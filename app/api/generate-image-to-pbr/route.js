import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req) {
  try {
    const { image, userId, userEmail, predictionId, step, resolution, seamless } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    if (step === 'normal' || step === 'height') {
      const prediction = await replicate.predictions.create({
        version: "6e31c31b0fbbe03993d941e77657a4d0e6e0925c989685eb98dcb14b9302fc54",
        input: {
          image: image,
        },
      });
      return NextResponse.json({ 
        predictionId: prediction.id, 
        status: prediction.status, 
        step: step 
      });
    }

    if (step === 'roughness' || step === 'ao' || step === 'albedo') {
      return NextResponse.json({ 
        output: [image], 
        status: 'succeeded', 
        step: step
      });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('Image to PBR error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}