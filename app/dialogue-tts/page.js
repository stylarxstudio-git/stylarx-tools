'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Play, Pause, Download, Sparkles, X, GripVertical, Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

const NONVERBALS = ['(laughs)', '(sighs)', '(gasps)', '(clears throat)', '(whispers)', '(shouts)', '(crying)', '(nervous laugh)'];

const EXAMPLE_DIALOGUES = [
  {
    name: 'Action Scene',
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
      { id: 5, speaker: 1, text: "By lying to me? (laughs) That makes perfect sense." },
    ]
  },
];

export default function DialogueTTS() {
  const router = useRouter();
  const { user, loading } = useUser();
  const audioRef = useRef();
  const nextId = useRef(3);

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
  const [showNonverbals, setShowNonverbals] = useState(null); // line id

  const s1Color = '#a78bfa'; // purple
  const s2Color = '#34d399'; // green

  const addLine = (speaker = 1) => {
    setLines(prev => [...prev, { id: nextId.current++, speaker, text: '' }]);
  };

  const removeLine = (id) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id, field, value) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const toggleSpeaker = (id) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, speaker: l.speaker === 1 ? 2 : 1 } : l));
  };

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

  const charCount = lines.map(l => l.text).join(' ').length;
  const estimatedCost = ((charCount / 1000) * 0.04).toFixed(3);

  const handleGenerate = async () => {
    const validLines = lines.filter(l => l.text.trim());
    if (!validLines.length || !user) { alert('Add some dialogue and log in first'); return; }

    setIsGenerating(true);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const response = await fetch('/api/generate-dialogue-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: validLines }),
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
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
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
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-white/30 font-medium hidden sm:block">{charCount} chars · ~${estimatedCost}</div>
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/50 uppercase tracking-wider">1 Credit</div>
        </div>
      </nav>

      <main className="flex-1 pt-20 pb-40 px-4 sm:px-6 max-w-3xl mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Mic size={24} className="text-white/60" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Dialogue TTS</h1>
          <p className="text-white/40 text-sm mt-1">Two-character dialogue generation with natural speech</p>
        </div>

        {/* Speaker legend */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: s1Color }} />
            <span className="text-xs font-bold text-white/60">Speaker 1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: s2Color }} />
            <span className="text-xs font-bold text-white/60">Speaker 2</span>
          </div>
        </div>

        {/* Example presets */}
        <div className="mb-6">
          <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 block">Load Example</label>
          <div className="flex gap-2 flex-wrap">
            {EXAMPLE_DIALOGUES.map(ex => (
              <button key={ex.name} onClick={() => loadExample(ex)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/60 hover:text-white transition-all">
                {ex.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dialogue lines */}
        <div className="space-y-2 mb-4">
          {lines.map((line, idx) => (
            <div key={line.id} className="relative group flex items-start gap-2">
              {/* Speaker toggle */}
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

              {/* Text input */}
              <div className="flex-1 relative">
                <textarea
                  value={line.text}
                  onChange={(e) => updateLine(line.id, 'text', e.target.value)}
                  placeholder={`Speaker ${line.speaker} says...`}
                  rows={1}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none transition-all"
                  style={{
                    borderLeftColor: line.speaker === 1 ? `${s1Color}44` : `${s2Color}44`,
                    borderLeftWidth: 2,
                    minHeight: 44,
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
                {/* Nonverbal insert button */}
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

              {/* Delete */}
              {lines.length > 1 && (
                <button onClick={() => removeLine(line.id)} className="mt-2.5 w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add line buttons */}
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
                <div className="text-xs text-white/50 mb-1.5 font-medium">Generated Dialogue</div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  if (audioRef.current) audioRef.current.currentTime = pct * duration;
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
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-4">
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">Tips for best results</p>
          <ul className="text-[11px] text-white/40 space-y-1 leading-relaxed">
            <li>• Use the <span className="text-white/60 font-bold">+ fx</span> button to add natural sounds like laughter or sighs</li>
            <li>• Keep lines conversational and natural — avoid overly formal language</li>
            <li>• Short punchy lines work better than long monologues</li>
            <li>• Speaker 1 and 2 have distinct auto-assigned voices</li>
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
                <><div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" /> Generating Audio...</>
              ) : (
                <><Sparkles size={20} /> Generate Dialogue</>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}