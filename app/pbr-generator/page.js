'use client';
import { useState, Suspense, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Download, X, Package, Wand2, Info, ChevronDown } from 'lucide-react';
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

function CustomDropdown({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div ref={dropdownRef} className="relative">
      <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">{label}</label>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-left focus:outline-none focus:border-white/30 flex items-center justify-between">
        <span>{value}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50" style={{ scrollbarWidth: 'none' }}>
          {options.map((option) => (
            <button key={option} type="button" onClick={() => { onChange(option); setIsOpen(false); }} className={`w-full px-3 py-2 text-sm text-left transition-all ${value === option ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>{option}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PBRGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [showSeamlessInfo, setShowSeamlessInfo] = useState(false);
  const [resolution, setResolution] = useState('4K');
  const [seamless, setSeamless] = useState(true);
  const [style, setStyle] = useState('Photorealistic');
  const [category, setCategory] = useState('Auto');
  const [showPreview, setShowPreview] = useState(false);
  const [resultMaps, setResultMaps] = useState({ albedo: null, normal: null, height: null, roughness: null, ao: null });

  const calculateCredits = () => {
    let credits = 3;
    if (resolution === '8K (+1 credit)') credits += 1;
    if (seamless) credits += 1;
    return credits;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) { alert('Please enter a material description and log in first'); return; }
    setIsGenerating(true);
    const generatedMaps = {};
    try {
      const { checkCredits } = await import('@/lib/credits');
      await checkCredits(user.uid, calculateCredits());

      setGenerationProgress('Generating base texture...');
      const albedoRes = await fetch('/api/generate-pbr-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, userId: user.uid, userEmail: user.email, step: 'albedo', resolution, seamless, style, category }) });
      const albedoData = await albedoRes.json();
      if (albedoData.error) throw new Error(albedoData.error);
      generatedMaps.albedo = albedoData.output[0];

      setGenerationProgress('Generating normal map...');
      const normalRes = await fetch('/api/generate-pbr-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'normal', albedoUrl: generatedMaps.albedo }) });
      const normalData = await normalRes.json();
      if (normalData.status === 'succeeded') generatedMaps.normal = normalData.output;

      setGenerationProgress('Generating height map...');
      const heightRes = await fetch('/api/generate-pbr-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'height', albedoUrl: generatedMaps.albedo }) });
      const heightData = await heightRes.json();
      if (heightData.status === 'succeeded') generatedMaps.height = heightData.output;

      setGenerationProgress('Generating roughness map...');
      const roughnessRes = await fetch('/api/generate-pbr-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'roughness', albedoUrl: generatedMaps.albedo }) });
      const roughnessData = await roughnessRes.json();
      if (roughnessData.output) generatedMaps.roughness = roughnessData.output;

      setGenerationProgress('Generating AO map...');
      const aoRes = await fetch('/api/generate-pbr-generator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'ao', albedoUrl: generatedMaps.albedo }) });
      const aoData = await aoRes.json();
      if (aoData.output) generatedMaps.ao = aoData.output;

      setResultMaps(generatedMaps);
      const { deductCredits } = await import('@/lib/credits');
      const { saveGeneration } = await import('@/lib/generations');
      const creditsUsed = calculateCredits();
      await deductCredits(user.uid, creditsUsed);
      await saveGeneration({ outsetaUid: user.uid, toolName: 'PBR Generator', prompt, imageUrl: generatedMaps.albedo, creditsUsed });
      setGenerationProgress('');
    } catch (err) {
      alert(err.message || 'Error generating PBR materials');
      setGenerationProgress('');
    } finally { setIsGenerating(false); }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    try {
      const fetchImage = async (url, filename) => { const response = await fetch(url); const blob = await response.blob(); return { filename, blob }; };
      const downloads = [];
      if (resultMaps.albedo) downloads.push(fetchImage(resultMaps.albedo, 'pbr_albedo.png'));
      if (resultMaps.normal) downloads.push(fetchImage(resultMaps.normal, 'pbr_normal.png'));
      if (resultMaps.height) downloads.push(fetchImage(resultMaps.height, 'pbr_height.png'));
      if (resultMaps.roughness) downloads.push(fetchImage(resultMaps.roughness, 'pbr_roughness.png'));
      if (resultMaps.ao) downloads.push(fetchImage(resultMaps.ao, 'pbr_ao.png'));
      const results = await Promise.all(downloads);
      results.forEach(({ filename, blob }) => zip.file(filename, blob));
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'pbr_materials.zip');
    } catch { alert('Error creating ZIP file'); }
  };

  const handleDownloadSingle = async (url, filename) => {
    try {
      const response = await fetch(url); const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(blobUrl); document.body.removeChild(a);
    } catch { window.open(url, '_blank'); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {resultMaps.albedo && showPreview && mounted ? (
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={null}>
              <MaterialPreview textureUrl={resultMaps.albedo} />
            </Suspense>
          </Canvas>
        ) : resultMaps.albedo ? (
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <div className="max-w-7xl w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { key: 'albedo', label: 'Albedo', filename: 'pbr_albedo.png' },
                  { key: 'normal', label: 'Normal', filename: 'pbr_normal.png' },
                  { key: 'height', label: 'Height', filename: 'pbr_height.png' },
                  { key: 'roughness', label: 'Roughness', filename: 'pbr_roughness.png' },
                  { key: 'ao', label: 'AO', filename: 'pbr_ao.png' },
                ].map(({ key, label, filename }) => resultMaps[key] && (
                  <div key={key} className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">{label}</p>
                    <img src={resultMaps[key]} alt={label} className="w-full rounded-lg" />
                    <button onClick={() => handleDownloadSingle(resultMaps[key], filename)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"><Download size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center px-4 max-w-2xl">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8"><Wand2 size={48} className="sm:w-16 sm:h-16 text-white/40" /></div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-4">AI PBR Material Generator</h1>
              <p className="text-white/60 text-sm sm:text-base">Describe any material and AI will generate a complete PBR texture set</p>
            </div>
          </div>
        )}
      </div>

      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button onClick={() => router.push('/tools')} className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md">
          <ArrowLeft size={18} /><span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {resultMaps.albedo && (
        <button onClick={() => setShowPreview(!showPreview)} className="fixed top-6 right-6 z-50 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 rounded-full text-sm font-bold transition-all">
          {showPreview ? 'Show Maps' : '3D Preview'}
        </button>
      )}

      {isGenerating && generationProgress && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl">
          <p className="text-sm font-medium">{generationProgress}</p>
        </div>
      )}

      {showSeamlessInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSeamlessInfo(false)}>
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">What is Seamless/Tileable?</h3>
            <p className="text-sm text-white/80 mb-4">Seamless textures have edges that loop perfectly, allowing you to repeat them infinitely without visible seams.</p>
            <button onClick={() => setShowSeamlessInfo(false)} className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-all">Got it!</button>
          </div>
        </div>
      )}

      {!resultMaps.albedo && (
        <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-black via-black/95 to-transparent p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CustomDropdown label="Material Type" value={category} options={['Auto','Wood','Metal','Stone','Brick','Concrete','Fabric','Leather','Plastic','Ceramic','Marble','Glass','Paper','Rust','Sand','Dirt','Moss','Ice']} onChange={setCategory} />
              <CustomDropdown label="Style" value={style} options={['Photorealistic','Stylized','Hand-painted','Cartoon','Sci-Fi','Fantasy','Grunge','Clean']} onChange={setStyle} />
              <CustomDropdown label="Resolution" value={resolution} options={['1K','2K','4K','8K (+1 credit)']} onChange={setResolution} />
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">Tiling</label>
                  <button onClick={() => setShowSeamlessInfo(true)} className="p-0.5 hover:bg-white/10 rounded-full transition-all" type="button"><Info size={10} className="text-white/40" /></button>
                </div>
                <button onClick={() => setSeamless(!seamless)} type="button" className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${seamless ? 'bg-white text-black' : 'bg-white/5 text-white/50 border border-white/10'}`}>Seamless {seamless && '✓'}</button>
              </div>
            </div>
            <div className="flex gap-3">
              <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} placeholder="Describe your material... (e.g., 'worn brick wall')" disabled={isGenerating} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-white/30 placeholder-white/30 disabled:opacity-50" />
              <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating || loading} className="px-8 py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl whitespace-nowrap">
                {isGenerating ? <><div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" /><span className="hidden sm:inline">Generating...</span></> : <><Sparkles size={20} /><span className="hidden sm:inline">{calculateCredits()} Credits</span><span className="sm:hidden">Gen</span></>}
              </button>
            </div>
          </div>
        </footer>
      )}

      {resultMaps.albedo && (
        <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3">
          <button onClick={() => setResultMaps({ albedo: null, normal: null, height: null, roughness: null, ao: null })} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"><X size={18} /><span>Reset</span></button>
          <button onClick={handleDownloadAll} className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"><Package size={18} /><span>Download All (ZIP)</span></button>
        </footer>
      )}
    </div>
  );
}