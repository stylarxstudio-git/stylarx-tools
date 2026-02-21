import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio, predictionId } = await req.json();

    // 1. Status Check: For polling the result
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // 2. Map Aspect Ratios
    const ratioMap = { landscape: "16:9", portrait: "9:16", square: "1:1" };

    // 3. Create Prediction: Using a verified SDXL Image-to-Image version
    const prediction = await replicate.predictions.create({
      // Confirmed 64-character SDXL version hash
      version: "39ed52f2a78e934b3ba6e2a89f5b1d712de7dfea535525255b1aa35c5565e08b", 
      input: {
        prompt: `A cinematic professional background for this object: ${prompt}. Photorealistic lighting, 8k, highly detailed environment.`,
        image: image, // Your 3D model screenshot
        prompt_strength: 0.8, // Adjust to keep your model more (lower) or less (higher) intact
        num_inference_steps: 50,
        guidance_scale: 7.5,
        scheduler: "K_EULER_ANCESTRAL",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Scene generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}