'use client';
import { useState } from 'react';
import { ArrowLeft, Sparkles, Download, X, Shuffle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

const CATEGORIES = [
  {
    id: 'foliage',
    label: '🌿 Foliage',
    items: ['Maple leaf', 'Oak leaf', 'Tropical palm leaf', 'Fern frond', 'Ivy cluster', 'Bamboo branch', 'Pine needles', 'Eucalyptus leaves'],
    prompt: 'photorealistic, highly detailed, studio lighting, clean subject',
  },
  {
    id: 'flowers',
    label: '🌸 Flowers',
    items: ['Red rose in bloom', 'Cherry blossom branch', 'Sunflower head', 'Lavender sprig', 'White daisy', 'Lotus flower', 'Wildflower bouquet', 'Peony bloom'],
    prompt: 'photorealistic macro photography, beautiful, detailed petals',
  },
  {
    id: 'grass',
    label: '🌾 Grass & Plants',
    items: ['Tall grass blades', 'Wheat stalks', 'Wild grass cluster', 'Reeds and cattails', 'Moss clump', 'Clover patch', 'Dandelion', 'Succulent plant'],
    prompt: 'photorealistic, natural, highly detailed, studio quality',
  },
  {
    id: 'trees',
    label: '🌲 Trees & Branches',
    items: ['Pine tree', 'Cherry blossom tree', 'Oak tree', 'Bare winter tree', 'Birch trunk', 'Willow branch', 'Dead branch', 'Autumn tree'],
    prompt: 'photorealistic, detailed bark and leaves, natural lighting',
  },
  {
    id: 'nature',
    label: '🪨 Nature Elements',
    items: ['Rock formation', 'Smooth river stones', 'Piece of driftwood', 'Mushroom cluster', 'Pinecone', 'Feather', 'Seashell', 'Crystal cluster'],
    prompt: 'photorealistic, detailed texture, studio quality, natural',
  },
  {
    id: 'atmospheric',
    label: '☁️ Atmospheric',
    items: ['Wispy cloud', 'Storm cloud', 'Smoke puff', 'Fog mist', 'Snowflakes', 'Rain drops', 'Falling leaves', 'Dust particles'],
    prompt: 'photorealistic, atmospheric, high quality render, soft edges',
  },
];

const EXAMPLES = [
  'Detailed maple leaf with autumn colors',
  'Large tropical palm leaf',
  'Wild grass blades swaying',
  'Cherry blossom branch in spring',
  'Weathered driftwood piece',
  'Cluster of mushrooms on moss',
  'Wispy cirrus clouds',
  'Smooth river stones',
];

export default function SceneElementsGenerator() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('foliage');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const category = CATEGORIES.find(c => c.id === selectedCategory);

  const randomExample = () => setPrompt(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  const usePreset = (item) => setPrompt(item);

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) { alert('Enter a prompt and make sure you are logged in'); return; }
    setIsGenerating(true);
    setResult(null);
    try {
      const { checkCredits } = await import('@/lib/credits');
      await checkCredits(user.uid, 1);

      const fullPrompt = `${prompt.trim()}, ${category.prompt}, isolated on white background, no other elements`;

      const response = await fetch('/api/generate-scene-element', {
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
          toolName: 'Scene Elements',
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
      a.download = `scene-element-${Date.now()}.png`;
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
            🌿
          </div>
          <h1 className="text-2xl font-black tracking-tight">Scene Elements</h1>
          <p className="text-white/40 text-sm mt-1">Realistic transparent cutouts for scenes, backgrounds & compositing</p>
        </div>

        {/* Category selector */}
        <div className="mb-6">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">Category</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick presets */}
        <div className="mb-6">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {category.items.map(item => (
              <button
                key={item}
                onClick={() => usePreset(item)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] text-white/50 hover:text-white transition-all"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Prompt</p>
            <button onClick={randomExample} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
              <Shuffle size={11} /> Random
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your scene element... e.g. 'Large tropical palm leaf with water droplets'"
            rows={3}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none"
          />
        </div>

        {/* Result */}
        {result && (
          <div className="mb-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a]">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }} />
              <img src={result} alt="Generated scene element" className="relative w-full max-h-[420px] object-contain p-6" />
              <button onClick={() => setResult(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-all">
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
            <li>• Best results with a single clear subject — avoid complex scenes</li>
            <li>• Add detail words: wet, dry, wilted, fresh, ancient, glowing</li>
            <li>• Use presets for quick starting points then customize</li>
            <li>• Download as PNG — transparency is preserved for compositing</li>
            <li>• Works great layered in Blender, Photoshop, or After Effects</li>
          </ul>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/95 to-transparent p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {result ? (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setResult(null)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-2 font-bold">
                <X size={16} /> New Element
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
                ? <><div className="h-5 w-5 border-2 border-black border-t-transparent animate-spin rounded-full" /> Generating element...</>
                : <><Sparkles size={20} /> Generate Element</>
              }
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}