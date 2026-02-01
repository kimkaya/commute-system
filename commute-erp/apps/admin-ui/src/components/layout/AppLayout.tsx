// =====================================================
// 메인 레이아웃 컴포넌트 (모바일 반응형)
// =====================================================

import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useMemo } from 'react';

// 라우트별 페이지 제목 매핑
const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: '대시보드', subtitle: '전체 현황을 한눈에 확인하세요' },
  '/employees': { title: '직원 관리', subtitle: '직원 정보를 관리합니다' },
  '/employees/new': { title: '직원 등록', subtitle: '새 직원을 등록합니다' },
  '/attendance': { title: '출퇴근 관리', subtitle: '출퇴근 기록을 관리합니다' },
  '/schedules': { title: '스케줄 관리', subtitle: '근무 스케줄을 관리합니다' },
  '/leaves': { title: '휴가 관리', subtitle: '휴가 신청 및 승인을 관리합니다' },
  '/payroll': { title: '급여 관리', subtitle: '급여 계산 및 지급을 관리합니다' },
  '/compliance': { title: '컴플라이언스', subtitle: '근로기준법 준수 현황을 확인합니다' },
  '/devices': { title: '기기 관리', subtitle: '출퇴근 인증 기기를 관리합니다' },
  '/reports': { title: '보고서', subtitle: '각종 보고서를 생성합니다' },
  '/settings': { title: '설정', subtitle: '시스템 설정을 관리합니다' },
};

// 동적 라우트 매칭 함수
function getRouteTitle(pathname: string): { title: string; subtitle?: string } {
  // 정확히 일치하는 경우
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }
  
  // 동적 라우트 패턴 매칭
  if (pathname.match(/^\/employees\/[^/]+\/edit$/)) {
    return { title: '직원 정보 수정', subtitle: '직원 정보를 수정합니다' };
  }
  if (pathname.match(/^\/employees\/[^/]+$/)) {
    return { title: '직원 상세', subtitle: '직원 상세 정보를 확인합니다' };
  }
  if (pathname.match(/^\/payroll\/[^/]+\/payslip\/[^/]+$/)) {
    return { title: '급여명세서', subtitle: '급여명세서를 확인합니다' };
  }
  
  // 기본값
  return { title: '출퇴근 ERP' };
}

export function AppLayout() {
  const { sidebarCollapsed } = useUIStore();
  const { isAuthenticated, checkSession } = useAuthStore();
  const location = useLocation();

  // 현재 라우트에 맞는 제목 가져오기
  const { title, subtitle } = useMemo(
    () => getRouteTitle(location.pathname),
    [location.pathname]
  );

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

      {/* 헤더 */}
      <Header title={title} subtitle={subtitle} />

      {/* 메인 콘텐츠 */}
      <main
        className={`min-h-screen pt-16 transition-all duration-300 ml-0 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
