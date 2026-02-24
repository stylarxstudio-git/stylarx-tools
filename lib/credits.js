import { supabase } from './supabase';

if (!supabase) {
  console.warn('⚠️ Supabase not initialized. Credits functions will not work.');
}

export async function initializeUserCredits(outsetaUid, email, name, planName = 'Pro Plan') {
  if (!supabase) throw new Error('Supabase not initialized');
  const { data, error } = await supabase
    .from('users')
    .insert([{ 
      outseta_uid: outsetaUid, 
      email,
      name,
      plan_name: planName,
      credits_remaining: 100,
      credits_used_this_month: 0,
      monthly_credit_limit: 100
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

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

// NEW — call this BEFORE generation to block it if not enough credits
export async function checkCredits(outsetaUid, amount = 1) {
  if (!supabase) throw new Error('Supabase not initialized');
  const { data: user, error } = await supabase
    .from('users')
    .select('credits_remaining')
    .eq('outseta_uid', outsetaUid)
    .single();
  if (error || !user) throw new Error('Could not verify credits. Please try again.');
  if (user.credits_remaining < amount) {
    throw new Error(`You've used all your credits for this month. Your credits reset on your next billing date.`);
  }
  return true;
}

// Call this AFTER generation succeeds
export async function deductCredits(outsetaUid, amount = 1) {
  if (!supabase) throw new Error('Supabase not initialized');
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('credits_remaining, credits_used_this_month')
    .eq('outseta_uid', outsetaUid)
    .single();
  if (fetchError || !user) throw new Error('User not found');
  if (user.credits_remaining < amount) throw new Error('Insufficient credits');
  const { data, error } = await supabase
    .from('users')
    .update({
      credits_remaining: user.credits_remaining - amount,
      credits_used_this_month: (user.credits_used_this_month || 0) + amount
    })
    .eq('outseta_uid', outsetaUid)
    .select()
    .single();
  if (error) throw error;
  return data;
}