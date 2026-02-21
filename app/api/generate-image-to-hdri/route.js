import { NextResponse } from 'next/server';
import Replicate from 'replicate';

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

    const prediction = await replicate.predictions.create({
      version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        image: image,
        prompt: "360 degree equirectangular HDRI panorama, photorealistic environment lighting, high dynamic range, seamless wrap-around view",
        prompt_strength: 0.7,
        num_inference_steps: 50,
        guidance_scale: 7.5,
        refine: "expert_ensemble_refiner",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Image to HDRI error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}