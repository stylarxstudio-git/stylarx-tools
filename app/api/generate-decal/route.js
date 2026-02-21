import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, predictionId, decalType, style } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    let enhancedPrompt = prompt;

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

    if (decalType && decalType !== 'Custom') {
      enhancedPrompt = `${decalTypeKeywords[decalType] || ''} ${prompt}`;
    }

    const styleKeywords = {
      'Realistic': 'photorealistic, highly detailed, 8K, professional',
      'Stylized': 'stylized, artistic, clean edges',
      'Grunge': 'grungy, worn, distressed, aged',
      'Clean': 'clean, minimal, simple, sharp',
    };

    enhancedPrompt += `, ${styleKeywords[style] || styleKeywords['Realistic']}`;
    enhancedPrompt += ', isolated object, decal, transparent background, no background, floating object, sticker style';

    const prediction = await replicate.predictions.create({
      version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        prompt: enhancedPrompt,
        negative_prompt: "background, scene, environment, landscape, blurry, low quality",
        width: 1024,
        height: 1024,
        num_outputs: 1,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        refine: "expert_ensemble_refiner",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Decal generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}