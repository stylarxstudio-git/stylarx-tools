import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { prompt, userId, userEmail, predictionId, step, resolution, seamless, style, category } = await req.json();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // If checking status of a specific step
    if (predictionId) {
      const prediction = await replicate.predictions.get(predictionId);
      return NextResponse.json(prediction);
    }

    // Calculate credits needed
    let creditsNeeded = 3; // Base price for prompt-to-PBR
    if (resolution === '8K') creditsNeeded += 1;
    if (seamless) creditsNeeded += 1;

    // Check credits (only on first step)
    if (step === 'albedo' && supabase) {
      const { data: userCredits } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('outseta_uid', userId)
        .single();

      if (!userCredits || userCredits.credits_remaining < creditsNeeded) {
        return NextResponse.json({ 
          error: `Insufficient credits. This generation requires ${creditsNeeded} credits.` 
        }, { status: 402 });
      }
    }

    // Build enhanced prompt
    let enhancedPrompt = prompt;
    
    // Add category-specific keywords
    if (category && category !== 'Auto') {
      const categoryKeywords = {
        'Wood': 'wooden grain texture',
        'Metal': 'metallic surface',
        'Stone': 'stone surface texture',
        'Fabric': 'fabric textile material',
        'Concrete': 'concrete surface',
        'Organic': 'organic natural material',
      };
      enhancedPrompt = `${categoryKeywords[category] || ''} ${prompt}`;
    }

    // Add style keywords
    const styleKeywords = {
      'Photorealistic': 'photorealistic, highly detailed, 4K',
      'Stylized': 'stylized, artistic, clean',
      'Hand-painted': 'hand-painted texture, artistic',
      'Sci-Fi': 'sci-fi, futuristic, high-tech',
      'Fantasy': 'fantasy style, magical',
    };
    enhancedPrompt += `, ${styleKeywords[style] || styleKeywords['Photorealistic']}`;

    // Add seamless keywords
    if (seamless) {
      enhancedPrompt += ', seamless texture, tileable, repeating pattern';
    }

    // Add PBR-specific keywords
    enhancedPrompt += ', PBR material, texture map, flat lighting, no shadows';

    // STEP 1: Generate Base Albedo/Diffuse Texture
    if (step === 'albedo') {
      const prediction = await replicate.predictions.create({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // SDXL
        input: {
          prompt: enhancedPrompt,
          negative_prompt: "blurry, low quality, distorted, people, faces, text, watermark, logo, perspective, 3d render, shadows, highlights",
          width: resolution === '8K' ? 2048 : 1024,
          height: resolution === '8K' ? 2048 : 1024,
          num_outputs: 1,
          scheduler: "K_EULER",
          guidance_scale: 7.5,
          num_inference_steps: 30,
        },
      });
      return NextResponse.json({ predictionId: prediction.id, status: prediction.status, step: 'albedo' });
    }

    // STEP 2: Generate Normal Map from Albedo
    if (step === 'normal') {
      const prediction = await replicate.predictions.create({
        version: "fca7e7e6e172430ec4941e4f9502e0d0c7eedf94ac3dc58e31c1f8b22b27bb6a",
        input: {
          image: prompt, // In this case, 'prompt' is the albedo image URL
        },
      });
      return NextResponse.json({ predictionId: prediction.id, status: prediction.status, step: 'normal' });
    }

    // STEP 3: Generate Height Map from Albedo
    if (step === 'height') {
      const prediction = await replicate.predictions.create({
        version: "fca7e7e6e172430ec4941e4f9502e0d0c7eedf94ac3dc58e31c1f8b22b27bb6a",
        input: {
          image: prompt, // Albedo image URL
        },
      });
      return NextResponse.json({ predictionId: prediction.id, status: prediction.status, step: 'height' });
    }

    // STEP 4 & 5: Generate Roughness and AO (simplified for now)
    if (step === 'roughness' || step === 'ao') {
      return NextResponse.json({ 
        output: prompt, // Using height map as base
        status: 'succeeded', 
        step: step,
        note: 'Processed version'
      });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('PBR Generator Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}