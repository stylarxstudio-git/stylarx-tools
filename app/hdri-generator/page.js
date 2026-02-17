'use client';
import { useState, Suspense, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { ArrowLeft, Sparkles, Download, X, Settings, Box, Layers, RefreshCw, Zap, ZoomIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';

// --- 1. PREVIEW SCENE LOADER ---
function BlenderPreview({ show }) {
  const { scene } = useGLTF('/HDRI-Scene_Preview.glb');
  if (!show) return null;
  return <primitive object={scene} position={[0, -1, 0]} scale={1.5} />;
}

// --- 2. THE 3D ENVIRONMENT ---
function Scene({ textureUrl }) {
  const isEXR = textureUrl.toLowerCase().endsWith('.exr');
  const texture = useLoader(isEXR ? EXRLoader : THREE.TextureLoader, textureUrl);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return (
    <>
      <Sphere args={[500, 60, 40]} scale={[-1, 1, 1]}>
        <meshBasicMaterial map={texture} side={THREE.BackSide} />
      </Sphere>
      <Environment map={texture} />
    </>
  );
}

export default function HDRIGenerator() {
  const router = useRouter();
  const controlsRef = useRef();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  
  // Settings States
  const [resolution, setResolution] = useState('2K');
  const [format, setFormat] = useState('HDRI');
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotateSpeed, setRotateSpeed] = useState(0.5);
  const [showScene, setShowScene] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(25); // Controls camera distance

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, -1, 0);
      setZoomLevel(25);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
      {/* 3D VIEWPORT */}
      <div className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing">
        <Canvas shadows camera={{ position: [12, 6, 18], fov: 50 }}>
          <Suspense fallback={null}>
            {resultImage ? (
              <Scene textureUrl={resultImage} />
            ) : (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.01, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial 
                  color={0x444444}
                  transparent 
                onBeforeCompile={(shader) => {
  // Inject the varying UV into the vertex shader if it's missing
  shader.vertexShader = `varying vec2 vCustomUv;` + shader.vertexShader.replace(
    `#include <uv_vertex>`,
    `#include <uv_vertex>
     vCustomUv = uv;`
  );

  // Use the injected UV in the fragment shader
  shader.fragmentShader = `varying vec2 vCustomUv;` + shader.fragmentShader.replace(
    `#include <dithering_fragment>`,
    `
    #include <dithering_fragment>
    float dist = distance(vCustomUv, vec2(0.5));
    float mask = smoothstep(0.5, 0.2, dist);
    gl_FragColor.a *= mask;
    `
  );
}}
                />
                <gridHelper args={[100, 50, 0x444444, 0x222222]} rotation={[Math.PI / 2, 0, 0]} />
              </mesh>
            )}
            <BlenderPreview show={showScene} />
            <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={20} blur={2.5} far={4.5} />
          </Suspense>
          
          <OrbitControls 
            ref={controlsRef}
            makeDefault 
            enableZoom={true}
            zoomSpeed={2.5} 
            enablePan={true}
            dampingFactor={0.05}
            enableDamping={true}
            autoRotate={autoRotate}
            autoRotateSpeed={rotateSpeed}
            minDistance={0.1}
            maxDistance={450} 
            target={[0, -1, 0]}
          />
        </Canvas>
      </div>

      {/* TOP NAVIGATION */}
      <nav className="p-4 md:p-6 fixed top-0 left-0 w-full z-50 flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => router.push('/tools')} 
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-white/[0.07] hover:bg-white/[0.12] rounded-full border border-white/10 backdrop-blur-md transition-all text-xs md:text-sm font-medium"
        >
          <ArrowLeft size={18} />
          <span>Back to Tools</span>
        </button>
      </nav>

      {/* LEFT SETTINGS PANEL */}
      <aside className="absolute top-20 left-4 md:top-24 md:left-8 z-40 w-52 md:w-64 p-4 md:p-6 bg-white/[0.07] backdrop-blur-2xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl scale-[0.85] md:scale-100 origin-top-left">
        <div className="flex items-center justify-between mb-4 md:mb-6 pb-3 md:pb-4 border-b border-white/10">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Studio Config</span>
          <Settings size={14} className="text-white/20" />
        </div>

        <div className="space-y-4 md:space-y-6">
          <button 
            onClick={resetCamera}
            className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl border border-white/10 text-[9px] md:text-[10px] font-bold text-white uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw size={14} /> Reset View
          </button>

          <div>
            <label className="text-[9px] md:text-[10px] uppercase font-bold text-white/40 mb-2 md:mb-3 block tracking-wider">Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              {['1K', '2K', '4K', '8K'].map(res => (
                <button 
                  key={res} onClick={() => setResolution(res)}
                  className={`py-1.5 md:py-2 text-[9px] md:text-[10px] font-bold rounded-lg md:rounded-xl border transition-all ${resolution === res ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] md:text-[10px] uppercase font-bold text-white/40 mb-2 md:mb-3 block tracking-wider">Format</label>
            <div className="flex bg-black/40 p-1 rounded-lg md:rounded-xl border border-white/5">
              {['HDRI', 'EXR'].map(f => (
                <button 
                  key={f} onClick={() => setFormat(f)}
                  className={`flex-1 py-1.5 md:py-2 text-[9px] md:text-[10px] font-bold rounded-md md:rounded-lg transition-all ${format === f ? 'bg-white/10 text-white border border-white/10' : 'text-white/30 hover:text-white/50'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 md:space-y-5 pt-3 md:pt-4 border-t border-white/5">
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between text-white/40 text-[9px] md:text-[10px]">
                <span className="font-bold uppercase tracking-wider">Rotate Speed</span>
                <span>{rotateSpeed}x</span>
              </div>
              <input 
                type="range" min="0.1" max="3" step="0.1" 
                value={rotateSpeed} onChange={(e) => setRotateSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400/80">
                <Zap size={14} className={resultImage ? "animate-pulse" : ""} />
                <span className="text-[10px] md:text-[11px] font-bold">Studio Mode</span>
              </div>
              <button 
                onClick={() => setResultImage(resultImage ? null : '/castel_st_angelo_roof_1k.exr')}
                className={`w-8 h-4 md:w-9 md:h-5 rounded-full transition-all relative ${resultImage ? 'bg-blue-500 shadow-lg' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full transition-transform ${resultImage ? 'translate-x-3.5 md:translate-x-4 bg-white' : 'translate-x-0 bg-white/40'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/50">
                <Layers size={14} />
                <span className="text-[10px] md:text-[11px] font-bold">Auto Rotate</span>
              </div>
              <button 
                onClick={() => setAutoRotate(!autoRotate)}
                className={`w-8 h-4 md:w-9 md:h-5 rounded-full transition-all relative ${autoRotate ? 'bg-white/80' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full transition-transform ${autoRotate ? 'translate-x-3.5 md:translate-x-4 bg-black' : 'translate-x-0 bg-white/40'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/50">
                <Box size={14} />
                <span className="text-[10px] md:text-[11px] font-bold">Show Scene</span>
              </div>
              <button 
                onClick={() => setShowScene(!showScene)}
                className={`w-8 h-4 md:w-9 md:h-5 rounded-full transition-all relative ${showScene ? 'bg-green-500/60' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full transition-transform ${showScene ? 'translate-x-3.5 md:translate-x-4 bg-white' : 'translate-x-0 bg-white/40'}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* FOOTER INPUT */}
      <footer className="fixed bottom-6 md:bottom-10 left-0 w-full px-6 md:px-8 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto scale-90 md:scale-100 origin-bottom">
          <div className="flex items-center gap-3 bg-white/[0.08] backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-2xl transition-all hover:border-white/20">
            <input 
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Atmospheric studio lighting..."
              className="flex-1 bg-transparent px-4 py-3 outline-none text-white text-sm md:text-base placeholder-white/20"
            />
            <button className="bg-white/90 text-black px-4 md:px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition-all h-11 md:h-12">
              <Sparkles size={18} /> 
              <span className="hidden xs:inline">Generate</span>
            </button>
          </div>
        </div>
      </footer>

      {/* DOWNLOAD & CLOSE */}
      {resultImage && (
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-50 flex gap-2 md:gap-3 pointer-events-auto">
          <button onClick={() => setResultImage(null)} className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all text-white/70">
            <X size={20} />
          </button>
          <a href={resultImage} download className="p-2 md:p-3 bg-white text-black rounded-full hover:scale-105 transition-transform shadow-2xl">
            <Download size={20} />
          </a>
        </div>
      )}
    </div>
  );
}