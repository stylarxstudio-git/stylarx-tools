'use client';
import { useState } from 'react';
import { ArrowLeft, Sparkles, Download, X } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

export default function RigAnimation() {
  const { user, loading } = useUser();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [animationUrl, setAnimationUrl] = useState(null);
  const [duration, setDuration] = useState('5');
  const [format, setFormat] = useState('FBX');

  const popularPrompts = [
    'running animation', 'victory dance', 'jumping jack',
    'waving hello', 'sitting down', 'combat stance',
    'walking forward', 'climbing ladder'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      alert('Please enter a description and log in first');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-rig-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          duration: parseInt(duration),
          format: format,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let prediction = data;
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const checkRes = await fetch('/api/generate-rig-animation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: prediction.predictionId }),
        });
        
        prediction = await checkRes.json();
        if (prediction.error) throw new Error(prediction.error);
      }

      if (prediction.status === 'succeeded') {
        setAnimationUrl(prediction.animationUrl);
        
        // Fixed dynamic imports
        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        
        await deductCredits(user.uid, 2);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'AI Rig Animation',
          prompt: prompt,
          imageUrl: prediction.animationUrl,
          creditsUsed: 2,
        });
      } else {
        throw new Error('Animation generation failed');
      }

    } catch (err) {
      alert(err.message || 'Error generating animation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/tools';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND VIEWPORT */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a] flex items-center justify-center">
        {animationUrl ? (
          <div className="text-center">
            <div className="w-64 h-64 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
              <Sparkles size={64} className="text-white/30" />
            </div>
            <p className="text-white/60 text-sm">Animation generated successfully!</p>
            <p className="text-white/40 text-xs mt-2">Download below to use in your project</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-64 h-64 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
              <div className="space-y-4">
                <div className="w-32 h-32 mx-auto relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/30 rounded-full" />
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-16 bg-white/30 rounded" />
                  <div className="absolute top-10 left-1/4 w-12 h-3 bg-white/30 rounded" />
                  <div className="absolute top-10 right-1/4 w-12 h-3 bg-white/30 rounded" />
                  <div className="absolute top-24 left-1/3 w-3 h-16 bg-white/30 rounded" />
                  <div className="absolute top-24 right-1/3 w-3 h-16 bg-white/30 rounded" />
                </div>
              </div>
            </div>
            <p className="text-white/60 text-sm">T-Pose Mannequin</p>
            <p className="text-white/40 text-xs mt-2">Animation will play here</p>
          </div>
        )}
      </div>

      {/* HEADER */}
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button 
          onClick={handleBack}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {/* SETTINGS PANEL */}
      <aside className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4">
        <div>
          <label className="text-xs text-white/60 mb-2 block uppercase tracking-wider font-bold">Duration</label>
          <div className="grid grid-cols-3 gap-2">
            {['2', '5', '10'].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  duration === d ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block uppercase tracking-wider font-bold">Export Format</label>
          <div className="grid grid-cols-2 gap-2">
            {['FBX', 'BVH'].map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  format === f ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white/70">Total Cost:</span>
            <span className="text-2xl font-black">2 Credits</span>
          </div>
        </div>
      </aside>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-black via-black/95 to-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-3">
          {!animationUrl && (
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-bold">Popular Animations</label>
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {popularPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all whitespace-nowrap"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {animationUrl ? (
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setAnimationUrl(null)} 
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <X size={18} />
                <span>Reset</span>
              </button>
              
              {/* FIXED THE TAG BELOW */}
              <a 
                href={animationUrl}
                download={`animation.${format.toLowerCase()}`}
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <Download size={18} />
                <span>Download {format}</span>
              </a>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
                placeholder="Describe the animation... (e.g., 'running animation')"
                disabled={isGenerating}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-white/30 placeholder-white/30 disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || loading}
                className="px-6 sm:px-8 py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
              >
                {isGenerating ? (
                  <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}