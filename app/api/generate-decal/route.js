import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

const decalTypeKeywords = {
  'Crack': 'cracked surface, fracture lines, broken texture',
  'Leak': 'liquid drip, stain, running fluid',
  'Dirt': 'dirt marks, grime, muddy stains',
  'Rust': 'rust corrosion, oxidation, metal decay',
  'Moss': 'moss growth, organic texture, plant growth',
  'Blood': 'blood splatter, red stain',
  'Oil': 'oil stain, grease mark, dark fluid',
  'Graffiti': 'spray paint, street art, tags',
  'Bullet Hole': 'bullet impact, hole, damage',
  'Scratch': 'scratch marks, scrape, abrasion',
};

const styleKeywords = {
  'Realistic': 'photorealistic, highly detailed, 8K, professional',
  'Stylized': 'stylized, artistic, clean edges',
  'Grunge': 'grungy, worn, distressed, aged',
  'Clean': 'clean, minimal, simple, sharp',
};

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, decalType, style } = await req.json();

    let basePrompt = prompt;
    if (decalType && decalType !== 'Custom') {
      basePrompt = `${decalTypeKeywords[decalType] || ''} ${prompt}`;
    }
    basePrompt += `, ${styleKeywords[style] || styleKeywords['Realistic']}`;

    // Macro-texture isolation template
    const enhancedPrompt = `(Isolated raw texture decal:1.3), macro photography of ${basePrompt}, ultra-detailed organic patterns, flat view, high contrast, top-down perspective, isolated on a solid flat white background, 8k, photorealistic, no background objects, no depth of field, sharp edges.`;

    // Step 1: Generate with Flux 1.1 Pro
    const generated = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: enhancedPrompt,
        negative_prompt: "3D object, product, scene, environment, landscape, blurry, depth of field, bokeh, multiple objects, hands, person, surface, wall, floor",
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
      },
    });

    const images = generated?.images || generated?.data?.images;
    const generatedUrl = images?.[0]?.url || images?.[0];
    if (!generatedUrl) throw new Error('No image returned from fal');

    // Step 2: Remove background with Bria RMBG 2.0
    const bgRemoved = await fal.subscribe('fal-ai/bria/background/remove', {
      input: {
        image_url: generatedUrl,
      },
    });

    const finalUrl = bgRemoved?.image?.url || bgRemoved?.data?.image?.url || generatedUrl;

    return NextResponse.json({
      status: 'succeeded',
      output: [finalUrl],
    });

  } catch (error) {
    console.error('Decal generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}