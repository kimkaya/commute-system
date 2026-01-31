// =====================================================
// Supabase API 서비스
// =====================================================

import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// 기본 사업장 ID (단일 테넌트 모드)
const BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

// =====================================================
// 타입 정의
// =====================================================

export interface Employee {
  id: string;
  business_id: string;
  employee_number: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  birth_date: string | null;
  hourly_rate: number;
  monthly_salary: number | null;
  salary_type: 'hourly' | 'monthly';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  business_id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  total_break_minutes: number;
  work_location: string | null;
  notes: string | null;
  check_in_method: 'face' | 'password' | 'emergency' | 'admin';
  check_out_method: 'face' | 'password' | 'emergency' | 'admin' | null;
  status: 'active' | 'deleted' | 'modified';
  created_at: string;
  employee?: Employee;
}

export interface Leave {
  id: string;
  business_id: string;
  employee_id: string;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'half_am' | 'half_pm';
  start_date: string;
  end_date: string;
  duration: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  employee?: Employee;
}

export interface PayrollPeriod {
  id: string;
  business_id: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'processing' | 'closed';
}

export interface PayrollLine {
  id: string;
  business_id: string;
  payroll_run_id: string;
  payroll_period_id: string;
  employee_id: string;
  regular_hours: number;
  overtime_hours: number;
  total_hours: number;
  work_days: number;
  hourly_rate: number;
  base_pay: number;
  overtime_pay: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: 'draft' | 'confirmed' | 'paid';
  employee?: Employee;
}

export interface Schedule {
  id: string;
  business_id: string;
  employee_id: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'night' | 'full' | 'off';
  start_time: string | null;
  end_time: string | null;
  break_duration: number;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  employee?: Employee;
}

export interface SystemSettings {
  id: string;
  business_id: string;
  admin_password_hash: string | null;
  default_hourly_rate: number;
  overtime_rate: number;
  night_work_rate: number;
  holiday_work_rate: number;
  weekly_regular_hours: number;
  daily_regular_hours: number;
  standard_start_time: string;
  standard_end_time: string;
  face_match_threshold: number;
}

export interface Notification {
  id: string;
  business_id: string;
  type: 'leave_request' | 'leave_approved' | 'leave_rejected' | 'payroll_confirmed' | 'schedule_change' | 'system' | 'reminder';
  title: string;
  message: string;
  target_type: 'all' | 'admin' | 'employee';
  target_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ComplianceCheck {
  id: string;
  business_id: string;
  check_type: 'weekly_hours' | 'overtime' | 'rest_period' | 'annual_leave' | 'night_work';
  employee_id: string | null;
  check_date: string;
  status: 'compliant' | 'warning' | 'violation' | 'good';
  details: { violations: string[]; warnings: string[] } | null;
  value: number | null;
  threshold: number | null;
  created_at: string;
  employee?: Employee;
}

// =====================================================
// 관리자 인증
// =====================================================

export async function adminLogin(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // system_settings에서 관리자 비밀번호 확인
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('admin_password_hash, admin_fail_count, admin_locked_until')
      .eq('business_id', BUSINESS_ID)
      .single();

    if (error) {
      console.error('Settings fetch error:', error);
      return { success: false, error: '설정을 불러올 수 없습니다.' };
    }

    // 잠금 확인
    if (settings.admin_locked_until && new Date(settings.admin_locked_until) > new Date()) {
      return { success: false, error: '계정이 잠겼습니다. 잠시 후 다시 시도하세요.' };
    }

    // 비밀번호 확인 (단순 비교 - 실제로는 해시 비교해야 함)
    // 초기 비밀번호: admin1234
    const isValid = settings.admin_password_hash === password || 
                    (!settings.admin_password_hash && password === 'admin1234');

    if (!isValid) {
      // 실패 횟수 증가
      await supabase
        .from('system_settings')
        .update({ 
          admin_fail_count: (settings.admin_fail_count || 0) + 1,
          admin_locked_until: (settings.admin_fail_count || 0) >= 4 
            ? new Date(Date.now() + 30 * 60 * 1000).toISOString() 
            : null
        })
        .eq('business_id', BUSINESS_ID);

      return { success: false, error: '비밀번호가 올바르지 않습니다.' };
    }

    // 성공 시 실패 횟수 초기화
    await supabase
      .from('system_settings')
      .update({ admin_fail_count: 0, admin_locked_until: null })
      .eq('business_id', BUSINESS_ID);

    return { success: true };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: '로그인 중 오류가 발생했습니다.' };
  }
}

// =====================================================
// 직원 API
// =====================================================

export async function getEmployees(filters?: { 
  is_active?: boolean; 
  department?: string;
  search?: string;
}): Promise<Employee[]> {
  let query = supabase
    .from('employees')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .order('name');

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters?.department) {
    query = query.eq('department', filters.department);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,employee_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createEmployee(employee: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      ...employee,
      business_id: BUSINESS_ID,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, inactive_date: new Date().toISOString().split('T')[0] })
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// 출퇴근 API
// =====================================================

export async function getAttendanceRecords(filters?: {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  date?: string;
}): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('attendance_records')
    .select('*, employee:employees!attendance_records_employee_id_fkey(*)')
    .eq('business_id', BUSINESS_ID)
    .eq('status', 'active')
    .order('date', { ascending: false });

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }
  if (filters?.date) {
    query = query.eq('date', filters.date);
  }
  if (filters?.start_date) {
    query = query.gte('date', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('date', filters.end_date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTodayAttendance(): Promise<AttendanceRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  return getAttendanceRecords({ date: today });
}

export async function checkIn(employeeId: string, method: 'face' | 'password' | 'admin' = 'admin'): Promise<AttendanceRecord> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].substring(0, 5);

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert({
      business_id: BUSINESS_ID,
      employee_id: employeeId,
      date,
      check_in: time,
      check_in_at: now.toISOString(),
      check_in_method: method,
      status: 'active',
    }, {
      onConflict: 'business_id,employee_id,date',
    })
    .select('*, employee:employees!attendance_records_employee_id_fkey(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function checkOut(employeeId: string, method: 'face' | 'password' | 'admin' = 'admin'): Promise<AttendanceRecord> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].substring(0, 5);

  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      check_out: time,
      check_out_at: now.toISOString(),
      check_out_method: method,
    })
    .eq('business_id', BUSINESS_ID)
    .eq('employee_id', employeeId)
    .eq('date', date)
    .select('*, employee:employees!attendance_records_employee_id_fkey(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttendance(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance_records')
    .update(updates)
    .eq('id', id)
    .select('*, employee:employees!attendance_records_employee_id_fkey(*)')
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// 휴가 API
// =====================================================

