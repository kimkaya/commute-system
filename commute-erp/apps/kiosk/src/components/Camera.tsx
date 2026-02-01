// =====================================================
// 웹캠 컴포넌트 with face-api.js (최적화 버전)
// =====================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Loader2, Camera as CameraIcon, AlertCircle, Zap } from 'lucide-react';

interface CameraProps {
  onFaceDetected: (descriptor: Float32Array | null) => void;
  isActive: boolean;
}

// TinyFaceDetector 옵션 (빠른 감지용)
const tinyFaceOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,      // 작은 입력 크기로 속도 향상 (128, 160, 224, 320, 416, 512, 608)
  scoreThreshold: 0.5, // 감지 임계값
});

export function Camera({ onFaceDetected, isActive }: CameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [fps, setFps] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const fpsCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);

  // 모델 로드 (TinyFaceDetector 사용 - 훨씬 빠름)
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const MODEL_URL = '/models';
        
        console.time('모델 로딩');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),      // 190KB (vs ssdMobilenetv1 5.5MB)
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),     // 350KB
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),    // 6.4MB
        ]);
        console.timeEnd('모델 로딩');
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        setError('얼굴 인식 모델을 불러올 수 없습니다');
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // 얼굴 감지 (requestAnimationFrame 사용으로 더 부드러운 처리)
  const detectFace = useCallback(async (timestamp: number) => {
    if (!webcamRef.current?.video || !canvasRef.current || !isActive) {
      animationRef.current = requestAnimationFrame(detectFace);
      return;
    }

    const video = webcamRef.current.video;
    
    if (video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(detectFace);
      return;
    }

    // 프레임 제한 (100ms = 10fps 정도로 감지, 리소스 절약)
    if (timestamp - lastTimeRef.current < 100) {
      animationRef.current = requestAnimationFrame(detectFace);
      return;
    }
    lastTimeRef.current = timestamp;

    try {
      // TinyFaceDetector 사용 (SSD MobileNet보다 10배 빠름)
      const detection = await faceapi
        .detectSingleFace(video, tinyFaceOptions)
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
          // 녹색 박스
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          const mirroredX = canvas.width - x - width;
          ctx.strokeRect(mirroredX, y, width, height);
          
          // 신뢰도 표시
          const score = Math.round(detection.detection.score * 100);
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 16px Pretendard';
          ctx.fillText(`${score}%`, mirroredX, y - 8);
        }

        onFaceDetected(detection.descriptor);
      } else {
        setFaceDetected(false);
        onFaceDetected(null);
      }

      // FPS 계산
      fpsCountRef.current++;
      if (timestamp - lastFpsUpdateRef.current >= 1000) {
        setFps(fpsCountRef.current);
        fpsCountRef.current = 0;
        lastFpsUpdateRef.current = timestamp;
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }

    animationRef.current = requestAnimationFrame(detectFace);
  }, [isActive, onFaceDetected]);

  // 감지 루프 시작/중지
  useEffect(() => {
    if (isActive && !isLoading && !error) {
      animationRef.current = requestAnimationFrame(detectFace);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
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
          width: 640,    // 낮은 해상도로 속도 향상
          height: 480,
          facingMode: 'user',
          frameRate: { ideal: 30 },
        }}
        className="w-full h-full object-cover rounded-3xl webcam-mirrored"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full webcam-mirrored pointer-events-none"
      />

      {/* 얼굴 가이드 오버레이 */}
      <div className={`face-overlay ${faceDetected ? 'matched' : 'detecting'}`} />

      {/* FPS 표시 (개발용) */}
      <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 rounded-full text-sm">
        <div className="flex items-center gap-1">
          <Zap size={14} className={fps > 5 ? 'text-success-400' : 'text-warning-400'} />
          <span>{fps} FPS</span>
        </div>
      </div>

      {/* 상태 표시 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className={`px-6 py-3 rounded-full ${faceDetected ? 'bg-success-500' : 'bg-white/20'} backdrop-blur transition-colors`}>
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
