// =====================================================
// Kiosk API 서비스
// =====================================================

import { supabase } from './supabase';

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

// =====================================================
// IP 관련 기능 (대리 출석 방지)
// =====================================================

// 현재 IP 가져오기 (외부 서비스 사용)
let cachedIP: string | null = null;
let ipCacheTime = 0;
const IP_CACHE_DURATION = 60000; // 1분 캐시

export async function getCurrentIP(): Promise<string> {
  // 캐시된 IP가 있고 유효하면 반환
  if (cachedIP && Date.now() - ipCacheTime < IP_CACHE_DURATION) {
    return cachedIP;
  }
  
  try {
    const response = await fetch('https://api.ipify.org?format=json', { 
      signal: AbortSignal.timeout(3000) // 3초 타임아웃
    });
    const data = await response.json();
    cachedIP = data.ip;
    ipCacheTime = Date.now();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP:', error);
    return cachedIP || 'unknown';
  }
}

// IP 검증 결과 타입
export interface IPValidationResult {
  isValid: boolean;
  isApprovedDevice: boolean;
  isSuspicious: boolean;
  currentIP: string;
  reason?: string;
  deviceStatus?: 'approved' | 'pending' | 'rejected' | 'disabled' | 'unknown';
}

// IP 검증 및 로그 기록
export async function validateAndLogIP(
  employeeId: string | null,
  employeeName: string | null,
  action: 'check_in' | 'check_out' | 'face_auth' | 'password_auth'
): Promise<IPValidationResult> {
  const currentIP = await getCurrentIP();
  
  try {
    const userAgent = navigator.userAgent;

    // 승인된 기기 확인
    const { data: approvedDevices, error: deviceError } = await supabase
      .from('kiosk_devices')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'approved');

    // 테이블이 없는 경우 통과
    if (deviceError && deviceError.code === '42P01') {
      return { isValid: true, isApprovedDevice: false, isSuspicious: false, currentIP };
    }

    // 승인된 IP 목록
    const approvedIPs = (approvedDevices || []).map(d => d.fixed_ip).filter(Boolean);
    
    // 승인된 기기가 없으면 모든 IP 허용
    if (approvedIPs.length === 0) {
      return { isValid: true, isApprovedDevice: false, isSuspicious: false, currentIP };
    }
    
    // 현재 IP가 승인된 IP인지 확인
    const isApprovedIP = approvedIPs.includes(currentIP);
    
    // 현재 기기 상태 확인
    const { data: currentDevice } = await supabase
      .from('kiosk_devices')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .or(`fixed_ip.eq.${currentIP},requested_ip.eq.${currentIP}`)
      .maybeSingle();

    const deviceStatus = currentDevice?.status || 'unknown';
    
    // 비정상 접속 판단
    const isSuspicious = !isApprovedIP;
    const reason = isSuspicious ? `미승인 IP에서 접속 (${currentIP})` : '';

    // 접속 로그 저장 (비동기, 에러 무시)
    supabase.from('ip_access_logs').insert({
      business_id: BUSINESS_ID,
      employee_id: employeeId,
      employee_name: employeeName,
      access_ip: currentIP,
      device_id: currentDevice?.id || null,
      action,
      is_suspicious: isSuspicious,
      reason: reason || null,
      user_agent: userAgent,
    }).then(() => {});

    // 비정상 접속 시 관리자 알림 생성 (비동기)
    if (isSuspicious && employeeId) {
      supabase.from('notifications').insert({
        business_id: BUSINESS_ID,
        recipient_id: null,
        type: 'security',
        title: '⚠️ 비정상 출퇴근 접속 감지',
        message: `${employeeName || '알 수 없음'}님이 미승인 IP(${currentIP})에서 ${action === 'check_in' ? '출근' : action === 'check_out' ? '퇴근' : '인증'} 시도`,
        data: { employee_id: employeeId, employee_name: employeeName, ip: currentIP, action },
        priority: 'high',
        status: 'pending',
        channel: 'in_app',
      }).then(() => {});
    }

    return {
      isValid: isApprovedIP,
      isApprovedDevice: deviceStatus === 'approved',
      isSuspicious,
      currentIP,
      reason,
      deviceStatus: deviceStatus as IPValidationResult['deviceStatus'],
    };
  } catch (error) {
    console.error('IP validation error:', error);
    return { isValid: true, isApprovedDevice: false, isSuspicious: false, currentIP };
  }
}

