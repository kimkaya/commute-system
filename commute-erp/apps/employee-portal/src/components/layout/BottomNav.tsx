// =====================================================
// 하단 네비게이션 컴포넌트 (모바일 + PC 반응형)
// =====================================================

import { NavLink } from 'react-router-dom';
import { Clock, Wallet, CalendarDays, MessageSquare, User } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export function BottomNav() {
  const navItems: NavItem[] = [
    { path: '/', label: '출퇴근', icon: <Clock size={22} /> },
    { path: '/payroll', label: '급여', icon: <Wallet size={22} /> },
    { path: '/leave', label: '휴가', icon: <CalendarDays size={22} /> },
    { path: '/messenger', label: '메신저', icon: <MessageSquare size={22} /> },
    { path: '/profile', label: '내정보', icon: <User size={22} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom md:left-auto md:right-auto md:bottom-auto md:top-14 md:w-full md:border-t-0 md:border-b md:bg-gray-50">
      <div className="flex justify-around items-center h-16 max-w-4xl mx-auto md:justify-center md:gap-2 md:h-12">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 min-w-[56px] md:min-w-0 transition-colors md:rounded-lg ${
                isActive
                  ? 'text-primary-600 md:bg-primary-50'
                  : 'text-gray-400 hover:text-gray-600 md:hover:bg-gray-100'
              }`
            }
          >
            {item.icon}
            <span className="text-xs font-medium md:text-sm">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
