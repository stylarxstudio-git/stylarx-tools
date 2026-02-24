'use client';
import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { ArrowLeft, Sparkles, Download, X, Upload, Package, Check, Shuffle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

const Canvas = dynamic(() => import('@react-three/fiber').then(m => ({ default: m.Canvas })), { ssr: false });
const OrbitControls = dynamic(() => import('@react-three/drei').then(m => ({ default: m.OrbitControls })), { ssr: false });
const Sphere = dynamic(() => import('@react-three/drei').then(m => ({ default: m.Sphere })), { ssr: false });
const Environment = dynamic(() => import('@react-three/drei').then(m => ({ default: m.Environment })), { ssr: false });

function getMinScale(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
}

function getSkewScale(skewXDeg, skewYDeg) {
  const tx = Math.tan((Math.abs(skewXDeg) * Math.PI) / 180);
  const ty = Math.tan((Math.abs(skewYDeg) * Math.PI) / 180);
  return 1 + tx + ty;
}

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

function compositeToCanvas(imageSrc, settings) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const {
        tileCount, tileRotation, tileSkewX, tileSkewY,
        edgeBlend, seamBlend, lightNorm, lightStrength, lightAngle,
        individualRotation, tileRotations,
      } = settings;
      const tileSize = 1024;
      const total = tileCount * tileSize;
      const canvas = document.createElement('canvas');
      canvas.width = total; canvas.height = total;
      const ctx = canvas.getContext('2d');

      for (let row = 0; row < tileCount; row++) {
        for (let col = 0; col < tileCount; col++) {
          const cx = col * tileSize + tileSize / 2;
          const cy = row * tileSize + tileSize / 2;
          const angle = individualRotation ? (tileRotations[row * tileCount + col] || 0) : tileRotation;
          const rotScale = getMinScale(angle);
          const skewScale = getSkewScale(tileSkewX, tileSkewY);
          const drawSize = tileSize * rotScale * skewScale;
          ctx.save();
          ctx.beginPath();
          ctx.rect(col * tileSize, row * tileSize, tileSize, tileSize);
          ctx.clip();
          ctx.translate(cx, cy);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.transform(1, tileSkewY / 100, tileSkewX / 100, 1, 0, 0);
          ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
          ctx.restore();
        }
      }

      if (seamBlend > 0 && tileCount > 1) {
        const tmp = document.createElement('canvas');
        tmp.width = total; tmp.height = total;
        const tctx = tmp.getContext('2d');
        for (let row = -1; row <= tileCount; row++) {
          for (let col = -1; col <= tileCount; col++) {
            const ox = col * tileSize + tileSize / 2;
            const oy = row * tileSize + tileSize / 2;
            const idx = ((row % tileCount) + tileCount) % tileCount * tileCount + ((col % tileCount) + tileCount) % tileCount;
            const angle = individualRotation ? (tileRotations[idx] || 0) : tileRotation;
            const drawSize = tileSize * getMinScale(angle) * getSkewScale(tileSkewX, tileSkewY);
            tctx.save();
            tctx.translate(ox + tileSize / 2, oy + tileSize / 2);
            tctx.rotate((angle * Math.PI) / 180);
            tctx.transform(1, tileSkewY / 100, tileSkewX / 100, 1, 0, 0);
            tctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            tctx.restore();
          }
        }
        ctx.globalAlpha = Math.min(seamBlend * 1.5, 1);
        ctx.drawImage(tmp, 0, 0);
        ctx.globalAlpha = 1;
      }

      if (lightNorm && lightStrength > 0) {
        const rad = (lightAngle * Math.PI) / 180;
        const x0 = total / 2 - Math.cos(rad) * total;
        const y0 = total / 2 - Math.sin(rad) * total;
        const x1 = total / 2 + Math.cos(rad) * total;
        const y1 = total / 2 + Math.sin(rad) * total;
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
  const getVal = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    return Math.min(max, Math.max(min, parseFloat((Math.round(raw / step) * step).toFixed(10))));
  };
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`mb-5 select-none transition-opacity ${disabled ? 'opacity-25 pointer-events-none' : ''}`}>
      <div className="flex justify-between text-[11px] mb-2">
        <span className="text-white/50 font-medium">{label}</span>
        <span className="text-white font-bold">{step < 1 ? (value * 100).toFixed(0) + (unit || '%') : `${value}${unit}`}</span>
      </div>
      <div ref={trackRef} className="relative h-5 flex items-center cursor-pointer"
        onPointerDown={(e) => { if (disabled) return; e.preventDefault(); trackRef.current.setPointerCapture(e.pointerId); onChange(getVal(e.clientX)); }}
        onPointerMove={(e) => { if (disabled || (e.buttons === 0 && e.pressure === 0)) return; onChange(getVal(e.clientX)); }}
      >
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  const [individualRotation, setIndividualRotation] = useState(false);
  const [tileRotations, setTileRotations] = useState([]);

  const randomizeTileRotations = useCallback(() => {
    const total = tileCount * tileCount;
    setTileRotations(Array.from({ length: total }, () => Math.floor(Math.random() * 360)));
  }, [tileCount]);

  useEffect(() => {
    if (individualRotation) randomizeTileRotations();
  }, [tileCount, individualRotation, randomizeTileRotations]);

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

  const getTileStyle = (tileIdx) => {
    const angle = individualRotation ? (tileRotations[tileIdx] || 0) : tileRotation;
    const rotScale = getMinScale(angle);
    const skewScale = getSkewScale(tileSkewX, tileSkewY);
    const totalScale = rotScale * skewScale;
    return {
      width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0,
      transform: `scale(${totalScale}) rotate(${angle}deg) skewX(${tileSkewX}deg) skewY(${tileSkewY}deg)`,
      transformOrigin: 'center center',
    };
  };

  const renderTileGrid = () => {
    if (!uploadedImage) return null;
    const count = Math.max(1, tileCount);
    const PREVIEW_SIZE = 560;
    const cellPx = PREVIEW_SIZE / count;
    return (
      <div style={{ position: 'relative', width: PREVIEW_SIZE, height: PREVIEW_SIZE, borderRadius: 14, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', flexShrink: 0 }}>
        {Array.from({ length: count * count }).map((_, idx) => {
          const row = Math.floor(idx / count);
          const col = idx % count;
          return (
            <div key={idx} style={{ position: 'absolute', left: col * cellPx, top: row * cellPx, width: cellPx, height: cellPx, overflow: 'hidden' }}>
              <img src={uploadedImage} alt="" draggable={false} style={getTileStyle(idx)} />
              {edgeBlend > 0 && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: `inset 0 0 ${cellPx * edgeBlend * 2}px rgba(0,0,0,0.75)` }} />}
            </div>
          );
        })}
        {seamBlend > 0 && count > 1 && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `url(${uploadedImage})`, backgroundSize: `${cellPx}px ${cellPx}px`, backgroundPosition: `${cellPx / 2}px ${cellPx / 2}px`, opacity: seamBlend, mixBlendMode: 'overlay' }} />
        )}
        {lightNorm && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(${lightAngle}deg, rgba(255,255,255,${lightStrength / 200}), transparent, rgba(0,0,0,${lightStrength / 150}))`, mixBlendMode: 'overlay' }} />
        )}
      </div>
    );
  };

  const generateRoughnessMap = (imageSrc) => new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const lum = 0.299 * d.data[i] + 0.587 * d.data[i+1] + 0.114 * d.data[i+2];
        const rough = Math.min(255, Math.max(0, 255 - ((lum - 128) * 1.4 + 128)));
        d.data[i] = d.data[i+1] = d.data[i+2] = rough;
      }
      ctx.putImageData(d, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = imageSrc;
  });

  const generateAOMap = (imageSrc) => new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const lum = 0.299 * d.data[i] + 0.587 * d.data[i+1] + 0.114 * d.data[i+2];
        const ao = Math.min(255, Math.max(0, Math.pow(lum / 255, 1.8) * 255));
        d.data[i] = d.data[i+1] = d.data[i+2] = ao;
      }
      ctx.putImageData(d, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = imageSrc;
  });

  const depthToNormal = (depthSrc) => new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.width, h = img.height;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const src = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const get = (x, y) => {
        x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y));
        return src.data[(y * w + x) * 4] / 255;
      };
      const strength = 4.0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dX = (-get(x-1,y-1) - 2*get(x-1,y) - get(x-1,y+1) + get(x+1,y-1) + 2*get(x+1,y) + get(x+1,y+1)) * strength;
          const dY = (-get(x-1,y-1) - 2*get(x,y-1) - get(x+1,y-1) + get(x-1,y+1) + 2*get(x,y+1) + get(x+1,y+1)) * strength;
          const len = Math.sqrt(dX*dX + dY*dY + 1);
          const i = (y * w + x) * 4;
          out.data[i]   = Math.round((-dX / len * 0.5 + 0.5) * 255);
          out.data[i+1] = Math.round((-dY / len * 0.5 + 0.5) * 255);
          out.data[i+2] = Math.round((1   / len * 0.5 + 0.5) * 255);
          out.data[i+3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = depthSrc;
  });

  const handleGenerate = async () => {
    if (!uploadedImage || !user) return;
    setIsGenerating(true);

    try {
      const { checkCredits } = await import('@/lib/credits');
      await checkCredits(user.uid, calculateCredits());

      const composited = await compositeToCanvas(uploadedImage, {
        tileCount, tileRotation, tileSkewX, tileSkewY, edgeBlend, seamBlend,
        lightNorm, lightStrength, lightAngle, individualRotation, tileRotations,
      });

      const compressed = await new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const maxSize = 1024;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.85));
        };
        img.src = composited;
      });

      const generatedMaps = { original: composited };

      setGenerationProgress('Generating depth map...');
      const depthRes = await fetch('/api/generate-image-to-pbr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed, step: 'depth' }),
      });
      const depthData = await depthRes.json();
      if (depthData.status === 'succeeded') {
        generatedMaps.height = depthData.output;
        setGenerationProgress('Converting to normal map...');
        generatedMaps.normal = await depthToNormal(depthData.output);
      }

      setGenerationProgress('Generating roughness map...');
      generatedMaps.roughness = await generateRoughnessMap(composited);

      setGenerationProgress('Generating AO map...');
      generatedMaps.ao = await generateAOMap(composited);

      setResultMaps(generatedMaps);

      const { deductCredits } = await import('@/lib/credits');
      const { saveGeneration } = await import('@/lib/generations');
      await deductCredits(user.uid, calculateCredits());
      await saveGeneration({
        outsetaUid: user.uid, toolName: 'Image to PBR', prompt: 'Texture conversion',
        imageUrl: generatedMaps.normal || generatedMaps.original, creditsUsed: calculateCredits(),
      });
    } catch (err) {
      console.error(err);
      alert('Error generating PBR maps: ' + err.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const addToZip = async (url, filename) => {
      if (!url) return;
      if (url.startsWith('data:')) { zip.file(filename, url.split(',')[1], { base64: true }); }
      else { const r = await fetch(url); zip.file(filename, await r.blob()); }
    };
    await addToZip(resultMaps.original,  'pbr_albedo.png');
    await addToZip(resultMaps.normal,    'pbr_normal.png');
    await addToZip(resultMaps.height,    'pbr_height.png');
    await addToZip(resultMaps.roughness, 'pbr_roughness.png');
    await addToZip(resultMaps.ao,        'pbr_ao.png');
    saveAs(await zip.generateAsync({ type: 'blob' }), 'pbr_maps.zip');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {resultMaps.normal && showPreview && mounted ? (
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={null}><MaterialPreview textureUrl={resultMaps.normal} /></Suspense>
          </Canvas>
        ) : resultMaps.normal ? (
          <div className="w-full h-full overflow-auto p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { key: 'original', label: 'Albedo' },
                { key: 'normal', label: 'Normal' },
                { key: 'height', label: 'Height' },
                { key: 'roughness', label: 'Roughness' },
                { key: 'ao', label: 'AO' },
              ].map(({ key, label }) => resultMaps[key] && (
                <div key={key} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs text-white/60 mb-2 uppercase font-bold">{label}</p>
                  <img src={resultMaps[key]} alt={label} className="w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : uploadedImage ? (
          <div className="w-full h-full flex items-center justify-center group">
            <div className="relative">
              {renderTileGrid()}
              <button onClick={handleRemoveImage} className="absolute -top-3 -right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xl border border-white/10"><X size={16} /></button>
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
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>{tab}</button>
            ))}
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
                <Toggle label="Individual Rotation" sub="Each tile gets its own random angle" value={individualRotation} onChange={(v) => { setIndividualRotation(v); if (v) randomizeTileRotations(); }} />
                {individualRotation ? (
                  <button onClick={randomizeTileRotations} className="w-full mb-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/70 flex items-center justify-center gap-2 transition-all">
                    <Shuffle size={13} /> Randomize All Angles
                  </button>
                ) : (
                  <Slider label="Tile Rotation" value={tileRotation} min={0} max={360} unit="°" onChange={setTileRotation} />
                )}
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
            {activeTab === 'Output' && (
              <>
                <div className="mb-5">
                  <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['2K', '4K', '8K'].map(r => (
                      <button key={r} onClick={() => setResolution(r)} className={`py-2 text-xs font-bold rounded-xl border transition-all ${resolution === r ? 'bg-white text-black border-white' : 'bg-white/5 text-white/50 border-white/10'}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <Toggle label="Seamless Tiling" sub="Blend edges for tileable output" value={pbSeamless} onChange={setPbSeamless} />
              </>
            )}
          </div>
        </aside>
      )}

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-6 text-center">
        {resultMaps.normal ? (
          <div className="flex gap-3 justify-center">
            <button onClick={() => setResultMaps({ original: null, normal: null, height: null, roughness: null, ao: null })} className="px-8 py-3.5 bg-white/10 text-white rounded-2xl font-bold border border-white/10">Reset</button>
            <button onClick={handleDownloadAll} className="px-8 py-3.5 bg-white text-black rounded-2xl font-bold flex items-center gap-2"><Package size={16} /> Download All</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={!uploadedImage || isGenerating || loading} className="w-full py-3.5 bg-white text-black font-bold rounded-2xl disabled:opacity-50 transition-all">
            {isGenerating ? generationProgress || 'Generating...' : `Generate PBR Maps (${calculateCredits()} Credits)`}
          </button>
        )}
      </footer>
    </div>
  );
}