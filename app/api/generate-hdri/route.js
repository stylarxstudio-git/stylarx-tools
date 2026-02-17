import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req) {
  try {
    const { prompt, predictionId } = await req.json();

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    const prediction = await replicate.predictions.create({
      // High-quality Panorama model
      version: "7e15d8f6-placeholder-id-for-panorama-model", 
      input: {
        prompt: `${prompt}, 360 degree equirectangular panorama, hdri, photorealistic, 8k`,
        aspect_ratio: "2:1",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}