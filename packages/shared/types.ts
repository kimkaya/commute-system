// Shared TypeScript types for Commute System
// Used across web and desktop applications

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  face_descriptor?: number[];
  created_at: string;
  updated_at: string;
}

export interface Employee extends User {
  role: 'employee';
  employee_id: string;
  hire_date: string;
  hourly_rate?: number;
  salary?: number;
}

export interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in: string;
  check_out?: string;
  check_in_location?: Location;
  check_out_location?: Location;
  check_in_method: 'face' | 'manual';
  check_out_method?: 'face' | 'manual';
  status: 'present' | 'absent' | 'late' | 'early_leave';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: 'vacation' | 'sick' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  base_pay: number;
  overtime_pay: number;
  deductions: number;
  net_pay: number;
  status: 'draft' | 'processed' | 'paid';
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  work_hours_start: string;
  work_hours_end: string;
  late_threshold_minutes: number;
  overtime_rate: number;
  weekend_days: number[];
  holidays: Holiday[];
  face_match_threshold: number;
  location_required: boolean;
  updated_at: string;
}

export interface Holiday {
  date: string;
  name: string;
  type: 'national' | 'company';
}

export interface DashboardStats {
  total_employees: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
  pending_leave_requests: number;
  average_attendance_rate: number;
  total_overtime_hours_month: number;
}

export interface AttendanceSummary {
  user_id: string;
  user_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  total_hours: number;
  overtime_hours: number;
  attendance_rate: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Face Recognition types
export interface FaceDescriptor {
  descriptor: number[];
  label: string;
}

export interface FaceMatch {
  match: boolean;
  distance: number;
  confidence: number;
  label?: string;
}
