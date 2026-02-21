import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { image, resolution, format, userId, userEmail, predictionId } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // FIXED: Check credits properly
    if (supabase && userId) {
      const { data: userCredits, error } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (error) {
        console.error('Credit check error:', error);
      }

      if (!userCredits || userCredits.credits_remaining < 1) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
    }

    // FIXED: Using SDXL for panorama generation
    const prediction = await replicate.predictions.create({
      version: "39ed52f2a78e934b3ba6e2a89f5b1d712de7dfea535525255b1aa35c5565e08b",
      input: {
        image: image,
        prompt: "360 degree equirectangular HDRI panorama, photorealistic environment lighting, high dynamic range, seamless wrap-around view",
        prompt_strength: 0.7,
        num_inference_steps: 50,
        guidance_scale: 7.5,
      },
    });

    return NextResponse.json({ predictionId: prediction.id, status: prediction.status });

  } catch (error) {
    console.error('Image to HDRI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}