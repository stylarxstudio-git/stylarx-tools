'use client';
import { useState, useRef, Suspense, useEffect } from 'react';
import { ArrowLeft, Sparkles, Download, Eye, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import dynamic from 'next/dynamic';

// Safari fix — never import Three.js at module level
const Canvas = dynamic(() => import('@react-three/fiber').then(m => ({ default: m.Canvas })), { ssr: false });
const OrbitControls = dynamic(() => import('@react-three/drei').then(m => ({ default: m.OrbitControls })), { ssr: false });

function GoboPreviewScene({ goboTexture, brightness, radius, blur }) {
  const [scene, setScene] = useState(null);
  const [texture, setTexture] = useState(null);
  const spotLightRef = useRef();

  useEffect(() => {
    // Load Three.js and assets dynamically
    Promise.all([
      import('@react-three/fiber'),
      import('@react-three/drei'),
      import('three'),
    ]).then(([, drei, THREE]) => {
      const loader = new THREE.TextureLoader();
      loader.load(goboTexture, (t) => {
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.anisotropy = 16;
        setTexture(t);
      });
      drei.useGLTF.preload('/Gobo-Preview-Scene.glb');
    });
  }, [goboTexture]);

  if (!texture) return null;

  return (
    <GoboSceneInner
      texture={texture}
      brightness={brightness}
      radius={radius}
      blur={blur}
      spotLightRef={spotLightRef}
    />
  );
}

// Inner component that uses hooks (needs to be inside Canvas)
function GoboSceneInner({ texture, brightness, radius, blur, spotLightRef }) {
  const { useGLTF } = require('@react-three/drei');
  const { useFrame } = require('@react-three/fiber');
  const { scene } = useGLTF('/Gobo-Preview-Scene.glb');

  useFrame(() => {
    if (spotLightRef.current) {
      spotLightRef.current.intensity = Math.pow(brightness, 2.8);
      spotLightRef.current.angle = radius;
      spotLightRef.current.penumbra = blur;
    }
  });

  return (
    <>
      <primitive object={scene} />
      <spotLight
        ref={spotLightRef}
        position={[0, 5, 0]}
        distance={50}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <primitive attach="map" object={texture} />
      </spotLight>
    </>
  );
}

export default function GoboGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [mounted, setMounted] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [goboUrl, setGoboUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [brightness, setBrightness] = useState(3);
  const [radius, setRadius] = useState(0.5);
  const [blur, setBlur] = useState(0.3);

  useEffect(() => { setMounted(true); }, []);

  const popularPrompts = [
    'tree branches silhouette', 'geometric hexagon pattern', 'venetian blinds horizontal',
    'ornate window frame', 'leaf shadow pattern', 'tribal pattern',
    'broken glass cracks', 'rain drops on window'
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      alert('Please enter a description and log in first');
      return;
    }

    setIsGenerating(true);

    try {
      // CHECK CREDITS FIRST — blocks generation if insufficient
      const { checkCredits } = await import('@/lib/credits');
      await checkCredits(user.uid, 1);

      const enhancedPrompt = `High-contrast black and white gobo lighting stencil: ${prompt}. Clean silhouette, connected shapes, no floating elements, professional theater lighting pattern, sharp edges`;

      const response = await fetch('/api/generate-gobo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let prediction = data;
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const checkResponse = await fetch('/api/generate-gobo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: prediction.id }),
        });
        prediction = await checkResponse.json();
      }

      if (prediction.status === 'succeeded') {
        setGoboUrl(prediction.output[0]);
        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        await deductCredits(user.uid, 1);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'Gobo Generator',
          prompt,
          imageUrl: prediction.output[0],
          creditsUsed: 1,
        });
      } else {
        throw new Error('Gobo generation failed');
      }
    } catch (err) {
      alert(err.message || 'Error generating gobo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!goboUrl) return;
    try {
      const response = await fetch(goboUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gobo-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(goboUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">

      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {/* Only render Canvas after mount and only when preview is active — Safari fix */}
        {mounted && showPreview && goboUrl ? (
          <Canvas shadows camera={{ position: [0, 3, 8], fov: 50 }}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.1} />
              <GoboPreviewScene goboTexture={goboUrl} brightness={brightness} radius={radius} blur={blur} />
              <OrbitControls />
            </Suspense>
          </Canvas>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            {goboUrl ? (
              <div className="max-w-md w-full aspect-square bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center justify-center">
                <img src={goboUrl} alt="Generated Gobo" className="w-full h-full object-contain rounded-lg" />
              </div>
            ) : (
              <div className="text-center text-white/40">
                <Sparkles size={64} className="mx-auto mb-4 opacity-20" />
                <p>Your gobo will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button
          onClick={() => router.push('/tools')}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {showPreview && goboUrl && (
        <aside className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">Preview Settings</h3>
            <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
          </div>
          <div>
            <label className="text-xs text-white/60 mb-2 block font-bold uppercase tracking-tighter">Intensity</label>
            <input type="range" min="0" max="10" step="0.1" value={brightness} onChange={(e) => setBrightness(parseFloat(e.target.value))} className="w-full accent-white" />
            <p className="text-[10px] text-white/40 mt-1">0 = Off, 10 = Maximum Brightness</p>
          </div>
          <div>
            <label className="text-xs text-white/60 mb-2 block font-bold uppercase tracking-tighter">Radius</label>
            <input type="range" min="0.1" max="1.5" step="0.01" value={radius} onChange={(e) => setRadius(parseFloat(e.target.value))} className="w-full accent-white" />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-2 block font-bold uppercase tracking-tighter">Edge Softness</label>
            <input type="range" min="0.01" max="1" step="0.01" value={blur} onChange={(e) => setBlur(parseFloat(e.target.value))} className="w-full accent-white" />
            <p className="text-[10px] text-white/40 mt-1">Softens and fades edges</p>
          </div>
        </aside>
      )}

      <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-black via-black/95 to-transparent p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-3">
          {!goboUrl && (
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block font-bold">Popular Gobos</label>
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {popularPrompts.map((p, i) => (
                  <button key={i} onClick={() => setPrompt(p)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all whitespace-nowrap">{p}</button>
                ))}
              </div>
            </div>
          )}

          {goboUrl ? (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setGoboUrl(null); setShowPreview(false); }} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"><X size={18} /><span>Reset</span></button>
              <button onClick={() => setShowPreview(!showPreview)} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"><Eye size={18} /><span>{showPreview ? 'Hide' : 'Preview'}</span></button>
              <button onClick={handleDownload} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"><Download size={18} /><span>Download</span></button>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
                placeholder="Describe the gobo pattern... (e.g., 'tree branches')"
                disabled={isGenerating}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-white/30 placeholder-white/30 disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || loading}
                className="px-6 sm:px-8 py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl whitespace-nowrap"
              >
                {isGenerating ? (
                  <><div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" /><span className="hidden sm:inline">Generating...</span></>
                ) : (
                  <><Sparkles size={20} /><span className="hidden sm:inline">Generate</span><span className="sm:hidden">Go</span></>
                )}
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}