'use client';
import { useState, Suspense, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Download, X, Upload, GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

// Safari fix — dynamic imports prevent Three.js from crashing at module load time
const Canvas = dynamic(() => import('@react-three/fiber').then(m => ({ default: m.Canvas })), { ssr: false });
const OrbitControls = dynamic(() => import('@react-three/drei').then(m => ({ default: m.OrbitControls })), { ssr: false });
const Sphere = dynamic(() => import('@react-three/drei').then(m => ({ default: m.Sphere })), { ssr: false });
const Environment = dynamic(() => import('@react-three/drei').then(m => ({ default: m.Environment })), { ssr: false });

function HDRIPreview({ textureUrl }) {
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    const isEXR = textureUrl.toLowerCase().endsWith('.exr');
    if (isEXR) {
      import('three/examples/jsm/loaders/EXRLoader').then(({ EXRLoader }) => {
        new EXRLoader().load(textureUrl, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; setTexture(t); });
      });
    } else {
      new THREE.TextureLoader().load(textureUrl, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; setTexture(t); });
    }
  }, [textureUrl]);
  if (!texture) return null;
  return (
    <>
      <Sphere args={[500, 60, 40]} scale={[-1, 1, 1]}>
        <meshBasicMaterial map={texture} side={THREE.BackSide} />
      </Sphere>
      <Environment map={texture} />
    </>
  );
}

export default function ImageToHDRI() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();
  const panelRef = useRef();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [uploadedImage, setUploadedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultHDRI, setResultHDRI] = useState(null);
  const [format, setFormat] = useState('EXR');
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotateSpeed, setRotateSpeed] = useState(0.5);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => { setPanelPosition({ x: window.innerWidth - 320, y: 120 }); }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { setUploadedImage(event.target.result); setResultHDRI(null); };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => { setUploadedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleGenerate = async () => {
    if (!uploadedImage || !user) { alert('Please upload an image and log in first'); return; }
    setIsGenerating(true);
    try {
      const { checkCredits } = await import('@/lib/credits');
      await checkCredits(user.uid, 1);

      const response = await fetch('/api/generate-image-to-hdri', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadedImage, format, userId: user.uid, userEmail: user.email }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.status === 'succeeded') {
        setResultHDRI(data.output[0]);
        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        await deductCredits(user.uid, 1);
        await saveGeneration({ outsetaUid: user.uid, toolName: 'Image to HDRI', prompt: `Convert to ${format}`, imageUrl: data.output[0], creditsUsed: 1 });
      } else { throw new Error('Generation failed'); }
    } catch (err) { alert(err.message || 'Error generating HDRI'); }
    finally { setIsGenerating(false); }
  };

  const handleDownload = async () => {
    if (!resultHDRI) return;
    try {
      const response = await fetch(resultHDRI); const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `hdri-${Date.now()}.${format.toLowerCase()}`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { window.open(resultHDRI, '_blank'); }
  };

  const handleMouseDown = (e) => { if (e.target.closest('.drag-handle')) { setIsDragging(true); setDragOffset({ x: e.clientX - panelPosition.x, y: e.clientY - panelPosition.y }); } };
  const handleTouchStart = (e) => { if (e.target.closest('.drag-handle')) { setIsDragging(true); const touch = e.touches[0]; setDragOffset({ x: touch.clientX - panelPosition.x, y: touch.clientY - panelPosition.y }); } };
  const handleMouseMove = (e) => { if (isDragging) setPanelPosition({ x: Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.x)), y: Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y)) }); };
  const handleTouchMove = (e) => { if (isDragging) { const touch = e.touches[0]; setPanelPosition({ x: Math.max(0, Math.min(window.innerWidth - 280, touch.clientX - dragOffset.x)), y: Math.max(0, Math.min(window.innerHeight - 200, touch.clientY - dragOffset.y)) }); } };
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove); window.addEventListener('touchend', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('touchend', handleMouseUp); };
    }
  }, [isDragging, dragOffset, panelPosition]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      <div className="fixed inset-0 z-0">
        {resultHDRI && mounted ? (
          <Canvas shadows camera={{ position: [0, 0, 0.1], fov: 75 }} gl={{ antialias: true }}>
            <Suspense fallback={null}><HDRIPreview textureUrl={resultHDRI} /></Suspense>
            <OrbitControls makeDefault enableZoom={true} enablePan={false} autoRotate={autoRotate} autoRotateSpeed={rotateSpeed} minDistance={0.1} maxDistance={490} zoomSpeed={3} rotateSpeed={0.5} />
          </Canvas>
        ) : uploadedImage ? (
          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] group">
            <div className="relative">
              <img src={uploadedImage} alt="Preview" className="max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl" />
              <button onClick={handleRemoveImage} className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xl border border-white/10 shadow-lg"><X size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
            <div className="text-center px-4">
              <button onClick={() => fileInputRef.current?.click()} className="group">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                  <Upload size={32} className="sm:w-[44px] sm:h-[44px] text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
                <p className="text-lg sm:text-xl text-white/60 font-medium">Click to upload image</p>
                <p className="text-xs text-white/30 mt-1.5">PNG, JPG up to 10MB</p>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}
      </div>

      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button onClick={() => router.push('/tools')} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md">
          <ArrowLeft size={18} /><span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50">
        <div className="text-right mb-1.5"><span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">Export Format</span></div>
        <div className="flex items-center gap-1.5 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-full px-1 py-1 shadow-2xl">
          {['HDRI', 'EXR'].map(f => (
            <button key={f} onClick={() => setFormat(f)} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${format === f ? 'bg-white text-black' : 'text-white/50 hover:text-white/80'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div ref={panelRef} style={{ left: `${panelPosition.x}px`, top: `${panelPosition.y}px`, position: 'fixed', touchAction: 'none' }} className="z-50 w-60 sm:w-64" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
        <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <div className="drag-handle flex items-center justify-center py-1.5 border-b border-white/10 cursor-move"><GripVertical size={16} className="text-white/30" /></div>
          <div className="p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/70">Auto Rotate</span>
              <button onClick={() => setAutoRotate(!autoRotate)} className={`w-10 h-5 rounded-full transition-all relative ${autoRotate ? 'bg-white' : 'bg-white/20'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${autoRotate ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/60'}`} />
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white/70">Rotation Speed</span>
                <span className="font-bold text-white text-[11px]">{rotateSpeed.toFixed(1)}x</span>
              </div>
              <input type="range" min="0.1" max="3" step="0.1" value={rotateSpeed} onChange={(e) => setRotateSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white" />
            </div>
          </div>
        </div>
      </div>

      <footer className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 sm:px-6">
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent pb-2">
          {resultHDRI ? (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setResultHDRI(null)} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"><X size={18} /><span>Reset</span></button>
              <button onClick={handleDownload} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"><Download size={18} /><span>Download {format}</span></button>
            </div>
          ) : (
            <button onClick={handleGenerate} disabled={!uploadedImage || isGenerating || loading} className="w-full py-3 sm:py-3.5 bg-white hover:bg-gray-100 text-black font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl">
              {isGenerating ? <><div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-black border-t-transparent animate-spin rounded-full" /><span>Converting to HDRI...</span></> : <><Sparkles size={18} /><span>Convert to HDRI (1 Credit)</span></>}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}