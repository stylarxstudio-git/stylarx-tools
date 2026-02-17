import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req) {
  try {
    const { image, prompt, aspectRatio, predictionId } = await req.json();

    // If we have a predictionId, we are just checking the status
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Otherwise, we are starting a new prediction
    const ratioMap = { landscape: "16:9", portrait: "9:16", square: "1:1" };

    const prediction = await replicate.predictions.create({
      // Replace with your chosen model version ID from Replicate
      version: "f46c6460-6453-41c6-9c4c-47407a508f7b", 
      input: {
        image: image,
        prompt: prompt,
        aspect_ratio: ratioMap[aspectRatio] || "1:1",
      },
    });

    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}