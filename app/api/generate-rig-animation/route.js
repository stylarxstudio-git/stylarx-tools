import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // fal.subscribe waits until complete — no polling needed
    // Returns: { fbx_file: { url: string }, seed: number }
    const result = await fal.subscribe('fal-ai/hunyuan-motion', {
      input: { prompt: prompt.trim() },
      logs: true,
    });

    const fbxUrl =
      result?.fbx_file?.url ||
      result?.data?.fbx_file?.url;

    if (!fbxUrl) {
      console.error('Full result:', JSON.stringify(result, null, 2));
      throw new Error('No FBX file returned');
    }

    return NextResponse.json({ status: 'succeeded', animationUrl: fbxUrl });

  } catch (error) {
    console.error('Animation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate animation' },
      { status: 500 }
    );
  }
}