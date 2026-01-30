// =====================================================
// Employee Portal API 서비스
// =====================================================

import { supabase } from './supabase';

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
  hourly_rate: number;
  salary_type: 'hourly' | 'monthly';
  is_active: boolean;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  total_break_minutes: number;
  notes: string | null;
  check_in_method: string;
  check_out_method: string | null;
}

export interface Leave {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  duration: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  review_notes: string | null;
}

export interface PayrollLine {
  id: string;
  employee_id: string;
  payroll_period_id: string;
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
  status: string;
  payroll_period?: {
    year: number;
    month: number;
  };
}

// =====================================================
// 직원 로그인
// =====================================================

export async function employeeLogin(employeeNumber: string, password: string): Promise<{
  success: boolean;
  employee?: Employee;
  error?: string;
}> {
  try {
    // 사원번호로 직원 찾기
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .eq('employee_number', employeeNumber)
      .eq('is_active', true)
      .single();

    if (empError || !employee) {
      return { success: false, error: '사원번호를 찾을 수 없습니다.' };
    }

    // 인증정보 확인
    const { data: credentials, error: credError } = await supabase
      .from('employee_credentials')
      .select('*')
      .eq('employee_id', employee.id)
      .single();

    if (credError || !credentials) {
      return { success: false, error: '인증 정보가 없습니다. 관리자에게 문의하세요.' };
    }

    // 잠금 확인
    if (credentials.locked_until && new Date(credentials.locked_until) > new Date()) {
      return { success: false, error: '계정이 잠겼습니다. 잠시 후 다시 시도하세요.' };
    }

    // 비밀번호 확인 (실제로는 해시 비교 필요)
    if (credentials.password_hash !== password) {
      // 실패 횟수 증가
      await supabase
        .from('employee_credentials')
        .update({
          failed_login_count: (credentials.failed_login_count || 0) + 1,
          locked_until: (credentials.failed_login_count || 0) >= 4
            ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
            : null,
        })
        .eq('employee_id', employee.id);

      return { success: false, error: '비밀번호가 올바르지 않습니다.' };
    }

    // 성공 - 로그인 정보 업데이트
    await supabase
      .from('employee_credentials')
      .update({
        failed_login_count: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        login_count: (credentials.login_count || 0) + 1,
      })
      .eq('employee_id', employee.id);

    return { success: true, employee };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: '로그인 중 오류가 발생했습니다.' };
  }
}

// =====================================================
// 내 출퇴근 기록 조회
// =====================================================

