// =====================================================
// 실시간 시계 컴포넌트
// =====================================================

import { useState, useEffect } from 'react';

interface ClockProps {
  size?: 'sm' | 'md' | 'lg';
  showSeconds?: boolean;
  showDate?: boolean;
}

export function Clock({ size = 'lg', showSeconds = true, showDate = true }: ClockProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds && { second: '2-digit' }),
    hour12: false,
  });

  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const sizeClasses = {
    sm: { time: 'text-4xl', date: 'text-lg' },
    md: { time: 'text-6xl', date: 'text-xl' },
    lg: { time: 'text-8xl', date: 'text-2xl' },
  };

  return (
    <div className="text-center">
      <div className={`${sizeClasses[size].time} font-bold tracking-tight`}>
        {timeStr}
      </div>
      {showDate && (
        <div className={`${sizeClasses[size].date} text-white/80 mt-2`}>
          {dateStr}
        </div>
      )}
    </div>
  );
}
