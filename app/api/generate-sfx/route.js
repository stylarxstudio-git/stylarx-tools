import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req) {
  try {
    const body = await req.json();
    const { prompt, userId, userEmail, duration, predictionId } = body;

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Check prediction status
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Map duration to seconds
    const durationMap = {
      quick: 5,
      auto: 10,
      full: 15
    };

    const durationSeconds = durationMap[duration] || 10;

    // Create new prediction with AudioLDM 2
    const prediction = await replicate.predictions.create({
      version: "b61392adecdd660326fc9cfc5398182437dbe5e97b5decfb36e1a36de5b8666f",
      input: {
        prompt: prompt,
        duration: durationSeconds,
        num_inference_steps: 200,
        audio_length_in_s: durationSeconds,
      },
    });

    return NextResponse.json({ 
      predictionId: prediction.id, 
      status: prediction.status 
    });

  } catch (error) {
    console.error('SFX Generator Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate sound' },
      { status: 500 }
    );
  }
}