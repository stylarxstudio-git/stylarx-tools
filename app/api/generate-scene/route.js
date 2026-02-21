import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ... (imports)

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio, predictionId } = await req.json();

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    const ratioMap = { landscape: "16:9", portrait: "9:16", square: "1:1" };

    const prediction = await replicate.predictions.create({
      // NEW: This is the FLUX FILL model (supports Image + Prompt)
      version: "b572236968846c2415d86237199c0b93850b1821035b8630737a90967396696d", 
      input: {
        // The image you uploaded (the positioned 3D model)
        image: image, 
        // We tell it to keep your model and build the environment
        prompt: `A professional cinematic scene around this object: ${prompt}. High quality, 8k, photorealistic.`,
        aspect_ratio: ratioMap[aspectRatio] || "1:1",
        guidance_scale: 30, // Higher guidance helps with image-to-image
        num_inference_steps: 50,
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Scene stager error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}