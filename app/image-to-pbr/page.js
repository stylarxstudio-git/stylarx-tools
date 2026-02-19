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

// 3D Preview Component
function MaterialPreview({ textureUrl }) {
  const texture = new THREE.TextureLoader().load(textureUrl);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Sphere args={[2, 64, 64]}>
        <meshStandardMaterial 
          map={texture}
          normalMap={texture}
          roughness={0.7}
          metalness={0.3}
        />
      </Sphere>
      <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={2} />
      <Environment preset="sunset" />
    </>
  );
}

export default function ImageToPBR() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();
  
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  
  // Map selection
  const [selectedMaps, setSelectedMaps] = useState({
    normal: true,
    height: true,
    roughness: true,
    ao: true,
  });

  // Settings
  const [resolution, setResolution] = useState('4K');
  const [seamless, setSeamless] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [resultMaps, setResultMaps] = useState({
    normal: null,
    height: null,
    roughness: null,
    ao: null,
    original: null,
  });

  // Calculate credits needed
  const calculateCredits = () => {
    let credits = 2; // Base
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleMap = (mapName) => {
    // Always keep at least one map selected
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

    setIsGenerating(true);
    const generatedMaps = { original: uploadedImage };

    try {
      // Generate Normal Map
      if (selectedMaps.normal) {
        setGenerationProgress('Generating normal map...');
        const normalStart = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: uploadedImage,
            userId: user.uid,
            userEmail: user.email,
            step: 'normal',
            resolution,
            seamless,
          }),
        });

        let normalPrediction = await normalStart.json();
        if (normalPrediction.error) throw new Error(normalPrediction.error);

        while (normalPrediction.status !== 'succeeded' && normalPrediction.status !== 'failed') {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const checkRes = await fetch('/api/generate-image-to-pbr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId: normalPrediction.predictionId }),
          });
          normalPrediction = await checkRes.json();
        }

        if (normalPrediction.status === 'succeeded') {
          generatedMaps.normal = normalPrediction.output;
        }
      }

      // Generate Height Map
      if (selectedMaps.height) {
        setGenerationProgress('Generating height map...');
        const heightStart = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: uploadedImage,
            step: 'height',
          }),
        });

        let heightPrediction = await heightStart.json();
        if (heightPrediction.error) throw new Error(heightPrediction.error);

        while (heightPrediction.status !== 'succeeded' && heightPrediction.status !== 'failed') {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const checkRes = await fetch('/api/generate-image-to-pbr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId: heightPrediction.predictionId }),
          });
          heightPrediction = await checkRes.json();
        }

        if (heightPrediction.status === 'succeeded') {
          generatedMaps.height = heightPrediction.output;
        }
      }

      // Generate Roughness Map (simplified for now)
      if (selectedMaps.roughness) {
        setGenerationProgress('Generating roughness map...');
        const roughnessRes = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: generatedMaps.height || uploadedImage,
            step: 'roughness',
          }),
        });
        const roughnessData = await roughnessRes.json();
        if (roughnessData.output) generatedMaps.roughness = roughnessData.output;
      }

      // Generate AO Map (simplified for now)
      if (selectedMaps.ao) {
        setGenerationProgress('Generating AO map...');
        const aoRes = await fetch('/api/generate-image-to-pbr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: generatedMaps.height || uploadedImage,
            step: 'ao',
          }),
        });
        const aoData = await aoRes.json();
        if (aoData.output) generatedMaps.ao = aoData.output;
      }

      setResultMaps(generatedMaps);

      // Deduct credits and save generation
      const { deductCredits } = await import('@/lib/credits');
      const { saveGeneration } = await import('@/lib/generations');
      
      const creditsUsed = calculateCredits();
      await deductCredits(user.uid, creditsUsed);
      await saveGeneration({
        outsetaUid: user.uid,
        toolName: 'Image to PBR',
        prompt: `Generate PBR maps (${resolution}${seamless ? ', Seamless' : ''})`,
        imageUrl: generatedMaps.normal || generatedMaps.height || uploadedImage,
        creditsUsed: creditsUsed,
      });

      setGenerationProgress('');

    } catch (err) {
      alert(err.message || 'Error generating PBR maps');
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
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
      results.forEach(({ filename, blob }) => {
        zip.file(filename, blob);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'pbr_maps.zip');
    } catch (err) {
      alert('Error creating ZIP file');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND */}
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

                {resultMaps.normal && (
                  <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Normal Map</p>
                    <img src={resultMaps.normal} alt="Normal" className="w-full rounded-lg" />
                    <a 
                      href={resultMaps.normal} 
                      download="normal_map.png"
                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                )}

                {resultMaps.height && (
                  <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Height Map</p>
                    <img src={resultMaps.height} alt="Height" className="w-full rounded-lg" />
                    <a 
                      href={resultMaps.height} 
                      download="height_map.png"
                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                )}

                {resultMaps.roughness && (
                  <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Roughness Map</p>
                    <img src={resultMaps.roughness} alt="Roughness" className="w-full rounded-lg" />
                    <a 
                      href={resultMaps.roughness} 
                      download="roughness_map.png"
                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                )}

                {resultMaps.ao && (
                  <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">AO Map</p>
                    <img src={resultMaps.ao} alt="AO" className="w-full rounded-lg" />
                    <a 
                      href={resultMaps.ao} 
                      download="ao_map.png"
                      className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                )}

              </div>
            </div>
          </div>
        ) : uploadedImage ? (
          <div className="w-full h-full flex items-center justify-center group">
            <div className="relative">
              <img src={uploadedImage} alt="Preview" className="max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl" />
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
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="group"
              >
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                  <Upload size={32} className="sm:w-[44px] sm:h-[44px] text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
                <p className="text-lg sm:text-xl text-white/60 font-medium">Click to upload texture</p>
                <p className="text-xs text-white/30 mt-1.5">JPG, PNG, WEBP up to 10MB</p>
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg,image/jpg,image/png,image/webp" 
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* TOP LEFT - BACK BUTTON */}
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50 pointer-events-none">
        <button 
          onClick={() => router.push('/tools')}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {/* TOP RIGHT - SETTINGS PANEL */}
      {uploadedImage && !resultMaps.normal && (
        <aside className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4">
          
          {/* Map Selection */}
          <div>
            <p className="text-xs text-white/60 mb-3 uppercase tracking-wider font-bold">Select Maps (All Included)</p>
            <div className="space-y-2">
              {Object.entries({ normal: 'Normal Map', height: 'Height Map', roughness: 'Roughness Map', ao: 'AO Map' }).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleMap(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    selectedMaps[key] 
                      ? 'bg-white/10 border border-white/20' 
                      : 'bg-white/5 border border-white/5 opacity-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedMaps[key] ? 'border-white bg-white' : 'border-white/30'
                  }`}>
                    {selectedMaps[key] && <Check size={14} className="text-black" />}
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <p className="text-xs text-white/60 mb-3 uppercase tracking-wider font-bold">Resolution</p>
            <div className="grid grid-cols-4 gap-2">
              {['1K', '2K', '4K', '8K'].map(res => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    resolution === res 
                      ? 'bg-white text-black' 
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {res}
                  {res === '8K' && <span className="text-[8px] block">+1</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Seamless Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div>
              <p className="text-sm font-bold">Seamless/Tileable</p>
              <p className="text-xs text-white/40">+1 credit</p>
            </div>
            <button
              onClick={() => setSeamless(!seamless)}
              className={`w-12 h-6 rounded-full transition-all relative ${seamless ? 'bg-white' : 'bg-white/20'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                seamless ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white/60'
              }`} />
            </button>
          </div>

          {/* Credit Total */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white/70">Total Cost:</span>
              <span className="text-2xl font-black">{calculateCredits()} Credits</span>
            </div>
          </div>

        </aside>
      )}

      {/* 3D PREVIEW TOGGLE */}
      {resultMaps.normal && (
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="fixed top-6 right-6 z-50 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 rounded-full text-sm font-bold transition-all"
        >
          {showPreview ? 'Show Maps' : '3D Preview'}
        </button>
      )}

      {/* GENERATION PROGRESS */}
      {isGenerating && generationProgress && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl">
          <p className="text-sm font-medium">{generationProgress}</p>
        </div>
      )}

      {/* BOTTOM CENTER - BUTTONS */}
      <footer className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 sm:px-6">
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent pb-2">
          {resultMaps.normal ? (
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setResultMaps({ normal: null, height: null, roughness: null, ao: null, original: null })} 
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleDownloadAll}
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <Package size={18} className="sm:w-5 sm:h-5" />
                <span>Download All (ZIP)</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={handleGenerate}
              disabled={!uploadedImage || isGenerating || loading}
              className="w-full py-3 sm:py-3.5 bg-white hover:bg-gray-100 text-black font-bold text-sm sm:text-base rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white shadow-2xl"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                  <span>Generating PBR Maps...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="sm:w-5 sm:h-5" />
                  <span>Generate PBR Maps ({calculateCredits()} Credits)</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}