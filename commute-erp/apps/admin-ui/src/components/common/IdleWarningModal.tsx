// =====================================================
// 자동 로그아웃 경고 모달
// =====================================================

import { useEffect } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

interface IdleWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function IdleWarningModal({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogout,
}: IdleWarningModalProps) {
  // ESC 키로 로그인 유지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onStayLoggedIn();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onStayLoggedIn]);

  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = minutes > 0 
    ? `${minutes}분 ${seconds}초` 
    : `${seconds}초`;

  // 남은 시간에 따른 색상
  const getTimeColor = () => {
    if (remainingSeconds <= 10) return 'text-danger-600';
    if (remainingSeconds <= 30) return 'text-warning-600';
    return 'text-primary-600';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-warning-500 to-warning-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">자동 로그아웃 예정</h2>
          <p className="text-white/80 mt-1 text-sm">장시간 활동이 감지되지 않았습니다</p>
        </div>

        {/* 본문 */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">
              보안을 위해 곧 자동으로 로그아웃됩니다.
              <br />
              계속 사용하시려면 아래 버튼을 클릭하세요.
            </p>
            
            {/* 카운트다운 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">남은 시간</p>
              <p className={`text-4xl font-bold ${getTimeColor()} font-mono`}>
                {timeDisplay}
              </p>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <LogOut size={18} />
              <span>로그아웃</span>
            </button>
            <button
              onClick={onStayLoggedIn}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
            >
              <RefreshCw size={18} />
              <span>계속 사용</span>
            </button>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="bg-gray-50 px-6 py-3 text-center">
          <p className="text-xs text-gray-400">
            ESC 키를 눌러도 로그인을 유지할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
