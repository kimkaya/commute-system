// =====================================================
// Supabase Realtime 알림 훅
// =====================================================

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationPayload {
  id: string;
  business_id: string;
  type: string;
  title: string;
  message: string;
  target_type: string;
  target_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface UseRealtimeNotificationsOptions {
  targetType?: 'admin' | 'employee' | 'all';
  targetId?: string;
  onNewNotification?: (notification: NotificationPayload) => void;
  onNotificationRead?: (notificationId: string) => void;
  onNotificationDeleted?: (notificationId: string) => void;
}

export function useRealtimeNotifications({
  onNewNotification,
  onNotificationRead,
  onNotificationDeleted,
}: UseRealtimeNotificationsOptions = {}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // 콜백을 ref에 저장하여 의존성 문제 해결
  const callbacksRef = useRef({ onNewNotification, onNotificationRead, onNotificationDeleted });
  
  // 콜백 업데이트
  useEffect(() => {
    callbacksRef.current = { onNewNotification, onNotificationRead, onNotificationDeleted };
  }, [onNewNotification, onNotificationRead, onNotificationDeleted]);

  useEffect(() => {
    // 기존 구독 해제
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // notifications 테이블 변경 감지
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('New notification received:', payload);
          if (callbacksRef.current.onNewNotification && payload.new) {
            callbacksRef.current.onNewNotification(payload.new as NotificationPayload);
            
            // 브라우저 알림 표시 (권한이 있는 경우)
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              const notif = payload.new as NotificationPayload;
              showBrowserNotification(notif.title, notif.message);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newData = payload.new as NotificationPayload;
          const oldData = payload.old as NotificationPayload;
          
          // 읽음 상태 변경 감지 (read_at이 null에서 값으로 변경됨)
          if (!oldData.read_at && newData.read_at && callbacksRef.current.onNotificationRead) {
            callbacksRef.current.onNotificationRead(newData.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (callbacksRef.current.onNotificationDeleted && payload.old) {
            const oldData = payload.old as NotificationPayload;
            callbacksRef.current.onNotificationDeleted(oldData.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // 빈 의존성 - 마운트 시 한 번만 실행

  const reconnect = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    // 재연결은 다시 useEffect를 트리거하지 않으므로 직접 처리
    const channel = supabase
      .channel('notifications-changes-reconnect')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {})
      .subscribe();
    channelRef.current = channel;
  };

  return { reconnect };
}

// 브라우저 알림 표시
function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'commute-erp-notification',
    });
  }
}

// 알림 권한 요청
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
