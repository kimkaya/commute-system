// Shared constants for Commute System

// API endpoints (relative to base URL)
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me',
  
  // Users
  USERS: '/api/users',
  USER: (id: string) => `/api/users/${id}`,
  
  // Attendance
  ATTENDANCE: '/api/attendance',
  ATTENDANCE_RECORD: (id: string) => `/api/attendance/${id}`,
  CHECK_IN: '/api/attendance/check-in',
  CHECK_OUT: '/api/attendance/check-out',
  MY_RECORDS: '/api/attendance/my-records',
  
  // Leave
  LEAVE_REQUESTS: '/api/leave',
  LEAVE_REQUEST: (id: string) => `/api/leave/${id}`,
  APPROVE_LEAVE: (id: string) => `/api/leave/${id}/approve`,
  REJECT_LEAVE: (id: string) => `/api/leave/${id}/reject`,
  
  // Payroll
  PAYROLL: '/api/payroll',
  PAYROLL_RECORD: (id: string) => `/api/payroll/${id}`,
  CALCULATE_PAYROLL: '/api/payroll/calculate',
  
  // Dashboard
  DASHBOARD_STATS: '/api/dashboard/stats',
  ATTENDANCE_SUMMARY: '/api/dashboard/attendance-summary',
  
  // Settings
  SETTINGS: '/api/settings',
};

// Leave types
export const LEAVE_TYPES = [
  { value: 'vacation', label: '휴가', color: 'blue' },
  { value: 'sick', label: '병가', color: 'red' },
  { value: 'personal', label: '개인 사유', color: 'yellow' },
  { value: 'other', label: '기타', color: 'gray' },
] as const;

// Leave status
export const LEAVE_STATUS = [
  { value: 'pending', label: '대기중', color: 'yellow' },
  { value: 'approved', label: '승인됨', color: 'green' },
  { value: 'rejected', label: '거부됨', color: 'red' },
] as const;

// Attendance status
export const ATTENDANCE_STATUS = [
  { value: 'present', label: '출근', color: 'green' },
  { value: 'absent', label: '결근', color: 'red' },
  { value: 'late', label: '지각', color: 'yellow' },
  { value: 'early_leave', label: '조퇴', color: 'orange' },
] as const;

// Check-in methods
export const CHECK_IN_METHODS = [
  { value: 'face', label: '얼굴 인식' },
  { value: 'manual', label: '수동 입력' },
] as const;

// User roles
export const USER_ROLES = [
  { value: 'admin', label: '관리자' },
  { value: 'employee', label: '직원' },
] as const;

// Payroll status
export const PAYROLL_STATUS = [
  { value: 'draft', label: '임시저장', color: 'gray' },
  { value: 'processed', label: '처리완료', color: 'blue' },
  { value: 'paid', label: '지급완료', color: 'green' },
] as const;

// Work schedule defaults
export const WORK_SCHEDULE = {
  START_TIME: '09:00',
  END_TIME: '18:00',
  LUNCH_BREAK_MINUTES: 60,
  LATE_THRESHOLD_MINUTES: 10,
  OVERTIME_RATE: 1.5,
} as const;

// Weekend days (0 = Sunday, 6 = Saturday)
export const WEEKEND_DAYS = [0, 6] as const;

// Face recognition settings
export const FACE_RECOGNITION = {
  MATCH_THRESHOLD: 0.6, // Lower is stricter
  MIN_CONFIDENCE: 0.7,
  MODEL_PATH: '/models',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'YYYY-MM-DD',
  DISPLAY_WITH_TIME: 'YYYY-MM-DD HH:mm',
  TIME_ONLY: 'HH:mm',
  MONTH_YEAR: 'YYYY-MM',
  FULL: 'YYYY-MM-DD HH:mm:ss',
} as const;

// Validation rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'commute_auth_token',
  USER_DATA: 'commute_user_data',
  THEME: 'commute_theme',
  LANGUAGE: 'commute_language',
} as const;

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
  FORBIDDEN: '권한이 없습니다.',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  VALIDATION_ERROR: '입력 데이터가 올바르지 않습니다.',
  SERVER_ERROR: '서버 오류가 발생했습니다.',
  FACE_NOT_DETECTED: '얼굴을 감지할 수 없습니다.',
  FACE_NOT_MATCHED: '등록된 얼굴과 일치하지 않습니다.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '로그인에 성공했습니다.',
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
  REGISTER_SUCCESS: '회원가입에 성공했습니다.',
  CHECK_IN_SUCCESS: '출근 체크가 완료되었습니다.',
  CHECK_OUT_SUCCESS: '퇴근 체크가 완료되었습니다.',
  LEAVE_REQUEST_SUCCESS: '휴가 신청이 완료되었습니다.',
  SAVE_SUCCESS: '저장되었습니다.',
  DELETE_SUCCESS: '삭제되었습니다.',
  UPDATE_SUCCESS: '수정되었습니다.',
} as const;
