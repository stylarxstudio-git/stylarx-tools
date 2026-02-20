import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, duration, format, userId, userEmail, predictionId } = body;

    // If checking existing prediction
    if (predictionId) {
      const checkResponse = await fetch(`https://api.motorica.ai/v1/animations/${predictionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MOTORICA_API_KEY}`,
        },
      });

      const prediction = await checkResponse.json();
      return NextResponse.json(prediction);
    }

    // Create new animation
    const response = await fetch('https://api.motorica.ai/v1/animations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MOTORICA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        duration: duration,
        format: format.toLowerCase(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Animation generation failed');
    }

    const data = await response.json();

    return NextResponse.json({
      predictionId: data.id,
      status: data.status,
      animationUrl: data.output_url || null,
    });

  } catch (error) {
    console.error('Animation API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate animation' },
      { status: 500 }
    );
  }
}