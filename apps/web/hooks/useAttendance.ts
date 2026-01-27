'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AttendanceRecord } from '@/types';

export function useAttendance(userId?: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchRecords();
    }
  }, [userId]);

  async function fetchRecords() {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkIn(location?: string, faceDescriptor?: number[]) {
    if (!userId) return { success: false, error: 'User not authenticated' };

    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: userId,
          check_in_time: now,
          location,
          status: 'present',
        })
        .select()
        .single();

      if (error) throw error;
      
      setRecords([data, ...records]);
      return { success: true, data };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  async function checkOut(recordId: string) {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out_time: now })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      
      setRecords(records.map(r => r.id === recordId ? data : r));
      return { success: true, data };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  async function getTodayRecord() {
    if (!userId) return null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('check_in_time', today.toISOString())
        .lt('check_in_time', tomorrow.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching today record:', err);
      return null;
    }
  }

  return {
    records,
    loading,
    error,
    checkIn,
    checkOut,
    getTodayRecord,
    refetch: fetchRecords,
  };
}
