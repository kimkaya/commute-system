// =====================================================
// 사이드바 컴포넌트
// =====================================================

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
  { path: '/reports', label: '보고서', icon: <FileText size={20} /> },
  { path: '/settings', label: '설정', icon: <Settings size={20} /> },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout, adminName } = useAuthStore();

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* 로고 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Clock className="text-white" size={18} />
            </div>
            <span className="font-bold text-gray-900">출퇴근 ERP</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
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
                  } ${sidebarCollapsed ? 'justify-center' : ''}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="p-4 border-t border-gray-200">
        {!sidebarCollapsed ? (
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
    </aside>
  );
}
