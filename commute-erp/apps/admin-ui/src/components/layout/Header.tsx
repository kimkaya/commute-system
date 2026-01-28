// =====================================================
// 헤더 컴포넌트
// =====================================================

import { Bell, Search } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* 타이틀 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      {/* 우측 액션 */}
      <div className="flex items-center gap-4">
        {/* 검색 */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="검색..."
            className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        {/* 알림 */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
