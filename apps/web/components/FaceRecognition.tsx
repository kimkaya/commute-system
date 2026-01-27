'use client';

import { useEffect, useRef, useState } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface FaceRecognitionProps {
  mode: 'register' | 'verify';
  onCapture?: (descriptor: number[]) => void;
  onVerify?: (isMatch: boolean) => void;
  storedDescriptor?: number[];
}

export function FaceRecognition({
  mode,
  onCapture,
  onVerify,
  storedDescriptor,
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const {
    isLoading,
    error,
    isModelLoaded,
    startCamera,
    stopCamera,
    captureFaceDescriptor,
    verifyFace,
  } = useFaceRecognition();

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartCamera = async () => {
    if (videoRef.current) {
      const stream = await startCamera(videoRef.current);
      if (stream) {
        setIsCameraActive(true);
      }
    }
  };

  const handleStopCamera = () => {
    stopCamera();
    setIsCameraActive(false);
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;

    const descriptor = await captureFaceDescriptor(videoRef.current);
    if (descriptor && onCapture) {
      onCapture(descriptor);
      handleStopCamera();
    }
  };

  const handleVerify = async () => {
    if (!videoRef.current || !storedDescriptor) return;

    const isMatch = await verifyFace(videoRef.current, storedDescriptor);
    if (onVerify) {
      onVerify(isMatch);
      handleStopCamera();
    }
  };

  if (!isModelLoaded) {
    return (
      <Card className="text-center">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading face recognition models...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {!isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <p className="text-white">Camera not active</p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          {!isCameraActive ? (
            <Button
              onClick={handleStartCamera}
              className="flex-1"
              disabled={isLoading}
            >
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                onClick={handleStopCamera}
                variant="secondary"
                className="flex-1"
              >
                Stop Camera
              </Button>
              {mode === 'register' ? (
                <Button
                  onClick={handleCapture}
                  className="flex-1"
                  isLoading={isLoading}
                  disabled={!isCameraActive}
                >
                  Capture Face
                </Button>
              ) : (
                <Button
                  onClick={handleVerify}
                  className="flex-1"
                  isLoading={isLoading}
                  disabled={!isCameraActive}
                >
                  Verify Face
                </Button>
              )}
            </>
          )}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Position your face in the center of the frame</p>
          <p>• Ensure good lighting conditions</p>
          <p>• Remove glasses if possible</p>
        </div>
      </div>
    </Card>
  );
}
