'use client';
import { useState, Suspense, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { ArrowLeft, Sparkles, Download, X, Settings, Box, Layers, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import * as THREE from 'three';

function BlenderPreview({ show }) {
  const { scene } = useGLTF('/HDRI-Scene_Preview.glb');
  if (!show) return null;
  return <primitive object={scene} position={[0, -1, 0]} scale={1.5} />;
}

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
  const { user, loading } = useUser();
  const controlsRef = useRef();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState(null); // preview URL (always PNG from fal)
  const [downloadBlob, setDownloadBlob] = useState(null); // actual HDR/EXR blob for download
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [resolution, setResolution] = useState('2K');
  const [format, setFormat] = useState('HDRI');
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotateSpeed, setRotateSpeed] = useState(0.5);
  const [showScene, setShowScene] = useState(true);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, -1, 0);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) {
      alert('Please enter a description and log in first');
      return;
    }

    setIsGenerating(true);
    setDownloadBlob(null);

    try {
      const response = await fetch('/api/generate-hdri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          resolution,
          format,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'Generation failed');
      }

      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.includes('application/json')) {
        // Fallback: got JSON with a URL (PNG/JPG format)
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setResultImage(data.output[0]);
        setDownloadBlob(null);
      } else {
        // Got binary HDR/EXR file — get preview URL from header, save blob for download
        const previewUrl = response.headers.get('X-Image-Url');
        const blob = await response.blob();
        setDownloadBlob({ blob, format });
        // Use the original PNG from fal for the 3D preview (EXR/HDR not displayable in browser)
        if (previewUrl) {
          setResultImage(previewUrl);
        }
      }

      const { deductCredits } = await import('@/lib/credits');
      const { saveGeneration } = await import('@/lib/generations');
      await deductCredits(user.uid, 1);
      await saveGeneration({
        outsetaUid: user.uid,
        toolName: 'HDRI Generator',
        prompt,
        imageUrl: resultImage || '',
        creditsUsed: 1,
      });

    } catch (err) {
      alert(err.message || 'Error generating HDRI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage && !downloadBlob) return;
    setIsDownloading(true);

    try {
      if (downloadBlob) {
        // We already have the converted HDR/EXR blob — just save it
        const ext = format === 'EXR' ? 'exr' : 'hdr';
        const url = window.URL.createObjectURL(downloadBlob.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hdri-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (resultImage) {
        // No blob yet — download the preview PNG as the chosen format name
        const response = await fetch(resultImage);
        const blob = await response.blob();
        const ext = format === 'EXR' ? 'exr' : format === 'HDRI' ? 'hdr' : 'png';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hdri-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch {
      window.open(resultImage, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setResultImage(null);
    setDownloadBlob(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
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
                    shader.vertexShader = `varying vec2 vCustomUv;` + shader.vertexShader.replace(
                      `#include <uv_vertex>`,
                      `#include <uv_vertex>
                       vCustomUv = uv;`
                    );
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

      <nav className="p-4 md:p-6 fixed top-0 left-0 w-full z-50 flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => router.push('/tools')} 
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-white/[0.07] hover:bg-white/[0.12] rounded-full border border-white/10 backdrop-blur-md transition-all text-xs md:text-sm font-medium"
        >
          <ArrowLeft size={18} />
          <span>Back to Tools</span>
        </button>
      </nav>

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
            <label className="text-[9px] md:text-[10px] uppercase font-bold text-white/40 mb-2 md:mb-3 block tracking-wider">
              Export Format
            </label>
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
            <p className="text-[8px] text-white/20 mt-1.5 text-center">
              {format === 'EXR' ? 'OpenEXR — industry standard for VFX' : '.hdr Radiance — works in Blender, Unity, Unreal'}
            </p>
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

      <footer className="fixed bottom-6 md:bottom-10 left-0 w-full px-6 md:px-8 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto scale-90 md:scale-100 origin-bottom">
          <div className="flex items-center gap-3 bg-white/[0.08] backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-2xl transition-all hover:border-white/20">
            <input 
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
              placeholder="Describe your environment... (e.g. golden hour forest)"
              disabled={isGenerating}
              className="flex-1 bg-transparent px-4 py-3 outline-none text-white text-sm md:text-base placeholder-white/20"
            />
            <button 
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || loading}
              className="bg-white/90 text-black px-4 md:px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition-all h-11 md:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                  <span className="hidden xs:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} /> 
                  <span className="hidden xs:inline">Generate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {resultImage && (
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-50 flex gap-2 md:gap-3 pointer-events-auto items-center">
          {/* Format badge */}
          <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-white/60 uppercase tracking-wider">
            {format === 'EXR' ? '.exr' : '.hdr'}
          </div>
          <button 
            onClick={handleReset}
            className="p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all text-white/70"
          >
            <X size={20} />
          </button>
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 md:p-3 bg-white text-black rounded-full hover:scale-105 transition-transform shadow-2xl disabled:opacity-50 flex items-center gap-2 px-4"
          >
            {isDownloading ? (
              <div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" />
            ) : (
              <Download size={20} />
            )}
            <span className="text-xs font-bold">Download {format === 'EXR' ? 'EXR' : 'HDR'}</span>
          </button>
        </div>
      )}
    </div>
  );
}