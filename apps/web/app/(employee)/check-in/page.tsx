'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FaceRecognition } from '@/components/FaceRecognition';
import { formatDateTime } from '@/lib/utils';

export default function CheckInPage() {
  const { user } = useAuth();
  const { checkIn, checkOut, getTodayRecord } = useAttendance(user?.id);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [checkType, setCheckType] = useState<'in' | 'out'>('in');
  const [location, setLocation] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadTodayRecord();
      getCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadTodayRecord = async () => {
    const record = await getTodayRecord();
    setTodayRecord(record);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation('Location unavailable');
        }
      );
    }
  };

  const handleCheckInClick = () => {
    setCheckType('in');
    setShowFaceRecognition(true);
    setError('');
    setSuccess('');
  };

  const handleCheckOutClick = () => {
    setCheckType('out');
    setShowFaceRecognition(true);
    setError('');
    setSuccess('');
  };

  const handleFaceVerified = async (isMatch: boolean) => {
    if (!isMatch) {
      setError('Face verification failed. Please try again.');
      setShowFaceRecognition(false);
      return;
    }

    if (checkType === 'in') {
      const result = await checkIn(location, user?.face_descriptor);
      if (result.success) {
        setSuccess('Check-in successful!');
        loadTodayRecord();
      } else {
        setError(result.error || 'Check-in failed');
      }
    } else {
      if (todayRecord) {
        const result = await checkOut(todayRecord.id);
        if (result.success) {
          setSuccess('Check-out successful!');
          loadTodayRecord();
        } else {
          setError(result.error || 'Check-out failed');
        }
      }
    }
    setShowFaceRecognition(false);
  };

  const handleManualCheckIn = async () => {
    setError('');
    setSuccess('');
    const result = await checkIn(location);
    if (result.success) {
      setSuccess('Check-in successful!');
      loadTodayRecord();
    } else {
      setError(result.error || 'Check-in failed');
    }
  };

  const handleManualCheckOut = async () => {
    if (!todayRecord) return;
    setError('');
    setSuccess('');
    const result = await checkOut(todayRecord.id);
    if (result.success) {
      setSuccess('Check-out successful!');
      loadTodayRecord();
    } else {
      setError(result.error || 'Check-out failed');
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Please log in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Check In / Check Out
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Mark your attendance for today
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Today&apos;s Status</CardTitle>
            <CardDescription>Your attendance for {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            {todayRecord ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Check In:</span>
                  <span className="font-medium">{formatDateTime(todayRecord.check_in)}</span>
                </div>
                {todayRecord.check_out && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Check Out:</span>
                    <span className="font-medium">{formatDateTime(todayRecord.check_out)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className="font-medium capitalize">{todayRecord.status}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No attendance record for today
              </p>
            )}
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Mark your attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {!todayRecord ? (
                <>
                  <Button
                    onClick={handleCheckInClick}
                    className="w-full"
                    disabled={!user.face_descriptor}
                  >
                    Check In with Face Recognition
                  </Button>
                  <Button
                    onClick={handleManualCheckIn}
                    variant="outline"
                    className="w-full"
                  >
                    Manual Check In
                  </Button>
                </>
              ) : !todayRecord.check_out ? (
                <>
                  <Button
                    onClick={handleCheckOutClick}
                    variant="secondary"
                    className="w-full"
                    disabled={!user.face_descriptor}
                  >
                    Check Out with Face Recognition
                  </Button>
                  <Button
                    onClick={handleManualCheckOut}
                    variant="outline"
                    className="w-full"
                  >
                    Manual Check Out
                  </Button>
                </>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ You have completed your attendance for today
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {(success || error) && (
        <div className="mt-6">
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

      {showFaceRecognition && user.face_descriptor && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Verify Your Identity for {checkType === 'in' ? 'Check In' : 'Check Out'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FaceRecognition
                mode="verify"
                storedDescriptor={user.face_descriptor}
                onVerify={handleFaceVerified}
              />
              <Button
                onClick={() => setShowFaceRecognition(false)}
                variant="ghost"
                className="w-full mt-4"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
