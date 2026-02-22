'use client';
import { useState, useRef, Suspense } from 'react';
import { ArrowLeft, Sparkles, Download, X, Upload, Package, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Environment } from '@react-three/drei';
import * as THREE from 'three';

function MaterialPreview({ textureUrl }) {
  const texture = new THREE.TextureLoader().load(textureUrl);
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Sphere args={[2, 64, 64]}>
        <meshStandardMaterial map={texture} normalMap={texture} roughness={0.7} metalness={0.3} />
      </Sphere>
      <OrbitControls enableZoom autoRotate autoRotateSpeed={2} />
      <Environment preset="sunset" />
    </>
  );
}

// Final compositor — Logic fixed for individual rotation + cohesive skew
function compositeToCanvas(imageSrc, settings) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { tileCount, tileRotation, tileSkewX, tileSkewY, edgeBlend, lightNorm, lightStrength, lightAngle, seamBlend } = settings;
      const tileSize = 1024;
      const total = tileCount * tileSize;
      const canvas = document.createElement('canvas');
      canvas.width = total;
      canvas.height = total;
      const ctx = canvas.getContext('2d');

      // Individual tile drawing
      for (let row = 0; row < tileCount; row++) {
        for (let col = 0; col < tileCount; col++) {
          const cx = col * tileSize + tileSize / 2;
          const cy = row * tileSize + tileSize / 2;
          ctx.save();
          ctx.translate(cx, cy);
          
          // Uniform Rotation per tile (Box B)
          ctx.rotate((tileRotation * Math.PI) / 180);
          
          // Skewing the content inside the tile
          ctx.transform(1, tileSkewY / 100, tileSkewX / 100, 1, 0, 0);
          
          // Draw image slightly oversized to hide skew gaps
          const scale = tileSize * 1.5; 
          ctx.drawImage(img, -scale / 2, -scale / 2, scale, scale);
          ctx.restore();
        }
      }

      // Seam Dissolve Pass
      if (seamBlend > 0 && tileCount > 1) {
        const tmp = document.createElement('canvas');
        tmp.width = total; tmp.height = total;
        tmp.getContext('2d').drawImage(canvas, 0, 0);
        ctx.globalAlpha = seamBlend;
        ctx.drawImage(tmp, tileSize/2, tileSize/2, total, total, 0, 0, total, total);
        ctx.globalAlpha = 1;
      }

      // Global Light Pass (The Gradient)
      if (lightNorm && lightStrength > 0) {
        const rad = (lightAngle * Math.PI) / 180;
        const x0 = total/2 - Math.cos(rad) * total;
        const y0 = total/2 - Math.sin(rad) * total;
        const x1 = total/2 + Math.cos(rad) * total;
        const y1 = total/2 + Math.sin(rad) * total;
        
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        const s = lightStrength / 100;
        g.addColorStop(0, `rgba(255,255,255,${s * 0.2})`);
        g.addColorStop(0.5, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${s * 0.25})`);
        ctx.fillStyle = g;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, total, total);
        ctx.globalCompositeOperation = 'source-over';
      }

      resolve(canvas.toDataURL('image/png', 0.95));
    };
    img.src = imageSrc;
  });
}

const TABS = ['Grid', 'Angle', 'Light', 'Output'];

function Slider({ label, value, min, max, step = 1, unit = '', onChange, disabled = false }) {
  const trackRef = useRef();
  const getValueFromEvent = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, parseFloat(stepped.toFixed(10))));
  };
  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    trackRef.current.setPointerCapture(e.pointerId);
    onChange(getValueFromEvent(e.clientX));
  };
  const handlePointerMove = (e) => {
    if (disabled) return;
    if (e.buttons === 0 && e.pressure === 0) return;
    onChange(getValueFromEvent(e.clientX));
  };
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`mb-5 transition-opacity select-none ${disabled ? 'opacity-25 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex justify-between text-[11px] mb-2">
        <span className="text-white/50 font-medium">{label}</span>
        <span className="text-white font-bold">{step < 1 ? (value * 100).toFixed(0) + (unit || '%') : `${value}${unit}`}</span>
      </div>
      <div ref={trackRef} className="relative h-5 flex items-center cursor-pointer" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}>
        <div className="absolute w-full h-1.5 bg-white/10 rounded-full">
          <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="absolute w-4 h-4 bg-white rounded-full shadow-lg border border-white/30" style={{ left: `calc(${pct}% - 8px)` }} />
      </div>
    </div>
  );
}

