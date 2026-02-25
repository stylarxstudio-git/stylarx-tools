'use client';
import { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Download, X, Shuffle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

const STYLES = [
  { id: 'graffiti', label: 'Graffiti', prompt: 'graffiti street art style sticker, bold outlines, spray paint texture, urban' },
  { id: 'emoji', label: 'Emoji', prompt: 'cute emoji style, bold outlines, simple flat design, expressive, clean' },
  { id: 'cartoon', label: 'Cartoon', prompt: 'cartoon sticker style, bold black outlines, vibrant colors, fun and playful' },
  { id: 'kawaii', label: 'Kawaii', prompt: 'kawaii cute Japanese style sticker, pastel colors, big eyes, adorable' },
  { id: 'retro', label: 'Retro', prompt: 'retro vintage sticker style, distressed edges, old school aesthetic, bold colors' },
  { id: 'holographic', label: 'Holographic', prompt: 'holographic iridescent sticker, rainbow sheen, glossy, futuristic, metallic' },
  { id: 'die-cut', label: 'Die-Cut', prompt: 'die-cut sticker style, white border outline, crisp edges, professional sticker design' },
  { id: 'anime', label: 'Anime', prompt: 'anime style sticker, cel shaded, bold outlines, vibrant colors, Japanese animation' },
];

const EXAMPLES = [
  'A roaring tiger face with flames',
  'Smiling avocado wearing sunglasses',
  'Skull with roses and butterflies',
  'Lightning bolt with sparks',
  'Pizza slice with funny face',
  'Astronaut floating in space',
  'Dragon breathing fire',
  'Cute ghost saying boo',
];

export default function StickerGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const randomExample = () => {
    setPrompt(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) { alert('Enter a prompt and make sure you are logged in'); return; }
    setIsGenerating(true);
    setResult(null);
    try {
      const { checkCredits } = await import('@/lib/credits');
      await checkCredits(user.uid, 1);

      const style = STYLES.find(s => s.id === selectedStyle);
      const fullPrompt = `${prompt.trim()}, ${style.prompt}, isolated subject, no background, sticker design`;

      const response = await fetch('/api/generate-sticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.imageUrl) {
        setResult(data.imageUrl);
        const { deductCredits } = await import('@/lib/credits');
        const { saveGeneration } = await import('@/lib/generations');
        await deductCredits(user.uid, 1);
        await saveGeneration({
          outsetaUid: user.uid,
          toolName: 'Sticker Generator',
          prompt: prompt.trim(),
          imageUrl: data.imageUrl,
          creditsUsed: 1,
        });
      } else throw new Error('No image returned');
    } catch (err) { alert(err.message || 'Generation failed'); }
    finally { setIsGenerating(false); }
  };

  const handleDownload = async () => {
    if (!result) return;
    setIsDownloading(true);
    try {
      const r = await fetch(result);
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sticker-${Date.now()}.png`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { window.open(result, '_blank'); }
    finally { setIsDownloading(false); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f0f] text-white font-sans">

      {/* NAV */}
      <nav className="fixed top-0 left-0 w-full z-50 p-4 sm:p-6 flex items-center justify-between bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/5">
        <button onClick={() => router.push('/tools')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-sm font-medium">
          <ArrowLeft size={16} /> Back to Tools
        </button>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/50 uppercase tracking-wider">1 Credit</div>
      </nav>

      <main className="flex-1 pt-20 pb-44 px-4 sm:px-6 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 text-2xl">
            🎨
          </div>
          <h1 className="text-2xl font-black tracking-tight">Sticker Generator</h1>
          <p className="text-white/40 text-sm mt-1">Generate transparent stickers, emojis, graffiti & more</p>
        </div>

        {/* Style selector */}
        <div className="mb-6">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">Style</p>
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  selectedStyle === style.id
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Prompt</p>
            <button onClick={randomExample} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
              <Shuffle size={11} /> Random idea
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your sticker... e.g. 'A fire-breathing dragon' or 'Smiling skull with flowers'"
            rows={3}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none"
          />
        </div>

        {/* Result */}
        {result && (
          <div className="mb-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a]">
              {/* Checkered background to show transparency */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }} />
              <img src={result} alt="Generated sticker" className="relative w-full max-h-[400px] object-contain p-6" />
              <button
                onClick={() => setResult(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-all"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[10px] text-white/20 text-center mt-2">Checkered pattern shows transparent areas</p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2">Tips</p>
          <ul className="text-[11px] text-white/40 space-y-1 leading-relaxed">
            <li>• Describe a single clear subject for best results</li>
            <li>• Try adding emotions: happy, angry, surprised, cool</li>
            <li>• Works great with animals, objects, characters & symbols</li>
            <li>• Download as PNG — transparency is preserved</li>
          </ul>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/95 to-transparent p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {result ? (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setResult(null)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-2 font-bold">
                <X size={16} /> New Sticker
              </button>
              <button onClick={handleDownload} disabled={isDownloading} className="px-8 py-3 bg-white hover:bg-gray-100 text-black rounded-2xl font-bold flex items-center gap-2 transition-all shadow-2xl disabled:opacity-50">
                {isDownloading ? <div className="h-4 w-4 border-2 border-black border-t-transparent animate-spin rounded-full" /> : <Download size={16} />}
                Download PNG
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || loading}
              className="w-full py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl text-base"
            >
              {isGenerating
                ? <><div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" /> Generating sticker...</>
                : <><Sparkles size={20} /> Generate Sticker</>
              }
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}