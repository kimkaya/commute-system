'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { AttendanceRecord } from '@/types';
import { formatDate, formatTime, getStatusColor } from '@/lib/utils';

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate]);

  const fetchAttendance = async () => {
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('attendance')
        .select('*, users(full_name, email)')
        .gte('check_in_time', startDate.toISOString())
        .lte('check_in_time', endDate.toISOString())
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Access denied. Admin only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Attendance Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage employee attendance records
        </p>
      </div>

      <Card variant="bordered" className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>Records for {formatDate(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Check In
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Check Out
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: any) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 px-4 text-sm">
                        <div>
                          <p className="font-medium">{record.users?.full_name}</p>
                          <p className="text-xs text-gray-500">{record.users?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatTime(record.check_in_time)}</td>
                      <td className="py-3 px-4 text-sm">
                        {record.check_out_time ? formatTime(record.check_out_time) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{record.location || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
