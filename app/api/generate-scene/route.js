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
        prompt: `Place this exact 3D object into a photorealistic scene: ${prompt}. Keep the object exactly as it is, only generate the environment around it. Bright golden hour sunlight, vivid warm cinematic lighting, sharp crisp details on the foreground object, photorealistic 8k, high contrast, vibrant colors, depth of field with sharp subject, professional photography.`,
        strength: 0.65,
        num_inference_steps: 50,
        guidance_scale: 12,
      },
    });

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