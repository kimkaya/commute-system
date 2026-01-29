// =====================================================
// Supabase 클라이언트 초기화
// =====================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 설정 (환경변수 또는 기본값)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://waazyjqdjdrnvcmymcga.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HDFqVXibdFC8zTsdGfNqSQ_TZnaM23F').trim();

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
