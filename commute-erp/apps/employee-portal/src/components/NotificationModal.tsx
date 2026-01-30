// =====================================================
// 알림 모달 컴포넌트
// =====================================================

import { useEffect, useState } from 'react';
import { X, Bell, Check } from 'lucide-react';
import type { Notification } from '../lib/api';
import { getMyNotifications, markNotificationAsRead } from '../lib/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

export function NotificationModal({ isOpen, onClose, employeeId }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      loadNotifications();
    }
  }, [isOpen, employeeId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getMyNotifications(employeeId);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('알림을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      toast.success('알림을 읽음으로 표시했습니다');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('알림 업데이트에 실패했습니다');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'M월 d일 HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-x-0 top-0 z-50 bg-white max-w-lg mx-auto shadow-xl"
        style={{ height: '80vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-gray-700" />
            <h2 id="notification-modal-title" className="text-lg font-semibold text-gray-900">
              알림
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="알림 닫기"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ height: 'calc(80vh - 60px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Bell size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">알림이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="읽음으로 표시"
                        title="읽음으로 표시"
                      >
                        <Check size={16} className="text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
