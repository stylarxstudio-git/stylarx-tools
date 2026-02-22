import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio } = await req.json();

    const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
  input: {
    image_url: image,
    prompt: `Place this exact 3D object into a photorealistic scene: ${prompt}. Keep the object exactly as it is, only generate the environment around it. Cinematic lighting, 8k, highly detailed.`,
    guidance_scale: 7.5,
    num_inference_steps: 50,
  },
});

    // Log the result so we can see its structure
    console.log('FAL RESULT:', JSON.stringify(result));

    // fal sometimes returns result.data.images or result.images
    const images = result?.images || result?.data?.images;
    const imageUrl = images?.[0]?.url || images?.[0];

    if (!imageUrl) {
      throw new Error('No image returned from fal');
    }

    return NextResponse.json({
      status: 'succeeded',
      output: [imageUrl],
    });

  } catch (error) {
    console.error('Scene generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}