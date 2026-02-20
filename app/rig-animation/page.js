'use client';
import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useFBX } from '@react-three/drei';
import { ArrowLeft, Sparkles, Download, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

// Extracted to a component to properly handle the useFBX hook
function MannequinModel() {
  // Ensure 'Mannequin.fbx' is in your /public folder
  const fbx = useFBX('/Mannequin.fbx');
  
  return (
    <primitive 
      object={fbx} 
      scale={0.10} 
      position={[0, -1.5, 0]}
    />
  );
}

export default function RigAnimation() {
  const router = useRouter();
  const { user, loading } = useUser();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [animationUrl, setAnimationUrl] = useState(null);
  const [duration, setDuration] = useState('auto');
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
          prompt,
          duration: duration === 'auto' ? null : parseInt(duration),
          format,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let animationData = data;
      // Added 'succeeded' check as many AI APIs use that status
      while (animationData.status !== 'completed' && animationData.status !== 'succeeded' && animationData.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const checkResponse = await fetch('/api/generate-rig-animation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: animationData.predictionId }),
        });
        
        animationData = await checkResponse.json();
      }

      if (animationData.status === 'completed' || animationData.status === 'succeeded') {
        const finalUrl = animationData.animationUrl || animationData.output;
        setAnimationUrl(finalUrl);

        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        
        await deductCredits(user.uid, 2);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'AI Rig Animation',
          prompt,
          imageUrl: finalUrl,
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

  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a1a] text-white font-sans overflow-hidden relative">
      
      {/* 3D VIEWPORT */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]">
        <Canvas camera={{ position: [0, 1, 4], fov: 50 }}>
          {/* Suspense is CRITICAL here for useFBX to work without crashing */}
          <Suspense fallback={null}>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-10, 10, -5]} intensity={1} />
            <pointLight position={[0, 5, 0]} intensity={1} />
            
            <MannequinModel />
            
            <OrbitControls 
              enableZoom={true} 
              enablePan={true}
              minDistance={2}
              maxDistance={10}
            />
            <gridHelper args={[10, 10, '#555555', '#333333']} position={[0, -1.5, 0]} />
          </Suspense>
        </Canvas>
      </div>

      {/* HEADER */}
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button 
          onClick={() => router.push('/tools')}
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
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setDuration('auto')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${duration === 'auto' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              Auto
            </button>
            {['2', '5', '10'].map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${duration === d ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
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
                className={`py-2 text-xs font-bold rounded-lg transition-all ${format === f ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
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
              
              {/* FIXED: Added missing <a bracket */}
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
                placeholder="Describe the animation..."
                disabled={isGenerating}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-white/30"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || loading}
                className="px-6 sm:px-8 py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                    <span>Generating...</span>
                  </>
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