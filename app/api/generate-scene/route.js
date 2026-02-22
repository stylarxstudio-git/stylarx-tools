import { NextResponse } from 'next/server';
import * as fal from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio } = await req.json();

    // Map your aspect ratio values to fal's format
    const aspectRatioMap = {
      landscape: '16:9',
      square: '1:1',
      portrait: '9:16',
    };

    const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        image_url: image,
        prompt: `A cinematic professional background for this object: ${prompt}. Photorealistic lighting, 8k, highly detailed environment.`,
        strength: 0.8,
        num_inference_steps: 50,
        guidance_scale: 7.5,
      },
    });

    // fal returns images array, we normalize it to match what your page.js expects
    return NextResponse.json({
      status: 'succeeded',
      output: [result.images[0].url],
    });

  } catch (error) {
    console.error('Scene generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}