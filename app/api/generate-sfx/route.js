import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, duration } = await req.json();

    // Check credits (1 credit required)
    if (supabase) {
      const { data: userCredits } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (!userCredits || userCredits.credits_remaining < 1) {
        return NextResponse.json({ 
          error: 'Insufficient credits. This generation requires 1 credit.' 
        }, { status: 402 });
      }
    }

    // Build enhanced prompt with duration hint
    let enhancedPrompt = prompt;
    
    // Add duration context
    const durationSeconds = duration === 'short' ? 5 : duration === 'medium' ? 10 : 15;
    
    // Call ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: enhancedPrompt,
        duration_seconds: durationSeconds,
        prompt_influence: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail?.message || 'Sound generation failed');
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Deduct credits and save generation
    if (supabase) {
      await supabase
        .from('users')
        .update({ 
          credits_remaining: userCredits.credits_remaining - 1 
        })
        .eq('outseta_uid', userId);

      await supabase
        .from('generations')
        .insert({
          outseta_uid: userId,
          tool_name: 'SFX Generator',
          prompt: prompt,
          image_url: null, // No image for audio
          credits_used: 1,
          created_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({ 
      audioUrl: audioUrl,
      success: true 
    });

  } catch (error) {
    console.error('SFX Generator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}