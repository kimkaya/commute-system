// =====================================================
// Employee Portal API 서비스 (멀티사업장 지원)
// =====================================================

import { supabase } from './supabase';

// Supabase URL
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://waazyjqdjdrnvcmymcga.supabase.co').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXp5anFkamRybnZjbXltY2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzU3MTYsImV4cCI6MjA4NTI1MTcxNn0.9h0j2EhMyPZtOo2SWiyJBx5G-SP36QAudlN_yS9OUrU').trim();

// 기본 사업장 ID (레거시 호환용)
const BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

// =====================================================
// 타입 정의
// =====================================================

export interface Employee {
  id: string;
  business_id: string;
  employee_number: string | null;
  username: string | null;
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
// 직원 로그인 (멀티사업장 - 이메일 형식)
// =====================================================

export interface LoginResponse {
  success: boolean;
  employee?: Employee & { business_name?: string; company_code?: string };
  business_id?: string;
  business_name?: string;
  company_code?: string;
  error?: string;
}

export async function employeeLoginV2(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/employee-login-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || '로그인에 실패했습니다' };
    }

    return {
      success: true,
      employee: data.employee,
      business_id: data.business_id,
      business_name: data.business_name,
      company_code: data.company_code,
    };
  } catch (err) {
    console.error('Login V2 error:', err);
    return { success: false, error: '로그인 중 오류가 발생했습니다' };
  }
}

// =====================================================
// 초대코드 검증
// =====================================================

export async function validateInviteCode(inviteCode: string): Promise<{
  valid: boolean;
  business_id?: string;
  business_name?: string;
  company_code?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ invite_code: inviteCode }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { valid: false, error: data.error || '유효하지 않은 초대코드입니다' };
    }

    return {
      valid: true,
      business_id: data.business_id,
      business_name: data.business_name,
      company_code: data.company_code,
    };
  } catch (err) {
    console.error('Validate invite code error:', err);
    return { valid: false, error: '초대코드 검증 중 오류가 발생했습니다' };
  }
}

// =====================================================
// 직원 회원가입
// =====================================================

export interface EmployeeRegisterParams {
  invite_code: string;
  username: string;
  password: string;
  name: string;
  phone?: string;
  email?: string;
}

export async function employeeRegister(params: EmployeeRegisterParams): Promise<{
  success: boolean;
  employee_id?: string;
  email_format?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/employee-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || '회원가입에 실패했습니다' };
    }

    return {
      success: true,
      employee_id: data.employee_id,
      email_format: data.email_format,
    };
  } catch (err) {
    console.error('Employee register error:', err);
    return { success: false, error: '회원가입 중 오류가 발생했습니다' };
  }
}

// =====================================================
// 직원 로그인 (레거시 - 사원번호 방식)
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
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
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
    .limit(1);

  if (error) throw error;

  const record = data && data.length > 0 ? data[0] : null;
  return {
    annual_total: record?.annual_total || 15,
    annual_used: record?.annual_used || 0,
    annual_remaining: (record?.annual_total || 15) - (record?.annual_used || 0),
    sick_total: record?.sick_total || 0,
    sick_used: record?.sick_used || 0,
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
// 직원 알림 API
// =====================================================

export interface EmployeeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  data?: Record<string, unknown>;
}

