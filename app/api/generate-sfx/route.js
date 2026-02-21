import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, duration, predictionId } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    const durationMap = {
      quick: 8,
      auto: 10,
      full: 15
    };

    const prediction = await replicate.predictions.create({
      version: "80e6ba42c43c8c03e4b29f8f0f5cdb45ff9de18a1ffff1af27913a9dcdadb21b",
      input: {
        prompt: prompt,
        duration: durationMap[duration] || 10,
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('SFX generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}