import { NextResponse } from 'next/server';
import { fal } from "@fal-ai/client";

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, duration, format, seed, predictionId } = body;

    // Use FAL_KEY from your .env.local
    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: 'Fal API key not configured. Add FAL_KEY to .env.local' },
        { status: 500 }
      );
    }

    // 1. Check Status if predictionId is provided
    if (predictionId) {
      const status = await fal.queue.status("fal-ai/hunyuan-motion/fast", { 
        requestId: predictionId 
      });
      
      // If finished, get the result
      if (status.status === "COMPLETED") {
        const result = await fal.queue.result("fal-ai/hunyuan-motion/fast", { 
          requestId: predictionId 
        });
        return NextResponse.json({
          status: 'completed',
          animationUrl: result.fbx_file?.url, // Hunyuan Motion returns fbx_file object
        });
      }
      
      return NextResponse.json({ status: status.status.toLowerCase() });
    }

    // 2. Start new generation
    // Hunyuan Motion specific parameters
    const { request_id } = await fal.queue.submit("fal-ai/hunyuan-motion/fast", {
      input: {
        prompt: prompt,
        duration: duration || 5, // Default 5s
        output_format: format.toLowerCase(), // 'fbx' or 'dict'
        seed: seed || Math.floor(Math.random() * 1000000),
      },
    });

    return NextResponse.json({
      predictionId: request_id,
      status: 'starting',
    });

  } catch (error) {
    console.error('Fal Animation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate motion' },
      { status: 500 }
    );
  }
}