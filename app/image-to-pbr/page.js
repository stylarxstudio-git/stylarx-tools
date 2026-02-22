'use client';
import { useState, useRef, Suspense, useCallback } from 'react';
import { ArrowLeft, Sparkles, Download, X, Upload, Package, Check, Layers, Blend, Grid2x2, ScanLine, Crop } from 'lucide-react';
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

// ─── Final canvas compositor (runs once on Generate) ─────────────────────────
function compositeImage(imageSrc, settings) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { tileCount, rotation, skewX, skewY, cropX, cropY, cropSize,
              seamless, seamWidth, lightNorm, lightStrength, lightAngle, edgeBlend } = settings;

      const tileSize = 1024;
      const total = tileCount > 1 ? tileCount * tileSize : tileSize;
      const canvas = document.createElement('canvas');
      canvas.width = total;
      canvas.height = total;
      const ctx = canvas.getContext('2d');

      // Seeded rand for reproducible rotation jitter
      let seed = 1337;
      const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

      const draws = tileCount > 1 ? tileCount : 1;
      for (let row = 0; row < draws; row++) {
        for (let col = 0; col < draws; col++) {
          const cx = col * tileSize + tileSize / 2;
          const cy = row * tileSize + tileSize / 2;
          ctx.save();
          ctx.translate(cx, cy);
          // Small per-tile rotation jitter
          ctx.rotate((rand() * 2 - 1) * 8 * (Math.PI / 180));
          const scale = tileSize * 1.06;
          ctx.drawImage(img, -scale / 2, -scale / 2, scale, scale);
          ctx.restore();
        }
      }

      // Directional light pass
      if (lightNorm && lightStrength > 0) {
        const rad = (lightAngle * Math.PI) / 180;
        const dx = Math.cos(rad), dy = Math.sin(rad);
        const x0 = total / 2 - dx * total * 0.7, y0 = total / 2 - dy * total * 0.7;
        const x1 = total / 2 + dx * total * 0.7, y1 = total / 2 + dy * total * 0.7;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        const s = lightStrength / 100;
        g.addColorStop(0, `rgba(255,255,255,${s * 0.12})`);
        g.addColorStop(0.5, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${s * 0.14})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, total, total);
      }

      // Edge blend between tiles
      if (tileCount > 1 && edgeBlend > 0) {
        for (let row = 0; row < tileCount; row++) {
          for (let col = 0; col < tileCount; col++) {
            const x0 = col * tileSize, y0 = row * tileSize;
            const bp = tileSize * edgeBlend * 0.5;
            if (col < tileCount - 1) {
              const gR = ctx.createLinearGradient(x0 + tileSize - bp, 0, x0 + tileSize + bp, 0);
              gR.addColorStop(0, 'rgba(0,0,0,0)'); gR.addColorStop(0.5, 'rgba(0,0,0,0.28)'); gR.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gR; ctx.fillRect(x0 + tileSize - bp, y0, bp * 2, tileSize);
            }
            if (row < tileCount - 1) {
              const gB = ctx.createLinearGradient(0, y0 + tileSize - bp, 0, y0 + tileSize + bp);
              gB.addColorStop(0, 'rgba(0,0,0,0)'); gB.addColorStop(0.5, 'rgba(0,0,0,0.28)'); gB.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gB; ctx.fillRect(x0, y0 + tileSize - bp, tileSize, bp * 2);
            }
          }
        }
      }

      resolve(canvas.toDataURL('image/png', 0.95));
    };
    img.src = imageSrc;
  });
}

const TABS = ['Perspective', 'Seamless', 'Blend', 'Tiling'];

