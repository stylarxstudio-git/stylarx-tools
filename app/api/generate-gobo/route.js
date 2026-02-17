import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail } = await req.json();

    // 1. INITIALIZE REPLICATE INSIDE THE POST (Ensures env vars are loaded)
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 2. CHECK CREDITS (Looking in 'users' table by email)
    const { data: userCredits, error: fetchError } = await supabase
      .from('users')
      .select('credits_remaining, credits_used_this_month')
      .eq('email', userEmail)
      .maybeSingle();

    if (fetchError || !userCredits || userCredits.credits_remaining < 1) {
      return NextResponse.json({ 
        error: `Insufficient credits. Email: ${userEmail}` 
      }, { status: 402 });
    }

    // 3. RUN GENERATION
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: `A high-contrast black and white lighting gobo stencil, ${prompt}, flat vector silhouette, pure black background, pure white pattern, sharp edges, 8k resolution.`,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "webp"
        }
      }
    );

    const generatedImageUrl = output[0];

    // 4. DEDUCT CREDIT
    await supabase
      .from('users')
      .update({ 
        credits_remaining: userCredits.credits_remaining - 1,
        credits_used_this_month: (userCredits.credits_used_this_month || 0) + 1 
      })
      .eq('email', userEmail);

    // 5. SAVE TO GENERATIONS TABLE (Updated columns to match your screenshot)
    const { error: historyError } = await supabase
      .from('generations')
      .insert([{
        user_uid: userId,           // Column from Screenshot 2026-02-15 203038
        user_email: userEmail,      // Column from Screenshot 2026-02-15 203038
        prompt: prompt,
        image_url: generatedImageUrl,
        result_url: generatedImageUrl,
        tool_name: 'Gobo Generator',
        tool_id: 'gobo-generator',
        credits_used: 1,
        status: 'Successful'
      }]);

    if (historyError) console.error("History Log Error:", historyError);

    return NextResponse.json({ imageUrl: generatedImageUrl });

  } catch (error) {
    console.error("AI Error:", error);
    // If Replicate fails with 401, this will now show in your console log
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}