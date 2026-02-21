import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio, predictionId } = await req.json();

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    const ratioMap = { landscape: "16:9", portrait: "9:16", square: "1:1" };

    // FIXED: Using correct SDXL img2img
    const prediction = await replicate.predictions.create({
      version: "39ed52f2a78e934b3ba6e2a89f5b1d712de7dfea535525255b1aa35c5565e08b",
      input: {
        prompt: `A cinematic professional background for this object: ${prompt}. Photorealistic lighting, 8k, highly detailed environment.`,
        image: image,
        prompt_strength: 0.8,
        num_inference_steps: 50,
        guidance_scale: 7.5,
        scheduler: "K_EULER",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Scene generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}