import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio, predictionId } = await req.json();

    // Check status of existing prediction
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Start new prediction with FLUX DEV (best quality)
    const ratioMap = { 
      landscape: "16:9", 
      portrait: "9:16", 
      square: "1:1" 
    };

    const prediction = await replicate.predictions.create({
      // FLUX DEV - Latest version (check Replicate for updates)
      version: "d5b35b8ef5e74c16e7e2ec54f87f0d7c9e05c0b4", // Latest Flux Dev
      input: {
        prompt: `${prompt}. Professional 3D render, high quality, photorealistic lighting, detailed environment, cinematic composition`,
        image: image, // Your uploaded 3D model
        aspect_ratio: ratioMap[aspectRatio] || "1:1",
        num_inference_steps: 50, // Higher = better quality
        guidance_scale: 7.5, // How closely to follow prompt
        num_outputs: 1,
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Scene stager error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}