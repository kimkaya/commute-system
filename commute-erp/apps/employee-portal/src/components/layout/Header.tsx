// =====================================================
// 헤더 컴포넌트
// =====================================================

import { Bell, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { employee } = useAuthStore();

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
          <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {employee?.name?.charAt(0) || 'U'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
