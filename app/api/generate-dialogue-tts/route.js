import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export const maxDuration = 120;

export async function POST(request) {
  try {
    const { lines, refAudioUrl, refText } = await request.json();

    if (!lines?.length) {
      return NextResponse.json({ error: 'No dialogue lines provided' }, { status: 400 });
    }

    const text = lines
      .map(line => `[S${line.speaker}] ${line.text.trim()}`)
      .join('\n');

    if (!text.trim()) {
      return NextResponse.json({ error: 'Dialogue is empty' }, { status: 400 });
    }

    const useVoiceClone = !!(refAudioUrl && refText?.trim());

    let result;

    if (useVoiceClone) {
      // If it's a base64 data URL, upload to fal storage first to get a real URL
      let audioUrl = refAudioUrl;
      if (refAudioUrl.startsWith('data:')) {
        const base64Data = refAudioUrl.split(',')[1];
        const mimeType = refAudioUrl.split(';')[0].split(':')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: mimeType });
        audioUrl = await fal.storage.upload(blob);
      }

      result = await fal.subscribe('fal-ai/dia-tts/voice-clone', {
        input: {
          text,
          ref_audio_url: audioUrl,
          ref_text: refText.trim(),
        },
        logs: true,
      });
    } else {
      result = await fal.subscribe('fal-ai/dia-tts', {
        input: { text },
        logs: true,
      });
    }

    const audioUrl = result?.audio?.url || result?.data?.audio?.url;

    if (!audioUrl) {
      console.error('dia-tts result:', JSON.stringify(result, null, 2));
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