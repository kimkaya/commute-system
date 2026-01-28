// =====================================================
// 알림 타입
// =====================================================

export interface Notification {
  id: string;
  business_id: string;
  recipient_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  priority: NotificationPriority;
  status: NotificationStatus;
  channel: NotificationChannel;
  sent_at?: string;
  read_at?: string;
  expires_at?: string;
  retry_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 
  | 'check_in_reminder'       // 출근 알림
  | 'check_out_reminder'      // 퇴근 알림
  | 'overtime_warning'        // 연장근무 경고
  | 'compliance_violation'    // 컴플라이언스 위반
  | 'compliance_warning'      // 컴플라이언스 경고
  | 'leave_request'           // 휴가 신청
  | 'leave_approved'          // 휴가 승인
  | 'leave_rejected'          // 휴가 반려
  | 'payroll_ready'           // 급여 준비
  | 'payroll_paid'            // 급여 지급
  | 'backup_completed'        // 백업 완료
  | 'backup_failed'           // 백업 실패
  | 'system_alert'            // 시스템 알림
  | 'announcement';           // 공지사항

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type NotificationChannel = 'email' | 'sms' | 'push' | 'system';

export interface NotificationWithRecipient extends Notification {
  recipient?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

// Input types
export interface CreateNotificationInput {
  business_id: string;
  recipient_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  expires_at?: string;
}

export interface SendNotificationInput {
  notification_id: string;
  channel?: NotificationChannel;
}

// 알림 설정
export interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  
  // 알림 유형별 설정
  check_in_reminder: {
    enabled: boolean;
    time: string; // 출근 알림 시간 (e.g., "08:30")
  };
  check_out_reminder: {
    enabled: boolean;
    time: string; // 퇴근 알림 시간
  };
  overtime_warning: {
    enabled: boolean;
    threshold_hours: number; // 경고 시작 시간
  };
  compliance_alerts: {
    enabled: boolean;
    recipients: string[]; // 관리자 ID 목록
  };
  
  // SMTP 설정
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    from_email: string;
    from_name: string;
  };
  
  // Slack 연동
  slack?: {
    enabled: boolean;
    webhook_url: string;
    channel: string;
  };
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_enabled: false,
  sms_enabled: false,
  push_enabled: true,
  check_in_reminder: { enabled: false, time: '08:30' },
  check_out_reminder: { enabled: false, time: '18:00' },
  overtime_warning: { enabled: true, threshold_hours: 8 },
  compliance_alerts: { enabled: true, recipients: [] },
};

// 알림 유형 정보
export interface NotificationTypeInfo {
  type: NotificationType;
  label: string;
  label_ko: string;
  icon: string;
  default_priority: NotificationPriority;
}

export const NOTIFICATION_TYPES: NotificationTypeInfo[] = [
  { type: 'check_in_reminder', label: 'Check-in Reminder', label_ko: '출근 알림', icon: 'clock', default_priority: 'normal' },
  { type: 'check_out_reminder', label: 'Check-out Reminder', label_ko: '퇴근 알림', icon: 'clock', default_priority: 'normal' },
  { type: 'overtime_warning', label: 'Overtime Warning', label_ko: '연장근무 경고', icon: 'alert-triangle', default_priority: 'high' },
  { type: 'compliance_violation', label: 'Compliance Violation', label_ko: '컴플라이언스 위반', icon: 'alert-circle', default_priority: 'urgent' },
  { type: 'compliance_warning', label: 'Compliance Warning', label_ko: '컴플라이언스 경고', icon: 'alert-triangle', default_priority: 'high' },
  { type: 'leave_request', label: 'Leave Request', label_ko: '휴가 신청', icon: 'calendar', default_priority: 'normal' },
  { type: 'leave_approved', label: 'Leave Approved', label_ko: '휴가 승인', icon: 'check-circle', default_priority: 'normal' },
  { type: 'leave_rejected', label: 'Leave Rejected', label_ko: '휴가 반려', icon: 'x-circle', default_priority: 'normal' },
  { type: 'payroll_ready', label: 'Payroll Ready', label_ko: '급여 준비', icon: 'dollar-sign', default_priority: 'normal' },
  { type: 'payroll_paid', label: 'Payroll Paid', label_ko: '급여 지급', icon: 'check', default_priority: 'normal' },
  { type: 'backup_completed', label: 'Backup Completed', label_ko: '백업 완료', icon: 'database', default_priority: 'low' },
  { type: 'backup_failed', label: 'Backup Failed', label_ko: '백업 실패', icon: 'alert-circle', default_priority: 'high' },
  { type: 'system_alert', label: 'System Alert', label_ko: '시스템 알림', icon: 'bell', default_priority: 'high' },
  { type: 'announcement', label: 'Announcement', label_ko: '공지사항', icon: 'megaphone', default_priority: 'normal' },
];
