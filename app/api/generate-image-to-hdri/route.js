import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { image, resolution, format, userId, userEmail, predictionId } = await req.json();

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

    // Start prediction
    const prediction = await replicate.predictions.create({
      version: "854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56472a247b",
      input: {
        image: image,
        prompt: "360 degree equirectangular HDRI panorama, photorealistic environment lighting, high dynamic range, seamless wrap-around view",
        num_outputs: 1,
        aspect_ratio: "21:9",
        output_format: "png",
      },
    });

    return NextResponse.json({ predictionId: prediction.id, status: prediction.status });

  } catch (error) {
    console.error('Image to HDRI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}