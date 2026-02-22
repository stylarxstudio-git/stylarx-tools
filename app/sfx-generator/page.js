'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Download, X, Volume2, Play, Pause, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

// Custom Dropdown Component with Glassmorphism
function CustomDropdown({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-left focus:outline-none focus:border-white/30 flex items-center justify-between"
      >
        <span>{value}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div 
          className="absolute bottom-full left-0 right-0 mb-1 bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { 
                onChange(option); 
                setIsOpen(false); 
              }}
              className={`w-full px-3 py-2 text-sm text-left transition-all ${
                value === option 
                  ? 'bg-white/20 text-white font-bold' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SFXGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  const audioRef = useRef(null);
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [category, setCategory] = useState('Weapons');
  const [duration, setDuration] = useState('auto');
  const [format, setFormat] = useState('mp3');

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
    'Custom': [],
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

  const handleDownload = async () => {
    if (!audioUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}_sfx.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(audioUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {audioUrl ? (
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-3xl w-full">
              <div className="relative bg-[#111111] rounded-2xl p-8 border border-white/10 shadow-2xl">
                
                {/* Waveform Visualizer */}
                <div className="mb-8 flex items-end justify-center gap-1 h-32">
                  {[...Array(50)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 rounded-full transition-all ${isPlaying ? 'bg-white animate-pulse' : 'bg-white/30'}`}
                      style={{
                        height: `${Math.sin(i * 0.5) * 40 + 50}px`,
                        animationDelay: `${i * 0.02}s`,
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
                  className="w-full mb-6 py-5 bg-white hover:bg-neutral-100 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl"
                >
                  {isPlaying ? (
                    <Pause size={28} className="text-black" />
                  ) : (
                    <Play size={28} className="text-black" />
                  )}
                  <span className="text-lg font-bold text-black">
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
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 items-end">
            
            {/* LEFT SIDE - SETTINGS PANEL */}
            <aside className="w-full lg:w-72 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl order-2 lg:order-1">
              <h3 className="text-xs text-white/60 uppercase tracking-wider mb-4 font-bold">Settings</h3>
              
              <div className="mb-4">
                <CustomDropdown
                  label="Category"
                  value={category}
                  options={categories}
                  onChange={setCategory}
                />
              </div>

              <div className="mb-4">
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-bold">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {['quick', 'auto', 'full'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                        duration === d
                          ? 'bg-white text-black shadow-lg'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                      <span className="block text-[8px] opacity-60 mt-0.5">
                        {d === 'quick' ? '3-8s' : d === 'auto' ? 'AI' : '8-15s'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-bold">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {['mp3', 'wav'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                        format === f
                          ? 'bg-white text-black shadow-lg'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {f.toUpperCase()}
                      <span className="block text-[8px] opacity-60 mt-0.5">
                        {f === 'mp3' ? 'Smaller' : 'Quality'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* RIGHT SIDE - SUGGESTIONS & PROMPT */}
            <div className="flex-1 space-y-3 order-1 lg:order-2 w-full">
              
              {category !== 'Custom' && (
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-bold">Popular in {category}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {examplePrompts[category].slice(0, 4).map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(example)}
                        className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-left text-white/70 hover:text-white transition-all truncate"
                        title={example}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {category === 'Custom' && (
                <div className="px-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Custom — type anything below</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
                  placeholder="Describe your sound effect..."
                  disabled={isGenerating}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-white/30 placeholder-white/30 disabled:opacity-50 backdrop-blur-xl"
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || loading}
                  className="px-6 sm:px-8 py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl whitespace-nowrap min-w-[140px]"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                      <span className="hidden sm:inline">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>1 Credit</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </footer>
      )}

      {/* RESULT BUTTONS */}
      {audioUrl && (
        <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3">
          <button 
            onClick={() => { setAudioUrl(null); setIsPlaying(false); }} 
            className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
          >
            <X size={18} />
            <span>Reset</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-neutral-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base disabled:opacity-50"
          >
            <Download size={18} />
            <span>{isDownloading ? 'Downloading...' : `Download ${format.toUpperCase()}`}</span>
          </button>
        </footer>
      )}

    </div>
  );
}