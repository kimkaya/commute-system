'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { SystemSettings as Settings } from '@/types';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    id: '',
    work_hours_start: '09:00',
    work_hours_end: '17:00',
    late_threshold_minutes: 15,
    overtime_rate: 1.5,
    weekend_days: [0, 6],
    holidays: [],
    face_match_threshold: 0.6,
    location_required: false,
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    });
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { error } = settings.id
        ? await supabase.from('settings').update(settings).eq('id', settings.id)
        : await supabase.from('settings').insert(settings);

      if (error) throw error;
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          System Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure system-wide settings and preferences
        </p>
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

      <div className="space-y-6">
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Work Hours</CardTitle>
            <CardDescription>Configure standard work hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Work Start Time"
                type="time"
                name="work_hours_start"
                value={settings.work_hours_start}
                onChange={handleInputChange}
              />
              <Input
                label="Work End Time"
                type="time"
                name="work_hours_end"
                value={settings.work_hours_end}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Attendance Rules</CardTitle>
            <CardDescription>Configure attendance calculation rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Late Threshold (minutes)"
                type="number"
                name="late_threshold_minutes"
                value={settings.late_threshold_minutes}
                onChange={handleInputChange}
              />
              <Input
                label="Overtime Rate (multiplier)"
                type="number"
                step="0.1"
                name="overtime_rate"
                value={settings.overtime_rate}
                onChange={handleInputChange}
              />
              <Input
                label="Face Match Threshold (0-1, lower is stricter)"
                type="number"
                step="0.1"
                min="0"
                max="1"
                name="face_match_threshold"
                value={settings.face_match_threshold}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Enable or disable system features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="location_required"
                  checked={settings.location_required}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Face Recognition</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enable face recognition for check-in/out
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="location_required"
                  checked={settings.location_required}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Location Tracking</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Track employee location during check-in
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={saving} disabled={saving}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
