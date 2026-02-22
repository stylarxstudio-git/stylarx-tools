'use client';
import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { ArrowLeft, Sparkles, Download, X, Upload, Package, Check, Grid } from 'lucide-react';
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
      <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={2} />
      <Environment preset="sunset" />
    </>
  );
}

// ─── Canvas compositor ────────────────────────────────────────────────────────
// lightAngle: 0-360 degrees — direction the "sun" comes from across the sheet
// edgeBlend: 0-1 — how much to feather tile borders
// rotationJitter: 0-45 degrees — per-tile rotation randomness
function buildTiledCanvas(imageSrc, { tileCount, rotationJitter, lightAngle, edgeBlend }) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const tileSize = 1024;
      const total = tileCount * tileSize;
      const canvas = document.createElement('canvas');
      canvas.width = total;
      canvas.height = total;
      const ctx = canvas.getContext('2d');

      // Seeded pseudo-random so same settings = same result (no flickering)
      let seed = 42;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
      };

      for (let row = 0; row < tileCount; row++) {
        for (let col = 0; col < tileCount; col++) {
          const cx = col * tileSize + tileSize / 2;
          const cy = row * tileSize + tileSize / 2;

          ctx.save();
          ctx.translate(cx, cy);

          // Rotation jitter — deterministic per tile
          const angle = (rand() * 2 - 1) * rotationJitter * (Math.PI / 180);
          ctx.rotate(angle);

          const scale = tileSize * 1.06; // slightly oversized to hide rotation gaps
          ctx.drawImage(img, -scale / 2, -scale / 2, scale, scale);
          ctx.restore();
        }
      }

      // ── Even directional light pass ──────────────────────────────────────
      // Instead of random per-tile brightness, paint ONE smooth gradient
      // across the entire sheet at the chosen light angle. This simulates
      // a single distant light source hitting the tiled surface evenly.
      if (lightAngle !== null && lightAngle !== undefined) {
        const rad = (lightAngle * Math.PI) / 180;
        // gradient goes from the "lit" side to the "shadow" side
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);
        const x0 = total / 2 - dx * total * 0.7;
        const y0 = total / 2 - dy * total * 0.7;
        const x1 = total / 2 + dx * total * 0.7;
        const y1 = total / 2 + dy * total * 0.7;

        const lightGrad = ctx.createLinearGradient(x0, y0, x1, y1);
        lightGrad.addColorStop(0, 'rgba(255,255,255,0.10)'); // lit side — slight brighten
        lightGrad.addColorStop(0.5, 'rgba(0,0,0,0)');        // midpoint — neutral
        lightGrad.addColorStop(1, 'rgba(0,0,0,0.12)');       // shadow side — slight darken

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, total, total);
      }

      // ── Edge blend pass ──────────────────────────────────────────────────
      // Feather each tile border with a soft gradient to hide seam lines
      if (edgeBlend > 0) {
        ctx.globalCompositeOperation = 'source-over';
        for (let row = 0; row < tileCount; row++) {
          for (let col = 0; col < tileCount; col++) {
            const x0 = col * tileSize;
            const y0 = row * tileSize;
            const blendPx = tileSize * edgeBlend * 0.5;

            // right seam
            if (col < tileCount - 1) {
              const gR = ctx.createLinearGradient(x0 + tileSize - blendPx, 0, x0 + tileSize + blendPx, 0);
              gR.addColorStop(0, 'rgba(0,0,0,0)');
              gR.addColorStop(0.5, 'rgba(0,0,0,0.3)');
              gR.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gR;
              ctx.fillRect(x0 + tileSize - blendPx, y0, blendPx * 2, tileSize);
            }

            // bottom seam
            if (row < tileCount - 1) {
              const gB = ctx.createLinearGradient(0, y0 + tileSize - blendPx, 0, y0 + tileSize + blendPx);
              gB.addColorStop(0, 'rgba(0,0,0,0)');
              gB.addColorStop(0.5, 'rgba(0,0,0,0.3)');
              gB.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gB;
              ctx.fillRect(x0, y0 + tileSize - blendPx, tileSize, blendPx * 2);
            }
          }
        }
      }

      resolve(canvas.toDataURL('image/png', 0.95));
    };
    img.src = imageSrc;
  });
}