export async function getMyNotifications(employeeId: string, limit = 20): Promise<EmployeeNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .or(`recipient_id.eq.${employeeId},recipient_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to load notifications:', error);
      return [];
    }

    return (data || []).map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      read_at: n.read_at,
      data: n.data,
    }));
  } catch (err) {
    console.error('Failed to load notifications:', err);
    return [];
  }
}

export async function getUnreadNotificationCount(employeeId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', BUSINESS_ID)
      .or(`recipient_id.eq.${employeeId},recipient_id.is.null`)
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

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString(), status: 'read' })
      .eq('id', notificationId);
  } catch (err) {
    console.error('Failed to mark as read:', err);
  }
}

export async function markAllNotificationsAsRead(employeeId: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString(), status: 'read' })
      .eq('business_id', BUSINESS_ID)
      .or(`recipient_id.eq.${employeeId},recipient_id.is.null`)
      .is('read_at', null);
  } catch (err) {
    console.error('Failed to mark all as read:', err);
  }
}

// =====================================================
// 사내 메신저 API
// =====================================================

export interface Conversation {
  id: string;
  business_id: string;
  type: 'direct' | 'group' | 'channel';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  is_active: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  employee_id: string;
  role: 'admin' | 'member';
  nickname: string | null;
  is_muted: boolean;
  is_pinned: boolean;
  last_read_at: string;
  unread_count: number;
  joined_at: string;
  is_active: boolean;
  employee?: Employee;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'file' | 'system' | 'reply' | 'forward';
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  attachments: MessageAttachment[];
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  mentions: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sender?: Employee;
  reply_to?: Message;
  reactions?: MessageReaction[];
}

export interface MessageAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
  thumbnail_url?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  employee_id: string;
  emoji: string;
  created_at: string;
  employee?: Employee;
}

// 채팅방 목록 조회
export async function getConversations(employeeId: string): Promise<Conversation[]> {
  try {
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count, is_pinned')
      .eq('employee_id', employeeId)
      .eq('is_active', true);
    
    if (participantError) throw participantError;
    if (!participantData || participantData.length === 0) return [];
    
    const conversationIds = participantData.map(p => p.conversation_id);
    const unreadMap = new Map(participantData.map(p => [p.conversation_id, p.unread_count]));
    const pinnedMap = new Map(participantData.map(p => [p.conversation_id, p.is_pinned]));
    
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    
    if (error) throw error;
    
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('*, employee:employees(*)')
      .in('conversation_id', conversationIds)
      .eq('is_active', true);
    
    const participantsMap = new Map<string, ConversationParticipant[]>();
    (allParticipants || []).forEach(p => {
      const list = participantsMap.get(p.conversation_id) || [];
      list.push(p);
      participantsMap.set(p.conversation_id, list);
    });
    
    return (conversations || []).map(conv => ({
      ...conv,
      participants: participantsMap.get(conv.id) || [],
      unread_count: unreadMap.get(conv.id) || 0,
      is_pinned: pinnedMap.get(conv.id) || false,
    })).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return [];
  }
}

// 채팅방 상세 조회
export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .limit(1);
  
  if (error) throw error;
  if (!data || data.length === 0) return null;
  
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('*, employee:employees(*)')
    .eq('conversation_id', id)
    .eq('is_active', true);
  
  return { ...data[0], participants: participants || [] };
}

// 1:1 채팅방 생성 또는 조회
export async function getOrCreateDirectConversation(
  employeeId1: string,
  employeeId2: string
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('employee_id', employeeId1);
  
  if (existing && existing.length > 0) {
    const convIds = existing.map(e => e.conversation_id);
    
    const { data: directConvs } = await supabase
      .from('conversations')
      .select('id')
      .in('id', convIds)
      .eq('type', 'direct');
    
    if (directConvs && directConvs.length > 0) {
      const directConvIds = directConvs.map(c => c.id);
      
      const { data: matchingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('employee_id', employeeId2)
        .in('conversation_id', directConvIds);
      
      if (matchingParticipants && matchingParticipants.length > 0) {
        const conv = await getConversation(matchingParticipants[0].conversation_id);
        if (conv) return conv;
      }
    }
  }
  
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      business_id: BUSINESS_ID,
      type: 'direct',
      created_by: employeeId1,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: newConv.id, employee_id: employeeId1, role: 'member' },
      { conversation_id: newConv.id, employee_id: employeeId2, role: 'member' },
    ]);
  
  return getConversation(newConv.id) as Promise<Conversation>;
}

// 그룹 채팅방 생성
export async function createGroupConversation(
  name: string,
  participantIds: string[],
  createdBy: string
): Promise<Conversation> {
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      business_id: BUSINESS_ID,
      type: 'group',
      name,
      created_by: createdBy,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  const participants = participantIds.map(empId => ({
    conversation_id: newConv.id,
    employee_id: empId,
    role: empId === createdBy ? 'admin' : 'member',
  }));
  
  await supabase.from('conversation_participants').insert(participants);
  await sendMessage(newConv.id, createdBy, '채팅방이 생성되었습니다.', 'system');
  
  return getConversation(newConv.id) as Promise<Conversation>;
}

// 메시지 목록 조회
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  
  query = query.limit(options?.limit || 50);
  if (options?.before) query = query.lt('created_at', options.before);
  
  const { data, error } = await query;
  if (error) throw error;
  
  const senderIds = [...new Set((data || []).map(m => m.sender_id))];
  let senders: Employee[] = [];
  if (senderIds.length > 0) {
    const { data: senderData } = await supabase
      .from('employees')
      .select('*')
      .in('id', senderIds);
    senders = senderData || [];
  }
  
  const senderMap = new Map(senders.map(s => [s.id, s]));
  
  const messageIds = (data || []).map(m => m.id);
  let reactions: MessageReaction[] = [];
  if (messageIds.length > 0) {
    const { data: reactionData } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);
    reactions = reactionData || [];
  }
  
  const reactionMap = new Map<string, MessageReaction[]>();
  reactions.forEach(r => {
    const list = reactionMap.get(r.message_id) || [];
    list.push(r);
    reactionMap.set(r.message_id, list);
  });
  
  return (data || []).map(msg => ({
    ...msg,
    sender: senderMap.get(msg.sender_id),
    reactions: reactionMap.get(msg.id) || [],
  })).reverse();
}

// 메시지 전송
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: Message['message_type'] = 'text',
  options?: {
    attachments?: MessageAttachment[];
    replyToId?: string;
    mentions?: string[];
  }
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
      attachments: options?.attachments || [],
      reply_to_id: options?.replyToId || null,
      mentions: options?.mentions || [],
    })
    .select()
    .single();
  
  if (error) throw error;
  
  const { data: sender } = await supabase
    .from('employees')
    .select('*')
    .eq('id', senderId)
    .limit(1);
  
  return { ...data, sender: sender?.[0] };
}

// 메시지 수정
export async function editMessage(messageId: string, content: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update({
      content,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// 메시지 삭제
export async function deleteMessage(messageId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId);
}

// 메시지 읽음 처리
export async function markMessagesAsRead(conversationId: string, employeeId: string): Promise<void> {
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (lastMessage && lastMessage.length > 0) {
    await supabase
      .from('message_read_receipts')
      .upsert({
        message_id: lastMessage[0].id,
        employee_id: employeeId,
        read_at: new Date().toISOString(),
      }, { onConflict: 'message_id,employee_id' });
  }
  
  await supabase
    .from('conversation_participants')
    .update({ unread_count: 0, last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('employee_id', employeeId);
}

// 메시지 반응 토글
export async function toggleMessageReaction(
  messageId: string,
  employeeId: string,
  emoji: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('employee_id', employeeId)
    .eq('emoji', emoji)
    .limit(1);
  
  if (existing && existing.length > 0) {
    await supabase.from('message_reactions').delete().eq('id', existing[0].id);
  } else {
    await supabase.from('message_reactions').insert({ message_id: messageId, employee_id: employeeId, emoji });
  }
}

// 전체 안읽은 메시지 수 조회
export async function getTotalUnreadCount(employeeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('unread_count')
    .eq('employee_id', employeeId)
    .eq('is_active', true);
  
  if (error) return 0;
  return (data || []).reduce((sum, p) => sum + (p.unread_count || 0), 0);
}

// 직원 목록 조회 (메신저용)
export async function getEmployeeList(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// 그룹 채팅방에 멤버 추가
export async function addGroupMembers(
  conversationId: string,
  memberIds: string[],
  addedBy: string
): Promise<void> {
  const participants = memberIds.map(empId => ({
    conversation_id: conversationId,
    employee_id: empId,
    role: 'member' as const,
  }));
  
  await supabase.from('conversation_participants').insert(participants);
  
  // 시스템 메시지 추가
  const { data: employees } = await supabase
    .from('employees')
    .select('name')
    .in('id', memberIds);
  const names = employees?.map(e => e.name).join(', ') || '멤버';
  await sendMessage(conversationId, addedBy, `${names}님이 초대되었습니다.`, 'system');
}

// 그룹 채팅방에서 멤버 제거
export async function removeGroupMember(
  conversationId: string,
  memberId: string,
  removedBy: string
): Promise<void> {
  await supabase
    .from('conversation_participants')
    .update({ is_active: false })
    .eq('conversation_id', conversationId)
    .eq('employee_id', memberId);
  
  // 시스템 메시지 추가
  const { data: employee } = await supabase
    .from('employees')
    .select('name')
    .eq('id', memberId)
    .limit(1);
  const name = employee?.[0]?.name || '멤버';
  await sendMessage(conversationId, removedBy, `${name}님이 나갔습니다.`, 'system');
}

// 그룹 이름 변경
export async function updateGroupName(
  conversationId: string,
  newName: string,
  updatedBy: string
): Promise<void> {
  await supabase
    .from('conversations')
    .update({ name: newName })
    .eq('id', conversationId);
  
  await sendMessage(conversationId, updatedBy, `채팅방 이름이 "${newName}"(으)로 변경되었습니다.`, 'system');
}

// =====================================================
// 파일 업로드 API
// =====================================================

// 파일을 Supabase Storage에 업로드
export async function uploadMessageFile(
  conversationId: string,
  file: File,
  employeeId: string
): Promise<MessageAttachment> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `conversations/${conversationId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('messenger-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from('messenger-files')
    .getPublicUrl(filePath);

  // 이미지인 경우 썸네일 URL도 생성 (옵션)
  const isImage = file.type.startsWith('image/');
  let thumbnailUrl = undefined;
  if (isImage) {
    thumbnailUrl = publicUrlData.publicUrl;
  }

  return {
    name: file.name,
    url: publicUrlData.publicUrl,
    size: file.size,
    type: file.type,
    thumbnail_url: thumbnailUrl,
  };
}

// 여러 파일을 한 번에 업로드
export async function uploadMessageFiles(
  conversationId: string,
  files: File[],
  employeeId: string
): Promise<MessageAttachment[]> {
  const uploadPromises = files.map(file => uploadMessageFile(conversationId, file, employeeId));
  return Promise.all(uploadPromises);
}

// 클립보드에서 이미지 업로드
export async function uploadClipboardImage(
  conversationId: string,
  blob: Blob,
  employeeId: string
): Promise<MessageAttachment> {
  const fileName = `clipboard_${Date.now()}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  return uploadMessageFile(conversationId, file, employeeId);
}
