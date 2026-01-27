'use client';

import { useState, useRef, useEffect } from 'react';
import { loadFaceApiModels, detectFace, compareFaces } from '@/lib/face-api';

export function useFaceRecognition() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeModels();
    return () => {
      stopCamera();
    };
  }, []);

  async function initializeModels() {
    try {
      setIsLoading(true);
      await loadFaceApiModels();
      setIsModelLoaded(true);
    } catch (err: any) {
      setError('Failed to load face recognition models');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function startCamera(videoElement?: HTMLVideoElement) {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      const video = videoElement || videoRef.current;
      if (video) {
        video.srcObject = stream;
        streamRef.current = stream;
        await video.play();
      }

      return stream;
    } catch (err: any) {
      setError('Failed to access camera');
      console.error(err);
      return null;
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function captureFaceDescriptor(videoElement: HTMLVideoElement) {
    try {
      setError(null);
      setIsLoading(true);

      const detection = await detectFace(videoElement);
      
      if (!detection) {
        setError('No face detected. Please ensure your face is clearly visible.');
        return null;
      }

      return Array.from(detection.descriptor);
    } catch (err: any) {
      setError('Failed to capture face data');
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyFace(
    videoElement: HTMLVideoElement,
    storedDescriptor: number[]
  ): Promise<boolean> {
    try {
      setError(null);
      setIsLoading(true);

      const detection = await detectFace(videoElement);
      
      if (!detection) {
        setError('No face detected');
        return false;
      }

      const distance = await compareFaces(
        detection.descriptor,
        storedDescriptor
      );

      return distance < 0.6; // Threshold for face match
    } catch (err: any) {
      setError('Failed to verify face');
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    isModelLoaded,
    videoRef,
    startCamera,
    stopCamera,
    captureFaceDescriptor,
    verifyFace,
  };
}
