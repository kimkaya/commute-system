// =====================================================
// 헤더 컴포넌트
// =====================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../lib/api';
import type { EmployeeNotification } from '../../lib/api';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const { employee } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 알림 데이터 로드
  const loadNotifications = async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getMyNotifications(employee.id),
        getUnreadNotificationCount(employee.id),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('알림 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 주기적으로 알림 수 확인
  useEffect(() => {
    if (employee?.id) {
      loadNotifications();
      // 30초마다 새 알림 확인
      const interval = setInterval(() => {
        getUnreadNotificationCount(employee.id).then(setUnreadCount);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [employee?.id]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 알림 클릭 (읽음 처리)
  const handleNotificationClick = async (notification: EmployeeNotification) => {
    if (!notification.read_at) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // 전체 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!employee?.id) return;
    await markAllNotificationsAsRead(employee.id);
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  // 알림 드롭다운 토글
  const toggleNotifications = () => {
    if (!showNotifications) {
      loadNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  // 시간 포맷팅
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 프로필 클릭 시 내 정보 페이지로 이동
  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* 로고 / 타이틀 */}
        <div className="flex items-center gap-2">
          {title ? (
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          ) : (
            <>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Clock className="text-white" size={18} />
              </div>
              <span className="font-bold text-gray-900">직원 포털</span>
            </>
          )}
        </div>

        {/* 우측 아이콘 */}
        <div className="flex items-center gap-2">
          {/* 알림 버튼 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleNotifications}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* 알림 드롭다운 */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <span className="font-semibold text-gray-900">알림</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <CheckCheck size={14} />
                      모두 읽음
                    </button>
                  )}
                </div>

                {/* 알림 목록 */}
                <div className="max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      로딩 중...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      알림이 없습니다
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          !notification.read_at ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                              !notification.read_at ? 'bg-primary-500' : 'bg-transparent'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm text-gray-900 truncate">
                                {notification.title}
                              </span>
                              {notification.read_at && (
                                <Check size={12} className="text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 프로필 아바타 - 클릭 시 내 정보 페이지로 이동 */}
          <button
            onClick={handleProfileClick}
            className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center hover:bg-primary-200 transition-colors"
          >
            <span className="text-sm font-medium text-primary-700">
              {employee?.name?.charAt(0) || 'U'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
