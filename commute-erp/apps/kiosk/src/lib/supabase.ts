// =====================================================
// Supabase 클라이언트 초기화
// =====================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 설정 (환경변수 또는 기본값)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://waazyjqdjdrnvcmymcga.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXp5anFkamRybnZjbXltY2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzU3MTYsImV4cCI6MjA4NTI1MTcxNn0.9h0j2EhMyPZtOo2SWiyJBx5G-SP36QAudlN_yS9OUrU').trim();

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
