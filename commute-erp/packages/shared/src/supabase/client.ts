// =====================================================
// Supabase 클라이언트 설정
// =====================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Supabase 클라이언트 초기화
 */
export function initSupabase(supabaseUrl: string, supabaseAnonKey: string): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
}

/**
 * Supabase 클라이언트 가져오기
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase first.');
  }
  return supabaseClient;
}

/**
 * Supabase 클라이언트 가져오기 (환경변수에서 자동 초기화)
 */
export function getSupabaseFromEnv(): SupabaseClient<Database> {
  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return initSupabase(supabaseUrl, supabaseAnonKey);
}

/**
 * Edge Function 호출
 */
export async function invokeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  const supabase = getSupabase();
  
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

/**
 * 실시간 구독 헬퍼
 */
export function subscribeToTable<T extends keyof Database['public']['Tables']>(
  table: T,
  filter: { column: string; value: string },
  callback: (payload: { eventType: string; new: unknown; old: unknown }) => void
) {
  const supabase = getSupabase();

  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table as string,
        filter: `${filter.column}=eq.${filter.value}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export { supabaseClient };
