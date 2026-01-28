// =====================================================
// 출퇴근 타입
// =====================================================

export interface AttendanceRecord {
  id: string;
  business_id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  check_in?: string; // HH:mm
  check_out?: string; // HH:mm
  check_in_at?: string; // ISO timestamp
  check_out_at?: string; // ISO timestamp
  total_break_minutes: number;
  break_start?: string;
  break_end?: string;
  work_location?: string;
  notes?: string;
  device_id?: string;
  ip_address?: string;
  check_in_method?: CheckMethod;
  check_out_method?: CheckMethod;
  status: RecordStatus;
  original_check_in?: string;
  original_check_out?: string;
  modified_by?: string;
  modified_at?: string;
  created_at: string;
  updated_at: string;
}

export type CheckMethod = 'face' | 'password' | 'emergency' | 'admin';
export type RecordStatus = 'active' | 'deleted' | 'modified';

// 출퇴근 기록 + 직원 정보
export interface AttendanceWithEmployee extends AttendanceRecord {
  employee?: {
    id: string;
    name: string;
    employee_number?: string;
    department?: string;
    position?: string;
  };
}

// 오늘 출퇴근 현황
export interface TodayAttendance {
  employee_id: string;
  employee_name: string;
  employee_number?: string;
  department?: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  work_minutes?: number;
}

export type AttendanceStatus = 
  | 'not_checked_in'  // 미출근
  | 'checked_in'      // 출근 (근무중)
  | 'checked_out'     // 퇴근 완료
  | 'late'            // 지각
  | 'early_leave'     // 조퇴
  | 'absent'          // 결근
  | 'on_leave';       // 휴가

// Input types
export interface CheckInInput {
  business_id: string;
  employee_id: string;
  method: CheckMethod;
  device_id?: string;
  ip_address?: string;
  work_location?: string;
}

export interface CheckOutInput {
  business_id: string;
  employee_id: string;
  method: CheckMethod;
  device_id?: string;
  ip_address?: string;
}

export interface CreateAttendanceInput {
  business_id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  total_break_minutes?: number;
  notes?: string;
}

export interface UpdateAttendanceInput {
  check_in?: string;
  check_out?: string;
  total_break_minutes?: number;
  notes?: string;
  modified_by: string;
}

// 출퇴근 통계
export interface AttendanceStats {
  period_start: string;
  period_end: string;
  total_work_days: number;
  total_work_hours: number;
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
  late_count: number;
  early_leave_count: number;
  absent_count: number;
}

// 출퇴근 필터
export interface AttendanceFilter {
  business_id: string;
  employee_id?: string;
  department?: string;
  start_date: string;
  end_date: string;
  status?: RecordStatus;
}

// 근무시간 계산 결과
export interface WorkHoursCalculation {
  total_minutes: number;
  regular_minutes: number;
  overtime_minutes: number;
  night_minutes: number;
  break_minutes: number;
}
