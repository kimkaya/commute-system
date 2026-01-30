// =====================================================
// 헤더 컴포넌트
// =====================================================

import { useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { NotificationModal } from './NotificationModal';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { employee } = useAuthStore();
  const navigate = useNavigate();
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* 로고 / 타이틀 */}
        <div className="flex items-center gap-2">
          {title ? (
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          ) : (
            <>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Clock className="text-white" size={18} />
              </div>
              <span className="font-bold text-gray-900">직원 포털</span>
            </>
          )}
        </div>

        {/* 우측 아이콘 */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNotificationModal(true)}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="알림 보기"
          >
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center hover:bg-primary-200 transition-colors cursor-pointer"
            aria-label="프로필 페이지로 이동"
          >
            <span className="text-sm font-medium text-primary-700">
              {employee?.name?.charAt(0) || 'U'}
            </span>
          </button>
        </div>
      </div>

      {/* 알림 모달 */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </header>
  );
}
