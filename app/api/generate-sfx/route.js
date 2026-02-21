import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, duration, predictionId } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Check status
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Check credits
    if (supabase && userId) {
      const { data: userCredits, error } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (error) {
        console.error('Credit check error:', error);
      }

      if (!userCredits || userCredits.credits_remaining < 1) {
        return NextResponse.json({ 
          error: 'Insufficient credits. This generation requires 1 credit.' 
        }, { status: 402 });
      }
    }

    // Map duration to seconds
    const durationMap = {
      'quick': 5,
      'auto': 10,
      'full': 15
    };

    // Use AudioLDM 2 for sound generation
    const prediction = await replicate.predictions.create({
      version: "b61392adecdd660326fc9cfc5398182437dbe5e97b5decfb36e1a36de5b8666f",
      input: {
        prompt: prompt,
        duration: durationMap[duration] || 10,
        num_inference_steps: 200,
        audio_length_in_s: durationMap[duration] || 10,
      },
    });

    return NextResponse.json({ 
      predictionId: prediction.id, 
      status: prediction.status 
    });

  } catch (error) {
    console.error('SFX Generator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## **NOW ADD MOTORICA API KEY:**

Go to https://motorica.ai and sign up, then add to `.env.local`:
```
MOTORICA_API_KEY=your_real_motorica_key_here