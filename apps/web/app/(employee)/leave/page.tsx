'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDate, getStatusColor } from '@/lib/utils';
import { LeaveApplication } from '@/types';

export default function LeavePage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'casual',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchLeaves = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (err: any) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('leave_applications').insert({
        user_id: user.id,
        ...formData,
        status: 'pending',
      });

      if (error) throw error;

      setSuccess('Leave application submitted successfully!');
      setShowForm(false);
      setFormData({
        leave_type: 'casual',
        start_date: '',
        end_date: '',
        reason: '',
      });
      fetchLeaves();
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Please log in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Leave Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Apply for leave and track your applications
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Apply for Leave'}
        </Button>
      </div>

      {(success || error) && (
        <div className="mb-6">
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <Card variant="bordered" className="mb-8">
          <CardHeader>
            <CardTitle>Apply for Leave</CardTitle>
            <CardDescription>Fill out the form to submit a leave application</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Leave Type
                </label>
                <select
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="vacation">Vacation</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Please provide a reason for your leave..."
                  required
                />
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Leave Applications</CardTitle>
          <CardDescription>Your leave application history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && leaves.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No leave applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reason
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr
                      key={leave.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 px-4 text-sm capitalize">{leave.leave_type}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(leave.start_date)}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(leave.end_date)}</td>
                      <td className="py-3 px-4 text-sm">{leave.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status.toUpperCase()}
                        </span>
                      </td>
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
