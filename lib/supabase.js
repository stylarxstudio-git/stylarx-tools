import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not set. Credits system will be disabled.');
  console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'MISSING');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase initialized successfully');
}

export { supabase };