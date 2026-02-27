import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const categoryKeywords = {
  'Wood': 'wooden grain texture, wood surface',
  'Metal': 'metallic surface, metal material',
  'Stone': 'stone surface texture, rock material',
  'Brick': 'brick wall texture, masonry',
  'Concrete': 'concrete surface, cement texture',
  'Fabric': 'fabric textile material, cloth',
  'Leather': 'leather surface texture',
  'Plastic': 'plastic surface material',
  'Ceramic': 'ceramic tile texture',
  'Marble': 'marble stone texture, veined stone',
  'Glass': 'glass surface material',
  'Paper': 'paper texture surface',
  'Rust': 'rust corrosion texture, oxidized metal',
  'Sand': 'sand texture, granular surface',
  'Dirt': 'dirt ground texture, soil',
  'Moss': 'moss texture, organic growth',
  'Ice': 'ice texture, frozen surface',
};

const styleKeywords = {
  'Photorealistic': 'photorealistic, highly detailed, 8K',
  'Stylized': 'stylized, artistic, clean',
  'Hand-painted': 'hand-painted texture, artistic',
  'Cartoon': 'cartoon style, flat colors',
  'Sci-Fi': 'sci-fi, futuristic, high-tech',
  'Fantasy': 'fantasy style, magical',
  'Grunge': 'grungy, worn, distressed',
  'Clean': 'clean, pristine, minimal',
};

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, predictionId, resolution, seamless, style, category } = await req.json();

    // Check prediction status
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Build enhanced prompt
    let enhancedPrompt = prompt;

    if (category && category !== 'Auto') {
      enhancedPrompt = `${categoryKeywords[category] || ''} ${prompt}`;
    }

    enhancedPrompt += `, ${styleKeywords[style] || styleKeywords['Photorealistic']}`;
    enhancedPrompt = `seamless tileable PBR texture of ${enhancedPrompt}, flat top-down view, uniform pattern, game-ready material`;

    if (seamless) {
      enhancedPrompt += ', perfectly seamless tileable edges';
    }

    // Resolution mapping
    const resolutionMap = {
      '1K': 1024,
      '2K': 2048,
      '4K': 4096,
      '8K (+1 credit)': 4096, // Max for this model
    };

    const size = resolutionMap[resolution] || 1024;

    // Generate ALL PBR maps in ONE call
    const prediction = await replicate.predictions.create({
      version: "a8aa8da43a48ebc951d421bf98981d198a2c6c72b3e5dc04570e127c82e6abd8",
      input: {
        prompt: enhancedPrompt,
        negative_prompt: "object, item, scene, environment, people, faces, text, watermark, perspective, 3d, shadows, dark edges",
        width: size,
        height: size,
        num_outputs: 1,
        guidance_scale: 7.5,
        num_inference_steps: 50,
      },
    });

    return NextResponse.json(prediction);

  } catch (error) {
    console.error('PBR Generator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}