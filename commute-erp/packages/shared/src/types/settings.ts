// =====================================================
// 시스템 설정 타입
// =====================================================

export interface SystemSettings {
  id: string;
  business_id: string;
  
  // 관리자 인증
  admin_password_hash?: string;
  admin_fail_count: number;
  admin_locked_until?: string;
  
  // 세션 설정
  session_timeout_minutes: number;
  
  // 급여 설정
  default_hourly_rate: number;
  overtime_rate: number;
  night_work_rate: number;
  holiday_work_rate: number;
  
  // 근무 설정
  weekly_regular_hours: number;
  daily_regular_hours: number;
  standard_start_time: string;
  standard_end_time: string;
  night_work_start_time: string;
  night_work_end_time: string;
  lunch_break_start: string;
  lunch_break_duration: number;
  
  // 컴플라이언스 설정
  max_weekly_hours: number;
  max_overtime_hours: number;
  max_continuous_work_days: number;
  mandatory_break_after_hours: number;
  
  // 백업 설정
  backup_enabled: boolean;
  backup_frequency: BackupFrequency;
  backup_time: string;
  backup_retention_days: number;
  
  // 알림 설정
  notification_settings: NotificationSettings;
  
  // 얼굴 인식 설정
  face_match_threshold: number;
  
  created_at: string;
  updated_at: string;
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface NotificationSettings {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  slack_enabled: boolean;
  slack_webhook_url?: string;
}

// Input types
export interface UpdateSystemSettingsInput {
  // 급여 설정
  default_hourly_rate?: number;
  overtime_rate?: number;
  night_work_rate?: number;
  holiday_work_rate?: number;
  
  // 근무 설정
  weekly_regular_hours?: number;
  daily_regular_hours?: number;
  standard_start_time?: string;
  standard_end_time?: string;
  night_work_start_time?: string;
  night_work_end_time?: string;
  lunch_break_start?: string;
  lunch_break_duration?: number;
  
  // 컴플라이언스 설정
  max_weekly_hours?: number;
  max_overtime_hours?: number;
  max_continuous_work_days?: number;
  mandatory_break_after_hours?: number;
  
  // 백업 설정
  backup_enabled?: boolean;
  backup_frequency?: BackupFrequency;
  backup_time?: string;
  backup_retention_days?: number;
  
  // 알림 설정
  notification_settings?: Partial<NotificationSettings>;
  
  // 얼굴 인식 설정
  face_match_threshold?: number;
}

export interface ChangeAdminPasswordInput {
  current_password: string;
  new_password: string;
}

// 기본값
export const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, 'id' | 'business_id' | 'admin_password_hash' | 'created_at' | 'updated_at'> = {
  admin_fail_count: 0,
  session_timeout_minutes: 30,
  
  default_hourly_rate: 10000,
  overtime_rate: 1.5,
  night_work_rate: 1.5,
  holiday_work_rate: 2.0,
  
  weekly_regular_hours: 40,
  daily_regular_hours: 8,
  standard_start_time: '09:00',
  standard_end_time: '18:00',
  night_work_start_time: '22:00',
  night_work_end_time: '06:00',
  lunch_break_start: '12:00',
  lunch_break_duration: 60,
  
  max_weekly_hours: 52,
  max_overtime_hours: 12,
  max_continuous_work_days: 6,
  mandatory_break_after_hours: 4,
  
  backup_enabled: true,
  backup_frequency: 'daily',
  backup_time: '03:00',
  backup_retention_days: 30,
  
  notification_settings: {
    email_enabled: false,
    sms_enabled: false,
    push_enabled: true,
    slack_enabled: false,
  },
  
  face_match_threshold: 0.76,
};

// 설정 카테고리
export interface SettingsCategory {
  key: string;
  label: string;
  label_ko: string;
  description: string;
  icon: string;
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    key: 'general',
    label: 'General',
    label_ko: '일반',
    description: '기본 설정',
    icon: 'settings',
  },
  {
    key: 'work',
    label: 'Work Hours',
    label_ko: '근무 시간',
    description: '표준 근무시간 및 야간근무 설정',
    icon: 'clock',
  },
  {
    key: 'payroll',
    label: 'Payroll',
    label_ko: '급여',
    description: '시급, 배율 등 급여 계산 설정',
    icon: 'dollar-sign',
  },
  {
    key: 'compliance',
    label: 'Compliance',
    label_ko: '컴플라이언스',
    description: '근로기준법 관련 설정',
    icon: 'shield',
  },
  {
    key: 'backup',
    label: 'Backup',
    label_ko: '백업',
    description: '자동 백업 설정',
    icon: 'database',
  },
  {
    key: 'notification',
    label: 'Notifications',
    label_ko: '알림',
    description: '이메일, SMS, 푸시 알림 설정',
    icon: 'bell',
  },
  {
    key: 'face_recognition',
    label: 'Face Recognition',
    label_ko: '얼굴 인식',
    description: '얼굴 인식 임계값 설정',
    icon: 'user-check',
  },
];
