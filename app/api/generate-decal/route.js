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

    let enhancedPrompt = prompt;

    if (decalType && decalType !== 'Custom') {
      enhancedPrompt = `${decalTypeKeywords[decalType] || ''} ${prompt}`;
    }

    enhancedPrompt += `, ${styleKeywords[style] || styleKeywords['Realistic']}`;
    enhancedPrompt += ', on a plain white background, isolated object, centered, product photography style';

    // Step 1: Generate with Flux 1.1 Pro
    const generated = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: enhancedPrompt,
        negative_prompt: "complex background, scene, environment, landscape, blurry, low quality, multiple objects",
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
      },
    });

    const images = generated?.images || generated?.data?.images;
    const generatedUrl = images?.[0]?.url || images?.[0];
    if (!generatedUrl) throw new Error('No image returned from fal');

    // Step 2: Remove background to make it transparent
    const bgRemoved = await fal.subscribe('fal-ai/imageutils/rembg', {
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