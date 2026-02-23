'use client';
import { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useAnimations } from '@react-three/drei';
import { ArrowLeft, Sparkles, Download, X, RotateCcw, Play, Pause } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import * as THREE from 'three';

// Loads the static mannequin from public folder
function StaticMannequin() {
  const fbx = useLoader(FBXLoader, '/Mannequin.fbx');
  useEffect(() => {
    fbx.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [fbx]);
  return <primitive object={fbx} scale={0.015} position={[0, -1.5, 0]} />;
}

// Loads the generated FBX from hunyuan-motion and plays its animation
function AnimatedModel({ url, playing }) {
  const fbx = useLoader(FBXLoader, url);
  const group = useRef();
  const { actions, names } = useAnimations(fbx.animations, group);

  useEffect(() => {
    if (names.length > 0) {
      const action = actions[names[0]];
      if (action) {
        action.reset();
        action.setLoop(THREE.LoopRepeat, Infinity);
        if (playing) {
          action.play();
        } else {
          action.play();
          action.paused = true;
        }
      }
    }
  }, [actions, names, playing]);

  useEffect(() => {
    if (names.length > 0) {
      const action = actions[names[0]];
      if (action) {
        action.paused = !playing;
      }
    }
  }, [playing]);

  useEffect(() => {
    fbx.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Give it a visible material if none
        if (!child.material) {
          child.material = new THREE.MeshStandardMaterial({ color: '#aaaaaa' });
        }
      }
    });
  }, [fbx]);

  return <primitive ref={group} object={fbx} scale={0.015} position={[0, -1.5, 0]} />;
}

export default function RigAnimation() {
  const router = useRouter();
  const { user, loading } = useUser();
  const controlsRef = useRef();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [animationUrl, setAnimationUrl] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState('auto');
  const [quality, setQuality] = useState('high');
  const [fps, setFps] = useState('30');
  const [loopable, setLoopable] = useState(true);

  const popularPrompts = [
    'A person is running then takes a big leap',
    'A person waves hello enthusiastically',
    'A person does a victory dance',
    'A person walks forward confidently',
    'A person jumps and celebrates',
    'A person sits down slowly',
    'A person punches forward in combat stance',
    'A person climbs a ladder',
  ];

  const resetCamera = () => {
    if (controlsRef.current) controlsRef.current.reset();
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      alert('Please enter a description and log in first');
      return;
    }

    setIsGenerating(true);
    setAnimationUrl(null);

    try {
      const response = await fetch('/api/generate-rig-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          userId: user.uid,
          userEmail: user.email,
        }),
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
        throw new Error('Animation generation failed — no file returned');
      }
    } catch (err) {
      alert(err.message || 'Error generating animation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!animationUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(animationUrl);
      const blob = await response.blob();
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
        <Canvas
          shadows
          camera={{ position: [0, 1, 4], fov: 50 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-10, 10, -5]} intensity={0.8} />
            <pointLight position={[0, 5, 0]} intensity={0.8} />

            {animationUrl ? (
              <AnimatedModel url={animationUrl} playing={isPlaying} />
            ) : (
              <StaticMannequin />
            )}

            <OrbitControls
              ref={controlsRef}
              enableZoom={true}
              enablePan={true}
              minDistance={1}
              maxDistance={15}
              target={[0, 0, 0]}
              makeDefault
            />
            <gridHelper args={[20, 20, '#555555', '#333333']} position={[0, -1.5, 0]} />
          </Suspense>
        </Canvas>
      </div>

      {/* LOADING OVERLAY */}
      {isGenerating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="h-12 w-12 border-3 border-white/30 border-t-white animate-spin rounded-full" style={{ borderWidth: 3 }} />
            <p className="text-white font-bold text-lg text-center">Generating Motion...</p>
            <p className="text-white/50 text-sm text-center">Hunyuan is creating your 3D animation. This takes ~60 seconds.</p>
          </div>
        </div>
      )}

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
      <aside className="fixed top-20 sm:top-24 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">

        {/* Play/Pause — only visible when animation loaded */}
        {animationUrl && (
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <p className="text-sm font-bold text-white">Animation</p>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-sm font-bold transition-all"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        )}

        <div>
          <label className="text-xs text-white/60 mb-2 block uppercase tracking-wider font-bold">Duration</label>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => setDuration('auto')} className={`py-2 text-xs font-bold rounded-lg transition-all ${duration === 'auto' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Auto</button>
            {['2', '5', '10'].map(d => (
              <button key={d} onClick={() => setDuration(d)} className={`py-2 text-xs font-bold rounded-lg transition-all ${duration === d ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{d}s</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block uppercase tracking-wider font-bold">Quality</label>
          <div className="grid grid-cols-3 gap-2">
            {['standard', 'high', 'ultra'].map(q => (
              <button key={q} onClick={() => setQuality(q)} className={`py-2 text-xs font-bold rounded-lg transition-all capitalize ${quality === q ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{q}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block uppercase tracking-wider font-bold">Frame Rate</label>
          <div className="grid grid-cols-3 gap-2">
            {['24', '30', '60'].map(f => (
              <button key={f} onClick={() => setFps(f)} className={`py-2 text-xs font-bold rounded-lg transition-all ${fps === f ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div>
            <p className="text-sm font-bold text-white">Seamless Loop</p>
            <p className="text-xs text-white/40">Smooth transition</p>
          </div>
          <button onClick={() => setLoopable(!loopable)} className={`w-12 h-6 rounded-full transition-all relative ${loopable ? 'bg-white' : 'bg-white/20'}`}>
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${loopable ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white/60'}`} />
          </button>
        </div>

        {/* Format info — hunyuan only outputs FBX */}
        <div className="pt-2 border-t border-white/10">
          <label className="text-xs text-white/60 mb-2 block uppercase tracking-wider font-bold">Export Format</label>
          <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-sm font-bold text-white/80">
            FBX — Hunyuan Motion output
          </div>
          <p className="text-[10px] text-white/30 mt-1.5">Compatible with Blender, Maya, Unreal, Unity</p>
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
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-bold">Example Prompts</label>
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
                placeholder="Describe the animation... (e.g. A person runs and leaps)"
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