import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, duration, format, quality, fps, loopable, userId, userEmail, predictionId } = body;

    // Check if API key exists
    if (!process.env.MOTORICA_API_KEY || process.env.MOTORICA_API_KEY === 'your_motorica_api_key_here') {
      return NextResponse.json(
        { error: 'Motorica API key not configured. Please add MOTORICA_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    // If checking existing prediction
    if (predictionId) {
      const checkResponse = await fetch(`https://api.motorica.ai/v1/animations/${predictionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MOTORICA_API_KEY}`,
        },
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to check animation status');
      }

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
        quality: quality,
        fps: fps,
        loopable: loopable,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Motorica API Error:', errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid Motorica API key');
      } else {
        throw new Error(`Animation generation failed: ${response.statusText}`);
      }
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