import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

async function toFalUrl(image) {
  // If it's already a real URL, use it directly
  if (image.startsWith('http')) return image;

  // If it's base64, upload it to fal's storage first
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: 'image/png' });
  const file = new File([blob], 'upload.png', { type: 'image/png' });
  const url = await fal.storage.upload(file);
  return url;
}

export async function POST(req) {
  try {
    const { image, userId, userEmail, step, resolution, seamless } = await req.json();

    if (step === 'normal' || step === 'height') {
      const imageUrl = await toFalUrl(image);

      const result = await fal.subscribe('fal-ai/imageutils/marigold-depth', {
        input: { image_url: imageUrl },
      });

      const outputUrl = result?.image?.url || result?.data?.image?.url;
      if (!outputUrl) throw new Error(`No ${step} map returned from fal`);

      return NextResponse.json({ status: 'succeeded', output: outputUrl, step });
    }

    if (step === 'roughness' || step === 'ao') {
      return NextResponse.json({ output: image, status: 'succeeded', step });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('Image to PBR error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}