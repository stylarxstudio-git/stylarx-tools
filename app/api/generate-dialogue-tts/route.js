import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert the file to a Buffer then upload to fal storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a Blob from the buffer with the correct mime type
    const blob = new Blob([buffer], { type: file.type || 'audio/mpeg' });

    const uploadedUrl = await fal.storage.upload(blob, {
      filename: file.name || 'reference.mp3',
    });

    return NextResponse.json({ url: uploadedUrl });

  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}