export default function ImageToPBR() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();

  const [uploadedImage, setUploadedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [activeTab, setActiveTab] = useState('Tiling');
  const [showPreview, setShowPreview] = useState(false);

  // ── Perspective ──
  const [rotation, setRotation] = useState(0);
  const [skewX, setSkewX] = useState(0);
  const [skewY, setSkewY] = useState(0);

  // ── Seamless ──
  const [seamless, setSeamless] = useState(false);
  const [seamWidth, setSeamWidth] = useState(10);

  // ── Blend / Lighting ──
  const [lightNorm, setLightNorm] = useState(false);
  const [lightStrength, setLightStrength] = useState(45);
  const [lightAngle, setLightAngle] = useState(45);

  // ── Tiling ──
  const [tileCount, setTileCount] = useState(1);
  const [edgeBlend, setEdgeBlend] = useState(0.15);

  // ── Crop ──
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropSize, setCropSize] = useState(100);

  // ── PBR settings ──
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
    if (sel === 1 && selectedMaps[k]) { alert('Select at least one map!'); return; }
    setSelectedMaps(p => ({ ...p, [k]: !p[k] }));
  };

  // CSS transform string — instant, no canvas needed for preview
  const previewTransform = `rotate(${rotation}deg) skewX(${skewX}deg) skewY(${skewY}deg)`;

  // Tile repeat via CSS background for instant tiling preview
  const tileStyle = tileCount > 1 ? {
    backgroundImage: uploadedImage ? `url(${uploadedImage})` : 'none',
    backgroundSize: `${100 / tileCount}% ${100 / tileCount}%`,
    backgroundRepeat: 'repeat',
    width: '600px',
    height: '600px',
    transform: previewTransform,
    filter: lightNorm ? `contrast(${1 + lightStrength / 200})` : 'none',
  } : null;

  const handleGenerate = async () => {
    if (!uploadedImage || !user) { alert('Please upload an image and log in first'); return; }

    setIsGenerating(true);

    // Run compositor once to get final image
    const settings = { tileCount, rotation, skewX, skewY, cropX, cropY, cropSize, seamless, seamWidth, lightNorm, lightStrength, lightAngle, edgeBlend };
    const composited = await compositeImage(uploadedImage, settings);
    const generatedMaps = { original: composited };

    try {
      if (selectedMaps.normal) {
        setGenerationProgress('Generating normal map...');
        const res = await fetch('/api/generate-image-to-pbr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: composited, userId: user.uid, userEmail: user.email, step: 'normal', resolution, seamless: pbSeamless }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.status === 'succeeded') generatedMaps.normal = data.output;
      }
      if (selectedMaps.height) {
        setGenerationProgress('Generating height map...');
        const res = await fetch('/api/generate-image-to-pbr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: composited, step: 'height', resolution, seamless: pbSeamless }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.status === 'succeeded') generatedMaps.height = data.output;
      }
      if (selectedMaps.roughness) {
        setGenerationProgress('Generating roughness map...');
        const res = await fetch('/api/generate-image-to-pbr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: generatedMaps.height || composited, step: 'roughness' }) });
        const data = await res.json();
        if (data.output) generatedMaps.roughness = data.output;
      }
      if (selectedMaps.ao) {
        setGenerationProgress('Generating AO map...');
        const res = await fetch('/api/generate-image-to-pbr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: generatedMaps.height || composited, step: 'ao' }) });
        const data = await res.json();
        if (data.output) generatedMaps.ao = data.output;
      }

      setResultMaps(generatedMaps);
      const { deductCredits } = await import('@/lib/credits');
      const { saveGeneration } = await import('@/lib/generations');
      const creditsUsed = calculateCredits();
      await deductCredits(user.uid, creditsUsed);
      await saveGeneration({ outsetaUid: user.uid, toolName: 'Image to PBR', prompt: `PBR maps (${resolution})`, imageUrl: generatedMaps.normal || composited, creditsUsed });
      setGenerationProgress('');
    } catch (err) {
      alert(err.message || 'Error generating PBR maps');
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSingle = async (url, filename) => {
    try {
      const r = await fetch(url); const blob = await r.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(blobUrl); document.body.removeChild(a);
    } catch { window.open(url, '_blank'); }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    try {
      const fi = async (url, fn) => { const r = await fetch(url); const b = await r.blob(); return { fn, b }; };
      const dl = [];
      if (resultMaps.normal) dl.push(fi(resultMaps.normal, 'pbr_normal.png'));
      if (resultMaps.height) dl.push(fi(resultMaps.height, 'pbr_height.png'));
      if (resultMaps.roughness) dl.push(fi(resultMaps.roughness, 'pbr_roughness.png'));
      if (resultMaps.ao) dl.push(fi(resultMaps.ao, 'pbr_ao.png'));
      if (resultMaps.original) dl.push(fi(resultMaps.original, 'pbr_original.png'));
      const res = await Promise.all(dl);
      res.forEach(({ fn, b }) => zip.file(fn, b));
      saveAs(await zip.generateAsync({ type: 'blob' }), 'pbr_maps.zip');
    } catch { alert('Error creating ZIP'); }
  };

  const Slider = ({ label, value, min, max, step = 1, unit = '', onChange, disabled = false }) => (
    <div className={`mb-4 transition-opacity ${disabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-white/50 font-medium">{label}</span>
        <span className="text-white font-bold">{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
      />
    </div>
  );

  const Toggle = ({ label, sub, value, onChange }) => (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        {sub && <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${value ? 'bg-white' : 'bg-white/20'}`}>
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${value ? 'translate-x-6 bg-black' : 'bg-white/60'}`} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">

      {/* MAIN VIEW */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {resultMaps.normal && showPreview ? (
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={null}><MaterialPreview textureUrl={resultMaps.normal} /></Suspense>
          </Canvas>
        ) : resultMaps.normal ? (
          <div className="w-full h-full overflow-auto p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {resultMaps.original && (
                  <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Original</p>
                    <img src={resultMaps.original} alt="Original" className="w-full rounded-lg" />
                  </div>
                )}
                {[
                  { key: 'normal', label: 'Normal Map', fn: 'pbr_normal.png' },
                  { key: 'height', label: 'Height Map', fn: 'pbr_height.png' },
                  { key: 'roughness', label: 'Roughness', fn: 'pbr_roughness.png' },
                  { key: 'ao', label: 'AO Map', fn: 'pbr_ao.png' },
                ].map(({ key, label, fn }) => resultMaps[key] && (
                  <div key={key} className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">{label}</p>
                    <img src={resultMaps[key]} alt={label} className="w-full rounded-lg" />
                    <button onClick={() => handleDownloadSingle(resultMaps[key], fn)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : uploadedImage ? (
          <div className="w-full h-full flex items-center justify-center group overflow-hidden">
            {tileCount > 1 ? (
              /* Instant CSS tiling preview — zero delay */
              <div style={tileStyle} className="rounded-xl shadow-2xl overflow-hidden" />
            ) : (
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="max-w-2xl max-h-[72vh] rounded-2xl shadow-2xl object-cover transition-all duration-150"
                  style={{
                    transform: previewTransform,
                    filter: lightNorm ? `contrast(${1 + lightStrength / 200}) brightness(${1 - lightStrength / 400})` : 'none',
                    objectPosition: `${cropX}% ${cropY}%`,
                  }}
                />
                <button onClick={handleRemoveImage} className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xl border border-white/10">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4">
              <button onClick={() => fileInputRef.current?.click()} className="group">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-5 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                  <Upload size={36} className="text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
                <p className="text-lg sm:text-xl text-white/60 font-medium">Click to upload texture</p>
                <p className="text-xs text-white/30 mt-1.5">JPG, PNG, WEBP up to 10MB</p>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}
      </div>

      {/* BACK */}
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button onClick={() => router.push('/tools')} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md">
          <ArrowLeft size={18} /><span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {/* SETTINGS PANEL */}
      {uploadedImage && !resultMaps.normal && (
        <aside className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          {/* Tab bar */}
          <div className="grid grid-cols-2 gap-px bg-white/5 p-1 m-3 rounded-xl">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 px-4 pb-4" style={{ scrollbarWidth: 'none' }}>

            {/* ── PERSPECTIVE ── */}
            {activeTab === 'Perspective' && (
              <div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-[11px] text-white/50 leading-relaxed">
                  <span className="text-white font-bold">Perspective:</span> Adjust rotation and skew to fix images taken at an angle.
                </div>
                <Slider label="Rotation" value={rotation} min={-45} max={45} unit="°" onChange={setRotation} />
                <Slider label="Horizontal Skew" value={skewX} min={-45} max={45} unit="°" onChange={setSkewX} />
                <Slider label="Vertical Skew" value={skewY} min={-45} max={45} unit="°" onChange={setSkewY} />
                <button
                  onClick={() => { setRotation(0); setSkewX(0); setSkewY(0); }}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all border border-white/10 mb-4"
                >
                  Reset Alignment
                </button>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Crop</p>
                  <Slider label="Position X" value={cropX} min={0} max={100} unit="%" onChange={setCropX} />
                  <Slider label="Position Y" value={cropY} min={0} max={100} unit="%" onChange={setCropY} />
                  <Slider label="Crop Size" value={cropSize} min={10} max={100} unit="%" onChange={setCropSize} />
                </div>
              </div>
            )}

            {/* ── SEAMLESS ── */}
            {activeTab === 'Seamless' && (
              <div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-[11px] text-white/50 leading-relaxed">
                  <span className="text-white font-bold">Seamless Tiling:</span> Makes your texture tile perfectly without visible seams — essential for repeating patterns on large surfaces.
                </div>
                <Toggle label="Enable Seamless Tiling" value={seamless} onChange={setSeamless} />
                <Slider label="Seam Width" value={seamWidth} min={1} max={50} unit="%" onChange={setSeamWidth} disabled={!seamless} />
                <div className="border-t border-white/10 pt-4 mt-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Crop</p>
                  <Slider label="Position X" value={cropX} min={0} max={100} unit="%" onChange={setCropX} />
                  <Slider label="Position Y" value={cropY} min={0} max={100} unit="%" onChange={setCropY} />
                  <Slider label="Crop Size" value={cropSize} min={10} max={100} unit="%" onChange={setCropSize} />
                </div>
              </div>
            )}

            {/* ── BLEND ── */}
            {activeTab === 'Blend' && (
              <div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-[11px] text-white/50 leading-relaxed">
                  <span className="text-white font-bold">Lighting:</span> Removes gradients and shading to make texture uniform — flattens uneven illumination while preserving color and detail.
                </div>
                <Toggle label="Enable Lighting Normalization" sub="Flattens uneven illumination" value={lightNorm} onChange={setLightNorm} />
                <Slider label="Normalization Strength" value={lightStrength} min={0} max={100} unit="%" onChange={setLightStrength} disabled={!lightNorm} />
                <Slider label="Light Direction" value={lightAngle} min={0} max={360} unit="°" onChange={setLightAngle} disabled={!lightNorm} />
                <div className="border-t border-white/10 pt-4 mt-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Crop</p>
                  <Slider label="Position X" value={cropX} min={0} max={100} unit="%" onChange={setCropX} />
                  <Slider label="Position Y" value={cropY} min={0} max={100} unit="%" onChange={setCropY} />
                  <Slider label="Crop Size" value={cropSize} min={10} max={100} unit="%" onChange={setCropSize} />
                </div>
              </div>
            )}

            {/* ── TILING ── */}
            {activeTab === 'Tiling' && (
              <div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-[11px] text-white/50 leading-relaxed">
                  <span className="text-white font-bold">Tiling:</span> Repeats your texture in a grid. Rotation randomness and edge blending hide the repeat pattern naturally.
                </div>
                <Slider label="Tile Count" value={tileCount} min={1} max={6} unit={tileCount === 1 ? ' (Off)' : `×${tileCount}`} onChange={setTileCount} />
                <Slider label="Edge Blend" value={edgeBlend} min={0} max={0.4} step={0.01} unit="%" onChange={setEdgeBlend} disabled={tileCount === 1} />
                <div className="border-t border-white/10 pt-4 mt-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">PBR Maps</p>
                  <div className="space-y-2 mb-4">
                    {Object.entries({ normal: 'Normal Map', height: 'Height Map', roughness: 'Roughness', ao: 'AO Map' }).map(([key, label]) => (
                      <button key={key} onClick={() => toggleMap(key)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${selectedMaps[key] ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/5 opacity-50'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedMaps[key] ? 'border-white bg-white' : 'border-white/30'}`}>
                          {selectedMaps[key] && <Check size={11} className="text-black" />}
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Resolution</p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {['1K', '2K', '4K', '8K'].map(res => (
                      <button key={res} onClick={() => setResolution(res)} className={`py-2 text-xs font-bold rounded-lg transition-all ${resolution === res ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                        {res}{res === '8K' && <span className="text-[8px] block opacity-60">+1cr</span>}
                      </button>
                    ))}
                  </div>
                  <Toggle label="Seamless Output" sub="+1 credit" value={pbSeamless} onChange={setPbSeamless} />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm font-bold text-white/60">Total Cost</span>
                  <span className="text-2xl font-black">{calculateCredits()} Credits</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {resultMaps.normal && (
        <button onClick={() => setShowPreview(!showPreview)} className="fixed top-6 right-6 z-50 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 rounded-full text-sm font-bold transition-all">
          {showPreview ? 'Show Maps' : '3D Preview'}
        </button>
      )}

      {isGenerating && generationProgress && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl">
          <p className="text-sm font-medium">{generationProgress}</p>
        </div>
      )}

      <footer className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 sm:px-6">
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent pb-2">
          {resultMaps.normal ? (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setResultMaps({ normal: null, height: null, roughness: null, ao: null, original: null })} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base">
                <X size={18} /><span>Reset</span>
              </button>
              <button onClick={handleDownloadAll} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base">
                <Package size={18} /><span>Download All (ZIP)</span>
              </button>
            </div>
          ) : (
            <button onClick={handleGenerate} disabled={!uploadedImage || isGenerating || loading} className="w-full py-3 sm:py-3.5 bg-white hover:bg-gray-100 text-black font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl">
              {isGenerating ? (
                <><div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" /><span>Generating PBR Maps...</span></>
              ) : (
                <><Sparkles size={18} /><span>Generate PBR Maps ({calculateCredits()} Credits)</span></>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}