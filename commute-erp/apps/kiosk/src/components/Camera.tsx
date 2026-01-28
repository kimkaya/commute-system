// =====================================================
// 웹캠 컴포넌트 with face-api.js
// =====================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Loader2, Camera as CameraIcon, AlertCircle } from 'lucide-react';

interface CameraProps {
  onFaceDetected: (descriptor: Float32Array | null) => void;
  isActive: boolean;
}

export function Camera({ onFaceDetected, isActive }: CameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);

  // 모델 로드
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        setError('얼굴 인식 모델을 불러올 수 없습니다');
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // 얼굴 감지 루프
  const detectFace = useCallback(async () => {
    if (!webcamRef.current?.video || !canvasRef.current || !isActive) {
      return;
    }

    const video = webcamRef.current.video;
    
    if (video.readyState !== 4) {
      return;
    }

    try {
      const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      const canvas = canvasRef.current;
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      // 캔버스 클리어
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        setFaceDetected(true);
        
        // 얼굴 박스 그리기 (미러링 적용)
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        const { x, y, width, height } = resizedDetection.detection.box;
        
        if (ctx) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          // 미러링된 x 좌표 계산
          const mirroredX = canvas.width - x - width;
          ctx.strokeRect(mirroredX, y, width, height);
        }

        onFaceDetected(detection.descriptor);
      } else {
        setFaceDetected(false);
        onFaceDetected(null);
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }
  }, [isActive, onFaceDetected]);

  // 감지 루프 시작/중지
  useEffect(() => {
    if (isActive && !isLoading && !error) {
      detectionRef.current = setInterval(detectFace, 200);
    }

    return () => {
      if (detectionRef.current) {
        clearInterval(detectionRef.current);
      }
    };
  }, [isActive, isLoading, error, detectFace]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/30 rounded-3xl">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-danger-500" size={48} />
          <p className="text-xl text-white">{error}</p>
          <p className="text-white/60 mt-2">비밀번호로 인증하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl z-10">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 animate-spin" size={48} />
            <p className="text-xl">얼굴 인식 준비 중...</p>
          </div>
        </div>
      )}

      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 1280,
          height: 720,
          facingMode: 'user',
        }}
        className="w-full h-full object-cover rounded-3xl webcam-mirrored"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full webcam-mirrored pointer-events-none"
      />

      {/* 얼굴 가이드 오버레이 */}
      <div className={`face-overlay ${faceDetected ? 'matched' : 'detecting'}`} />

      {/* 상태 표시 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className={`px-6 py-3 rounded-full ${faceDetected ? 'bg-success-500' : 'bg-white/20'} backdrop-blur`}>
          <div className="flex items-center gap-2">
            <CameraIcon size={20} />
            <span className="font-medium">
              {faceDetected ? '얼굴 인식됨' : '얼굴을 화면에 맞춰주세요'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
