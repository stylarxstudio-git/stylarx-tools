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

// Final compositor — runs once on Generate
function compositeToCanvas(imageSrc, settings) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { tileCount, tileRotation, tileSkewX, tileSkewY, edgeBlend, lightNorm, lightStrength, lightAngle, seamBlend } = settings;
      const tileSize = 1024;
      const cols = tileCount;
      const rows = tileCount;
      const total = cols * tileSize;
      const canvas = document.createElement('canvas');
      canvas.width = total;
      canvas.height = total;
      const ctx = canvas.getContext('2d');

      let seed = 7;
      const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * tileSize + tileSize / 2;
          const cy = row * tileSize + tileSize / 2;
          ctx.save();
          ctx.translate(cx, cy);
          // Per-tile rotation jitter based on tileRotation setting
          const rotRad = (tileRotation + (rand() * 2 - 1) * tileRotation * 0.5) * (Math.PI / 180);
          ctx.rotate(rotRad);
          // Per-tile skew
          ctx.transform(1, tileSkewY / 100, tileSkewX / 100, 1, 0, 0);
          const scale = tileSize * 1.08;
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
        g.addColorStop(0, `rgba(255,255,255,${s * 0.13})`);
        g.addColorStop(0.5, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${s * 0.15})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, total, total);
      }

      // Edge blend between tiles
      if (tileCount > 1 && edgeBlend > 0) {
        const bp = tileSize * edgeBlend;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x0 = col * tileSize, y0 = row * tileSize;
            if (col < cols - 1) {
              const gR = ctx.createLinearGradient(x0 + tileSize - bp, 0, x0 + tileSize + bp, 0);
              gR.addColorStop(0, 'rgba(0,0,0,0)');
              gR.addColorStop(0.5, `rgba(0,0,0,${edgeBlend * 0.7})`);
              gR.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gR;
              ctx.fillRect(x0 + tileSize - bp, y0, bp * 2, tileSize);
            }
            if (row < rows - 1) {
              const gB = ctx.createLinearGradient(0, y0 + tileSize - bp, 0, y0 + tileSize + bp);
              gB.addColorStop(0, 'rgba(0,0,0,0)');
              gB.addColorStop(0.5, `rgba(0,0,0,${edgeBlend * 0.7})`);
              gB.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gB;
              ctx.fillRect(x0, y0 + tileSize - bp, tileSize, bp * 2);
            }
          }
        }
      }

      // Seam blend — copy to temp first, can't draw canvas onto itself
      if (seamBlend > 0 && tileCount > 1) {
        const tmp = document.createElement('canvas');
        tmp.width = total; tmp.height = total;
        tmp.getContext('2d').drawImage(canvas, 0, 0);
        const half = tileSize / 2;
        ctx.globalAlpha = seamBlend * 0.45;
        ctx.drawImage(tmp, half, half, total - half, total - half, 0, 0, total - half, total - half);
        ctx.globalAlpha = 1;
      }

      resolve(canvas.toDataURL('image/png', 0.95));
    };
    img.src = imageSrc;
  });
}

const TABS = ['Grid', 'Angle', 'Light', 'Output'];

