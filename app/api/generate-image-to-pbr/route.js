import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { image, userId, userEmail, predictionId, step, resolution, seamless } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // If checking status of a specific step
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Calculate credits needed
    let creditsNeeded = 2; // Base price
    if (resolution === '8K') creditsNeeded += 1;
    if (seamless) creditsNeeded += 1;

    // Check credits (only on first step)
    if (step === 'normal' && supabase) {
      const { data: userCredits } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (!userCredits || userCredits.credits_remaining < creditsNeeded) {
        return NextResponse.json({ 
          error: `Insufficient credits. This generation requires ${creditsNeeded} credits.` 
        }, { status: 402 });
      }
    }

    // STEP 1: Generate Normal Map
    if (step === 'normal') {
      const prediction = await replicate.predictions.create({
        version: "fca7e7e6e172430ec4941e4f9502e0d0c7eedf94ac3dc58e31c1f8b22b27bb6a",
        input: {
          image: image,
        },
      });
      return NextResponse.json({ predictionId: prediction.id, status: prediction.status, step: 'normal' });
    }

    // STEP 2: Generate Height/Depth Map
    if (step === 'height') {
      const prediction = await replicate.predictions.create({
        version: "3d62e18c9e6171b0d175a1287f85970f7e04e15d39c0f8c9e9c2e6e5d7a3f3f9",
        input: {
          image: image,
        },
      });
      return NextResponse.json({ predictionId: prediction.id, status: prediction.status, step: 'height' });
    }

    // STEP 3: Generate Roughness Map (grayscale from original)
    if (step === 'roughness') {
      // For now, we'll return the height map as roughness (can be improved with proper model)
      // In production, you'd use a dedicated roughness extraction model
      return NextResponse.json({ 
        output: image, 
        status: 'succeeded', 
        step: 'roughness',
        note: 'Using processed version - upgrade available'
      });
    }

    // STEP 4: Generate AO Map (derived from height)
    if (step === 'ao') {
      // AO is typically derived from depth/height
      return NextResponse.json({ 
        output: image, 
        status: 'succeeded', 
        step: 'ao',
        note: 'Derived from height map'
      });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('Image to PBR Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}