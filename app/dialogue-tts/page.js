'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Play, Pause, Download, Sparkles, X, Mic, Upload, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

const NONVERBALS = ['(laughs)', '(sighs)', '(gasps)', '(clears throat)', '(whispers)', '(shouts)', '(crying)', '(nervous laugh)'];

const EXAMPLE_DIALOGUES = [
  {
    name: 'Action',
    lines: [
      { id: 1, speaker: 1, text: "Get down! They're right behind us." },
      { id: 2, speaker: 2, text: "I see them. How many?" },
      { id: 3, speaker: 1, text: "Too many. We need to move. Now." },
      { id: 4, speaker: 2, text: "(sighs) I really hate Tuesdays." },
    ]
  },
  {
    name: 'Comedy',
    lines: [
      { id: 1, speaker: 1, text: "Did you eat my sandwich?" },
      { id: 2, speaker: 2, text: "(nervous laugh) Define sandwich." },
      { id: 3, speaker: 1, text: "The one with my name literally written on it." },
      { id: 4, speaker: 2, text: "I thought that was a suggestion." },
    ]
  },
  {
    name: 'Drama',
    lines: [
      { id: 1, speaker: 1, text: "You knew the whole time, didn't you?" },
      { id: 2, speaker: 2, text: "(sighs) Yes. I knew." },
      { id: 3, speaker: 1, text: "And you said nothing." },
      { id: 4, speaker: 2, text: "I was trying to protect you." },
    ]
  },
];

