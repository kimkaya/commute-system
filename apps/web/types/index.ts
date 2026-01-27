export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  face_descriptor?: number[];
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  location?: string;
  notes?: string;
  created_at: string;
}

export interface LeaveApplication {
  id: string;
  user_id: string;
  leave_type: 'sick' | 'casual' | 'vacation' | 'unpaid';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  user_id: string;
  month: string;
  year: number;
  base_salary: number;
  deductions: number;
  bonuses: number;
  net_salary: number;
  paid: boolean;
  payment_date?: string;
}

export interface Settings {
  id: string;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  half_day_hours: number;
  full_day_hours: number;
  enable_face_recognition: boolean;
  enable_location_tracking: boolean;
}
