'use client';
import { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useAnimations } from '@react-three/drei';
import { ArrowLeft, Sparkles, Download, X, RotateCcw, Play, Pause } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import * as THREE from 'three';

// Loads the generated FBX and plays its embedded animation
function AnimatedModel({ url, playing }) {
  const fbx = useLoader(FBXLoader, url);
  const groupRef = useRef();
  const { actions, names } = useAnimations(fbx.animations, groupRef);

  useEffect(() => {
    fbx.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (!child.material) {
          child.material = new THREE.MeshStandardMaterial({ color: '#b0b0b0' });
        }
      }
    });
  }, [fbx]);

  useEffect(() => {
    if (!names.length) return;
    const action = actions[names[0]];
    if (!action) return;
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    action.paused = !playing;
  }, [actions, names]);

  useEffect(() => {
    if (!names.length) return;
    const action = actions[names[0]];
    if (action) action.paused = !playing;
  }, [playing]);

  return <primitive ref={groupRef} object={fbx} scale={0.1} position={[0, -1.5, 0]} />;
}



// Animated progress bar with estimated countdown
function GeneratingOverlay({ elapsed }) {
  // Hunyuan motion takes ~60-90 seconds typically
  const estimated = 75;
  const pct = Math.min(98, (elapsed / estimated) * 100);
  const remaining = Math.max(0, estimated - elapsed);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-5 w-full max-w-sm mx-4">
        {/* STYLARX brand — not "AI model" */}
        <div className="text-center">
          <p className="text-white font-black text-xl tracking-tight">STYLARX</p>
          <p className="text-white/50 text-sm mt-1">Generating your animation...</p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-2">
            <span>{Math.round(pct)}%</span>
            <span>~{remaining}s remaining</span>
          </div>
        </div>

        {/* Steps hint */}
        <div className="text-center text-[11px] text-white/30 leading-relaxed">
          Processing motion data • Rigging skeleton • Exporting FBX
        </div>
      </div>
    </div>
  );
}

export default function RigAnimation() {
  const router = useRouter();
  const { user, loading } = useUser();
  const controlsRef = useRef();
  const timerRef = useRef();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [animationUrl, setAnimationUrl] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Settings — kept for UX, they don't change API but good for future

  const popularPrompts = [
    'A person runs then leaps into the air',
    'A person waves hello enthusiastically',
    'A person does a victory dance',
    'A person walks forward confidently',
    'A person throws a punch and kicks',
    'A person sits down slowly then stands up',
    'A person climbs a ladder',
    'A person crouches and sneaks forward',
  ];

  const resetCamera = () => {
    if (controlsRef.current) controlsRef.current.reset();
  };

  // Countdown timer
  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };
  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      alert('Please enter a description and log in first');
      return;
    }

    setIsGenerating(true);
    setAnimationUrl(null);
    startTimer();

    try {
      const response = await fetch('/api/generate-rig-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), userId: user.uid, userEmail: user.email }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.status === 'succeeded' && data.animationUrl) {
        setAnimationUrl(data.animationUrl);
        setIsPlaying(true);

        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        await deductCredits(user.uid, 2);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'AI Rig Animation',
          prompt,
          imageUrl: data.animationUrl,
          creditsUsed: 2,
        });
      } else {
        throw new Error('Generation failed — no animation returned');
      }
    } catch (err) {
      alert(err.message || 'Error generating animation');
    } finally {
      stopTimer();
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!animationUrl) return;
    setIsDownloading(true);
    try {
      const r = await fetch(animationUrl);
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animation-${Date.now()}.fbx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(animationUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };



  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a1a] text-white font-sans overflow-hidden relative">

      {/* 3D SCENE */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]">
        <Canvas shadows camera={{ position: [0, 1, 4], fov: 50 }} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-10, 10, -5]} intensity={0.8} />
            <pointLight position={[0, 5, 0]} intensity={0.8} />

            {animationUrl && (
              <AnimatedModel url={animationUrl} playing={isPlaying} />
            )}

            <OrbitControls
              ref={controlsRef}
              enableZoom enablePan
              minDistance={1} maxDistance={15}
              target={[0, 0, 0]}
              makeDefault
            />
            <gridHelper args={[20, 20, '#555555', '#333333']} position={[0, -1.5, 0]} />
          </Suspense>
        </Canvas>

        {/* Empty state hint */}
        {!animationUrl && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-white/20" />
              </div>
              <p className="text-white/30 text-base font-medium">Enter a prompt below</p>
              <p className="text-white/15 text-sm mt-1">Your animated character will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* GENERATING OVERLAY */}
      {isGenerating && <GeneratingOverlay elapsed={elapsed} />}

      {/* NAV */}
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none flex justify-between items-start">
        <button
          onClick={() => router.push('/tools')}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Tools</span>
        </button>
        <button
          onClick={resetCamera}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md"
        >
          <RotateCcw size={18} />
          <span className="text-sm font-medium">Reset View</span>
        </button>
      </nav>

      {/* SETTINGS PANEL */}
      <aside className="fixed top-20 sm:top-24 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {/* Play/Pause when animation loaded */}
        {animationUrl && (
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <p className="text-sm font-bold">Playback</p>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-sm font-bold transition-all"
            >
              {isPlaying ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
            </button>
          </div>
        )}

        {/* Export */}
        <div className="pt-2 border-t border-white/10">
          <label className="text-xs text-white/60 uppercase tracking-wider font-bold mb-2 block">Export Format</label>
          <div className="px-3 py-2.5 bg-white/5 rounded-lg border border-white/10 text-sm font-bold text-white/80 flex items-center justify-between">
            <span>FBX</span>
            <span className="text-[10px] text-white/30 font-normal">Blender · Maya · Unreal · Unity</span>
          </div>
        </div>

        {/* Cost */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white/70">Total Cost</span>
            <span className="text-2xl font-black">2 Credits</span>
          </div>
        </div>
      </aside>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-black via-black/95 to-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-3">

          {!animationUrl && (
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-bold">Quick Prompts</label>
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
                onClick={() => { setAnimationUrl(null); setPrompt(''); }}
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <X size={18} /><span>Reset</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base disabled:opacity-50"
              >
                {isDownloading
                  ? <div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" />
                  : <Download size={18} />
                }
                <span>Download FBX</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
                placeholder="Describe the animation... (e.g. A person runs then leaps)"
                disabled={isGenerating}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-white/30 placeholder-white/30 disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || loading}
                className="px-6 sm:px-8 py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl whitespace-nowrap"
              >
                {isGenerating ? (
                  <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span className="hidden sm:inline">Generate</span>
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