'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { AttendanceCard } from '@/components/AttendanceCard';
import { calculateWorkHours } from '@/lib/utils';

export default function MyRecordsPage() {
  const { user } = useAuth();
  const { records, loading } = useAttendance(user?.id);

  const totalDays = records.length;
  const presentDays = records.filter((r) => r.status === 'present').length;
  const lateDays = records.filter((r) => r.status === 'late').length;
  const totalHours = records
    .filter((r) => r.check_out_time)
    .reduce((sum, r) => sum + calculateWorkHours(r.check_in_time, r.check_out_time!), 0);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Attendance Records
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View your attendance history and statistics
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card variant="bordered">
          <CardHeader>
            <CardDescription>Total Days</CardDescription>
            <CardTitle className="text-3xl">{totalDays}</CardTitle>
          </CardHeader>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardDescription>Present Days</CardDescription>
            <CardTitle className="text-3xl text-green-600">{presentDays}</CardTitle>
          </CardHeader>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardDescription>Late Days</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{lateDays}</CardTitle>
          </CardHeader>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardDescription>Total Hours</CardDescription>
            <CardTitle className="text-3xl">{Math.round(totalHours)}h</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your last 30 days of attendance records</CardDescription>
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map((record) => (
                <AttendanceCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
