// =====================================================
// Supabase 클라이언트 초기화
// =====================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'dummy-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Edge Function 호출 헬퍼
export async function invokeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