export async function getLeaves(filters?: {
  employee_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Leave[]> {
  try {
    let query = supabase
      .from('leaves')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .order('start_date', { ascending: false });

    if (filters?.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.start_date) {
      query = query.gte('start_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('end_date', filters.end_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // 직원 정보 별도 조회
    if (data && data.length > 0) {
      const employeeIds = [...new Set(data.map(l => l.employee_id))];
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .in('id', employeeIds);
      
      const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);
      return data.map(leave => ({
        ...leave,
        employee: employeeMap.get(leave.employee_id) || null,
      }));
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to load leaves:', err);
    return [];
  }
}

export async function createLeave(leave: Partial<Leave>): Promise<Leave> {
  const { data, error } = await supabase
    .from('leaves')
    .insert({
      ...leave,
      business_id: BUSINESS_ID,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeave(id: string, updates: Partial<Leave>): Promise<Leave> {
  const { data, error } = await supabase
    .from('leaves')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function approveLeave(id: string, reviewNotes?: string): Promise<Leave> {
  return updateLeave(id, {
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes,
  });
}

export async function rejectLeave(id: string, reviewNotes?: string): Promise<Leave> {
  return updateLeave(id, {
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes,
  });
}

// 휴가 잔여 조회
export interface LeaveBalance {
  employee_id: string;
  year: number;
  annual_total: number;
  annual_used: number;
  annual_remaining: number;
  sick_total: number;
  sick_used: number;
  employee?: Employee;
}

export async function getLeaveBalances(year: number): Promise<LeaveBalance[]> {
  try {
    // leave_balances 테이블 조회
    const { data: balances, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .eq('year', year);

    if (error) {
      console.error('Failed to load leave balances:', error);
      // 테이블이 없거나 오류 시, 직원 목록 기반으로 기본값 생성
      const employees = await getEmployees({ is_active: true });
      return employees.map(emp => ({
        employee_id: emp.id,
        year,
        annual_total: 15,
        annual_used: 0,
        annual_remaining: 15,
        sick_total: 0,
        sick_used: 0,
        employee: emp,
      }));
    }

    // 직원 정보 조회
    const employeeIds = [...new Set((balances || []).map(b => b.employee_id))];
    let employees: Employee[] = [];
    if (employeeIds.length > 0) {
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .in('id', employeeIds);
      employees = empData || [];
    }

    const employeeMap = new Map(employees.map(e => [e.id, e]));
    
    return (balances || []).map(b => ({
      employee_id: b.employee_id,
      year: b.year,
      annual_total: b.annual_total || 15,
      annual_used: b.annual_used || 0,
      annual_remaining: (b.annual_total || 15) - (b.annual_used || 0),
      sick_total: b.sick_total || 0,
      sick_used: b.sick_used || 0,
      employee: employeeMap.get(b.employee_id),
    }));
  } catch (err) {
    console.error('Failed to load leave balances:', err);
    return [];
  }
}

export async function getEmployeeLeaveBalance(employeeId: string, year: number): Promise<LeaveBalance> {
  // 해당 직원의 승인된 휴가 일수 합산
  const { data: leaves } = await supabase
    .from('leaves')
    .select('type, duration, status')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .gte('start_date', `${year}-01-01`)
    .lte('end_date', `${year}-12-31`);

  let annualUsed = 0;
  let sickUsed = 0;
  
  (leaves || []).forEach(leave => {
    if (leave.type === 'annual' || leave.type === 'half_am' || leave.type === 'half_pm') {
      annualUsed += leave.duration || 0;
    } else if (leave.type === 'sick') {
      sickUsed += leave.duration || 0;
    }
  });

  return {
    employee_id: employeeId,
    year,
    annual_total: 15, // 기본 연차
    annual_used: annualUsed,
    annual_remaining: 15 - annualUsed,
    sick_total: 0,
    sick_used: sickUsed,
  };
}

// =====================================================
// 급여 API
// =====================================================

export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPayrollLines(periodId: string): Promise<PayrollLine[]> {
  // payroll_lines 조회 (조인 없이)
  const { data, error } = await supabase
    .from('payroll_lines')
    .select('*')
    .eq('payroll_period_id', periodId)
    .order('employee_id');

  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // 직원 정보 별도 조회
  const employeeIds = [...new Set(data.map(l => l.employee_id).filter(Boolean))];
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .in('id', employeeIds);
    
    const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);
    return data.map(line => ({
      ...line,
      employee: employeeMap.get(line.employee_id) || null,
    }));
  }
  
  return data || [];
}

export async function createPayrollPeriod(year: number, month: number): Promise<PayrollPeriod> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const { data, error } = await supabase
    .from('payroll_periods')
    .insert({
      business_id: BUSINESS_ID,
      year,
      month,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// 스케줄 API
// =====================================================

export async function getSchedules(filters?: {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Schedule[]> {
  let query = supabase
    .from('schedules')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .order('date');

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }
  if (filters?.start_date) {
    query = query.gte('date', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('date', filters.end_date);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  // 직원 정보 별도 조회
  const employeeIds = [...new Set(data.map(s => s.employee_id).filter(Boolean))];
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .in('id', employeeIds);
    
    const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);
    return data.map(schedule => ({
      ...schedule,
      employee: employeeMap.get(schedule.employee_id) || null,
    }));
  }
  
  return data || [];
}

export async function createSchedule(schedule: Partial<Schedule>): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .upsert({
      ...schedule,
      business_id: BUSINESS_ID,
    }, {
      onConflict: 'business_id,employee_id,date',
    })
    .select('*')
    .single();

  if (error) throw error;
  
  // 직원 정보 별도 조회
  if (data.employee_id) {
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', data.employee_id)
      .single();
    return { ...data, employee };
  }
  
  return data;
}

export async function updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  
  // 직원 정보 별도 조회
  if (data.employee_id) {
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', data.employee_id)
      .single();
    return { ...data, employee };
  }
  
  return data;
}

// =====================================================
// 설정 API
// =====================================================

export async function getSystemSettings(): Promise<SystemSettings | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .single();

  if (error) throw error;
  return data;
}

export async function updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .update(updates)
    .eq('business_id', BUSINESS_ID)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// 대시보드 통계
// =====================================================

export async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  
  // 병렬로 데이터 조회
  const [
    employeesResult,
    todayAttendanceResult,
    pendingLeavesResult,
  ] = await Promise.all([
    supabase
      .from('employees')
      .select('id, is_active')
      .eq('business_id', BUSINESS_ID),
    supabase
      .from('attendance_records')
      .select('id, check_in, check_out')
      .eq('business_id', BUSINESS_ID)
      .eq('date', today)
      .eq('status', 'active'),
    supabase
      .from('leaves')
      .select('id')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'pending'),
  ]);

  const employees = employeesResult.data || [];
  const todayAttendance = todayAttendanceResult.data || [];
  const pendingLeaves = pendingLeavesResult.data || [];

  const totalEmployees = employees.filter(e => e.is_active !== false).length;
  const checkedIn = todayAttendance.filter(a => a.check_in).length;
  const checkedOut = todayAttendance.filter(a => a.check_out).length;
  const working = checkedIn - checkedOut;

  return {
    totalEmployees,
    checkedIn,
    checkedOut,
    working,
    pendingLeaves: pendingLeaves.length,
    attendanceRate: totalEmployees > 0 ? Math.round((checkedIn / totalEmployees) * 100) : 0,
  };
}

// =====================================================
// 직원 인증정보 API
// =====================================================

export async function getEmployeeCredentials(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_credentials')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createEmployeeCredentials(employeeId: string, password: string) {
  const { data, error } = await supabase
    .from('employee_credentials')
    .upsert({
      employee_id: employeeId,
      password_hash: password, // 실제로는 해시해야 함
    }, {
      onConflict: 'employee_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// 급여 계산 API
// =====================================================

export interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  department: string | null;
  workDays: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  hourlyRate: number;
  basePay: number;
  overtimePay: number;
  grossPay: number;
  incomeTax: number;
  healthInsurance: number;
  nationalPension: number;
  employmentInsurance: number;
  totalDeductions: number;
  netPay: number;
}

// 특정 기간의 출퇴근 기록을 기반으로 급여 계산
export async function calculatePayroll(year: number, month: number): Promise<PayrollCalculation[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // 설정 가져오기
  const settings = await getSystemSettings();
  const overtimeRate = settings?.overtime_rate || 1.5;
  const dailyRegularHours = settings?.daily_regular_hours || 8;

  // 활성 직원 목록
  const employees = await getEmployees({ is_active: true });

  // 해당 기간의 출퇴근 기록
  const attendanceRecords = await getAttendanceRecords({
    start_date: startDateStr,
    end_date: endDateStr,
  });

  // 직원별로 급여 계산
  const calculations: PayrollCalculation[] = [];

  for (const employee of employees) {
    const employeeRecords = attendanceRecords.filter(r => r.employee_id === employee.id);
    
    let totalMinutes = 0;
    let overtimeMinutes = 0;
    let workDays = 0;

    for (const record of employeeRecords) {
      if (record.check_in && record.check_out) {
        workDays++;
        
        // 근무 시간 계산
        const [inH, inM] = record.check_in.split(':').map(Number);
        const [outH, outM] = record.check_out.split(':').map(Number);
        const workedMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (record.total_break_minutes || 60);
        
        totalMinutes += Math.max(0, workedMinutes);
        
        // 초과근무 계산 (일 8시간 초과)
        const regularMinutes = dailyRegularHours * 60;
        if (workedMinutes > regularMinutes) {
          overtimeMinutes += workedMinutes - regularMinutes;
        }
      }
    }

    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const overtimeHours = Math.round(overtimeMinutes / 60 * 10) / 10;
    const regularHours = totalHours - overtimeHours;
    const hourlyRate = employee.hourly_rate || settings?.default_hourly_rate || 9860;

    // 급여 계산
    const basePay = Math.round(regularHours * hourlyRate);
    const overtimePay = Math.round(overtimeHours * hourlyRate * overtimeRate);
    const grossPay = basePay + overtimePay;

    // 공제 계산 (간이세액표 기준 간략화)
    const incomeTax = Math.round(grossPay * 0.04); // 소득세 약 4%
    const healthInsurance = Math.round(grossPay * 0.03545); // 건강보험 3.545%
    const nationalPension = Math.round(grossPay * 0.045); // 국민연금 4.5%
    const employmentInsurance = Math.round(grossPay * 0.009); // 고용보험 0.9%
    const totalDeductions = incomeTax + healthInsurance + nationalPension + employmentInsurance;
    const netPay = grossPay - totalDeductions;

    calculations.push({
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNumber: employee.employee_number,
      department: employee.department,
      workDays,
      regularHours,
      overtimeHours,
      totalHours,
      hourlyRate,
      basePay,
      overtimePay,
      grossPay,
      incomeTax,
      healthInsurance,
      nationalPension,
      employmentInsurance,
      totalDeductions,
      netPay,
    });
  }

  return calculations;
}

// 급여 기간 생성 또는 조회
export async function getOrCreatePayrollPeriod(year: number, month: number): Promise<PayrollPeriod> {
  // 기존 기간 확인
  const { data: existing } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (existing) return existing;

  // 새로 생성
  return createPayrollPeriod(year, month);
}

// 급여 실행 (계산 결과를 DB에 저장)
export async function runPayroll(year: number, month: number): Promise<{ 
  success: boolean; 
  periodId: string;
  lineCount: number;
  error?: string;
}> {
  try {
    // 급여 기간 생성/조회
    const period = await getOrCreatePayrollPeriod(year, month);

    // 이미 확정된 급여가 있는지 확인
    const { data: existingLines } = await supabase
      .from('payroll_lines')
      .select('id, status')
      .eq('payroll_period_id', period.id);

    const hasConfirmed = existingLines?.some(l => l.status === 'confirmed' || l.status === 'paid');
    if (hasConfirmed) {
      return { success: false, periodId: period.id, lineCount: 0, error: '이미 확정된 급여가 있습니다.' };
    }

    // 기존 draft 삭제
    if (existingLines && existingLines.length > 0) {
      await supabase
        .from('payroll_lines')
        .delete()
        .eq('payroll_period_id', period.id)
        .eq('status', 'draft');
    }

    // 급여 계산
    const calculations = await calculatePayroll(year, month);

    // payroll_run 생성
    const { data: runData, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        business_id: BUSINESS_ID,
        payroll_period_id: period.id,
        run_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        total_gross: calculations.reduce((sum, c) => sum + c.grossPay, 0),
        total_deductions: calculations.reduce((sum, c) => sum + c.totalDeductions, 0),
        total_net: calculations.reduce((sum, c) => sum + c.netPay, 0),
        employee_count: calculations.length,
      })
      .select()
      .single();

    if (runError) throw runError;

    // payroll_lines 생성
    const lines = calculations.map(calc => ({
      business_id: BUSINESS_ID,
      payroll_run_id: runData.id,
      payroll_period_id: period.id,
      employee_id: calc.employeeId,
      regular_hours: calc.regularHours,
      overtime_hours: calc.overtimeHours,
      total_hours: calc.totalHours,
      work_days: calc.workDays,
      hourly_rate: calc.hourlyRate,
      base_pay: calc.basePay,
      overtime_pay: calc.overtimePay,
      gross_pay: calc.grossPay,
      total_deductions: calc.totalDeductions,
      net_pay: calc.netPay,
      status: 'draft',
    }));

    const { error: linesError } = await supabase
      .from('payroll_lines')
      .insert(lines);

    if (linesError) throw linesError;

    return { success: true, periodId: period.id, lineCount: lines.length };
  } catch (error) {
    console.error('Payroll run error:', error);
    return { success: false, periodId: '', lineCount: 0, error: '급여 계산 중 오류가 발생했습니다.' };
  }
}

// 급여 라인 수정
export async function updatePayrollLine(id: string, updates: Partial<PayrollLine>): Promise<PayrollLine> {
  const { data, error } = await supabase
    .from('payroll_lines')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// 급여 확정
export async function confirmPayroll(periodId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 모든 라인을 confirmed로 변경
    const { error: lineError } = await supabase
      .from('payroll_lines')
      .update({ status: 'confirmed' })
      .eq('payroll_period_id', periodId)
      .eq('status', 'draft');

    if (lineError) throw lineError;

    // 기간 상태 변경
    const { error: periodError } = await supabase
      .from('payroll_periods')
      .update({ status: 'closed' })
      .eq('id', periodId);

    if (periodError) throw periodError;

    // payroll_run 상태 변경
    const { error: runError } = await supabase
      .from('payroll_runs')
      .update({ status: 'confirmed' })
      .eq('payroll_period_id', periodId);

    if (runError) throw runError;

    return { success: true };
  } catch (error) {
    console.error('Confirm payroll error:', error);
    return { success: false, error: '급여 확정 중 오류가 발생했습니다.' };
  }
}

// 급여 지급 완료 처리
export async function markPayrollAsPaid(periodId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: lineError } = await supabase
      .from('payroll_lines')
      .update({ status: 'paid' })
      .eq('payroll_period_id', periodId)
      .eq('status', 'confirmed');

    if (lineError) throw lineError;

    const { error: runError } = await supabase
      .from('payroll_runs')
      .update({ status: 'paid' })
      .eq('payroll_period_id', periodId);

    if (runError) throw runError;

    return { success: true };
  } catch (error) {
    console.error('Mark paid error:', error);
    return { success: false, error: '지급 처리 중 오류가 발생했습니다.' };
  }
}

// =====================================================
// 세금/공제 설정 API (LocalStorage 기반 - DB 확장 전까지)
// =====================================================

export interface TaxSettings {
  // 소득세
  incomeTaxRate: number;        // 소득세율 (기본 4%)
  localTaxRate: number;         // 지방소득세율 (소득세의 10%)
  
  // 4대보험 요율 (2024년 기준)
  nationalPensionRate: number;  // 국민연금 (4.5%)
  healthInsuranceRate: number;  // 건강보험 (3.545%)
  longTermCareRate: number;     // 장기요양보험 (건강보험의 12.95%)
  employmentInsuranceRate: number; // 고용보험 (0.9%)
  
  // 회사 정보
  companyName: string;
  businessNumber: string;
  ceoName: string;
  companyAddress: string;
  companyPhone: string;
  
  // 근무 설정
  standardStartTime: string;
  standardEndTime: string;
  lunchStartTime: string;
  lunchEndTime: string;
  lateGraceMinutes: number;
}

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  incomeTaxRate: 0.04,
  localTaxRate: 0.1,
  nationalPensionRate: 0.045,
  healthInsuranceRate: 0.03545,
  longTermCareRate: 0.1295,
  employmentInsuranceRate: 0.009,
  companyName: '(주)테스트회사',
  businessNumber: '123-45-67890',
  ceoName: '홍길동',
  companyAddress: '서울시 강남구 테헤란로 123',
  companyPhone: '02-1234-5678',
  standardStartTime: '09:00',
  standardEndTime: '18:00',
  lunchStartTime: '12:00',
  lunchEndTime: '13:00',
  lateGraceMinutes: 10,
};

const TAX_SETTINGS_KEY = 'commute_erp_tax_settings';

export function getTaxSettings(): TaxSettings {
  try {
    const stored = localStorage.getItem(TAX_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_TAX_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load tax settings:', e);
  }
  return DEFAULT_TAX_SETTINGS;
}

export function saveTaxSettings(settings: TaxSettings): void {
  try {
    localStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save tax settings:', e);
  }
}

// 세금 계산 함수 (커스텀 세율 적용)
export function calculateTaxes(grossPay: number, settings?: TaxSettings) {
  const s = settings || getTaxSettings();
  
  const incomeTax = Math.round(grossPay * s.incomeTaxRate);
  const localTax = Math.round(incomeTax * s.localTaxRate);
  const nationalPension = Math.round(grossPay * s.nationalPensionRate);
  const healthInsurance = Math.round(grossPay * s.healthInsuranceRate);
  const longTermCare = Math.round(healthInsurance * s.longTermCareRate);
  const employmentInsurance = Math.round(grossPay * s.employmentInsuranceRate);
  
  const totalDeductions = incomeTax + localTax + nationalPension + healthInsurance + longTermCare + employmentInsurance;
  const netPay = grossPay - totalDeductions;
  
  return {
    incomeTax,
    localTax,
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    totalDeductions,
    netPay,
  };
}

// =====================================================
// Excel 템플릿 관리 API (LocalStorage 기반)
// =====================================================

export interface ExcelTemplate {
  id: string;
  name: string;
  description: string;
  type: 'payroll' | 'tax' | 'withholding' | 'custom';
  fileName: string;
  fileData: string; // base64
  mappings: TemplateCellMapping[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCellMapping {
  cell: string;       // 예: "B5", "C10"
  field: string;      // 예: "employeeName", "grossPay", "incomeTax"
  format?: string;    // 예: "currency", "date", "number"
}

const EXCEL_TEMPLATES_KEY = 'commute_erp_excel_templates';

export function getExcelTemplates(): ExcelTemplate[] {
  try {
    const stored = localStorage.getItem(EXCEL_TEMPLATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load excel templates:', e);
  }
  return [];
}

export function saveExcelTemplate(template: ExcelTemplate): void {
  try {
    const templates = getExcelTemplates();
    const existingIndex = templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    localStorage.setItem(EXCEL_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save excel template:', e);
  }
}

export function deleteExcelTemplate(id: string): void {
  try {
    const templates = getExcelTemplates().filter(t => t.id !== id);
    localStorage.setItem(EXCEL_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to delete excel template:', e);
  }
}

// =====================================================
// 보고서 데이터 API
// =====================================================

export async function getReportData(startDate: string, endDate: string) {
  try {
    // 직원 목록
    const employees = await getEmployees({ is_active: true });
    
    // 출퇴근 기록
    const attendance = await getAttendanceRecords({
      start_date: startDate,
      end_date: endDate,
    });
    
    // 휴가 기록
    const leaves = await getLeaves({
      start_date: startDate,
      end_date: endDate,
    });
    
    // 부서별 통계 계산
    const departmentStats: Record<string, {
      name: string;
      employees: number;
      totalHours: number;
      lateCount: number;
      overtimeHours: number;
    }> = {};
    
    for (const emp of employees) {
      const dept = emp.department || '미지정';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          name: dept,
          employees: 0,
          totalHours: 0,
          lateCount: 0,
          overtimeHours: 0,
        };
      }
      departmentStats[dept].employees++;
    }
    
    // 출퇴근 기록 분석
    for (const record of attendance) {
      const emp = employees.find(e => e.id === record.employee_id);
      const dept = emp?.department || '미지정';
      
      if (record.check_in && record.check_out) {
        const [inH, inM] = record.check_in.split(':').map(Number);
        const [outH, outM] = record.check_out.split(':').map(Number);
        const workedMinutes = (outH * 60 + outM) - (inH * 60 + inM) - 60; // 점심시간 1시간 제외
        const workedHours = Math.max(0, workedMinutes / 60);
        
        departmentStats[dept].totalHours += workedHours;
        
        // 연장근무 (8시간 초과)
        if (workedHours > 8) {
          departmentStats[dept].overtimeHours += workedHours - 8;
        }
        
        // 지각 체크 (9:00 이후)
        if (inH > 9 || (inH === 9 && inM > 0)) {
          departmentStats[dept].lateCount++;
        }
      }
    }
    
    return {
      employees,
      attendance,
      leaves,
      departmentStats: Object.values(departmentStats),
      summary: {
        totalEmployees: employees.length,
        totalAttendance: attendance.length,
        totalLeaves: leaves.length,
        pendingLeaves: leaves.filter(l => l.status === 'pending').length,
      },
    };
  } catch (error) {
    console.error('Failed to get report data:', error);
    throw error;
  }
}

// =====================================================
// Excel 파일 처리 API
// =====================================================

// 사용 가능한 필드 목록 (템플릿 매핑용)
export const AVAILABLE_FIELDS = [
  // 회사 정보
  { field: 'companyName', label: '회사명', category: 'company' },
  { field: 'businessNumber', label: '사업자등록번호', category: 'company' },
  { field: 'ceoName', label: '대표자명', category: 'company' },
  { field: 'companyAddress', label: '회사주소', category: 'company' },
  { field: 'companyPhone', label: '회사전화', category: 'company' },
  
  // 직원 정보
  { field: 'employeeName', label: '직원명', category: 'employee' },
  { field: 'employeeNumber', label: '사번', category: 'employee' },
  { field: 'department', label: '부서', category: 'employee' },
  { field: 'position', label: '직급', category: 'employee' },
  { field: 'hireDate', label: '입사일', category: 'employee' },
  { field: 'birthDate', label: '생년월일', category: 'employee' },
  
  // 급여 정보
  { field: 'year', label: '연도', category: 'payroll' },
  { field: 'month', label: '월', category: 'payroll' },
  { field: 'workDays', label: '근무일수', category: 'payroll' },
  { field: 'totalHours', label: '총근무시간', category: 'payroll' },
  { field: 'regularHours', label: '정규근무시간', category: 'payroll' },
  { field: 'overtimeHours', label: '연장근무시간', category: 'payroll' },
  { field: 'hourlyRate', label: '시급', category: 'payroll' },
  { field: 'basePay', label: '기본급', category: 'payroll' },
  { field: 'overtimePay', label: '연장수당', category: 'payroll' },
  { field: 'grossPay', label: '총지급액', category: 'payroll' },
  { field: 'netPay', label: '실수령액', category: 'payroll' },
  
  // 공제 항목
  { field: 'incomeTax', label: '소득세', category: 'deduction' },
  { field: 'localTax', label: '지방소득세', category: 'deduction' },
  { field: 'nationalPension', label: '국민연금', category: 'deduction' },
  { field: 'healthInsurance', label: '건강보험', category: 'deduction' },
  { field: 'longTermCare', label: '장기요양보험', category: 'deduction' },
  { field: 'employmentInsurance', label: '고용보험', category: 'deduction' },
  { field: 'totalDeductions', label: '공제합계', category: 'deduction' },
  
  // 날짜
  { field: 'currentDate', label: '현재날짜', category: 'date' },
  { field: 'paymentDate', label: '지급일', category: 'date' },
];

// 급여 데이터를 필드 값으로 변환
export interface PayrollDataForExcel {
  // 회사 정보
  companyName: string;
  businessNumber: string;
  ceoName: string;
  companyAddress: string;
  companyPhone: string;
  
  // 직원 정보
  employeeName: string;
  employeeNumber: string;
  department: string;
  position: string;
  hireDate: string;
  birthDate: string;
  
  // 급여 정보
  year: number;
  month: number;
  workDays: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  basePay: number;
  overtimePay: number;
  grossPay: number;
  netPay: number;
  
  // 공제 항목
  incomeTax: number;
  localTax: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  totalDeductions: number;
  
  // 날짜
  currentDate: string;
  paymentDate: string;
}

// PayrollLine을 PayrollDataForExcel로 변환
export function convertPayrollToExcelData(
  line: PayrollLine & { employee?: Employee },
  year: number,
  month: number
): PayrollDataForExcel {
  const taxSettings = getTaxSettings();
  const taxes = calculateTaxes(line.gross_pay);
  
  return {
    // 회사 정보
    companyName: taxSettings.companyName,
    businessNumber: taxSettings.businessNumber,
    ceoName: taxSettings.ceoName,
    companyAddress: taxSettings.companyAddress,
    companyPhone: taxSettings.companyPhone,
    
    // 직원 정보
    employeeName: line.employee?.name || '',
    employeeNumber: line.employee?.employee_number || '',
    department: line.employee?.department || '',
    position: line.employee?.position || '',
    hireDate: line.employee?.hire_date || '',
    birthDate: line.employee?.birth_date || '',
    
    // 급여 정보
    year,
    month,
    workDays: line.work_days,
    totalHours: line.total_hours,
    regularHours: line.regular_hours,
    overtimeHours: line.overtime_hours,
    hourlyRate: line.hourly_rate,
    basePay: line.base_pay,
    overtimePay: line.overtime_pay,
    grossPay: line.gross_pay,
    netPay: taxes.netPay,
    
    // 공제 항목
    incomeTax: taxes.incomeTax,
    localTax: taxes.localTax,
    nationalPension: taxes.nationalPension,
    healthInsurance: taxes.healthInsurance,
    longTermCare: taxes.longTermCare,
    employmentInsurance: taxes.employmentInsurance,
    totalDeductions: taxes.totalDeductions,
    
    // 날짜
    currentDate: new Date().toISOString().split('T')[0],
    paymentDate: `${year}-${String(month).padStart(2, '0')}-25`,
  };
}

// Excel 셀 주소를 파싱 (예: "B5" -> { col: 1, row: 4 })
function parseCellAddress(cell: string): { col: number; row: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell address: ${cell}`);
  
  const colStr = match[1];
  const row = parseInt(match[2], 10) - 1;
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1;
  
  return { col, row };
}

// 값을 형식에 맞게 포맷
function formatValue(value: unknown, format?: string): string | number {
  if (value === null || value === undefined) return '';
  
  if (format === 'currency' && typeof value === 'number') {
    return value; // Excel에서 숫자로 처리
  }
  if (format === 'number' && typeof value === 'number') {
    return value;
  }
  if (format === 'date' && typeof value === 'string') {
    return value;
  }
  
  return String(value);
}

// 템플릿에 데이터를 채워서 새 워크북 생성
export function fillTemplateWithData(
  templateBase64: string,
  mappings: TemplateCellMapping[],
  data: PayrollDataForExcel
): XLSX.WorkBook {
  // Base64 디코딩
  const binaryString = atob(templateBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // 워크북 로드
  const workbook = XLSX.read(bytes, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // 매핑된 셀에 데이터 채우기
  for (const mapping of mappings) {
    const value = data[mapping.field as keyof PayrollDataForExcel];
    const formattedValue = formatValue(value, mapping.format);
    
    // 셀에 값 설정
    worksheet[mapping.cell] = {
      t: typeof formattedValue === 'number' ? 'n' : 's',
      v: formattedValue,
    };
  }
  
  return workbook;
}

// 단일 직원 급여명세서 다운로드
export function downloadPayslipExcel(
  template: ExcelTemplate,
  payrollData: PayrollDataForExcel,
  fileName?: string
): void {
  const workbook = fillTemplateWithData(
    template.fileData,
    template.mappings,
    payrollData
  );
  
  // 파일 생성 및 다운로드
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const name = fileName || `급여명세서_${payrollData.employeeName}_${payrollData.year}년${payrollData.month}월.xlsx`;
  saveAs(blob, name);
}

// 여러 직원 급여명세서 일괄 다운로드 (ZIP)
export async function downloadPayslipsZip(
  template: ExcelTemplate,
  payrollDataList: PayrollDataForExcel[],
  zipFileName?: string
): Promise<void> {
  // 동적으로 JSZip 로드 (필요시 설치: npm install jszip)
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  for (const data of payrollDataList) {
    const workbook = fillTemplateWithData(
      template.fileData,
      template.mappings,
      data
    );
    
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = `급여명세서_${data.employeeName}_${data.year}년${data.month}월.xlsx`;
    zip.file(fileName, wbout);
  }
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const name = zipFileName || `급여명세서_${payrollDataList[0]?.year}년${payrollDataList[0]?.month}월_전체.zip`;
  saveAs(zipBlob, name);
}

// 새 Excel 파일 생성 (템플릿 없이 기본 양식으로)
export function generateDefaultPayrollExcel(
  payrollLines: (PayrollLine & { employee?: Employee })[],
  year: number,
  month: number
): void {
  const taxSettings = getTaxSettings();
  
  // 헤더 행
  const headers = [
    '사번', '이름', '부서', '근무일수', '총근무시간',
    '기본급', '연장수당', '총지급액',
    '소득세', '지방소득세', '국민연금', '건강보험', '장기요양', '고용보험', '공제합계',
    '실수령액'
  ];
  
  // 데이터 행
  const rows = payrollLines.map(line => {
    const taxes = calculateTaxes(line.gross_pay);
    return [
      line.employee?.employee_number || '',
      line.employee?.name || '',
      line.employee?.department || '',
      line.work_days,
      line.total_hours,
      line.base_pay,
      line.overtime_pay,
      line.gross_pay,
      taxes.incomeTax,
      taxes.localTax,
      taxes.nationalPension,
      taxes.healthInsurance,
      taxes.longTermCare,
      taxes.employmentInsurance,
      taxes.totalDeductions,
      taxes.netPay
    ];
  });
  
  // 워크북 생성
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [`${taxSettings.companyName} ${year}년 ${month}월 급여대장`],
    [],
    headers,
    ...rows,
    [],
    ['', '', '합계', 
      payrollLines.reduce((sum, l) => sum + l.work_days, 0),
      payrollLines.reduce((sum, l) => sum + l.total_hours, 0),
      payrollLines.reduce((sum, l) => sum + l.base_pay, 0),
      payrollLines.reduce((sum, l) => sum + l.overtime_pay, 0),
      payrollLines.reduce((sum, l) => sum + l.gross_pay, 0),
      ...Array(8).fill('')
    ]
  ]);
  
  // 열 너비 설정
  ws['!cols'] = [
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, '급여대장');
  
  // 다운로드
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `급여대장_${year}년${month}월.xlsx`);
}

// 원천징수영수증 Excel 생성 (간이 양식)
export function generateWithholdingExcel(
  payrollLines: (PayrollLine & { employee?: Employee })[],
  year: number
): void {
  const taxSettings = getTaxSettings();
  
  const headers = [
    '사번', '이름', '주민등록번호', '부서',
    '급여총액', '소득세', '지방소득세', '총세액'
  ];
  
  // 연간 합산 데이터
  const rows = payrollLines.map(line => {
    const taxes = calculateTaxes(line.gross_pay);
    return [
      line.employee?.employee_number || '',
      line.employee?.name || '',
      '******-*******', // 실제로는 별도 관리 필요
      line.employee?.department || '',
      line.gross_pay,
      taxes.incomeTax,
      taxes.localTax,
      taxes.incomeTax + taxes.localTax
    ];
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [`${taxSettings.companyName} ${year}년 원천징수영수증`],
    [`사업자등록번호: ${taxSettings.businessNumber}`],
    [`대표자: ${taxSettings.ceoName}`],
    [],
    headers,
    ...rows
  ]);
  
  ws['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, '원천징수영수증');
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `원천징수영수증_${year}년.xlsx`);
}

// 4대보험 신고자료 Excel 생성
export function generateInsuranceReportExcel(
  payrollLines: (PayrollLine & { employee?: Employee })[],
  year: number,
  month: number
): void {
  const taxSettings = getTaxSettings();
  
  const headers = [
    '사번', '이름', '주민등록번호', '입사일',
    '보수월액', '국민연금', '건강보험', '장기요양', '고용보험', '합계'
  ];
  
  const rows = payrollLines.map(line => {
    const taxes = calculateTaxes(line.gross_pay);
    return [
      line.employee?.employee_number || '',
      line.employee?.name || '',
      '******-*******',
      line.employee?.hire_date || '',
      line.gross_pay,
      taxes.nationalPension,
      taxes.healthInsurance,
      taxes.longTermCare,
      taxes.employmentInsurance,
      taxes.nationalPension + taxes.healthInsurance + taxes.longTermCare + taxes.employmentInsurance
    ];
  });
  
  const totals = rows.reduce((acc, row) => {
    return [
      '', '', '', '합계',
      (acc[4] as number || 0) + (row[4] as number),
      (acc[5] as number || 0) + (row[5] as number),
      (acc[6] as number || 0) + (row[6] as number),
      (acc[7] as number || 0) + (row[7] as number),
      (acc[8] as number || 0) + (row[8] as number),
      (acc[9] as number || 0) + (row[9] as number),
    ];
  }, ['', '', '', '합계', 0, 0, 0, 0, 0, 0] as (string | number)[]);
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [`${taxSettings.companyName} ${year}년 ${month}월 4대보험 신고자료`],
    [`사업자등록번호: ${taxSettings.businessNumber}`],
    [],
    headers,
    ...rows,
    [],
    totals
  ]);
  
  ws['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, '4대보험신고');
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `4대보험신고_${year}년${month}월.xlsx`);
}

// Excel 파일을 Base64로 읽기 (템플릿 업로드용)
export function readExcelAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resolve(btoa(binary));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Excel 파일의 시트 정보 및 셀 목록 가져오기 (템플릿 매핑 UI용)
export function getExcelSheetInfo(base64Data: string): {
  sheetNames: string[];
  cells: { sheet: string; cell: string; value: unknown }[];
} {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const workbook = XLSX.read(bytes, { type: 'array' });
  const cells: { sheet: string; cell: string; value: unknown }[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    for (let row = range.s.r; row <= Math.min(range.e.r, 100); row++) {
      for (let col = range.s.c; col <= Math.min(range.e.c, 26); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        if (cell && cell.v !== undefined && cell.v !== '') {
          cells.push({
            sheet: sheetName,
            cell: cellAddress,
            value: cell.v
          });
        }
      }
    }
  }
  
  return {
    sheetNames: workbook.SheetNames,
    cells
  };
}

// =====================================================
// 알림 API
// =====================================================

export async function getNotifications(filters?: {
  target_type?: string;
  target_id?: string;
  is_read?: boolean;
  limit?: number;
}): Promise<Notification[]> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .order('created_at', { ascending: false });

    // read_at이 null이면 안읽음
    if (filters?.is_read === false) {
      query = query.is('read_at', null);
    } else if (filters?.is_read === true) {
      query = query.not('read_at', 'is', null);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load notifications:', error);
      return [];
    }
    
    // 데이터 변환 (테이블 구조 → 앱 구조)
    return (data || []).map(n => ({
      ...n,
      is_read: n.read_at !== null,
      target_type: 'all' as const,
      target_id: n.recipient_id,
    }));
  } catch (err) {
    console.error('Failed to load notifications:', err);
    return [];
  }
}

export async function getUnreadNotificationCount(targetType?: string, targetId?: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', BUSINESS_ID)
      .is('read_at', null);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error('Failed to get unread count:', err);
    return 0;
  }
}

export async function createNotification(notification: Partial<Notification>): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      business_id: BUSINESS_ID,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'system',
      recipient_id: notification.target_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, is_read: false, target_type: 'all', target_id: data.recipient_id };
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), status: 'read' })
    .eq('id', id);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(targetType?: string, targetId?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString(), status: 'read' })
      .eq('business_id', BUSINESS_ID)
      .is('read_at', null);

    if (error) {
      console.error('Failed to mark all as read:', error);
    }
  } catch (err) {
    console.error('Failed to mark all as read:', err);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// 컴플라이언스 API
// =====================================================

export async function getComplianceChecks(filters?: {
  check_type?: string;
  employee_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ComplianceCheck[]> {
  try {
    let query = supabase
      .from('compliance_checks')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .order('week_start', { ascending: false });

    if (filters?.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.start_date) {
      query = query.gte('week_start', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('week_end', filters.end_date);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load compliance data:', error);
      return [];
    }
    
    // 테이블 구조 → 앱 구조 변환
    return (data || []).map(c => ({
      ...c,
      check_date: c.week_start,
      check_type: 'weekly_hours',
      details: { violations: c.violations, warnings: c.warnings },
      value: c.weekly_hours,
      threshold: 52,
    }));
  } catch (err) {
    console.error('Failed to load compliance data:', err);
    return [];
  }
}

export async function runComplianceCheck(): Promise<{ 
  success: boolean; 
  violations: number; 
  warnings: number;
  checks: ComplianceCheck[];
}> {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 이번 주 일요일
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // 이번 주 토요일
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    const settings = await getSystemSettings();
    const employees = await getEmployees({ is_active: true });
    
    // 이번 주 출퇴근 기록
    const attendance = await getAttendanceRecords({
      start_date: weekStartStr,
      end_date: weekEndStr,
    });
    
    const checks: ComplianceCheck[] = [];
    let violations = 0;
    let warnings = 0;
    
    const weeklyHoursLimit = (settings as any)?.max_weekly_hours || settings?.weekly_regular_hours || 52;
    
    for (const emp of employees) {
      const empRecords = attendance.filter(r => r.employee_id === emp.id);
      
      // 주간 근무시간 계산
      let weeklyHours = 0;
      let overtimeHours = 0;
      
      for (const record of empRecords) {
        if (record.check_in && record.check_out) {
          const [inH, inM] = record.check_in.split(':').map(Number);
          const [outH, outM] = record.check_out.split(':').map(Number);
          const hours = ((outH * 60 + outM) - (inH * 60 + inM) - (record.total_break_minutes || 60)) / 60;
          const actualHours = Math.max(0, hours);
          weeklyHours += actualHours;
          if (actualHours > 8) {
            overtimeHours += actualHours - 8;
          }
        }
      }
      
      // 상태 결정
      let status = 'good';
      const checkViolations: string[] = [];
      const checkWarnings: string[] = [];
      
      if (weeklyHours > weeklyHoursLimit) {
        status = 'violation';
        checkViolations.push(`주간 근무시간 ${weeklyHours.toFixed(1)}시간 (제한: ${weeklyHoursLimit}시간)`);
        violations++;
      } else if (weeklyHours > weeklyHoursLimit - 8) {
        status = 'warning';
        checkWarnings.push(`주간 근무시간 ${weeklyHours.toFixed(1)}시간 (제한 임박)`);
        warnings++;
      }
      
      checks.push({
        id: crypto.randomUUID(),
        business_id: BUSINESS_ID,
        check_type: 'weekly_hours',
        employee_id: emp.id,
        check_date: weekStartStr,
        status: status as ComplianceCheck['status'],
        details: { violations: checkViolations, warnings: checkWarnings },
        value: Math.round(weeklyHours * 10) / 10,
        threshold: weeklyHoursLimit,
        created_at: new Date().toISOString(),
        employee: emp,
      });
      
      // DB에 저장
      await supabase
        .from('compliance_checks')
        .upsert({
          business_id: BUSINESS_ID,
          employee_id: emp.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          weekly_hours: Math.round(weeklyHours * 10) / 10,
          weekly_overtime: Math.round(overtimeHours * 10) / 10,
          continuous_work_days: empRecords.length,
          status,
          violations: checkViolations,
          warnings: checkWarnings,
        }, {
          onConflict: 'business_id,employee_id,week_start',
        });
    }
    
    return { success: true, violations, warnings, checks };
  } catch (error) {
    console.error('Compliance check error:', error);
    return { success: false, violations: 0, warnings: 0, checks: [] };
  }
}

export async function getComplianceSummary(): Promise<{
  total: number;
  compliant: number;
  warnings: number;
  violations: number;
  lastChecked: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('compliance_checks')
      .select('status, week_start, checked_at')
      .eq('business_id', BUSINESS_ID)
      .order('week_start', { ascending: false })
      .limit(100);
      
    if (error) {
      console.error('Failed to load compliance summary:', error);
      return { total: 0, compliant: 0, warnings: 0, violations: 0, lastChecked: null };
    }
    
    const checks = data || [];
    const lastChecked = checks.length > 0 ? checks[0].week_start : null;
    
    // 최근 체크 날짜의 데이터만 집계
    const recentChecks = checks.filter(c => c.week_start === lastChecked);
    
    return {
      total: recentChecks.length,
      compliant: recentChecks.filter(c => c.status === 'good').length,
      warnings: recentChecks.filter(c => c.status === 'warning').length,
      violations: recentChecks.filter(c => c.status === 'violation').length,
      lastChecked,
    };
  } catch (err) {
    console.error('Failed to load compliance summary:', err);
    return { total: 0, compliant: 0, warnings: 0, violations: 0, lastChecked: null };
  }
}

// =====================================================
// 보안 설정 API (DB 연동)
// =====================================================

export interface SecuritySettings {
  require_password_change_days: number;
  min_password_length: number;
  require_special_char: boolean;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  session_timeout_minutes: number;
  enable_2fa: boolean;
  allowed_ip_ranges: string[];
}

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  require_password_change_days: 90,
  min_password_length: 8,
  require_special_char: true,
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
  session_timeout_minutes: 60,
  enable_2fa: false,
  allowed_ip_ranges: [],
};

const SECURITY_SETTINGS_KEY = 'commute_erp_security_settings';

export function getSecuritySettings(): SecuritySettings {
  try {
    const stored = localStorage.getItem(SECURITY_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load security settings:', e);
  }
  return DEFAULT_SECURITY_SETTINGS;
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  try {
    localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save security settings:', e);
  }
}

// =====================================================
// 알림 설정 API
// =====================================================

export interface NotificationSettings {
  email_enabled: boolean;
  email_leave_request: boolean;
  email_payroll_confirmed: boolean;
  email_schedule_change: boolean;
  push_enabled: boolean;
  push_leave_request: boolean;
  push_payroll_confirmed: boolean;
  push_schedule_change: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_enabled: true,
  email_leave_request: true,
  email_payroll_confirmed: true,
  email_schedule_change: false,
  push_enabled: false,
  push_leave_request: false,
  push_payroll_confirmed: false,
  push_schedule_change: false,
};

const NOTIFICATION_SETTINGS_KEY = 'commute_erp_notification_settings';

export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load notification settings:', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save notification settings:', e);
  }
}

