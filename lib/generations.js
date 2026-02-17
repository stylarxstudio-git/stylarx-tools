import { supabase } from './supabase';

export async function saveGeneration({ outsetaUid, toolName, prompt, imageUrl, creditsUsed = 1 }) {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('generations')
    .insert([
      {
        user_uid: outsetaUid,
        tool_name: toolName,
        prompt: prompt,
        image_url: imageUrl,
        credits_used: creditsUsed,
        status: 'Successful'
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving generation:', error.message);
    throw error;
  }
  return data;
}

export async function getGenerationStats(outsetaUid) {
  if (!supabase) return { totalGenerations: 0 };

  const { count, error } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_uid', outsetaUid);

  if (error) {
    console.error('❌ Error fetching stats:', error.message);
    return { totalGenerations: 0 };
  }
  
  return { totalGenerations: count || 0 };
}

// UPDATED: Added 30-day logic
export async function getRecentActivity(outsetaUid, limit = 5) {
  if (!supabase) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from('generations')
    .select('*')
    .eq('user_uid', outsetaUid)
    .gte('created_at', thirtyDaysAgo.toISOString()) // Only last 30 days
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return [];
  return data;
}

// NEW: Delete function
export async function deleteGeneration(id) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('generations')
    .delete()
    .eq('id', id);
  return !error;
}