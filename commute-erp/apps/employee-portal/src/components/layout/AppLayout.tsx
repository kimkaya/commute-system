// =====================================================
// 앱 레이아웃 컴포넌트
// =====================================================

import { Navigate, Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuthStore } from '../../stores/authStore';

export function AppLayout() {
  const { isAuthenticated } = useAuthStore();

  // 미인증 시 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="pt-14 pb-20 px-4 max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* 하단 네비게이션 */}
      <BottomNav />
    </div>
  );
}