export async function getMyAttendance(employeeId: string, filters?: {
  start_date?: string;
  end_date?: string;
  month?: string; // YYYY-MM 형식
}): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .order('date', { ascending: false });

  if (filters?.start_date) {
    query = query.gte('date', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('date', filters.end_date);
  }
  if (filters?.month) {
    const [year, month] = filters.month.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;
    query = query.gte('date', startDate).lte('date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// =====================================================
// 출퇴근 통계
// =====================================================

export async function getAttendanceStats(employeeId: string, month: string): Promise<{
  totalDays: number;
  workDays: number;
  lateDays: number;
  totalHours: number;
  averageCheckIn: string;
}> {
  const records = await getMyAttendance(employeeId, { month });
  
  const workDays = records.filter(r => r.check_in).length;
  const lateDays = records.filter(r => {
    if (!r.check_in) return false;
    const [h, m] = r.check_in.split(':').map(Number);
    return h > 9 || (h === 9 && m > 0);
  }).length;

  let totalMinutes = 0;
  let checkInMinutes = 0;
  let checkInCount = 0;

  records.forEach(r => {
    if (r.check_in && r.check_out) {
      const [inH, inM] = r.check_in.split(':').map(Number);
      const [outH, outM] = r.check_out.split(':').map(Number);
      totalMinutes += (outH * 60 + outM) - (inH * 60 + inM) - (r.total_break_minutes || 60);
    }
    if (r.check_in) {
      const [h, m] = r.check_in.split(':').map(Number);
      checkInMinutes += h * 60 + m;
      checkInCount++;
    }
  });

  const avgMinutes = checkInCount > 0 ? Math.round(checkInMinutes / checkInCount) : 0;
  const avgH = Math.floor(avgMinutes / 60);
  const avgM = avgMinutes % 60;

  return {
    totalDays: records.length,
    workDays,
    lateDays,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    averageCheckIn: checkInCount > 0 ? `${String(avgH).padStart(2, '0')}:${String(avgM).padStart(2, '0')}` : '-',
  };
}

// =====================================================
// 내 휴가 조회/신청
// =====================================================

export async function getMyLeaves(employeeId: string, filters?: {
  status?: string;
  year?: number;
}): Promise<Leave[]> {
  let query = supabase
    .from('leaves')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.year) {
    query = query.gte('start_date', `${filters.year}-01-01`).lte('start_date', `${filters.year}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function requestLeave(employeeId: string, leaveData: {
  type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  duration?: number;
}): Promise<Leave> {
  const { data, error } = await supabase
    .from('leaves')
    .insert({
      business_id: BUSINESS_ID,
      employee_id: employeeId,
      type: leaveData.type,
      start_date: leaveData.start_date,
      end_date: leaveData.end_date,
      reason: leaveData.reason,
      duration: leaveData.duration || 1,
      status: 'pending',
      requested_by: employeeId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelLeave(leaveId: string): Promise<void> {
  const { error } = await supabase
    .from('leaves')
    .update({ status: 'cancelled' })
    .eq('id', leaveId);

  if (error) throw error;
}

// =====================================================
// 휴가 잔여 조회
// =====================================================

export async function getLeaveBalance(employeeId: string, year: number): Promise<{
  annual_total: number;
  annual_used: number;
  annual_remaining: number;
  sick_total: number;
  sick_used: number;
}> {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return {
    annual_total: data?.annual_total || 15,
    annual_used: data?.annual_used || 0,
    annual_remaining: (data?.annual_total || 15) - (data?.annual_used || 0),
    sick_total: data?.sick_total || 0,
    sick_used: data?.sick_used || 0,
  };
}

// =====================================================
// 내 급여 명세서 조회
// =====================================================

export async function getMyPayslips(employeeId: string): Promise<PayrollLine[]> {
  const { data, error } = await supabase
    .from('payroll_lines')
    .select(`
      *,
      payroll_period:payroll_periods(year, month)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPayslipDetail(payslipId: string): Promise<PayrollLine | null> {
  const { data, error } = await supabase
    .from('payroll_lines')
    .select(`
      *,
      payroll_period:payroll_periods(year, month, start_date, end_date)
    `)
    .eq('id', payslipId)
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// 내 정보 수정
// =====================================================

export async function updateMyProfile(employeeId: string, updates: {
  email?: string;
  phone?: string;
}): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', employeeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function changePassword(employeeId: string, currentPassword: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // 현재 비밀번호 확인
  const { data: credentials, error } = await supabase
    .from('employee_credentials')
    .select('password_hash')
    .eq('employee_id', employeeId)
    .single();

  if (error || !credentials) {
    return { success: false, error: '인증 정보를 찾을 수 없습니다.' };
  }

  if (credentials.password_hash !== currentPassword) {
    return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
  }

  // 새 비밀번호 저장
  const { error: updateError } = await supabase
    .from('employee_credentials')
    .update({ password_hash: newPassword })
    .eq('employee_id', employeeId);

  if (updateError) {
    return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' };
  }

  return { success: true };
}

// =====================================================
// 문의 API
// =====================================================

export interface Inquiry {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  type: string;
  content: string;
}

export async function createInquiry(inquiry: Inquiry): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // notifications 테이블에 관리자 알림으로 저장
    const typeLabels: Record<string, string> = {
      attendance: '출퇴근 기록 문의',
      leave: '휴가 관련 문의',
      payroll: '급여 관련 문의',
      password: '비밀번호 초기화 요청',
      info_change: '개인정보 변경 요청',
      other: '기타 문의',
    };

    const { error } = await supabase
      .from('notifications')
      .insert({
        business_id: BUSINESS_ID,
        recipient_id: null, // 관리자 전체
        type: 'system',
        title: `[${typeLabels[inquiry.type] || '문의'}] ${inquiry.employee_name}`,
        message: inquiry.content,
        data: {
          inquiry_type: inquiry.type,
          employee_id: inquiry.employee_id,
          employee_name: inquiry.employee_name,
          employee_number: inquiry.employee_number,
          department: inquiry.department,
        },
        priority: 'normal',
        status: 'pending',
        channel: 'in_app',
      });

    if (error) {
      console.error('Create inquiry error:', error);
      return { success: false, error: '문의 접수에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Create inquiry error:', error);
    return { success: false, error: '문의 접수 중 오류가 발생했습니다.' };
  }
}

// =====================================================
// 알림 API
// =====================================================

export interface Notification {
  id: string;
  business_id: string;
  recipient_id: string | null;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority: string;
  status: string;
  channel: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function getMyNotifications(employeeId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .or(`recipient_id.eq.${employeeId},recipient_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString() 
    })
    .eq('id', notificationId);

  if (error) throw error;
}
