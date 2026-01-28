// =====================================================
// 메인 레이아웃 컴포넌트
// =====================================================

import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useEffect } from 'react';

export function AppLayout() {
  const { sidebarCollapsed } = useUIStore();
  const { isAuthenticated, checkSession } = useAuthStore();
  const location = useLocation();

  // 세션 체크
  useEffect(() => {
    const interval = setInterval(() => {
      checkSession();
    }, 60000); // 1분마다 체크

    return () => clearInterval(interval);
  }, [checkSession]);

  // 인증되지 않은 경우 로그인 페이지로
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
