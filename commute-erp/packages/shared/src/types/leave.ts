// =====================================================
// 휴가 타입
// =====================================================

export interface Leave {
  id: string;
  business_id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  duration: number;
  unit: LeaveUnit;
  reason?: string;
  status: LeaveStatus;
  requested_at: string;
  requested_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  attachments: string[];
  is_paid: boolean;
  deduct_from_salary: boolean;
  created_at: string;
  updated_at: string;
}

export type LeaveType = 
  | 'annual'      // 연차
  | 'sick'        // 병가
  | 'personal'    // 개인사유
  | 'maternity'   // 출산휴가
  | 'paternity'   // 배우자 출산휴가
  | 'bereavement' // 경조사
  | 'unpaid'      // 무급휴가
  | 'half_am'     // 오전 반차
  | 'half_pm';    // 오후 반차

export type LeaveUnit = 'days' | 'hours';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveWithEmployee extends Leave {
  employee?: {
    id: string;
    name: string;
    employee_number?: string;
    department?: string;
  };
}

// 휴가 잔여
export interface LeaveBalance {
  id: string;
  business_id: string;
  employee_id: string;
  year: number;
  annual_total: number;
  annual_used: number;
  annual_remaining: number;
  sick_total: number;
  sick_used: number;
  sick_remaining: number;
  created_at: string;
  updated_at: string;
}

// Input types
export interface CreateLeaveInput {
  business_id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  unit?: LeaveUnit;
  reason?: string;
  attachments?: string[];
}

export interface ReviewLeaveInput {
  status: 'approved' | 'rejected';
  reviewed_by: string;
  review_notes?: string;
}

// 휴가 유형 정보
export interface LeaveTypeInfo {
  type: LeaveType;
  label: string;
  label_ko: string;
  is_paid: boolean;
  requires_approval: boolean;
  max_days?: number;
}

export const LEAVE_TYPES: LeaveTypeInfo[] = [
  { type: 'annual', label: 'Annual Leave', label_ko: '연차', is_paid: true, requires_approval: true },
  { type: 'sick', label: 'Sick Leave', label_ko: '병가', is_paid: true, requires_approval: true },
  { type: 'personal', label: 'Personal Leave', label_ko: '개인사유', is_paid: false, requires_approval: true },
  { type: 'maternity', label: 'Maternity Leave', label_ko: '출산휴가', is_paid: true, requires_approval: true, max_days: 90 },
  { type: 'paternity', label: 'Paternity Leave', label_ko: '배우자출산휴가', is_paid: true, requires_approval: true, max_days: 10 },
  { type: 'bereavement', label: 'Bereavement Leave', label_ko: '경조사', is_paid: true, requires_approval: true },
  { type: 'unpaid', label: 'Unpaid Leave', label_ko: '무급휴가', is_paid: false, requires_approval: true },
  { type: 'half_am', label: 'Half Day (AM)', label_ko: '오전반차', is_paid: true, requires_approval: true },
  { type: 'half_pm', label: 'Half Day (PM)', label_ko: '오후반차', is_paid: true, requires_approval: true },
];
