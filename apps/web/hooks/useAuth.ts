'use client';

import { useEffect, useState } from 'react';
import { supabase, getCurrentUser, signIn, signOut, signUp } from '@/lib/supabase';
import { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const { user: authUser, error } = await getCurrentUser();
      if (error) throw error;
      
      if (authUser) {
        await fetchUserProfile(authUser.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      if (data.user) {
        await fetchUserProfile(data.user.id);
      }
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  async function register(email: string, password: string, fullName: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await signUp(email, password, fullName);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await signOut();
      setUser(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
  };
}
