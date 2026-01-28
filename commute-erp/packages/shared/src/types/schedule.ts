// =====================================================
// 스케줄 타입
// =====================================================

export interface Schedule {
  id: string;
  business_id: string;
  employee_id: string;
  date: string;
  shift?: ShiftType;
  start_time?: string;
  end_time?: string;
  break_duration: number;
  location?: string;
  notes?: string;
  is_holiday: boolean;
  holiday_type?: string;
  assigned_by?: string;
  assigned_at: string;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'full' | 'off';
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'cancelled';

export interface ScheduleWithEmployee extends Schedule {
  employee?: {
    id: string;
    name: string;
    employee_number?: string;
    department?: string;
  };
}

// 공휴일
export interface Holiday {
  id: string;
  business_id?: string;
  date: string;
  name: string;
  type: HolidayType;
  is_paid: boolean;
  created_at: string;
}

export type HolidayType = 'public' | 'company' | 'substitute';

// Input types
export interface CreateScheduleInput {
  business_id: string;
  employee_id: string;
  date: string;
  shift?: ShiftType;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  location?: string;
  notes?: string;
  is_holiday?: boolean;
  holiday_type?: string;
  assigned_by?: string;
}

export interface UpdateScheduleInput {
  shift?: ShiftType;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  location?: string;
  notes?: string;
  status?: ScheduleStatus;
}

// 일괄 스케줄 생성
export interface BulkScheduleInput {
  business_id: string;
  employee_ids: string[];
  start_date: string;
  end_date: string;
  shift: ShiftType;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  skip_holidays?: boolean;
  skip_weekends?: boolean;
  assigned_by?: string;
}

// 시프트 정보
export interface ShiftInfo {
  type: ShiftType;
  label: string;
  label_ko: string;
  default_start?: string;
  default_end?: string;
  color: string;
}

export const SHIFTS: ShiftInfo[] = [
  { type: 'morning', label: 'Morning', label_ko: '오전', default_start: '06:00', default_end: '14:00', color: '#FCD34D' },
  { type: 'afternoon', label: 'Afternoon', label_ko: '오후', default_start: '14:00', default_end: '22:00', color: '#60A5FA' },
  { type: 'night', label: 'Night', label_ko: '야간', default_start: '22:00', default_end: '06:00', color: '#A78BFA' },
  { type: 'full', label: 'Full Day', label_ko: '종일', default_start: '09:00', default_end: '18:00', color: '#34D399' },
  { type: 'off', label: 'Day Off', label_ko: '휴무', color: '#9CA3AF' },
];
