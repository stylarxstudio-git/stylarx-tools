import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { image, userId, userEmail, predictionId } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // If checking status
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Check credits
    if (supabase) {
      const { data: userCredits } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (!userCredits || userCredits.credits_remaining < 1) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
    }

    // Start prediction with Depth-Anything-V2
    const prediction = await replicate.predictions.create({
      version: "3d62e18c9e6171b0d175a1287f85970f7e04e15d39c0f8c9e9c2e6e5d7a3f3f9",
      input: {
        image: image,
      },
    });

    return NextResponse.json({ predictionId: prediction.id, status: prediction.status });

  } catch (error) {
    console.error('Depth Map Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}