// 고정 IP 등록 요청
export async function requestFixedIP(deviceName: string, location: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const currentIP = await getCurrentIP();

    // 이미 요청한 기기인지 확인
    const { data: existing } = await supabase
      .from('kiosk_devices')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .eq('requested_ip', currentIP)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'approved') {
        return { success: true, message: '이미 승인된 기기입니다.' };
      }
      if (existing.status === 'pending') {
        return { success: false, message: '승인 대기 중입니다. 관리자에게 문의하세요.' };
      }
    }

    // 새 기기 등록 요청
    const { error } = await supabase.from('kiosk_devices').insert({
      business_id: BUSINESS_ID,
      device_name: deviceName,
      location,
      requested_ip: currentIP,
      requested_at: new Date().toISOString(),
      status: 'pending',
    });

    if (error) throw error;

    // 관리자 알림
    await supabase.from('notifications').insert({
      business_id: BUSINESS_ID,
      recipient_id: null,
      type: 'system',
      title: '📱 새 키오스크 기기 등록 요청',
      message: `${deviceName} (${location})에서 고정 IP 등록 요청. IP: ${currentIP}`,
      data: { device_name: deviceName, location, ip: currentIP },
      priority: 'normal',
      status: 'pending',
      channel: 'in_app',
    });

    return { success: true, message: '등록 요청 완료. 관리자 승인 후 사용 가능합니다.' };
  } catch (error) {
    console.error('Request fixed IP error:', error);
    return { success: false, message: '등록 요청 중 오류가 발생했습니다.' };
  }
}

// 현재 기기 상태 확인
export async function getDeviceStatus(): Promise<{
  status: 'approved' | 'pending' | 'rejected' | 'disabled' | 'unregistered';
  deviceName?: string;
  currentIP: string;
}> {
  const currentIP = await getCurrentIP();
  
  try {
    const { data, error } = await supabase
      .from('kiosk_devices')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .or(`fixed_ip.eq.${currentIP},requested_ip.eq.${currentIP}`)
      .maybeSingle();

    if (error || !data) {
      return { status: 'unregistered', currentIP };
    }

    return {
      status: data.status,
      deviceName: data.device_name,
      currentIP,
    };
  } catch {
    return { status: 'unregistered', currentIP };
  }
}

// =====================================================
// 타입 정의
// =====================================================

export interface Employee {
  id: string;
  employee_number: string | null;
  name: string;
  department: string | null;
  position: string | null;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_method: string;
  check_out_method: string | null;
}

export interface FaceTemplate {
  id: string;
  employee_id: string;
  embedding: number[];
}

// =====================================================
// 직원 조회
// =====================================================

export async function getEmployeeByNumber(employeeNumber: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_number, name, department, position')
    .eq('business_id', BUSINESS_ID)
    .eq('employee_number', employeeNumber)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_number, name, department, position')
    .eq('id', employeeId)
    .single();

  if (error) return null;
  return data;
}

// =====================================================
// 비밀번호 인증
// =====================================================

export async function verifyPassword(employeeId: string, password: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('employee_credentials')
    .select('password_hash')
    .eq('employee_id', employeeId)
    .single();

  if (error || !data) return false;
  return data.password_hash === password;
}

// =====================================================
// 얼굴 템플릿 조회 (얼굴 인식용)
// =====================================================

export async function getAllFaceTemplates(): Promise<{ employee: Employee; embedding: number[] }[]> {
  const { data, error } = await supabase
    .from('employee_face_templates')
    .select(`
      employee_id,
      embedding,
      employee:employees!inner(id, employee_number, name, department, position)
    `)
    .eq('business_id', BUSINESS_ID);

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((item: any) => ({
    employee: item.employee as Employee,
    embedding: item.embedding,
  }));
}

