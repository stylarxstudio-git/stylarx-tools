import { supabase } from './supabase';

if (!supabase) {
  console.warn('⚠️ Supabase not initialized. Credits functions will not work.');
}

// 1. THE AUTO-CREATE ENGINE (Already tested and working for you)
export async function initializeUserCredits(outsetaUid, email, name, planName = 'Pro Plan') {
  if (!supabase) throw new Error('Supabase not initialized');
  
  console.log('📡 Sending data to Supabase for user:', email);

  const { data, error } = await supabase
    .from('users')
    .insert([
      { 
        outseta_uid: outsetaUid, 
        email: email,
        name: name,
        plan_name: planName,
        credits_remaining: 100,
        credits_used_this_month: 0,
        monthly_credit_limit: 100
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase Insert Error:', error.message);
    throw error;
  }

  console.log('🎉 Row created successfully:', data);
  return data;
}

// 2. THE CHECKER (Finds existing users)
export async function getUserCredits(outsetaUid) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('outseta_uid', outsetaUid)
    .single();

  if (error && error.code !== 'PGRST116') { 
    console.error('❌ Error fetching credits:', error.message);
  }
  
  return data;
}

// 3. THE CHARGING SYSTEM (Subtracts credits when they use a tool)
export async function deductCredits(outsetaUid, amount = 1) {
  if (!supabase) throw new Error('Supabase not initialized');

  // First, see how many they have
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('credits_remaining, credits_used_this_month')
    .eq('outseta_uid', outsetaUid)
    .single();

  if (fetchError || !user) throw new Error('User not found');
  if (user.credits_remaining < amount) throw new Error('Insufficient credits');

  // Then, subtract the amount
  const { data, error } = await supabase
    .from('users')
    .update({
      credits_remaining: user.credits_remaining - amount,
      credits_used_this_month: (user.credits_used_this_month || 0) + amount
    })
    .eq('outseta_uid', outsetaUid)
    .select()
    .single();

  if (error) {
    console.error('❌ Deduct Error:', error.message);
    throw error;
  }
  
  return data;
}