// Smooth slider — works with both mouse and touch drag
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

  const displayVal = step < 1
    ? (value * 100).toFixed(0) + (unit || '%')
    : `${value}${unit}`;

  return (
    <div className={`mb-5 transition-opacity select-none ${disabled ? 'opacity-25 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex justify-between text-[11px] mb-2">
        <span className="text-white/50 font-medium">{label}</span>
        <span className="text-white font-bold">{displayVal}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-5 flex items-center cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Track */}
        <div className="absolute w-full h-1.5 bg-white/10 rounded-full">
          <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
        </div>
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-lg border border-white/30"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
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

  // Grid / Tiling
  const [tileCount, setTileCount] = useState(1);
  const [edgeBlend, setEdgeBlend] = useState(0.05);
  const [seamBlend, setSeamBlend] = useState(0);

  // Angle — per-tile transforms
  const [tileRotation, setTileRotation] = useState(0);
  const [tileSkewX, setTileSkewX] = useState(0);
  const [tileSkewY, setTileSkewY] = useState(0);

  // Light
  const [lightNorm, setLightNorm] = useState(false);
  const [lightStrength, setLightStrength] = useState(40);
  const [lightAngle, setLightAngle] = useState(45);

  // Output / PBR
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
    if (sel === 1 && selectedMaps[k]) { alert('Keep at least one map selected'); return; }
    setSelectedMaps(p => ({ ...p, [k]: !p[k] }));
  };

  // ── Instant CSS tiling preview ───────────────────────────────────────────
  const renderTileGrid = () => {
    if (!uploadedImage) return null;
    const count = Math.max(1, tileCount);
    const size = 560;
    const cellPx = size / count;

    // To guarantee ZERO gaps when rotating: we render the image MUCH larger than
    // the cell (200% minimum) centered on the cell's center point, then clip to the cell.
    // The image center stays fixed, the large image rotates around it — corners can
    // never reach the cell edge because the image is always twice the cell size.
    // √2 * cellPx covers the diagonal at any angle, 200% is always safe.
    const oversize = 2.0; // 200% — completely gap-proof at any rotation angle
    const imgPx = cellPx * oversize;
    const imgOffset = -(imgPx - cellPx) / 2; // centers the oversized image in the cell

    const filterStr = lightNorm
      ? `contrast(${1 + lightStrength / 180}) brightness(${1 - lightStrength / 350})`
      : 'none';

    const tiles = [];
    let seed = 7;
    const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        // Each tile gets a random rotation within the user's range
        const rot = (rand() * 2 - 1) * tileRotation;

        tiles.push(
          <div
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: c * cellPx,
              top: r * cellPx,
              width: cellPx,
              height: cellPx,
              // clip — never let anything escape the cell boundary
              overflow: 'hidden',
              // These MUST be 0 — any margin/padding/border creates a gap
              margin: 0,
              padding: 0,
              border: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            {/* 
              The image is 200% the size of the cell, centered perfectly.
              When it rotates around its own center, it ALWAYS covers the full cell.
              The parent clip (overflow:hidden) cuts it to exactly the cell boundary.
              Result: zero gaps, zero black corners, at any rotation angle.
            */}
            <img
              src={uploadedImage}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                width: imgPx,
                height: imgPx,
                top: imgOffset,
                left: imgOffset,
                objectFit: 'cover',
                transformOrigin: 'center center',
                transform: `rotate(${rot}deg) skewX(${tileSkewX}deg) skewY(${tileSkewY}deg)`,
                filter: filterStr,
                transition: 'transform 0.03s linear, filter 0.03s linear',
                display: 'block',
                flexShrink: 0,
              }}
            />
            {edgeBlend > 0 && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                boxShadow: `inset 0 0 ${cellPx * edgeBlend * 1.2}px rgba(0,0,0,${Math.min(edgeBlend * 1.5, 0.85)})`,
              }} />
            )}
            {seamBlend > 0 && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${seamBlend * 0.55}) 100%)`,
              }} />
            )}
          </div>
        );
      }
    }

    return (
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        overflow: 'hidden',
        borderRadius: 14,
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        flexShrink: 0,
        // No gap properties anywhere on this element
        margin: 0,
        padding: 0,
      }}>
        {tiles}
      </div>
    );
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !user) { alert('Please upload an image and log in first'); return; }
    setIsGenerating(true);

    const composited = await compositeToCanvas(uploadedImage, {
      tileCount, tileRotation, tileSkewX, tileSkewY, edgeBlend, seamBlend,
      lightNorm, lightStrength, lightAngle,
    });
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
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Composited</p>
                    <img src={resultMaps.original} alt="Original" className="w-full rounded-lg" />
                  </div>
                )}
                {[
                  { key: 'normal', label: 'Normal', fn: 'pbr_normal.png' },
                  { key: 'height', label: 'Height', fn: 'pbr_height.png' },
                  { key: 'roughness', label: 'Roughness', fn: 'pbr_roughness.png' },
                  { key: 'ao', label: 'Ambient Occlusion', fn: 'pbr_ao.png' },
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
          <div className="w-full h-full flex items-center justify-center group">
            <div className="relative">
              {renderTileGrid()}
              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xl border border-white/10"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4">
              <button onClick={() => fileInputRef.current?.click()} className="group">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-5 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                  <Upload size={36} className="text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
                <p className="text-xl text-white/60 font-medium">Upload a texture</p>
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
        <aside className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-[#0f0f0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          {/* Tabs */}
          <div className="grid grid-cols-4 gap-0.5 bg-white/5 p-1 m-3 rounded-xl">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 px-4 pb-5" style={{ scrollbarWidth: 'none' }}>

            {/* GRID TAB */}
            {activeTab === 'Grid' && (
              <div>
                <p className="text-[10px] text-white/30 mb-4 leading-relaxed">
                  Repeat your texture in a grid. Use edge and seam controls to hide where tiles meet.
                </p>
                <Slider label="Repeat Count" value={tileCount} min={1} max={6} unit={tileCount === 1 ? ' (off)' : `×${tileCount}`} onChange={setTileCount} />
                <Slider label="Edge Softness" value={edgeBlend} min={0} max={0.4} step={0.01} unit="" onChange={setEdgeBlend} disabled={tileCount === 1} />
                <Slider label="Seam Dissolve" value={seamBlend} min={0} max={1} step={0.01} unit="" onChange={setSeamBlend} disabled={tileCount === 1} />
              </div>
            )}

            {/* ANGLE TAB */}
            {activeTab === 'Angle' && (
              <div>
                <p className="text-[10px] text-white/30 mb-4 leading-relaxed">
                  Each tile gets its own slight transform. Rotate or skew to break the repetition pattern and make the grid look natural.
                </p>
                <Slider label="Tile Rotation" value={tileRotation} min={0} max={180} unit="°" onChange={setTileRotation} disabled={tileCount === 1} />
                <Slider label="Horizontal Shear" value={tileSkewX} min={-30} max={30} unit="°" onChange={setTileSkewX} disabled={tileCount === 1} />
                <Slider label="Vertical Shear" value={tileSkewY} min={-30} max={30} unit="°" onChange={setTileSkewY} disabled={tileCount === 1} />
                {tileCount === 1 && (
                  <p className="text-[10px] text-white/30 mt-2 italic">Set Repeat Count above 1 to enable per-tile transforms.</p>
                )}
              </div>
            )}

            {/* LIGHT TAB */}
            {activeTab === 'Light' && (
              <div>
                <p className="text-[10px] text-white/30 mb-4 leading-relaxed">
                  Apply a smooth directional gradient across the whole sheet to simulate a single light source and remove uneven lighting from the source photo.
                </p>
                <Toggle label="Lighting Overlay" sub="Smooth directional shading" value={lightNorm} onChange={setLightNorm} />
                <Slider label="Intensity" value={lightStrength} min={0} max={100} unit="%" onChange={setLightStrength} disabled={!lightNorm} />
                <Slider label="Light Direction" value={lightAngle} min={0} max={360} unit="°" onChange={setLightAngle} disabled={!lightNorm} />
              </div>
            )}

            {/* OUTPUT TAB */}
            {activeTab === 'Output' && (
              <div>
                <p className="text-[10px] text-white/30 mb-4 leading-relaxed">
                  Choose which PBR maps to generate and at what resolution.
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">Maps</p>
                <div className="space-y-2 mb-5">
                  {Object.entries({ normal: 'Normal', height: 'Height', roughness: 'Roughness', ao: 'Ambient Occlusion' }).map(([key, label]) => (
                    <button key={key} onClick={() => toggleMap(key)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${selectedMaps[key] ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/5 opacity-40'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedMaps[key] ? 'border-white bg-white' : 'border-white/30'}`}>
                        {selectedMaps[key] && <Check size={11} className="text-black" />}
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-2">Resolution</p>
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {['1K', '2K', '4K', '8K'].map(res => (
                    <button key={res} onClick={() => setResolution(res)} className={`py-2 text-xs font-bold rounded-lg transition-all ${resolution === res ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                      {res}{res === '8K' && <span className="block text-[8px] opacity-50">+1cr</span>}
                    </button>
                  ))}
                </div>
                <Toggle label="Tileable Output" sub="Forces seamless edges (+1 credit)" value={pbSeamless} onChange={setPbSeamless} />
                <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
                  <span className="text-sm text-white/50 font-bold">Total</span>
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
              <button onClick={() => setResultMaps({ normal: null, height: null, roughness: null, ao: null, original: null })} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold">
                <X size={18} /><span>Reset</span>
              </button>
              <button onClick={handleDownloadAll} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold">
                <Package size={18} /><span>Download All (ZIP)</span>
              </button>
            </div>
          ) : (
            <button onClick={handleGenerate} disabled={!uploadedImage || isGenerating || loading} className="w-full py-3 sm:py-3.5 bg-white hover:bg-gray-100 text-black font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl">
              {isGenerating
                ? <><div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" /><span>Generating PBR Maps...</span></>
                : <><Sparkles size={18} /><span>Generate PBR Maps ({calculateCredits()} Credits)</span></>
              }
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}