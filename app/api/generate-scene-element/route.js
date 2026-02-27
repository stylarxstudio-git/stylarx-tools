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

    // ENHANCED PROMPT for photorealism + clean cutout
    const enhancedPrompt = `${prompt.trim()}, professional product photography, isolated on pure white background, studio lighting, 8K resolution, highly detailed, photorealistic, sharp focus, macro photography, no shadows, centered composition, single subject only`;

    // Step 1: Generate with Flux Dev
    const fluxResult = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt: enhancedPrompt,
        image_size: 'square_hd', // 1024x1024
        num_inference_steps: 40, // INCREASED from 28 (better quality)
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false, // Don't block nature images
      },
    });

    const generatedUrl = fluxResult?.images?.[0]?.url || fluxResult?.data?.images?.[0]?.url;
    if (!generatedUrl) throw new Error('No image returned from Flux');

    // Step 2: Remove background with BiRefNet (better than rembg for nature)
    const birefnetResult = await fal.subscribe('fal-ai/birefnet', {
      input: { 
        image_url: generatedUrl,
      },
    });

    const finalUrl = birefnetResult?.image?.url || birefnetResult?.data?.image?.url;
    if (!finalUrl) throw new Error('Background removal failed');

    return NextResponse.json({ imageUrl: finalUrl });

  } catch (error) {
    console.error('Scene element generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate scene element' },
      { status: 500 }
    );
  }
}