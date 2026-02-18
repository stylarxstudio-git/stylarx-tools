'use client';
import { useState, Suspense, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Environment } from '@react-three/drei';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { ArrowLeft, Sparkles, Download, X, Upload, RotateCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import * as THREE from 'three';

function HDRIPreview({ textureUrl }) {
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

export default function ImageToHDRI() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();
  const controlsRef = useRef();
  
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultHDRI, setResultHDRI] = useState(null);
  const [format, setFormat] = useState('EXR');
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
      setResultHDRI(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !user) return;
    setIsGenerating(true);
    try {
      const startRes = await fetch('/api/generate-image-to-hdri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: uploadedImage,
          format,
          userId: user.uid,
          userEmail: user.email,
        }),
      });
      let prediction = await startRes.json();
      if (prediction.error) throw new Error(prediction.error);
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const checkRes = await fetch('/api/generate-image-to-hdri', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: prediction.predictionId }),
        });
        prediction = await checkRes.json();
        if (prediction.error) throw new Error(prediction.error);
      }
      if (prediction.status === 'succeeded') {
        setResultHDRI(prediction.output[0]);
      }
    } catch (err) {
      alert(err.message || 'Error generating HDRI');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      
      {/* 1. FULL SCREEN VIEWPORT (Behind everything) */}
      <div className="absolute inset-0 z-0">
        {resultHDRI ? (
          <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
            <Suspense fallback={null}>
              <HDRIPreview textureUrl={resultHDRI} />
            </Suspense>
            <OrbitControls 
              ref={controlsRef} 
              makeDefault 
              autoRotate={autoRotate} 
              autoRotateSpeed={rotationSpeed} 
            />
          </Canvas>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#080808]">
             {!uploadedImage ? (
                <div onClick={() => fileInputRef.current?.click()} className="group cursor-pointer flex flex-col items-center">
                  <div className="w-24 h-24 bg-white/[0.03] group-hover:bg-white/[0.08] rounded-[40px] flex items-center justify-center mb-6 border border-white/5 transition-all duration-500 scale-100 group-hover:scale-110">
                    <Upload size={32} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tighter uppercase opacity-40 group-hover:opacity-100 transition-opacity">Drop image for HDRI</h2>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                </div>
             ) : (
                <div className="relative group max-w-4xl max-h-[70vh] px-6">
                  <img src={uploadedImage} alt="Preview" className="w-full h-full object-contain rounded-[32px] shadow-2xl border border-white/10" />
                  <button onClick={() => setUploadedImage(null)} className="absolute top-4 right-10 p-2 bg-black/60 hover:bg-red-500 rounded-full border border-white/10 transition-all opacity-0 group-hover:opacity-100">
                    <X size={16} />
                  </button>
                </div>
             )}
          </div>
        )}
      </div>

      {/* 2. TOP HUD */}
      <nav className="p-6 fixed top-0 left-0 w-full z-50 flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => router.push('/tools')} 
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-[#0A0A0A]/60 hover:bg-white/10 rounded-full border border-white/10 backdrop-blur-2xl transition-all text-sm font-medium"
        >
          <ArrowLeft size={18} />
          <span>Back to Tools</span>
        </button>

        {resultHDRI && (
          <div className="pointer-events-auto flex gap-3">
             <button onClick={() => controlsRef.current?.reset()} className="p-3 bg-[#0A0A0A]/60 hover:bg-white/10 rounded-full border border-white/10 backdrop-blur-2xl transition-all"><RotateCw size={20} /></button>
             <a href={resultHDRI} download className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black uppercase text-xs rounded-full hover:bg-emerald-400 transition-all shadow-xl">
                <Download size={18} />
                <span>Export HDRI</span>
             </a>
          </div>
        )}
      </nav>

      {/* 3. FLOATING ACTION DOCK (Replaced Prompt Bar) */}
      <footer className="fixed bottom-10 left-0 w-full z-50 flex flex-col items-center gap-4 px-6 pointer-events-none">
        
        {/* Settings Row */}
        {uploadedImage && (
          <div className="pointer-events-auto flex items-center gap-3 bg-[#0A0A0A]/80 backdrop-blur-3xl p-1.5 rounded-[22px] border border-white/10 shadow-2xl">
            <div className="flex bg-black/40 rounded-xl p-1">
              {['EXR', 'HDR'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setFormat(f)} 
                  className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${format === f ? 'bg-white text-black' : 'text-white/20 hover:text-white/40'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Rotation Switch */}
            <div className="flex items-center gap-3 px-2">
              <button 
                onClick={() => setAutoRotate(!autoRotate)}
                className={`w-9 h-5 rounded-full relative transition-all ${autoRotate ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${autoRotate ? 'translate-x-4' : ''}`} />
              </button>
              <input 
                type="range" min="0.1" max="3" step="0.1" 
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                className="w-24 h-1 bg-white/10 rounded-full appearance-none accent-emerald-500 hidden sm:block"
              />
            </div>
          </div>
        )}

        {/* Generate Button Dock */}
        <div className="w-full max-w-sm pointer-events-auto">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !uploadedImage || loading}
            className={`w-full py-4 rounded-[24px] font-black uppercase tracking-tighter text-sm flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl
              ${isGenerating ? 'bg-white/10 text-white/40 cursor-wait' : 'bg-white text-black hover:bg-emerald-400 hover:scale-[1.02] active:scale-95'}
              ${!uploadedImage ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}
            `}
          >
            {isGenerating ? (
              <RotateCw size={18} className="animate-spin" />
            ) : (
              <>
                <Sparkles size={18} />
                <span>Process HDRI Environment</span>
                <div className="px-2 py-0.5 bg-black/10 rounded text-[9px] border border-black/5">1 CREDIT</div>
              </>
            )}
          </button>
        </div>

        {/* Status Text (Only when no image) */}
        {!uploadedImage && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-full backdrop-blur-md opacity-40">
            <AlertCircle size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting input asset</span>
          </div>
        )}
      </footer>

    </div>
  );
}