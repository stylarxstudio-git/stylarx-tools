import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

const resolutionMap = {
  '1K': { width: 1024, height: 512 },
  '2K': { width: 2048, height: 1024 },
  '4K': { width: 4096, height: 2048 },
  '8K': { width: 8192, height: 4096 },
};

export async function POST(req) {
  try {
    const { prompt, resolution, format, userId, userEmail } = await req.json();

    const size = resolutionMap[resolution] || resolutionMap['2K'];

    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: `360 degree equirectangular panoramic HDRI environment map, ${prompt}. Seamless spherical panorama, photorealistic physically-based lighting, high dynamic range, smooth horizon, no visible seams, professional studio HDRI, uniform light distribution around full 360 degrees, ultra detailed`,
        negative_prompt: "seams, cuts, edges, distortion, people, text, watermark, fisheye, black bars",
        image_size: { width: size.width, height: size.height },
        num_inference_steps: 28,
        guidance_scale: 3.5,
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
    console.error('HDRI generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}