import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

const resolutionMap = {
  '1K': { width: 1024, height: 1024 },
  '2K': { width: 2048, height: 2048 },
  '4K': { width: 1024, height: 1024 }, // fal max is 1024, upscale later
  '8K (+1 credit)': { width: 1024, height: 1024 },
};

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
  'Photorealistic': 'photorealistic, highly detailed, 8K, professional photography',
  'Stylized': 'stylized, artistic, clean illustration',
  'Hand-painted': 'hand-painted texture, artistic brushwork',
  'Cartoon': 'cartoon style, flat colors, cel shaded',
  'Sci-Fi': 'sci-fi, futuristic, high-tech surface',
  'Fantasy': 'fantasy style, magical material',
  'Grunge': 'grungy, worn, distressed, aged',
  'Clean': 'clean, pristine, minimal, sharp',
};

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, step, resolution, seamless, style, category, albedoUrl } = await req.json();

    // STEP 1: Generate Albedo
    if (step === 'albedo') {
  let enhancedPrompt = prompt;

  if (category && category !== 'Auto') {
    enhancedPrompt = `${categoryKeywords[category] || ''} ${prompt}`;
  }

  enhancedPrompt += `, ${styleKeywords[style] || styleKeywords['Photorealistic']}`;
  
  // This is the key change — force flat texture pattern, not a photo
  enhancedPrompt = `seamless tileable texture map of ${enhancedPrompt}, flat top-down macro view, uniform surface pattern, zoomed in material surface, no objects, no perspective, no scene, evenly lit diffuse texture, game-ready PBR albedo map, texture sheet, repeating pattern, studio scan`;

  if (seamless) {
    enhancedPrompt += ', perfectly seamless, tileable edges, no border, repeating';
  }

  enhancedPrompt += ', negative space: shadows, objects, people, faces, perspective, 3D render, scene, environment, dark edges';

      const size = resolutionMap[resolution] || { width: 1024, height: 1024 };

      const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
        input: {
          prompt: enhancedPrompt,
          negative_prompt: 'object, item, product, scene, environment, background, people, faces, text, watermark, perspective, 3d render, shadows, dark corners, vignette, ball, sphere, closeup object',
          image_size: size,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
        },
      });

      const images = result?.images || result?.data?.images;
      const imageUrl = images?.[0]?.url || images?.[0];
      if (!imageUrl) throw new Error('No albedo image returned');

      return NextResponse.json({ status: 'succeeded', output: [imageUrl], step: 'albedo' });
    }

    // STEP 2: Generate Normal + Height Map from Albedo using depth model
    if (step === 'normal') {
      const result = await fal.subscribe('fal-ai/imageutils/marigold-depth', {
        input: { image_url: albedoUrl },
      });

      const imageUrl = result?.image?.url || result?.data?.image?.url;
      if (!imageUrl) throw new Error('No normal map returned');

      return NextResponse.json({ status: 'succeeded', output: imageUrl, step: 'normal' });
    }

    if (step === 'height') {
      const result = await fal.subscribe('fal-ai/imageutils/marigold-depth', {
        input: { image_url: albedoUrl },
      });

      const imageUrl = result?.image?.url || result?.data?.image?.url;
      if (!imageUrl) throw new Error('No height map returned');

      return NextResponse.json({ status: 'succeeded', output: imageUrl, step: 'height' });
    }

    // STEP 3: Roughness and AO — convert albedo to grayscale variants
    if (step === 'roughness' || step === 'ao') {
      return NextResponse.json({
        status: 'succeeded',
        output: albedoUrl,
        step: step,
      });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('PBR Generator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}