export default function DialogueTTS() {
  const router = useRouter();
  const { user, loading } = useUser();
  const audioRef = useRef();
  const nextId = useRef(3);
  const refAudioInputRef = useRef();

  const [lines, setLines] = useState([
    { id: 1, speaker: 1, text: '' },
    { id: 2, speaker: 2, text: '' },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNonverbals, setShowNonverbals] = useState(null);

  // Voice cloning state
  const [voiceCloneMode, setVoiceCloneMode] = useState(false);
  const [refAudioFile, setRefAudioFile] = useState(null);   // { url, name } — fal URL after upload
  const [refAudioLocal, setRefAudioLocal] = useState(null); // local object URL for playback preview
  const [refText, setRefText] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [showRefInfo, setShowRefInfo] = useState(false);

  const s1Color = '#a78bfa';
  const s2Color = '#34d399';

  const addLine = (speaker = 1) => {
    setLines(prev => [...prev, { id: nextId.current++, speaker, text: '' }]);
  };
  const removeLine = (id) => setLines(prev => prev.filter(l => l.id !== id));
  const updateLine = (id, field, value) => setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  const toggleSpeaker = (id) => setLines(prev => prev.map(l => l.id === id ? { ...l, speaker: l.speaker === 1 ? 2 : 1 } : l));
  const insertNonverbal = (lineId, nv) => {
    setLines(prev => prev.map(l => {
      if (l.id !== lineId) return l;
      const text = l.text.trim();
      return { ...l, text: text ? `${text} ${nv}` : nv };
    }));
    setShowNonverbals(null);
  };
  const loadExample = (example) => {
    nextId.current = example.lines.length + 1;
    setLines(example.lines.map((l, i) => ({ ...l, id: i + 1 })));
    setAudioUrl(null);
  };

  // Upload reference audio via server route (keeps FAL_KEY server-side only)
  const handleRefAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRefAudioLocal(URL.createObjectURL(file));
    setIsUploadingAudio(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Upload failed');

      setRefAudioFile({ url: data.url, name: file.name });
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload audio. Please try again.');
      setRefAudioLocal(null);
      if (refAudioInputRef.current) refAudioInputRef.current.value = '';
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const removeRefAudio = () => {
    setRefAudioFile(null);
    setRefAudioLocal(null);
    setRefText('');
    if (refAudioInputRef.current) refAudioInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    const validLines = lines.filter(l => l.text.trim());
    if (!validLines.length || !user) { alert('Add some dialogue and log in first'); return; }
    if (voiceCloneMode && (!refAudioFile || !refText.trim())) {
      alert('Voice clone mode requires both a reference audio file and its transcript.');
      return;
    }

    setIsGenerating(true);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const body = { lines: validLines };
      if (voiceCloneMode && refAudioFile) {
        body.refAudioUrl = refAudioFile.url;
        body.refText = refText.trim();
      }

      const response = await fetch('/api/generate-dialogue-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.status === 'succeeded' && data.audioUrl) {
        setAudioUrl(data.audioUrl);
        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        await deductCredits(user.uid, 1);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'Dialogue TTS',
          prompt: validLines.map(l => `[S${l.speaker}] ${l.text}`).join(' | '),
          imageUrl: data.audioUrl,
          creditsUsed: 1,
        });
      } else {
        throw new Error('Generation failed');
      }
    } catch (err) {
      alert(err.message || 'Error generating audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    setIsDownloading(true);
    try {
      const r = await fetch(audioUrl);
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dialogue-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch { window.open(audioUrl, '_blank'); }
    finally { setIsDownloading(false); }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [audioUrl]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f0f] text-white font-sans">
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      {/* NAV */}
      <nav className="fixed top-0 left-0 w-full z-50 p-4 sm:p-6 flex items-center justify-between bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/5">
        <button onClick={() => router.push('/tools')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-sm font-medium">
          <ArrowLeft size={16} /> Back to Tools
        </button>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/50 uppercase tracking-wider">1 Credit</div>
      </nav>

      <main className="flex-1 pt-20 pb-44 px-4 sm:px-6 max-w-3xl mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Mic size={24} className="text-white/60" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Dialogue TTS</h1>
          <p className="text-white/40 text-sm mt-1">Two-character dialogue with optional voice cloning</p>
        </div>

        {/* Voice Clone Toggle */}
        <div className="mb-6 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white/80">Voice Clone Mode</span>
              <button onClick={() => setShowRefInfo(!showRefInfo)} className="text-white/30 hover:text-white/60 transition-colors">
                <Info size={13} />
              </button>
            </div>
            <button
              onClick={() => setVoiceCloneMode(!voiceCloneMode)}
              className={`w-11 h-6 rounded-full transition-all relative ${voiceCloneMode ? 'bg-violet-500' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform bg-white ${voiceCloneMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {showRefInfo && (
            <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
              Upload a 5–10 second audio clip and provide its transcript. The AI will clone the voice style from that clip and apply it to your entire dialogue.
            </p>
          )}

          {voiceCloneMode && (
            <div className="mt-4 space-y-4">
              {/* Upload reference audio */}
              {!refAudioFile ? (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Reference Audio <span className="text-violet-400">*</span></label>
                  <button
                    onClick={() => refAudioInputRef.current?.click()}
                    disabled={isUploadingAudio}
                    className="w-full py-3 border border-dashed border-violet-500/30 rounded-xl text-xs text-violet-400/70 hover:border-violet-500/60 hover:text-violet-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploadingAudio ? (
                      <><div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload size={14} /> Upload audio clip (5–10 seconds)</>
                    )}
                  </button>
                  <input ref={refAudioInputRef} type="file" accept="audio/*" onChange={handleRefAudioUpload} className="hidden" />
                  <p className="text-[10px] text-white/20 mt-1">WAV, MP3, M4A supported</p>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Reference Audio</label>
                  <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                    <Mic size={14} className="text-violet-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate">{refAudioFile.name}</p>
                      {refAudioLocal && <audio src={refAudioLocal} controls className="mt-1 h-7 w-full" />}
                    </div>
                    <button onClick={removeRefAudio} className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"><X size={14} /></button>
                  </div>
                </div>
              )}

              {/* Reference transcript */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">
                  Transcript of reference audio <span className="text-violet-400">*</span>
                </label>
                <textarea
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                  placeholder="Type exactly what is said in the reference audio, using [S1] [S2] tags if two speakers are present. E.g: [S1] Hey, how are you doing today?"
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 resize-none"
                />
                <p className="text-[10px] text-white/20 mt-1">Must match the audio exactly for best results</p>
              </div>
            </div>
          )}
        </div>

        {/* Speaker legend */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s1Color }} />
              <span className="text-xs text-white/50 font-bold">Speaker 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s2Color }} />
              <span className="text-xs text-white/50 font-bold">Speaker 2</span>
            </div>
          </div>
          <div className="flex gap-2">
            {EXAMPLE_DIALOGUES.map(ex => (
              <button key={ex.name} onClick={() => loadExample(ex)} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-white/50 hover:text-white transition-all">
                {ex.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dialogue lines */}
        <div className="space-y-2 mb-4">
          {lines.map((line) => (
            <div key={line.id} className="relative group flex items-start gap-2">
              <button
                onClick={() => toggleSpeaker(line.id)}
                className="mt-2.5 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all flex-shrink-0 border"
                style={{
                  background: line.speaker === 1 ? `${s1Color}22` : `${s2Color}22`,
                  borderColor: line.speaker === 1 ? `${s1Color}66` : `${s2Color}66`,
                  color: line.speaker === 1 ? s1Color : s2Color,
                }}
              >
                S{line.speaker}
              </button>
              <div className="flex-1 relative">
                <textarea
                  value={line.text}
                  onChange={(e) => updateLine(line.id, 'text', e.target.value)}
                  placeholder={`Speaker ${line.speaker} says...`}
                  rows={1}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-14 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none transition-all"
                  style={{ borderLeftColor: line.speaker === 1 ? `${s1Color}44` : `${s2Color}44`, borderLeftWidth: 2, minHeight: 44 }}
                  onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />
                <button
                  onClick={() => setShowNonverbals(showNonverbals === line.id ? null : line.id)}
                  className="absolute right-2 top-2 px-2 py-1 text-[9px] text-white/20 hover:text-white/50 hover:bg-white/5 rounded-lg transition-all font-bold uppercase tracking-wider"
                >
                  + fx
                </button>
                {showNonverbals === line.id && (
                  <div className="absolute right-0 top-9 z-50 bg-[#1a1a1a] border border-white/20 rounded-xl p-2 flex flex-wrap gap-1 shadow-2xl w-64">
                    {NONVERBALS.map(nv => (
                      <button key={nv} onClick={() => insertNonverbal(line.id, nv)} className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[10px] text-white/70 hover:text-white transition-all">
                        {nv}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {lines.length > 1 && (
                <button onClick={() => removeLine(line.id)} className="mt-2.5 w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add line */}
        <div className="flex gap-2 mb-8">
          <button onClick={() => addLine(1)} className="flex-1 py-2 border border-dashed rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5" style={{ borderColor: `${s1Color}33`, color: `${s1Color}99` }}>
            <Plus size={12} /> Speaker 1
          </button>
          <button onClick={() => addLine(2)} className="flex-1 py-2 border border-dashed rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5" style={{ borderColor: `${s2Color}33`, color: `${s2Color}99` }}>
            <Plus size={12} /> Speaker 2
          </button>
        </div>

        {/* Audio player */}
        {audioUrl && (
          <div className="mb-6 bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-100 transition-all shadow-lg">
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="text-xs text-white/50 mb-1.5 font-medium">
                  Generated Dialogue {voiceCloneMode && <span className="text-violet-400 ml-1">· Voice Cloned</span>}
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (audioRef.current) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                }}>
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">Tips</p>
          <ul className="text-[11px] text-white/40 space-y-1 leading-relaxed">
            <li>• Use <span className="text-white/60 font-bold">+ fx</span> to add sounds like laughter or sighs</li>
            <li>• For voice cloning, use a clear 5–10s clip with minimal background noise</li>
            <li>• The transcript must exactly match what's said in the reference audio</li>
            <li>• Short punchy lines sound more natural than long monologues</li>
          </ul>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/95 to-transparent p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          {audioUrl ? (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setAudioUrl(null); setIsPlaying(false); }} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-2 font-bold">
                <X size={16} /> New Dialogue
              </button>
              <button onClick={handleDownload} disabled={isDownloading} className="px-8 py-3 bg-white hover:bg-gray-100 text-black rounded-2xl font-bold flex items-center gap-2 transition-all shadow-2xl disabled:opacity-50">
                {isDownloading ? <div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" /> : <Download size={16} />}
                Download WAV
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!lines.some(l => l.text.trim()) || isGenerating || loading}
              className="w-full py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl text-base"
            >
              {isGenerating ? (
                <><div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                  {voiceCloneMode ? 'Cloning voice & generating...' : 'Generating audio...'}</>
              ) : (
                <><Sparkles size={20} />
                  {voiceCloneMode ? 'Generate with Cloned Voice' : 'Generate Dialogue'}</>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}