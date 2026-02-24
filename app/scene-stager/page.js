'use client';
import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Upload, Box, Image as ImageIcon, Cpu, X, Download, AlertCircle, Monitor, Smartphone, Square } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import dynamic from 'next/dynamic';

const Canvas = dynamic(() => import('@react-three/fiber').then(m => ({ default: m.Canvas })), { ssr: false });
const OrbitControls = dynamic(() => import('@react-three/drei').then(m => ({ default: m.OrbitControls })), { ssr: false });
const Stage = dynamic(() => import('@react-three/drei').then(m => ({ default: m.Stage })), { ssr: false });
const Center = dynamic(() => import('@react-three/drei').then(m => ({ default: m.Center })), { ssr: false });

function Model({ url, isFbx }) {
  const { useFBX, useGLTF } = require('@react-three/drei');
  const fbx = isFbx ? useFBX(url) : null;
  const { scene } = !isFbx ? useGLTF(url) : { scene: null };
  return <primitive object={isFbx ? fbx : scene} scale={isFbx ? 0.01 : 1} />;
}

export default function SceneStager() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [file, setFile] = useState(null);
  const [isFbx, setIsFbx] = useState(false);
  const [activeMode, setActiveMode] = useState('3d');
  const [resultImage, setResultImage] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('landscape');

  const handleUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    const extension = uploadedFile.name.split('.').pop().toLowerCase();
    setIsFbx(extension === 'fbx');
    setFile(URL.createObjectURL(uploadedFile));
    setResultImage(null);
  };

  const handleAutoPrompt = () => {
    const presets = [
      "High-end cinematic studio lighting, minimalist architecture, 8k resolution",
      "Modern luxury living room, sunset lighting, marble textures",
      "Cyberpunk street corner, neon signs, rainy asphalt, volumetric fog"
    ];
    setPrompt(presets[Math.floor(Math.random() * presets.length)]);
  };

  const captureCanvas = () => { const canvas = document.querySelector('canvas'); return canvas ? canvas.toDataURL('image/png') : null; };

  const blobToBase64 = async (blobUrl) => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(blob); });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(resultImage); const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'staged-scene.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { window.open(resultImage, '_blank'); }
  };

  const handleGenerate = async () => {
    if (!prompt || !file) return;
    setIsGenerating(true);
    try {
      const { checkCredits } = await import('@/lib/credits');
      await checkCredits(user.uid, 1);

      let inputImage = activeMode === '3d' ? captureCanvas() : await blobToBase64(file);
      const response = await fetch('/api/generate-scene', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: inputImage, prompt, aspectRatio }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      if (result.status === 'succeeded') {
        setResultImage(result.output[0]);
        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        await deductCredits(user.uid, 1);
        await saveGeneration({ outsetaUid: user.uid, toolName: 'Scene Stager', prompt, imageUrl: result.output[0], creditsUsed: 1 });
      } else { throw new Error('Generation failed. Please try a different prompt.'); }
    } catch (err) { alert(err.message || 'An error occurred during generation.'); }
    finally { setIsGenerating(false); }
  };

  const getAspectClass = () => {
    if (aspectRatio === 'portrait') return 'max-w-[350px] aspect-[9/16]';
    if (aspectRatio === 'square') return 'max-w-xl aspect-square';
    return 'max-w-4xl aspect-video';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden">
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 flex items-center justify-between">
        <button onClick={() => router.push('/tools')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md">
          <ArrowLeft size={18} /><span className="hidden sm:inline text-sm font-medium">Back to Tools</span>
        </button>
        <div className="flex bg-[#1a1a1a] p-1 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
          <button onClick={() => { setActiveMode('3d'); setFile(null); setResultImage(null); }} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeMode === '3d' ? 'bg-white text-black' : 'text-white/40'}`}><Box size={14} /> 3D Model</button>
          <button onClick={() => { setActiveMode('photo'); setFile(null); setResultImage(null); }} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeMode === 'photo' ? 'bg-white text-black' : 'text-white/40'}`}><ImageIcon size={14} /> Photo Basis</button>
        </div>
        <div className="w-[80px] sm:w-[120px]" />
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-24 pb-32">
        {!file ? (
          <div className="text-center px-6">
            <label className="cursor-pointer group flex flex-col items-center">
              <div className="w-20 h-20 bg-white/5 group-hover:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-white/20 transition-all">
                {activeMode === '3d' ? <Box size={32} className="text-white/40" /> : <ImageIcon size={32} className="text-white/40" />}
              </div>
              <p className="text-lg font-medium mb-2 uppercase tracking-tight">Upload {activeMode === '3d' ? '3D Asset' : 'Photo asset'}</p>
              <p className="text-[10px] text-white/20 font-bold tracking-[0.2em] uppercase">{activeMode === '3d' ? 'GLB • FBX • OBJ • GLTF' : 'PNG • SVG'}</p>
              <input type="file" className="hidden" onChange={handleUpload} accept={activeMode === '3d' ? ".glb,.gltf,.obj,.fbx" : ".png,.svg"} />
            </label>
          </div>
        ) : (
          <div className={`relative w-full transition-all duration-500 bg-neutral-900/30 rounded-3xl overflow-hidden border border-white/5 shadow-2xl ${getAspectClass()}`}>
            {activeMode === '3d' && !resultImage && mounted && (
              <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
                <Suspense fallback={null}>
                  <Stage environment="city" intensity={0.5}>
                    <Center><Model url={file} isFbx={isFbx} /></Center>
                  </Stage>
                </Suspense>
                <OrbitControls makeDefault />
              </Canvas>
            )}
            {(activeMode === 'photo' || resultImage) && <img src={resultImage || file} alt="Preview" className="w-full h-full object-contain p-4 sm:p-12" />}
            {resultImage && (
              <div className="absolute top-4 right-4 flex gap-2 z-50">
                <button onClick={() => setResultImage(null)} className="p-2 bg-black/60 hover:bg-black rounded-full border border-white/10 transition-all text-white"><X size={20} /></button>
                <button onClick={handleDownload} className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"><Download size={20} /></button>
              </div>
            )}
            {!resultImage && <button onClick={() => setFile(null)} className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-[10px] font-bold uppercase rounded-lg border border-white/10 transition-all">Remove</button>}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-50">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex bg-[#1a1a1a]/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
              <button onClick={() => setAspectRatio('landscape')} className={`p-2 rounded-lg transition-all flex items-center gap-2 ${aspectRatio === 'landscape' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}><Monitor size={16} /><span className="text-[10px] font-bold uppercase">16:9</span></button>
              <button onClick={() => setAspectRatio('square')} className={`p-2 rounded-lg transition-all flex items-center gap-2 ${aspectRatio === 'square' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}><Square size={14} /><span className="text-[10px] font-bold uppercase">1:1</span></button>
              <button onClick={() => setAspectRatio('portrait')} className={`p-2 rounded-lg transition-all flex items-center gap-2 ${aspectRatio === 'portrait' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}><Smartphone size={16} /><span className="text-[10px] font-bold uppercase">9:16</span></button>
            </div>
            {file && prompt && !isGenerating && !resultImage && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <AlertCircle size={14} className="text-blue-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Cost: 1 credit</p>
              </div>
            )}
          </div>
          <div className="w-full flex items-center gap-2 sm:gap-3 bg-[#1a1a1a] p-1.5 sm:p-2 rounded-2xl border border-white/10 shadow-2xl">
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={isGenerating} placeholder="Describe environment..." className="flex-1 bg-transparent px-3 py-2 sm:px-4 sm:py-3 outline-none text-white text-[16px] sm:text-base placeholder-neutral-500 min-w-0" onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} />
            <button onClick={handleAutoPrompt} disabled={isGenerating} className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 border border-white/10 transition-all"><Cpu size={16} /><span className="text-xs font-bold uppercase tracking-tighter">AI Suggest</span></button>
            <button onClick={handleGenerate} disabled={isGenerating || !file || loading} className="bg-white text-black px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-200 disabled:opacity-50 transition-all h-10 sm:h-12 shadow-xl">
              {isGenerating ? <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" /> : <><Sparkles size={18} /><span className="hidden xs:inline">Stage Scene</span></>}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}