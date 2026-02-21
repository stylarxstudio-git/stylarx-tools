import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { image, userId, userEmail, predictionId } = await req.json();

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
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
    }

    // FIXED: Correct Depth-Anything-V2 version
    const prediction = await replicate.predictions.create({
      version: "fca7e7e6e172430ec4941e4f9502e0d0c7eedf94ac3dc58e31c1f8b22b27bb6a",
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