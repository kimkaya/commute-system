// =====================================================
// 사이드바 컴포넌트 (모바일 드로어 지원)
// =====================================================

import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  CalendarDays,
  Wallet,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Monitor,
  X,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: '대시보드', icon: <LayoutDashboard size={20} /> },
  { path: '/employees', label: '직원 관리', icon: <Users size={20} /> },
  { path: '/attendance', label: '출퇴근 관리', icon: <Clock size={20} /> },
  { path: '/schedules', label: '스케줄 관리', icon: <Calendar size={20} /> },
  { path: '/leaves', label: '휴가 관리', icon: <CalendarDays size={20} /> },
  { path: '/payroll', label: '급여 관리', icon: <Wallet size={20} /> },
  { path: '/compliance', label: '컴플라이언스', icon: <Shield size={20} /> },
  { path: '/devices', label: '기기 관리', icon: <Monitor size={20} /> },
  { path: '/reports', label: '보고서', icon: <FileText size={20} /> },
  { path: '/settings', label: '설정', icon: <Settings size={20} /> },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, mobileMenuOpen, toggleSidebar, closeMobileMenu } = useUIStore();
  const { logout, adminName } = useAuthStore();

  // 라우트 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  // ESC 키로 모바일 메뉴 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeMobileMenu]);

  // 모바일 메뉴 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      closeMobileMenu();
    }
  };

  // 사이드바 내부 컨텐츠 (데스크톱/모바일 공통)
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* 로고 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {(!sidebarCollapsed || isMobile) && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Clock className="text-white" size={18} />
            </div>
            <span className="font-bold text-gray-900">출퇴근 ERP</span>
          </div>
        )}
        {isMobile ? (
          <button
            onClick={closeMobileMenu}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hidden md:block"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`
                }
                title={sidebarCollapsed && !isMobile ? item.label : undefined}
              >
                {item.icon}
                {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="p-4 border-t border-gray-200">
        {(!sidebarCollapsed || isMobile) ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {adminName?.charAt(0) || 'A'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{adminName || '관리자'}</p>
                <p className="text-xs text-gray-500">관리자</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex justify-center"
            title="로그아웃"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* 데스크톱 사이드바 - md 이상에서만 표시 */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 hidden md:flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* 모바일 오버레이 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* 모바일 드로어 사이드바 */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent isMobile />
      </aside>
    </>
  );
}
