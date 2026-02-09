'use client';

import { AttendanceRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { formatDate, formatTime, calculateWorkHours, getStatusColor } from '@/lib/utils';

interface AttendanceCardProps {
  record: AttendanceRecord;
}

export function AttendanceCard({ record }: AttendanceCardProps) {
  const workHours = record.check_out
    ? calculateWorkHours(record.check_in, record.check_out)
    : null;

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{formatDate(record.check_in)}</CardTitle>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
            {record.status.toUpperCase()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Check In:</span>
            <span className="font-medium">{formatTime(record.check_in)}</span>
          </div>
          {record.check_out && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Check Out:</span>
              <span className="font-medium">{formatTime(record.check_out)}</span>
            </div>
          )}
          {workHours !== null && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Work Hours:</span>
              <span className="font-medium">{workHours}h</span>
            </div>
          )}
          {record.check_in_location && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Location:</span>
              <span className="font-medium">{record.check_in_location.address || `${record.check_in_location.latitude.toFixed(4)}, ${record.check_in_location.longitude.toFixed(4)}`}</span>
            </div>
          )}
          {record.notes && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">{record.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
