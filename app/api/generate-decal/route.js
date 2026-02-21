import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

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

    if (supabase) {
      const { data: userCredits } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (!userCredits || userCredits.credits_remaining < 1) {
        return NextResponse.json({ 
          error: 'Insufficient credits. This generation requires 1 credit.' 
        }, { status: 402 });
      }
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

    // FIXED: Using SDXL with refiner
    const prediction = await replicate.predictions.create({
      version: "39ed52f2a78e934b3ba6e2a89f5b1d712de7dfea535525255b1aa35c5565e08b",
      input: {
        prompt: enhancedPrompt,
        negative_prompt: "background, scene, environment, landscape, blurry, low quality",
        width: 1024,
        height: 1024,
        num_outputs: 1,
        scheduler: "K_EULER",
        guidance_scale: 7.5,
        num_inference_steps: 30,
      },
    });

    return NextResponse.json({ 
      predictionId: prediction.id, 
      status: prediction.status 
    });

  } catch (error) {
    console.error('Decal Generator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}