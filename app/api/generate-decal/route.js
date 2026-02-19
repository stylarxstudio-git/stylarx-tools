import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, predictionId, decalType, style } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // If checking status of existing prediction
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Check credits (1 credit required)
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

    // Build enhanced prompt
    let enhancedPrompt = prompt;

    // Add decal type context
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

    // Add style keywords
    const styleKeywords = {
      'Realistic': 'photorealistic, highly detailed, 8K, professional',
      'Stylized': 'stylized, artistic, clean edges',
      'Grunge': 'grungy, worn, distressed, aged',
      'Clean': 'clean, minimal, simple, sharp',
    };

    enhancedPrompt += `, ${styleKeywords[style] || styleKeywords['Realistic']}`;

    // Critical for transparency
    enhancedPrompt += ', isolated object, decal, transparent background, no background, floating object, sticker style';

    // Start generation with Recraft V3
    const prediction = await replicate.predictions.create({
      version: "40d1ea1df5386c6b1d5c0c8d3c6b03b6c5e8a8a8a8a8a8a8a8a8a8a8a8a8a8a8", // Recraft V3 version - NEEDS TO BE UPDATED
      input: {
        prompt: enhancedPrompt,
        style: "realistic_image",
        output_format: "png",
        aspect_ratio: "1:1",
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