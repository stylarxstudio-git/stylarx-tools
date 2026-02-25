import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    // Step 1: Generate with Flux Schnell
    const fluxResult = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt: prompt.trim(),
        image_size: 'square_hd',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      },
    });

    const generatedUrl = fluxResult?.images?.[0]?.url || fluxResult?.data?.images?.[0]?.url;
    if (!generatedUrl) throw new Error('No image returned from Flux');

    // Step 2: Remove background with rembg
    const rembgResult = await fal.subscribe('fal-ai/imageutils/rembg', {
      input: { image_url: generatedUrl },
    });

    const finalUrl = rembgResult?.image?.url || rembgResult?.data?.image?.url;
    if (!finalUrl) throw new Error('Background removal failed');

    return NextResponse.json({ imageUrl: finalUrl });

  } catch (error) {
    console.error('Sticker generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate sticker' },
      { status: 500 }
    );
  }
}