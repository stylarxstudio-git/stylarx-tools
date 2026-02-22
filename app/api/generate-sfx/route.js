import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({
  credentials: process.env.FAL_KEY,
});

const durationMap = {
  quick: 8,
  auto: 10,
  full: 15,
};

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, duration, format } = await req.json();

    const result = await fal.subscribe('fal-ai/elevenlabs/sound-effects/v2', {
      input: {
        text: prompt,
        duration_seconds: durationMap[duration] || 10,
      },
    });

    const audioUrl = result?.audio?.url || result?.data?.audio?.url || result?.audio_url;

    if (!audioUrl) throw new Error('No audio returned from fal');

    return NextResponse.json({
      audioUrl: audioUrl,
    });

  } catch (error) {
    console.error('SFX generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}