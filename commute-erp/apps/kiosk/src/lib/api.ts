// =====================================================
// Kiosk API 서비스
// =====================================================

import { supabase } from './supabase';

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

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
// 출퇴근 체크
// =====================================================

export async function checkIn(employeeId: string, method: 'face' | 'password'): Promise<{
  success: boolean;
  message: string;
  record?: AttendanceRecord;
}> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const time = now.toTimeString().split(' ')[0].substring(0, 5);

  // 이미 출근했는지 확인
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .eq('status', 'active')
    .single();

  if (existing?.check_in) {
    return {
      success: false,
      message: '이미 출근 처리되었습니다.',
    };
  }

  // 출근 기록 생성/업데이트
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
    })
    .select()
    .single();

  if (error) {
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

  // 오늘 출근 기록 확인
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .eq('status', 'active')
    .single();

  if (!existing?.check_in) {
    return {
      success: false,
      message: '출근 기록이 없습니다. 먼저 출근하세요.',
    };
  }

  if (existing.check_out) {
    return {
      success: false,
      message: '이미 퇴근 처리되었습니다.',
    };
  }

  // 퇴근 기록 업데이트
  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      check_out: time,
      check_out_at: now.toISOString(),
      check_out_method: method,
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
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
