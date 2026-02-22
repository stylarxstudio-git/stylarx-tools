import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

async function toFalUrl(image) {
  if (image.startsWith('http')) return image;
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: 'image/png' });
  const file = new File([blob], 'upload.png', { type: 'image/png' });
  return await fal.storage.upload(file);
}

export async function POST(req) {
  try {
    const { image, format, userId, userEmail } = await req.json();

    const imageUrl = await toFalUrl(image);

    const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
      input: {
        image_url: imageUrl,
        prompt: '360 degree equirectangular panoramic HDRI environment map, photorealistic lighting, seamless spherical panorama, high dynamic range, smooth horizon, no visible seams, professional HDRI lighting environment',
        guidance_scale: 7.5,
        num_inference_steps: 50,
        strength: 0.75,
      },
    });

    const images = result?.images || result?.data?.images;
    const imageOutputUrl = images?.[0]?.url || images?.[0];
    if (!imageOutputUrl) throw new Error('No image returned from fal');

    return NextResponse.json({
      status: 'succeeded',
      output: [imageOutputUrl],
    });

  } catch (error) {
    console.error('Image to HDRI error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}