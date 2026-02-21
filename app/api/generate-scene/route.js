import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio, predictionId } = await req.json();

    // 1. Status Check Logic
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // 2. Aspect Ratio Mapping
    const ratioMap = { 
      landscape: "16:9", 
      portrait: "9:16", 
      square: "1:1" 
    };

    // 3. Start Prediction with a VALID 64-character Image-to-Image Version
    // This model (SDXL) is optimized for maintaining your uploaded object's shape
    const prediction = await replicate.predictions.create({
      version: "39ed52f2a78e934b3ba6e2a89f5b1d712de7dfea535525255b1aa35c5565e08b", 
      input: {
        prompt: `A professional cinematic environment, ${prompt}, 8k resolution, highly detailed, photorealistic lighting, matching shadows`,
        image: image,
        prompt_strength: 0.8, // Higher = more background change, Lower = keeps original more
        num_inference_steps: 50,
        guidance_scale: 7.5,
        scheduler: "K_EULER_ANCESTRAL",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Replicate API Error:', error);
    // Returning the exact error helps debug if it's a token or a parameter issue
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}