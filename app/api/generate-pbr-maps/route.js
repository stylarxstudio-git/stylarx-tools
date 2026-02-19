import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { image, userId, userEmail, predictionId, step } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // If checking status of a specific step
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Check credits (only on first step)
    if (step === 'normal' && supabase) {
      const { data: userCredits } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (!userCredits || userCredits.credits_remaining < 2) {
        return NextResponse.json({ error: 'Insufficient credits. This tool requires 2 credits.' }, { status: 402 });
      }
    }

    // STEP 1: Generate Normal Map
    if (step === 'normal') {
      const prediction = await replicate.predictions.create({
        version: "fca7e7e6e172430ec4941e4f9502e0d0c7eedf94ac3dc58e31c1f8b22b27bb6a", // Normal map model
        input: {
          image: image,
        },
      });
      return NextResponse.json({ predictionId: prediction.id, status: prediction.status, step: 'normal' });
    }

    // STEP 2: Generate Height/Depth Map
    if (step === 'height') {
      const prediction = await replicate.predictions.create({
        version: "3d62e18c9e6171b0d175a1287f85970f7e04e15d39c0f8c9e9c2e6e5d7a3f3f9", // Depth-Anything-V2
        input: {
          image: image,
        },
      });
      return NextResponse.json({ predictionId: prediction.id, status: prediction.status, step: 'height' });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('PBR Maps Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}