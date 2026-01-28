// =====================================================
// 감사 로그 타입
// =====================================================

export interface AuditLog {
  id: string;
  business_id?: string;
  timestamp: string;
  user_id?: string;
  user_name?: string;
  action: AuditAction;
  resource: AuditResource;
  resource_id?: string;
  details: Record<string, unknown>;
  before_value?: Record<string, unknown>;
  after_value?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  level: AuditLevel;
  success: boolean;
  error_message?: string;
  duration_ms?: number;
}

export type AuditAction = 
  // 인증
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'password_reset'
  
  // CRUD
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  
  // 출퇴근
  | 'check_in'
  | 'check_out'
  | 'emergency_check_in'
  | 'emergency_check_out'
  | 'attendance_modify'
  
  // 급여
  | 'payroll_calculate'
  | 'payroll_confirm'
  | 'payroll_close'
  
  // 휴가
  | 'leave_request'
  | 'leave_approve'
  | 'leave_reject'
  | 'leave_cancel'
  
  // 시스템
  | 'backup_create'
  | 'backup_restore'
  | 'settings_change'
  | 'export_data';

export type AuditResource = 
  | 'employee'
  | 'attendance'
  | 'leave'
  | 'schedule'
  | 'payroll'
  | 'compliance'
  | 'notification'
  | 'backup'
  | 'settings'
  | 'system';

export type AuditLevel = 'info' | 'warning' | 'error';

// Input types
export interface CreateAuditLogInput {
  business_id?: string;
  user_id?: string;
  user_name?: string;
  action: AuditAction;
  resource: AuditResource;
  resource_id?: string;
  details?: Record<string, unknown>;
  before_value?: Record<string, unknown>;
  after_value?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  level?: AuditLevel;
  success?: boolean;
  error_message?: string;
  duration_ms?: number;
}

// 감사 로그 필터
export interface AuditLogFilter {
  business_id?: string;
  user_id?: string;
  action?: AuditAction;
  resource?: AuditResource;
  level?: AuditLevel;
  success?: boolean;
  start_date?: string;
  end_date?: string;
  search?: string;
}

// 감사 로그 통계
export interface AuditLogStats {
  period_start: string;
  period_end: string;
  total_count: number;
  by_action: Record<AuditAction, number>;
  by_resource: Record<AuditResource, number>;
  by_level: Record<AuditLevel, number>;
  success_count: number;
  failure_count: number;
  active_users: number;
}

// 액션 정보
export interface AuditActionInfo {
  action: AuditAction;
  label: string;
  label_ko: string;
  category: 'auth' | 'crud' | 'attendance' | 'payroll' | 'leave' | 'system';
}

export const AUDIT_ACTIONS: AuditActionInfo[] = [
  // 인증
  { action: 'login', label: 'Login', label_ko: '로그인', category: 'auth' },
  { action: 'logout', label: 'Logout', label_ko: '로그아웃', category: 'auth' },
  { action: 'login_failed', label: 'Login Failed', label_ko: '로그인 실패', category: 'auth' },
  { action: 'password_change', label: 'Password Change', label_ko: '비밀번호 변경', category: 'auth' },
  { action: 'password_reset', label: 'Password Reset', label_ko: '비밀번호 재설정', category: 'auth' },
  
  // CRUD
  { action: 'create', label: 'Create', label_ko: '생성', category: 'crud' },
  { action: 'read', label: 'Read', label_ko: '조회', category: 'crud' },
  { action: 'update', label: 'Update', label_ko: '수정', category: 'crud' },
  { action: 'delete', label: 'Delete', label_ko: '삭제', category: 'crud' },
  
  // 출퇴근
  { action: 'check_in', label: 'Check In', label_ko: '출근', category: 'attendance' },
  { action: 'check_out', label: 'Check Out', label_ko: '퇴근', category: 'attendance' },
  { action: 'emergency_check_in', label: 'Emergency Check In', label_ko: '긴급 출근', category: 'attendance' },
  { action: 'emergency_check_out', label: 'Emergency Check Out', label_ko: '긴급 퇴근', category: 'attendance' },
  { action: 'attendance_modify', label: 'Attendance Modify', label_ko: '출퇴근 수정', category: 'attendance' },
  
  // 급여
  { action: 'payroll_calculate', label: 'Payroll Calculate', label_ko: '급여 계산', category: 'payroll' },
  { action: 'payroll_confirm', label: 'Payroll Confirm', label_ko: '급여 확정', category: 'payroll' },
  { action: 'payroll_close', label: 'Payroll Close', label_ko: '급여 마감', category: 'payroll' },
  
  // 휴가
  { action: 'leave_request', label: 'Leave Request', label_ko: '휴가 신청', category: 'leave' },
  { action: 'leave_approve', label: 'Leave Approve', label_ko: '휴가 승인', category: 'leave' },
  { action: 'leave_reject', label: 'Leave Reject', label_ko: '휴가 반려', category: 'leave' },
  { action: 'leave_cancel', label: 'Leave Cancel', label_ko: '휴가 취소', category: 'leave' },
  
  // 시스템
  { action: 'backup_create', label: 'Backup Create', label_ko: '백업 생성', category: 'system' },
  { action: 'backup_restore', label: 'Backup Restore', label_ko: '백업 복원', category: 'system' },
  { action: 'settings_change', label: 'Settings Change', label_ko: '설정 변경', category: 'system' },
  { action: 'export_data', label: 'Export Data', label_ko: '데이터 내보내기', category: 'system' },
];
