import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export const maxDuration = 180;

async function toFalUrl(image) {
  if (image.startsWith('http')) return image;
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: 'image/png' });
  const file = new File([blob], 'upload.png', { type: 'image/png' });
  return await fal.storage.upload(file);
}

// Convert depth greyscale → proper RGB normal map on the server
// Uses a Sobel filter on the depth data to compute surface normals
function depthToNormalMap(depthBase64) {
  // We'll do this client-side via canvas instead — return the depth for now
  // and let the page convert it. Signal with a special key.
  return depthBase64;
}

export async function POST(req) {
  try {
    const { image, step } = await req.json();

    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const imageUrl = await toFalUrl(image);

    if (step === 'depth') {
      // Raw depth map — used for height map AND to derive normal map
      const result = await fal.subscribe('fal-ai/imageutils/marigold-depth', {
        input: { image_url: imageUrl },
        logs: true,
      });
      const outputUrl = result?.image?.url || result?.data?.image?.url;
      if (!outputUrl) throw new Error('No depth map returned');
      return NextResponse.json({ status: 'succeeded', output: outputUrl });
    }

    if (step === 'normal') {
      // Use IC-Light or a proper normal map model
      // fal-ai/bria/normal-map generates proper blue-channel normal maps
      const result = await fal.subscribe('fal-ai/bria/normal-map', {
        input: { image_url: imageUrl },
        logs: true,
      });
      const outputUrl = result?.image?.url || result?.data?.image?.url
        || result?.normal_map?.url || result?.data?.normal_map?.url;
      if (!outputUrl) throw new Error('No normal map returned');
      return NextResponse.json({ status: 'succeeded', output: outputUrl });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('Image to PBR error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}