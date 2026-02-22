'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Download, X, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

// Custom Dropdown Component
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
      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">{label}</label>
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

export default function DecalGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [resultImage, setResultImage] = useState(null);
  
  const [decalType, setDecalType] = useState('Crack');
  const [style, setStyle] = useState('Realistic');

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      alert('Please enter a description and log in first');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('Generating transparent decal...');

    try {
      const response = await fetch('/api/generate-decal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          userId: user.uid,
          userEmail: user.email,
          decalType,
          style,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.status === 'succeeded') {
        setResultImage(data.output[0]);

        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        
        await deductCredits(user.uid, 1);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'Decal Generator',
          prompt: prompt,
          imageUrl: data.output[0],
          creditsUsed: 1,
        });

        setGenerationProgress('');
      } else {
        throw new Error('Generation failed');
      }

    } catch (err) {
      alert(err.message || 'Error generating decal');
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decal-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(resultImage, '_blank');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {resultImage ? (
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-2xl w-full">
              <div className="relative bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="relative bg-white/10 rounded-xl p-4" style={{
                  backgroundImage: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px'
                }}>
                  <img src={resultImage} alt="Generated Decal" className="w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4 max-w-2xl">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                <Sparkles size={48} className="sm:w-16 sm:h-16 text-white/40" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-4">Decal Generator</h1>
              <p className="text-white/60 text-sm sm:text-base">Generate transparent decals and overlays for 3D, VFX, and design</p>
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

      {/* BOTTOM PANEL - PROMPT & SETTINGS */}
      {!resultImage && (
        <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-black via-black/95 to-transparent p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            
            <div className="grid grid-cols-2 gap-3">
              <CustomDropdown
                label="Decal Type"
                value={decalType}
                options={['Crack', 'Leak', 'Dirt', 'Rust', 'Moss', 'Blood', 'Oil', 'Graffiti', 'Bullet Hole', 'Scratch', 'Custom']}
                onChange={setDecalType}
              />
              <CustomDropdown
                label="Style"
                value={style}
                options={['Realistic', 'Stylized', 'Grunge', 'Clean']}
                onChange={setStyle}
              />
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Describe your decal... (e.g., 'large diagonal crack' or 'rust drip running down')"
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
      {resultImage && (
        <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3">
          <button 
            onClick={() => setResultImage(null)} 
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
            <span>Download PNG</span>
          </button>
        </footer>
      )}

    </div>
  );
}