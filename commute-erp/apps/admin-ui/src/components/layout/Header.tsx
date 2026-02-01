// =====================================================
// 헤더 컴포넌트 (알림 기능 포함 + Realtime + 모바일 반응형)
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, CheckCheck, X, FileText, Calendar, DollarSign, AlertTriangle, Info, Volume2, Menu } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { 
  getNotifications, 
  getUnreadNotificationCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  type Notification 
} from '../../lib/api';
import { useRealtimeNotifications, requestNotificationPermission } from '../../hooks/useRealtimeNotifications';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

// 알림 타입별 아이콘
function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'leave_request':
    case 'leave_approved':
    case 'leave_rejected':
      return <Calendar size={16} className="text-blue-500" />;
    case 'payroll_confirmed':
      return <DollarSign size={16} className="text-green-500" />;
    case 'schedule_change':
      return <Calendar size={16} className="text-purple-500" />;
    case 'system':
      return <AlertTriangle size={16} className="text-orange-500" />;
    case 'reminder':
      return <Info size={16} className="text-gray-500" />;
    default:
      return <FileText size={16} className="text-gray-500" />;
  }
}

// 알림 타입별 배경색
function getNotificationBgColor(type: Notification['type'], isRead: boolean) {
  if (isRead) return 'bg-gray-50';
  
  switch (type) {
    case 'leave_request':
      return 'bg-blue-50';
    case 'leave_approved':
      return 'bg-green-50';
    case 'leave_rejected':
      return 'bg-red-50';
    case 'payroll_confirmed':
      return 'bg-green-50';
    case 'schedule_change':
      return 'bg-purple-50';
    case 'system':
      return 'bg-orange-50';
    default:
      return 'bg-white';
  }
}

// 상대 시간 포맷
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// 알림 소리 재생
function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVJldpyvwI5dP0FznMWyiWNOUG2WuLWOYUpHZI+2taaNWUJMX4qwr6mKT0RQWYOopKeJR0JTVYCknaWCS0RVWH2hm6N8Q0VXWXygmaF5RUVXWn2fm558QkRZWn6gnJ17QkNZXH+gnJt6Q0JZXoCgnJp5REJZXYCgm5l4RUNZXoGgm5h2RkRZX4GgmpdzR0VZX4KgmZVxSEVZYIKfmJNuSUZZYYOfmJJrSkdZYoOel5BnS0hZYoSelpBkTElZY4SelY5hTUpZZIadlYxdTktZZYeclotaTkxaZoeckopaT0xaZ4ickolaUE1baIiblIZWUU5baomblYRTUk9ca4qalYFQU1BcbIuZk35OVFBdboqYkntLVVFebolYkXhIVlJfcIlXj3VFV1NgcYlWjXJCWFRhcohVi29AW1VidIhUiW09XVZjdIdTh2o6X1dkdoZShmc4YFhld4VQhGQ2YVlmeYRPgmE0Y1pneoNOgF4yZFtoe4JPfl0xZVxpfIJOelpwZl1qfIJPeVhxZ11rfYFPd1ZyaF5sfYFPdVR0aV5tfoFPdFJ1al9uf4BO');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {
    // 소리 재생 실패 무시
  }
}

export function Header({ title, subtitle }: HeaderProps) {
  const { sidebarCollapsed, toggleMobileMenu } = useUIStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 알림 목록 로드
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const [notifs, count] = await Promise.all([
        getNotifications({ target_type: 'admin', limit: 20 }),
        getUnreadNotificationCount('admin')
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime 알림 구독
  useRealtimeNotifications({
    targetType: 'admin',
    onNewNotification: (payload) => {
      // 새 알림을 목록 맨 앞에 추가
      const newNotif: Notification = {
        id: payload.id,
        business_id: payload.business_id,
        type: payload.type as Notification['type'],
        title: payload.title,
        message: payload.message,
        target_type: 'admin',
        target_id: payload.target_id,
        is_read: false,
        created_at: payload.created_at,
        read_at: null,
        link: null,
        metadata: null,
      };
      
      setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
      setHasNewNotification(true);
      
      // 알림 소리 재생
      playNotificationSound();
      
      // 애니메이션 효과 해제
      setTimeout(() => setHasNewNotification(false), 1000);
    },
    onNotificationRead: (notificationId) => {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    },
    onNotificationDeleted: (notificationId) => {
      setNotifications(prev => {
        const deletedNotif = prev.find(n => n.id === notificationId);
        if (deletedNotif && !deletedNotif.is_read) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    },
  });

  // 초기 로드
  useEffect(() => {
    loadNotifications();
    
    // 알림 권한 상태 확인
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [loadNotifications]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 알림 권한 요청
  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
  };

  // 알림 읽음 처리
  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead('admin');
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // 알림 삭제
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const deletedNotif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // 드롭다운 토글
  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
    if (!isDropdownOpen) {
      loadNotifications();
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-300 left-0 md:left-16 ${
        !sidebarCollapsed ? 'md:left-64' : ''
      }`}
    >
      {/* 좌측: 햄버거 메뉴 + 타이틀 */}
      <div className="flex items-center gap-3">
        {/* 모바일 햄버거 메뉴 */}
        <button
          onClick={toggleMobileMenu}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 md:hidden"
          aria-label="메뉴 열기"
        >
          <Menu size={24} />
        </button>

        {/* 타이틀 */}
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* 우측 액션 */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* 모바일 검색 토글 */}
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 md:hidden"
          aria-label="검색"
        >
          <Search size={20} />
        </button>

        {/* 데스크톱 검색 */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="검색..."
            className="pl-10 pr-4 py-2 w-48 lg:w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        {/* 알림 */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={toggleDropdown}
            className={`relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-all ${
              isDropdownOpen ? 'bg-gray-100' : ''
            } ${hasNewNotification ? 'animate-bounce' : ''}`}
          >
            <Bell size={20} className={hasNewNotification ? 'text-primary-500' : ''} />
            {unreadCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-danger-500 text-white text-xs font-medium rounded-full px-1 ${
                hasNewNotification ? 'animate-pulse' : ''
              }`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* 알림 드롭다운 */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">알림</h3>
                <div className="flex items-center gap-2">
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={handleRequestPermission}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      title="브라우저 알림 허용"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      <CheckCheck size={14} />
                      <span className="hidden sm:inline">모두 읽음</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 알림 목록 */}
              <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="py-8 text-center text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    로딩 중...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                    <p>알림이 없습니다</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                      className={`px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors group ${
                        getNotificationBgColor(notification.type, notification.is_read)
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 아이콘 */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                              )}
                              <button
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} className="text-gray-400" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 푸터 */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1"
                  >
                    전체보기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 모바일 검색 바 (토글 시 표시) */}
      {isSearchOpen && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-gray-200 p-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="검색..."
              autoFocus
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      )}
    </header>
  );
}
