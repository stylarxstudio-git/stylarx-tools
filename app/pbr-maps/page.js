'use client';
import { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Download, X, Upload, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PBRMapGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();
  
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [resultMaps, setResultMaps] = useState({
    normal: null,
    height: null,
    original: null,
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
      setResultMaps({ normal: null, height: null, original: null });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !user) {
      alert('Please upload an image and log in first');
      return;
    }

    setIsGenerating(true);
    try {
      // STEP 1: Generate Normal Map
      setGenerationProgress('Generating normal map...');
      const normalStart = await fetch('/api/generate-pbr-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: uploadedImage,
          userId: user.uid,
          userEmail: user.email,
          step: 'normal',
        }),
      });

      let normalPrediction = await normalStart.json();
      if (normalPrediction.error) throw new Error(normalPrediction.error);

      // Poll for normal map completion
      while (normalPrediction.status !== 'succeeded' && normalPrediction.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const checkRes = await fetch('/api/generate-pbr-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: normalPrediction.predictionId }),
        });
        normalPrediction = await checkRes.json();
      }

      if (normalPrediction.status !== 'succeeded') throw new Error('Normal map generation failed');
      const normalMapUrl = normalPrediction.output;

      // STEP 2: Generate Height Map
      setGenerationProgress('Generating height map...');
      const heightStart = await fetch('/api/generate-pbr-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: uploadedImage,
          step: 'height',
        }),
      });

      let heightPrediction = await heightStart.json();
      if (heightPrediction.error) throw new Error(heightPrediction.error);

      // Poll for height map completion
      while (heightPrediction.status !== 'succeeded' && heightPrediction.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const checkRes = await fetch('/api/generate-pbr-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictionId: heightPrediction.predictionId }),
        });
        heightPrediction = await checkRes.json();
      }

      if (heightPrediction.status !== 'succeeded') throw new Error('Height map generation failed');
      const heightMapUrl = heightPrediction.output;

      // Set all results
      setResultMaps({
        normal: normalMapUrl,
        height: heightMapUrl,
        original: uploadedImage,
      });

      // Deduct credits and save generation
      const { deductCredits } = await import('@/lib/credits');
      const { saveGeneration } = await import('@/lib/generations');
      
      await deductCredits(user.uid, 2);
      await saveGeneration({
        outsetaUid: user.uid,
        toolName: 'PBR Map Generator',
        prompt: 'Generate PBR maps from image',
        imageUrl: normalMapUrl,
        creditsUsed: 2,
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
      // Download all images as blobs
      const fetchImage = async (url, filename) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return { filename, blob };
      };

      const downloads = await Promise.all([
        fetchImage(resultMaps.normal, 'pbr_normal_map.png'),
        fetchImage(resultMaps.height, 'pbr_height_map.png'),
        fetchImage(resultMaps.original, 'pbr_original.png'),
      ]);

      downloads.forEach(({ filename, blob }) => {
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
        {resultMaps.normal ? (
          <div className="w-full h-full overflow-auto p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Original Image */}
                <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Original</p>
                  <img src={resultMaps.original} alt="Original" className="w-full rounded-lg" />
                </div>

                {/* Normal Map */}
                <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Normal Map</p>
                  <img src={resultMaps.normal} alt="Normal Map" className="w-full rounded-lg" />
                  <a 
                    href={resultMaps.normal} 
                    download="normal_map.png"
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <Download size={16} />
                  </a>
                </div>

                {/* Height Map */}
                <div className="relative bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-xs text-white/60 mb-2 uppercase tracking-wider font-bold">Height Map</p>
                  <img src={resultMaps.height} alt="Height Map" className="w-full rounded-lg" />
                  <a 
                    href={resultMaps.height} 
                    download="height_map.png"
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <Download size={16} />
                  </a>
                </div>

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
                onClick={() => setResultMaps({ normal: null, height: null, original: null })} 
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
                  <span>Generate PBR Maps (2 Credits)</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}