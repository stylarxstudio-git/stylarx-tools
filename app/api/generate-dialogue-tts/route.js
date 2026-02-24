import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export const maxDuration = 60;

// Female voices for S1, male voices for S2 (distinct by default)
const S1_VOICE = 'af_heart';   // warm female
const S2_VOICE = 'am_echo';    // clear male

export async function POST(request) {
  try {
    const { lines } = await request.json();

    if (!lines?.length) {
      return NextResponse.json({ error: 'No dialogue lines provided' }, { status: 400 });
    }

    const validLines = lines.filter(l => l.text?.trim());
    if (!validLines.length) {
      return NextResponse.json({ error: 'Dialogue is empty' }, { status: 400 });
    }

    // Generate each line individually with the correct voice
    // Run all in parallel for speed
    const audioPromises = validLines.map(line =>
      fal.subscribe('fal-ai/kokoro/american-english', {
        input: {
          prompt: line.text.trim(),
          voice: line.speaker === 1 ? S1_VOICE : S2_VOICE,
        },
      })
    );

    const results = await Promise.all(audioPromises);

    // Collect ordered audio URLs
    const audioUrls = results.map((result, i) => {
      const url = result?.audio?.url || result?.data?.audio?.url;
      if (!url) throw new Error(`No audio for line ${i + 1}`);
      return url;
    });

    return NextResponse.json({ status: 'succeeded', audioUrls });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate audio' },
      { status: 500 }
    );
  }
}