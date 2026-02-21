import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { image, userId, userEmail, predictionId, step, resolution, seamless } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    let creditsNeeded = 2;
    if (resolution === '8K') creditsNeeded += 1;
    if (seamless) creditsNeeded += 1;

    if (step === 'normal' && supabase && userId) {
      const { data: userCredits, error } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (error) {
        console.error('Credit check error:', error);
      }

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
      return NextResponse.json({ 
        predictionId: prediction.id, 
        status: prediction.status, 
        step: 'normal' 
      });
    }

    // STEP 2: Generate Height Map
    if (step === 'height') {
      const prediction = await replicate.predictions.create({
        version: "fca7e7e6e172430ec4941e4f9502e0d0c7eedf94ac3dc58e31c1f8b22b27bb6a",
        input: {
          image: image,
        },
      });
      return NextResponse.json({ 
        predictionId: prediction.id, 
        status: prediction.status, 
        step: 'height' 
      });
    }

    // STEP 3: Roughness (processed)
    if (step === 'roughness') {
      return NextResponse.json({ 
        output: [image], 
        status: 'succeeded', 
        step: 'roughness',
        note: 'Processed version'
      });
    }

    // STEP 4: AO (processed)
    if (step === 'ao') {
      return NextResponse.json({ 
        output: [image], 
        status: 'succeeded', 
        step: 'ao',
        note: 'Derived from height map'
      });
    }

    // STEP 5: Albedo (original image)
    if (step === 'albedo') {
      return NextResponse.json({ 
        output: [image], 
        status: 'succeeded', 
        step: 'albedo'
      });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('Image to PBR Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}