export async function saveFaceTemplate(employeeId: string, embedding: number[]): Promise<boolean> {
  const { error } = await supabase
    .from('employee_face_templates')
    .upsert({
      business_id: BUSINESS_ID,
      employee_id: employeeId,
      embedding,
    }, {
      onConflict: 'employee_id',
    });

  return !error;
}

// =====================================================
// 출퇴근 체크 (최적화 버전 - 단일 쿼리)
// =====================================================

export async function checkIn(employeeId: string, method: 'face' | 'password'): Promise<{
  success: boolean;
  message: string;
  record?: AttendanceRecord;
}> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const time = now.toTimeString().split(' ')[0].substring(0, 5);

  // 단일 upsert 쿼리로 출근 처리 (기존 확인 쿼리 제거)
  // ignoreDuplicates: true로 이미 출근한 경우 무시
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert({
      business_id: BUSINESS_ID,
      employee_id: employeeId,
      date: today,
      check_in: time,
      check_in_at: now.toISOString(),
      check_in_method: method,
      status: 'active',
    }, {
      onConflict: 'business_id,employee_id,date',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    // 이미 출근한 경우 (check_in이 이미 있는 경우)
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return {
        success: false,
        message: '이미 출근 처리되었습니다.',
      };
    }
    console.error('Check-in error:', error);
    return {
      success: false,
      message: '출근 처리 중 오류가 발생했습니다.',
    };
  }

  return {
    success: true,
    message: `${time}에 출근 처리되었습니다.`,
    record: data,
  };
}

export async function checkOut(employeeId: string, method: 'face' | 'password'): Promise<{
  success: boolean;
  message: string;
  record?: AttendanceRecord;
}> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const time = now.toTimeString().split(' ')[0].substring(0, 5);

  // 단일 update 쿼리로 퇴근 처리 (check_out이 null인 경우만)
  const { data, error, count } = await supabase
    .from('attendance_records')
    .update({
      check_out: time,
      check_out_at: now.toISOString(),
      check_out_method: method,
    })
    .eq('employee_id', employeeId)
    .eq('date', today)
    .eq('status', 'active')
    .is('check_out', null)  // 아직 퇴근 안 한 경우만
    .select()
    .single();

  if (error || !data) {
    // 업데이트된 행이 없으면 이미 퇴근했거나 출근 기록이 없음
    if (error?.code === 'PGRST116' || !data) {
      // 출근 기록 있는지 확인
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('check_in, check_out')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .eq('status', 'active')
        .single();

      if (!existing?.check_in) {
        return {
          success: false,
          message: '출근 기록이 없습니다.',
        };
      }
      if (existing?.check_out) {
        return {
          success: false,
          message: '이미 퇴근 처리되었습니다.',
        };
      }
    }
    console.error('Check-out error:', error);
    return {
      success: false,
      message: '퇴근 처리 중 오류가 발생했습니다.',
    };
  }

  return {
    success: true,
    message: `${time}에 퇴근 처리되었습니다.`,
    record: data,
  };
}

// =====================================================
// 오늘 출퇴근 상태 확인
// =====================================================

export async function getTodayStatus(employeeId: string): Promise<{
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('attendance_records')
    .select('check_in, check_out')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .eq('status', 'active')
    .single();

  return {
    hasCheckedIn: !!data?.check_in,
    hasCheckedOut: !!data?.check_out,
    checkInTime: data?.check_in || undefined,
    checkOutTime: data?.check_out || undefined,
  };
}

// =====================================================
// 얼굴 임베딩 비교 (코사인 유사도)
// =====================================================

export function compareFaceEmbeddings(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export async function findMatchingEmployee(capturedEmbedding: number[], threshold: number = 0.6): Promise<Employee | null> {
  const templates = await getAllFaceTemplates();

  let bestMatch: { employee: Employee; score: number } | null = null;

  for (const template of templates) {
    const score = compareFaceEmbeddings(capturedEmbedding, template.embedding);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { employee: template.employee, score };
    }
  }

  return bestMatch?.employee || null;
}
