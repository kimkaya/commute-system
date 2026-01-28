// =====================================================
// 하단 네비게이션 컴포넌트 (모바일 친화적)
// =====================================================

import { NavLink } from 'react-router-dom';
import { Clock, Wallet, CalendarDays, User } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: '출퇴근', icon: <Clock size={22} /> },
  { path: '/payroll', label: '급여', icon: <Wallet size={22} /> },
  { path: '/leave', label: '휴가', icon: <CalendarDays size={22} /> },
  { path: '/profile', label: '내정보', icon: <User size={22} /> },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
