'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wand2, Sparkles, Download } from 'lucide-react';
import { useUser } from '@/hooks/useUser'; 

export default function GoboGenerator() {
  const router = useRouter();
  const { user, loading } = useUser(); 
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    if (!user) {
      alert("Please log in to generate images.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-gobo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          userId: user.uid,     
          userEmail: user.email 
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.imageUrl) {
        setResultImage(data.imageUrl);
      } else {
        alert(data.error || "Error generating image");
      }
    } catch (err) {
      alert("Error connecting to server");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden">
      
      {/* 1. TOP NAVIGATION */}
      <nav className="p-4 sm:p-6 fixed top-0 left-0 w-full z-50">
        <button 
          onClick={() => router.push('/tools')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all backdrop-blur-md"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Tools</span>
        </button>
      </nav>

      {/* 2. MAIN DISPLAY AREA */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-24 pb-32">
        {resultImage ? (
          <div className="relative group max-w-2xl w-full aspect-square bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            <img src={resultImage} alt="Gobo result" className="w-full h-full object-contain p-4 sm:p-8" />
            <a 
              href={resultImage} 
              target="_blank"
              rel="noopener noreferrer"
              download 
              className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 p-3 sm:p-4 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform"
            >
              <Download size={20} className="sm:w-6 sm:h-6" />
            </a>
          </div>
        ) : (
          <div className="text-center opacity-40 px-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} className={isGenerating ? "animate-pulse text-blue-400" : ""} />
            </div>
            <p className="text-lg sm:text-xl">{isGenerating ? "Carving your stencil..." : "Your Gobo will appear here"}</p>
          </div>
        )}
      </main>

      {/* 3. FIXED BOTTOM PROMPT BAR */}
      <footer className="fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3 bg-[#1a1a1a] p-1.5 sm:p-2 rounded-2xl border border-white/10 shadow-2xl">
          <input 
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="Describe pattern..."
            /* The fix: text-[16px] ensures the browser doesn't auto-zoom. 
               sm:text-base switches to the standard size on desktop.
            */
            className="flex-1 bg-transparent px-3 py-2 sm:px-4 sm:py-3 outline-none text-white text-[16px] sm:text-base placeholder-neutral-500 disabled:opacity-50 min-w-0"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || loading}
            className="bg-white text-black px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-200 disabled:opacity-50 transition-all shrink-0 h-10 sm:h-12"
          >
            {isGenerating ? (
              <div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
            ) : (
              <>
                <Wand2 size={18} /> 
                <span className="hidden xs:inline">Generate</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}