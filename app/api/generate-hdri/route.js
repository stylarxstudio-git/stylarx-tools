import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req) {
  try {
    const { prompt, resolution, format, userId, userEmail, predictionId } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    const resolutionMap = {
      '1K': 1024,
      '2K': 2048,
      '4K': 4096,
      '8K': 8192,
    };

    const size = resolutionMap[resolution] || 2048;

    const prediction = await replicate.predictions.create({
      version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        prompt: `360 degree equirectangular HDRI environment: ${prompt}. Seamless panorama, photorealistic lighting, high dynamic range`,
        width: size,
        height: size / 2,
        num_outputs: 1,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        refine: "expert_ensemble_refiner",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('HDRI generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}