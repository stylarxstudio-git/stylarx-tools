import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req) {
  try {
    const { image, userId, userEmail, step, resolution, seamless } = await req.json();

    if (step === 'normal' || step === 'height') {
      const result = await fal.subscribe('fal-ai/imageutils/marigold-depth', {
        input: { image_url: image },
      });

      const imageUrl = result?.image?.url || result?.data?.image?.url;
      if (!imageUrl) throw new Error(`No ${step} map returned from fal`);

      return NextResponse.json({ status: 'succeeded', output: imageUrl, step });
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