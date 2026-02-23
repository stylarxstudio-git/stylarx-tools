import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export const maxDuration = 120;

export async function POST(request) {
  try {
    const { lines } = await request.json();

    if (!lines?.length) {
      return NextResponse.json({ error: 'No dialogue lines provided' }, { status: 400 });
    }

    // Build the text string with [S1] [S2] speaker tags
    // lines = [{ speaker: 1|2, text: string }, ...]
    const text = lines
      .map(line => `[S${line.speaker}] ${line.text.trim()}`)
      .join('\n');

    if (!text.trim()) {
      return NextResponse.json({ error: 'Dialogue is empty' }, { status: 400 });
    }

    // fal-ai/dia-tts — input: { text }, output: { audio: { url } }
    const result = await fal.subscribe('fal-ai/dia-tts', {
      input: { text },
      logs: true,
    });

    const audioUrl =
      result?.audio?.url ||
      result?.data?.audio?.url;

    if (!audioUrl) {
      console.error('dia-tts full result:', JSON.stringify(result, null, 2));
      throw new Error('No audio returned from model');
    }

    return NextResponse.json({ status: 'succeeded', audioUrl });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate audio' },
      { status: 500 }
    );
  }
}