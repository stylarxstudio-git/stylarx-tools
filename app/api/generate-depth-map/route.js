import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req) {
  try {
    const { image, userId, userEmail, predictionId } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    const prediction = await replicate.predictions.create({
      version: "6e31c31b0fbbe03993d941e77657a4d0e6e0925c989685eb98dcb14b9302fc54",
      input: {
        image: image,
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Depth map error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}