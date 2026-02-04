// =====================================================
// 하단 네비게이션 컴포넌트 (모바일 + PC 반응형)
// =====================================================

import { NavLink } from 'react-router-dom';
import { Clock, Wallet, CalendarDays, MessageSquare, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getTotalUnreadCount } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function BottomNav() {
  const { employee } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!employee?.id) return;
    
    const loadUnread = async () => {
      const count = await getTotalUnreadCount(employee.id);
      setUnreadCount(count);
    };
    
    loadUnread();
    const interval = setInterval(loadUnread, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, [employee?.id]);

  const navItems: NavItem[] = [
    { path: '/', label: '출퇴근', icon: <Clock size={22} /> },
    { path: '/payroll', label: '급여', icon: <Wallet size={22} /> },
    { path: '/leave', label: '휴가', icon: <CalendarDays size={22} /> },
    { path: '/messenger', label: '메신저', icon: <MessageSquare size={22} />, badge: unreadCount },
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
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium md:text-sm">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
