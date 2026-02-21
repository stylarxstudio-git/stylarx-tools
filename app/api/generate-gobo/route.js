import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, predictionId } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    const enhancedPrompt = `High-contrast black and white gobo lighting stencil: ${prompt}. Clean silhouette, connected shapes, no floating elements, professional theater lighting pattern, sharp edges`;

    const prediction = await replicate.predictions.create({
      version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        prompt: enhancedPrompt,
        negative_prompt: "color, gradient, blurry, low quality, gray, shadows",
        width: 1024,
        height: 1024,
        num_outputs: 1,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        refine: "expert_ensemble_refiner",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Gobo generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}