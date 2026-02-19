'use client';
import { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Download, X, Volume2, Play, Pause } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

export default function SFXGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  const audioRef = useRef(null);
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Settings
  const [category, setCategory] = useState('Weapons');
  const [duration, setDuration] = useState('full');
  const [format, setFormat] = useState('mp3');

  // Example prompts by category
  const examplePrompts = {
    'Weapons': [
      'Cyberpunk pistol reload with mechanical clicks',
      'Laser gun charging and firing',
      'Medieval sword unsheathing with metal ring',
      'Shotgun pump action reload',
    ],
    'Magic': [
      'Arcane spell casting with ethereal whoosh',
      'Magic teleportation sound effect',
      'Healing spell with soft sparkles',
      'Fire spell ignition and burn',
    ],
    'UI': [
      'Button click with satisfying pop',
      'Notification ping, friendly tone',
      'Success sound with ascending chime',
      'Error beep, warning tone',
    ],
    'Footsteps': [
      'Heavy boots on metal grating',
      'Sneakers on wet pavement',
      'High heels on marble floor',
      'Barefoot on wooden creaking floor',
    ],
    'Ambience': [
      'Distant thunder with rain ambience',
      'Busy city street with traffic',
      'Spaceship engine hum, deep',
      'Wind howling through canyon',
    ],
    'Impacts': [
      'Punch impact with bone crack',
      'Explosion with debris falling',
      'Car crash with metal crunch',
      'Body falling on concrete',
    ],
    'Mechanical': [
      'Sci-fi door opening with hydraulics',
      'Old elevator ascending with creaks',
      'Robotic arm movement with servos',
      'Engine starting and revving',
    ],
    'Nature': [
      'Thunder rumble, close and powerful',
      'Ocean waves crashing on rocks',
      'Campfire crackling and popping',
      'Birds chirping in forest morning',
    ],
  };

  const categories = Object.keys(examplePrompts);

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      alert('Please enter a sound description and log in first');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('Generating sound effect...');

    try {
      const response = await fetch('/api/generate-sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          userId: user.uid,
          userEmail: user.email,
          duration: duration,
          format: format,
        }),
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      setAudioUrl(data.audioUrl);
      setGenerationProgress('');

    } catch (err) {
      alert(err.message || 'Error generating sound effect');
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}_sfx.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {audioUrl ? (
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-3xl w-full">
              <div className="relative bg-white/5 rounded-2xl p-8 border border-white/10">
                
                {/* Waveform Visualizer */}
                <div className="mb-8 flex items-end justify-center gap-1 h-32">
                  {[...Array(50)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 bg-gradient-to-t from-green-500 via-emerald-400 to-teal-300 rounded-full transition-all ${
                        isPlaying ? 'animate-pulse' : ''
                      }`}
                      style={{
                        height: `${Math.sin(i * 0.5) * 40 + 50}px`,
                        animationDelay: `${i * 0.02}s`,
                        opacity: isPlaying ? 1 : 0.6,
                      }}
                    />
                  ))}
                </div>

                {/* Audio Player */}
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />

                {/* Play Button */}
                <button
                  onClick={togglePlay}
                  className="w-full mb-6 py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl"
                >
                  {isPlaying ? (
                    <Pause size={32} className="text-white" />
                  ) : (
                    <Play size={32} className="text-white" />
                  )}
                  <span className="text-xl font-bold text-white">
                    {isPlaying ? 'Pause' : 'Play Sound'}
                  </span>
                </button>

                {/* Prompt Display */}
                <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Generated Sound:</p>
                  <p className="text-white/90 font-medium">{prompt}</p>
                </div>

                {/* Format Badge */}
                <div className="flex justify-end">
                  <span className="px-3 py-1 bg-white/10 text-white/60 text-xs font-bold rounded-full uppercase">
                    {format.toUpperCase()}
                  </span>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4 max-w-2xl">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                <Volume2 size={48} className="sm:w-16 sm:h-16 text-white/40" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-4">SFX Generator</h1>
              <p className="text-white/60 text-sm sm:text-base">Generate studio-quality sound effects from text descriptions</p>
            </div>
          </div>
        )}
      </div>

      {/* TOP LEFT - BACK BUTTON */}
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button 
          onClick={() => router.push('/tools')}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {/* GENERATION PROGRESS */}
      {isGenerating && generationProgress && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl">
          <p className="text-sm font-medium">{generationProgress}</p>
        </div>
      )}

      {/* BOTTOM PANEL - SETTINGS & PROMPT */}
      {!audioUrl && (
        <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-black via-black/95 to-transparent p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* Settings Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Category Selector */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  style={{ colorScheme: 'dark' }}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDuration('quick')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      duration === 'quick' 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    Quick
                    <span className="block text-[9px] opacity-60">3-8s</span>
                  </button>
                  <button
                    onClick={() => setDuration('full')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      duration === 'full' 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    Full
                    <span className="block text-[9px] opacity-60">8-15s</span>
                  </button>
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat('mp3')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      format === 'mp3' 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    MP3
                    <span className="block text-[9px] opacity-60">Smaller</span>
                  </button>
                  <button
                    onClick={() => setFormat('wav')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      format === 'wav' 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    WAV
                    <span className="block text-[9px] opacity-60">Pro</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Example Prompts */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Popular in {category}</label>
              <div className="flex flex-wrap gap-2">
                {examplePrompts[category].slice(0, 4).map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-all"
                  >
                    {example.length > 40 ? example.slice(0, 40) + '...' : example}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input & Generate */}
            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Describe your sound... (e.g., 'cyberpunk pistol reload' or 'magic spell whoosh')"
                disabled={isGenerating}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-white/30 placeholder-white/30 disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || loading}
                className="px-8 py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl whitespace-nowrap"
              >
                {isGenerating ? (
                  <>
                    <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span className="hidden sm:inline">1 Credit</span>
                    <span className="sm:hidden">Gen</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </footer>
      )}

      {/* RESULT BUTTONS */}
      {audioUrl && (
        <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3">
          <button 
            onClick={() => {
              setAudioUrl(null);
              setIsPlaying(false);
            }} 
            className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
          >
            <Download size={18} className="sm:w-5 sm:h-5" />
            <span>Download {format.toUpperCase()}</span>
          </button>
        </footer>
      )}

    </div>
  );
}