function Toggle({ label, sub, value, onChange }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        {sub && <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ml-3 ${value ? 'bg-white' : 'bg-white/20'}`}>
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${value ? 'translate-x-6 bg-black' : 'bg-white/60'}`} />
      </button>
    </div>
  );
}

export default function ImageToPBR() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();

  const [uploadedImage, setUploadedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [activeTab, setActiveTab] = useState('Grid');
  const [showPreview, setShowPreview] = useState(false);

  const [tileCount, setTileCount] = useState(1);
  const [edgeBlend, setEdgeBlend] = useState(0.05);
  const [seamBlend, setSeamBlend] = useState(0);
  const [tileRotation, setTileRotation] = useState(0);
  const [tileSkewX, setTileSkewX] = useState(0);
  const [tileSkewY, setTileSkewY] = useState(0);
  const [lightNorm, setLightNorm] = useState(false);
  const [lightStrength, setLightStrength] = useState(40);
  const [lightAngle, setLightAngle] = useState(45);
  const [selectedMaps, setSelectedMaps] = useState({ normal: true, height: true, roughness: true, ao: true });
  const [resolution, setResolution] = useState('4K');
  const [pbSeamless, setPbSeamless] = useState(false);
  const [resultMaps, setResultMaps] = useState({ normal: null, height: null, roughness: null, ao: null, original: null });

  const calculateCredits = () => {
    let c = 2;
    if (resolution === '8K') c++;
    if (pbSeamless) c++;
    return c;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result);
      setResultMaps({ normal: null, height: null, roughness: null, ao: null, original: null });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleMap = (k) => {
    const sel = Object.values(selectedMaps).filter(Boolean).length;
    if (sel === 1 && selectedMaps[k]) return;
    setSelectedMaps(p => ({ ...p, [k]: !p[k] }));
  };

  const renderTileGrid = () => {
    if (!uploadedImage) return null;
    const count = Math.max(1, tileCount);
    const size = 560;
    const cellPx = size / count;

    const tiles = [];
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        tiles.push(
          <div key={`${r}-${c}`} style={{
            position: 'absolute',
            left: c * cellPx,
            top: r * cellPx,
            width: cellPx,
            height: cellPx,
            overflow: 'hidden'
          }}>
            <img src={uploadedImage} alt="" draggable={false} style={{
              width: '140%', // Oversized to prevent skew gaps
              height: '140%',
              position: 'absolute',
              top: '-20%',
              left: '-20%',
              objectFit: 'cover',
              transform: `rotate(${tileRotation}deg) skewX(${tileSkewX}deg) skewY(${tileSkewY}deg)`,
              transformOrigin: 'center center'
            }} />
            {edgeBlend > 0 && (
              <div style={{
                position: 'absolute', inset: 0,
                boxShadow: `inset 0 0 ${cellPx * edgeBlend}px rgba(0,0,0,0.8)`
              }} />
            )}
          </div>
        );
      }
    }

    return (
      <div style={{ position: 'relative', width: size, height: size, borderRadius: 14, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ position: 'absolute', inset: 0 }}>{tiles}</div>
        {/* Seam Dissolve Overlay Preview */}
        {seamBlend > 0 && count > 1 && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `url(${uploadedImage})`,
            backgroundSize: `${cellPx}px ${cellPx}px`,
            backgroundPosition: `${cellPx/2}px ${cellPx/2}px`,
            opacity: seamBlend,
            mixBlendMode: 'overlay'
          }} />
        )}
        {/* Light Overlay Preview */}
        {lightNorm && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(${lightAngle}deg, rgba(255,255,255,${lightStrength/200}), transparent, rgba(0,0,0,${lightStrength/150}))`,
            mixBlendMode: 'overlay'
          }} />
        )}
      </div>
    );
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !user) return;
    setIsGenerating(true);
    const composited = await compositeToCanvas(uploadedImage, {
      tileCount, tileRotation, tileSkewX, tileSkewY, edgeBlend, seamBlend,
      lightNorm, lightStrength, lightAngle,
    });
    const generatedMaps = { original: composited };
    try {
      if (selectedMaps.normal) {
        setGenerationProgress('Generating maps...');
        const res = await fetch('/api/generate-image-to-pbr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: composited, userId: user.uid, userEmail: user.email, step: 'normal', resolution, seamless: pbSeamless }) });
        const data = await res.json();
        if (data.status === 'succeeded') generatedMaps.normal = data.output;
      }
      setResultMaps(generatedMaps);
    } catch (err) { alert('Error'); } finally { setIsGenerating(false); setGenerationProgress(''); }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const fi = async (url, fn) => { const r = await fetch(url); const b = await r.blob(); zip.file(fn, b); };
    if (resultMaps.normal) await fi(resultMaps.normal, 'pbr_normal.png');
    if (resultMaps.original) await fi(resultMaps.original, 'pbr_original.png');
    saveAs(await zip.generateAsync({ type: 'blob' }), 'pbr_maps.zip');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {resultMaps.normal && showPreview ? (
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={null}><MaterialPreview textureUrl={resultMaps.normal} /></Suspense>
          </Canvas>
        ) : resultMaps.normal ? (
          <div className="w-full h-full overflow-auto p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
              {['original', 'normal'].map(m => resultMaps[m] && (
                <div key={m} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs text-white/60 mb-2 uppercase font-bold">{m}</p>
                  <img src={resultMaps[m]} alt={m} className="w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : uploadedImage ? (
          <div className="w-full h-full flex items-center justify-center group">
            <div className="relative">
              {renderTileGrid()}
              <button onClick={handleRemoveImage} className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xl border border-white/10"><X size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <button onClick={() => fileInputRef.current?.click()} className="group">
              <div className="w-28 h-28 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-white/10"><Upload size={36} className="text-white/40" /></div>
              <p className="text-xl text-white/60 font-medium">Upload a texture</p>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>
        )}
      </div>

      <nav className="p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button onClick={() => router.push('/tools')} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md">
          <ArrowLeft size={18} /><span className="text-sm font-medium">Back</span>
        </button>
      </nav>

      {uploadedImage && !resultMaps.normal && (
        <aside className="fixed top-6 right-6 z-50 w-80 bg-[#0f0f0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          <div className="grid grid-cols-4 gap-0.5 bg-white/5 p-1 m-3 rounded-xl">
            {TABS.map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>{tab}</button>))}
          </div>
          <div className="overflow-y-auto px-4 pb-5">
            {activeTab === 'Grid' && (
              <>
                <Slider label="Repeat Count" value={tileCount} min={1} max={6} unit={`×${tileCount}`} onChange={setTileCount} />
                <Slider label="Edge Softness" value={edgeBlend} min={0} max={0.4} step={0.01} onChange={setEdgeBlend} />
                <Slider label="Seam Dissolve" value={seamBlend} min={0} max={1} step={0.01} onChange={setSeamBlend} />
              </>
            )}
            {activeTab === 'Angle' && (
              <>
                <Slider label="Tile Rotation" value={tileRotation} min={0} max={180} unit="°" onChange={setTileRotation} />
                <Slider label="Horizontal Shear" value={tileSkewX} min={-30} max={30} unit="°" onChange={setTileSkewX} />
                <Slider label="Vertical Shear" value={tileSkewY} min={-30} max={30} unit="°" onChange={setTileSkewY} />
              </>
            )}
            {activeTab === 'Light' && (
              <>
                <Toggle label="Lighting Overlay" value={lightNorm} onChange={setLightNorm} />
                <Slider label="Intensity" value={lightStrength} min={0} max={100} onChange={setLightStrength} disabled={!lightNorm} />
                <Slider label="Light Direction" value={lightAngle} min={0} max={360} unit="°" onChange={setLightAngle} disabled={!lightNorm} />
              </>
            )}
          </div>
        </aside>
      )}

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-6 text-center">
        {resultMaps.normal ? (
          <div className="flex gap-3 justify-center">
             <button onClick={() => setResultMaps({ normal: null, original: null })} className="px-8 py-3.5 bg-white/10 text-white rounded-2xl font-bold">Reset</button>
             <button onClick={handleDownloadAll} className="px-8 py-3.5 bg-white text-black rounded-2xl font-bold">Download All</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={!uploadedImage || isGenerating} className="w-full py-3.5 bg-white text-black font-bold rounded-2xl">
            {isGenerating ? 'Generating...' : `Generate PBR Maps (${calculateCredits()} Credits)`}
          </button>
        )}
      </footer>
    </div>
  );
}