// =====================================================
// 사용자 비활성 감지 및 자동 로그아웃 훅
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // 비활성 타임아웃 (밀리초)
  warningTime?: number; // 경고 표시 시간 (밀리초, 로그아웃 전)
  onIdle: () => void; // 타임아웃 시 실행할 콜백
  onWarning?: () => void; // 경고 시 실행할 콜백
  onActive?: () => void; // 활성화 시 실행할 콜백
  events?: string[]; // 감지할 이벤트 목록
}

interface UseIdleTimerReturn {
  isIdle: boolean;
  isWarning: boolean;
  remainingTime: number;
  reset: () => void;
}

const DEFAULT_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
  'click',
];

export function useIdleTimer({
  timeout,
  warningTime = 60000, // 기본 1분 전 경고
  onIdle,
  onWarning,
  onActive,
  events = DEFAULT_EVENTS,
}: UseIdleTimerOptions): UseIdleTimerReturn {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 타이머 리셋
  const reset = useCallback(() => {
    // 기존 타이머들 클리어
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // 상태 리셋
    setIsIdle(false);
    setIsWarning(false);
    setRemainingTime(timeout);
    lastActivityRef.current = Date.now();

    // 활성화 콜백
    if (onActive) onActive();

    // 경고 타이머 설정
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarning(true);
      if (onWarning) onWarning();

      // 카운트다운 시작
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = Math.max(0, timeout - elapsed);
        setRemainingTime(remaining);

        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, timeout - warningTime);

    // 메인 타임아웃 설정
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, timeout);
  }, [timeout, warningTime, onIdle, onWarning, onActive]);

  // 이벤트 핸들러
  const handleActivity = useCallback(() => {
    if (!isIdle) {
      reset();
    }
  }, [isIdle, reset]);

  // 이벤트 리스너 등록
  useEffect(() => {
    // 초기 타이머 시작
    reset();

    // 이벤트 리스너 추가
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 클린업
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [events, handleActivity, reset]);

  return {
    isIdle,
    isWarning,
    remainingTime,
    reset,
  };
}
