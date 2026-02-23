import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'audio/mpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ url: dataUrl, name: file.name });

  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}