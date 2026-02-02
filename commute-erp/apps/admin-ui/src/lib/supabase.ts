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

// Edge Function 호출 헬퍼
// --no-verify-jwt로 배포된 함수를 위해 직접 fetch 사용
export async function invokeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: new Error(data.error || `HTTP ${response.status}`) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