export default function ImageToPBR() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();
  const debounceRef = useRef(null);

  const [uploadedImage, setUploadedImage] = useState(null);
  const [tiledPreview, setTiledPreview] = useState(null);
  const [isCompositing, setIsCompositing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Tiling settings
  const [tileCount, setTileCount] = useState(1);
  const [rotationJitter, setRotationJitter] = useState(5);
  const [lightAngle, setLightAngle] = useState(45);
  const [edgeBlend, setEdgeBlend] = useState(0.15);

  const [selectedMaps, setSelectedMaps] = useState({
    normal: true, height: true, roughness: true, ao: true,
  });
  const [resolution, setResolution] = useState('4K');
  const [seamless, setSeamless] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [resultMaps, setResultMaps] = useState({
    normal: null, height: null, roughness: null, ao: null, original: null,
  });

  // Debounced compositor — only fires 300ms after the user stops moving a slider
  const scheduleComposite = useCallback((image, settings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsCompositing(true);
    debounceRef.current = setTimeout(async () => {
      if (settings.tileCount <= 1) {
        setTiledPreview(image);
        setIsCompositing(false);
        return;
      }
      const result = await buildTiledCanvas(image, settings);
      setTiledPreview(result);
      setIsCompositing(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (!uploadedImage) { setTiledPreview(null); return; }
    scheduleComposite(uploadedImage, { tileCount, rotationJitter, lightAngle, edgeBlend });
  }, [uploadedImage, tileCount, rotationJitter, lightAngle, edgeBlend]);

  const calculateCredits = () => {
    let credits = 2;
    if (resolution === '8K') credits += 1;
    if (seamless) credits += 1;
    return credits;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
      setResultMaps({ normal: null, height: null, roughness: null, ao: null, original: null });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setTiledPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleMap = (mapName) => {
    const currentlySelected = Object.values(selectedMaps).filter(Boolean).length;
    if (currentlySelected === 1 && selectedMaps[mapName]) {
      alert('You must select at least one map!');
      return;
    }
    setSelectedMaps(prev => ({ ...prev, [mapName]: !prev[mapName] }));
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !user) {
      alert('Please upload an image and log in first');
      return;
    }
    const imageToSend = tiledPreview || uploadedImage;
    setIsGenerating(true);
    const generatedMaps = { original: imageToSend };

    try {
      if (selectedMaps.normal) {
        setGenerationProgress('Generating normal map...');
        const res = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageToSend, userId: user.uid, userEmail: user.email, step: 'normal', resolution, seamless }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.status === 'succeeded') generatedMaps.normal = data.output;
      }

      if (selectedMaps.height) {
        setGenerationProgress('Generating height map...');
        const res = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageToSend, step: 'height', resolution, seamless }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.status === 'succeeded') generatedMaps.height = data.output;
      }

      if (selectedMaps.roughness) {
        setGenerationProgress('Generating roughness map...');
        const res = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: generatedMaps.height || imageToSend, step: 'roughness' }),
        });
        const data = await res.json();
        if (data.output) generatedMaps.roughness = data.output;
      }

      if (selectedMaps.ao) {
        setGenerationProgress('Generating AO map...');
        const res = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: generatedMaps.height || imageToSend, step: 'ao' }),
        });
        const data = await res.json();
        if (data.output) generatedMaps.ao = data.output;
      }

      setResultMaps(generatedMaps);

      const { deductCredits } = await import('@/lib/credits');
      const { saveGeneration } = await import('@/lib/generations');
      const creditsUsed = calculateCredits();
      await deductCredits(user.uid, creditsUsed);
      await saveGeneration({
        outsetaUid: user.uid,
        toolName: 'Image to PBR',
        prompt: `PBR maps (${resolution}${seamless ? ', Seamless' : ''}${tileCount > 1 ? `, ${tileCount}×${tileCount} Tiled` : ''})`,
        imageUrl: generatedMaps.normal || generatedMaps.height || imageToSend,
        creditsUsed,
      });
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
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch { window.open(url, '_blank'); }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    try {
      const fetchImage = async (url, filename) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return { filename, blob };
      };
      const downloads = [];
      if (resultMaps.normal) downloads.push(fetchImage(resultMaps.normal, 'pbr_normal_map.png'));
      if (resultMaps.height) downloads.push(fetchImage(resultMaps.height, 'pbr_height_map.png'));
      if (resultMaps.roughness) downloads.push(fetchImage(resultMaps.roughness, 'pbr_roughness_map.png'));
      if (resultMaps.ao) downloads.push(fetchImage(resultMaps.ao, 'pbr_ao_map.png'));
      if (resultMaps.original) downloads.push(fetchImage(resultMaps.original, 'pbr_original.png'));
      const results = await Promise.all(downloads);
      results.forEach(({ filename, blob }) => zip.file(filename, blob));
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'pbr_maps.zip');
    } catch { alert('Error creating ZIP file'); }
  };

  const tilingEnabled = tileCount > 1;

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">

      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {resultMaps.normal && showPreview ? (
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={null}>
              <MaterialPreview textureUrl={resultMaps.normal} />
            </Suspense>
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
                  { key: 'normal', label: 'Normal Map', filename: 'pbr_normal_map.png' },
                  { key: 'height', label: 'Height Map', filename: 'pbr_height_map.png' },
                  { key: 'roughness', label: 'Roughness Map', filename: 'pbr_roughness_map.png' },
                  { key: 'ao', label: 'AO Map', filename: 'pbr_ao_map.png' },
                ].map(({ key, label, filename }) => resultMaps[key] && (
                  <div key={key} className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">{label}</p>
                    <img src={resultMaps[key]} alt={label} className="w-full rounded-lg" />
                    <button
                      onClick={() => handleDownloadSingle(resultMaps[key], filename)}
                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
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
              {isCompositing ? (
                <div className="flex flex-col items-center gap-3">
                  {/* Show previous preview faded while recomputing */}
                  {tiledPreview && (
                    <img src={tiledPreview} alt="Preview" className="max-w-2xl max-h-[70vh] rounded-2xl shadow-2xl object-cover opacity-40 transition-opacity" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-7 w-7 border-2 border-white/40 border-t-white animate-spin rounded-full" />
                  </div>
                </div>
              ) : (
                <img
                  src={tiledPreview || uploadedImage}
                  alt="Tiled Preview"
                  className="max-w-2xl max-h-[70vh] rounded-2xl shadow-2xl object-cover transition-opacity duration-300"
                />
              )}
              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xl border border-white/10 shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4">
              <button onClick={() => fileInputRef.current?.click()} className="group">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                  <Upload size={32} className="sm:w-[44px] sm:h-[44px] text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
                <p className="text-lg sm:text-xl text-white/60 font-medium">Click to upload texture</p>
                <p className="text-xs text-white/30 mt-1.5">JPG, PNG, WEBP up to 10MB</p>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}
      </div>

      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button onClick={() => router.push('/tools')} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {/* SETTINGS PANEL */}
      {uploadedImage && !resultMaps.normal && (
        <aside
          className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-5 max-h-[90vh] overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
        >

          {/* ── TILING ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Grid size={13} className="text-white/50" />
              <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Tiling</p>
            </div>

            {/* Tile count — slider */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-white/40 mb-2">
                <span>Tile Count</span>
                <span className="text-white font-bold">{tileCount === 1 ? 'Off' : `${tileCount}×${tileCount}`}</span>
              </div>
              <input
                type="range" min="1" max="6" step="1"
                value={tileCount}
                onChange={e => setTileCount(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[9px] text-white/20 mt-1">
                <span>Off</span><span>2×2</span><span>3×3</span><span>4×4</span><span>5×5</span><span>6×6</span>
              </div>
            </div>

            {/* Rotation jitter */}
            <div className={`mb-4 transition-opacity ${tilingEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div className="flex justify-between text-[10px] text-white/40 mb-2">
                <span>Rotation Randomness</span>
                <span className="text-white font-bold">{rotationJitter}°</span>
              </div>
              <input
                type="range" min="0" max="45" step="1"
                value={rotationJitter}
                onChange={e => setRotationJitter(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[9px] text-white/20 mt-1">
                <span>None</span><span>Subtle</span><span>Strong</span>
              </div>
            </div>

            {/* Light angle — even directional shading across whole sheet */}
            <div className={`mb-4 transition-opacity ${tilingEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div className="flex justify-between text-[10px] text-white/40 mb-2">
                <span>Light Direction</span>
                <span className="text-white font-bold">{lightAngle}°</span>
              </div>
              <input
                type="range" min="0" max="360" step="1"
                value={lightAngle}
                onChange={e => setLightAngle(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[9px] text-white/20 mt-1">
                <span>← Left</span><span>Top</span><span>Right →</span>
              </div>
            </div>

            {/* Edge blend */}
            <div className={`transition-opacity ${tilingEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div className="flex justify-between text-[10px] text-white/40 mb-2">
                <span>Edge Blend</span>
                <span className="text-white font-bold">{Math.round(edgeBlend * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="0.4" step="0.01"
                value={edgeBlend}
                onChange={e => setEdgeBlend(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[9px] text-white/20 mt-1">
                <span>Sharp</span><span>Soft</span><span>Heavy</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* ── MAP SELECTION ── */}
          <div>
            <p className="text-xs text-white/60 mb-3 uppercase tracking-wider font-bold">Select Maps</p>
            <div className="space-y-2">
              {Object.entries({ normal: 'Normal Map', height: 'Height Map', roughness: 'Roughness Map', ao: 'AO Map' }).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleMap(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${selectedMaps[key] ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/5 opacity-50'}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedMaps[key] ? 'border-white bg-white' : 'border-white/30'}`}>
                    {selectedMaps[key] && <Check size={14} className="text-black" />}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── RESOLUTION ── */}
          <div>
            <p className="text-xs text-white/60 mb-3 uppercase tracking-wider font-bold">Resolution</p>
            <div className="grid grid-cols-4 gap-2">
              {['1K', '2K', '4K', '8K'].map(res => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${resolution === res ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  {res}{res === '8K' && <span className="text-[8px] block">+1</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ── SEAMLESS ── */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <div>
              <p className="text-sm font-bold">Seamless/Tileable</p>
              <p className="text-xs text-white/40">+1 credit</p>
            </div>
            <button
              onClick={() => setSeamless(!seamless)}
              className={`w-12 h-6 rounded-full transition-all relative ${seamless ? 'bg-white' : 'bg-white/20'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${seamless ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white/60'}`} />
            </button>
          </div>

          {/* ── TOTAL ── */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <span className="text-sm font-bold text-white/70">Total Cost:</span>
            <span className="text-2xl font-black">{calculateCredits()} Credits</span>
          </div>
        </aside>
      )}

      {resultMaps.normal && (
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="fixed top-6 right-6 z-50 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 rounded-full text-sm font-bold transition-all"
        >
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
              <button
                onClick={() => setResultMaps({ normal: null, height: null, roughness: null, ao: null, original: null })}
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <X size={18} /><span>Reset</span>
              </button>
              <button
                onClick={handleDownloadAll}
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <Package size={18} /><span>Download All (ZIP)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!uploadedImage || isGenerating || isCompositing || loading}
              className="w-full py-3 sm:py-3.5 bg-white hover:bg-gray-100 text-black font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white shadow-2xl"
            >
              {isGenerating ? (
                <><div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" /><span>Generating PBR Maps...</span></>
              ) : isCompositing ? (
                <><div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" /><span>Updating Preview...</span></>
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