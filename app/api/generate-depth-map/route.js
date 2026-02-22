import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req) {
  try {
    const { image, userId, userEmail } = await req.json();

    const result = await fal.subscribe('fal-ai/imageutils/marigold-depth', {
      input: {
        image_url: image,
      },
    });

    const imageUrl = result?.image?.url || result?.data?.image?.url;

    if (!imageUrl) throw new Error('No depth map returned from fal');

    return NextResponse.json({
      status: 'succeeded',
      output: imageUrl,
    });

  } catch (error) {
    console.error('Depth map error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}