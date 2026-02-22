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
        prompt: 'Expand this image into a full seamless 360 degree equirectangular panorama. Keep the original subject exactly as is in the center. Naturally extend the environment in all directions — left, right, above and below — maintaining the same lighting, atmosphere, color palette and style. The final image must be a wide 2:1 aspect ratio panoramic environment map with a natural horizon, smooth sky, and ground, with no borders, no black bars, no seams, photorealistic.',
        image_size: { width: 2048, height: 1024 },
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
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