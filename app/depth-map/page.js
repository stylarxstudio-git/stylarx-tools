'use client';
import { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Download, X, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

export default function DepthMapGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  const fileInputRef = useRef();
  
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultDepthMap, setResultDepthMap] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
      setResultDepthMap(null);
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
      const response = await fetch('/api/generate-depth-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: uploadedImage,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.status === 'succeeded') {
        setResultDepthMap(data.output);
        
        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        
        await deductCredits(user.uid, 1);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'Depth Map Generator',
          prompt: 'Generate depth map from image',
          imageUrl: data.output,
          creditsUsed: 1,
        });
      } else {
        throw new Error('Generation failed');
      }

    } catch (err) {
      alert(err.message || 'Error generating depth map');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!resultDepthMap) return;
    try {
      const response = await fetch(resultDepthMap);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `depth-map-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(resultDepthMap, '_blank');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {resultDepthMap ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative max-w-6xl w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Image */}
                <div className="relative">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Original</p>
                  <img src={uploadedImage} alt="Original" className="w-full rounded-2xl shadow-2xl" />
                </div>
                {/* Depth Map */}
                <div className="relative">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Depth Map</p>
                  <img src={resultDepthMap} alt="Depth Map" className="w-full rounded-2xl shadow-2xl" />
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
                <p className="text-lg sm:text-xl text-white/60 font-medium">Click to upload image</p>
                <p className="text-xs text-white/30 mt-1.5">PNG, JPG up to 10MB</p>
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
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

      {/* BOTTOM CENTER - BUTTONS */}
      <footer className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 sm:px-6">
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent pb-2">
          {resultDepthMap ? (
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setResultDepthMap(null)} 
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-3 sm:px-8 sm:py-3.5 bg-white hover:bg-gray-100 text-black rounded-xl sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 font-bold text-sm sm:text-base"
              >
                <Download size={18} className="sm:w-5 sm:h-5" />
                <span>Download</span>
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
                  <span>Generating Depth Map...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="sm:w-5 sm:h-5" />
                  <span>Generate Depth Map (1 Credit)</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}