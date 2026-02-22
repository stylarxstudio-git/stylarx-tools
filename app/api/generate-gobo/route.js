import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req) {
  try {
    const { prompt, userId, userEmail } = await req.json();

    const result = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt: prompt,
        negative_prompt: "color, gradient, blurry, low quality, gray, shadows",
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: 25,
        guidance_scale: 7.5,
        num_images: 1,
      },
    });

    const images = result?.images || result?.data?.images;
    const imageUrl = images?.[0]?.url || images?.[0];

    if (!imageUrl) throw new Error('No image returned from fal');

    return NextResponse.json({
      status: 'succeeded',
      output: [imageUrl],
    });

  } catch (error) {
    console.error('Gobo generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}