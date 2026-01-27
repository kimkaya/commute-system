// Supabase 클라이언트 설정 및 유틸리티
import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 타입 정의
export interface Employee {
  id: string
  employee_number: string
  name: string
  email?: string
  department?: string
  position?: string
  phone?: string
  hire_date?: string
  role: 'ADMIN' | 'EMPLOYEE' | 'MANAGER'
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
  password_hash?: string
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  check_in_device?: string
  check_out_device?: string
  total_break_minutes: number
  work_minutes?: number
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'HOLIDAY'
  note?: string
  created_at: string
}

export interface Leave {
  id: string
  employee_id: string
  type: 'ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'OTHER'
  start_date: string
  end_date: string
  days?: number
  reason?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approved_by?: string
  approved_at?: string
  created_at: string
}

export interface Payroll {
  id: string
  employee_id: string
  year_month: string
  base_salary?: number
  overtime_pay: number
  deductions: number
  net_salary?: number
  work_days?: number
  total_work_hours?: number
  created_at: string
}

export interface FaceEmbedding {
  id: string
  employee_id: string
  embedding: any // JSONB
  image_url?: string
  created_at: string
  is_primary: boolean
}

export interface RegisteredDevice {
  id: string
  employee_id: string
  device_id: string
  device_name?: string
  registered_at: string
  last_used_at?: string
}

// 인증 관련 함수
export async function login(employeeNumber: string, password: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      employee_number: employeeNumber,
      password: password,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '로그인에 실패했습니다.')
  }

  return await response.json()
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// 직원 관련 함수
export async function getEmployees(department?: string, status: string = 'ACTIVE') {
  let query = supabase
    .from('employees')
    .select('*')
    .eq('status', status)
    .order('name')

  if (department) {
    query = query.eq('department', department)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Employee[]
}

export async function getEmployee(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      face_embeddings (*),
      registered_devices (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Employee
}

export async function createEmployee(employee: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

// 출퇴근 기록 관련 함수
export async function getAttendance(
  employeeId?: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from('attendance')
    .select(`
      *,
      employees:employee_id (
        employee_number,
        name,
        department
      )
    `)
    .order('date', { ascending: false })

  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }
  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Attendance[]
}

export async function checkIn(employeeId: string, deviceId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      employee_id: employeeId,
      date: today,
      check_in: new Date().toISOString(),
      check_in_device: deviceId,
      status: 'PRESENT',
    })
    .select()
    .single()

  if (error) throw error
  return data as Attendance
}

export async function checkOut(employeeId: string, deviceId: string) {
  const today = new Date().toISOString().split('T')[0]

  // 오늘의 출근 기록 찾기
  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .single()

  if (!existing) {
    throw new Error('출근 기록이 없습니다.')
  }

  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out: new Date().toISOString(),
      check_out_device: deviceId,
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) throw error
  return data as Attendance
}

// 휴가 관련 함수
export async function getLeaves(employeeId?: string, status?: string) {
  let query = supabase
    .from('leaves')
    .select(`
      *,
      employees:employee_id (
        employee_number,
        name,
        department
      )
    `)
    .order('created_at', { ascending: false })

  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Leave[]
}

export async function createLeave(leave: Partial<Leave>) {
  const { data, error } = await supabase
    .from('leaves')
    .insert(leave)
    .select()
    .single()

  if (error) throw error
  return data as Leave
}

export async function approveLeave(leaveId: string, approverId: string) {
  const { data, error } = await supabase
    .from('leaves')
    .update({
      status: 'APPROVED',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', leaveId)
    .select()
    .single()

  if (error) throw error
  return data as Leave
}

// 급여 관련 함수
export async function getPayroll(employeeId?: string, yearMonth?: string) {
  let query = supabase
    .from('payroll')
    .select(`
      *,
      employees:employee_id (
        employee_number,
        name,
        department
      )
    `)
    .order('year_month', { ascending: false })

  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }
  if (yearMonth) {
    query = query.eq('year_month', yearMonth)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Payroll[]
}

export async function createPayroll(payroll: Partial<Payroll>) {
  const { data, error } = await supabase
    .from('payroll')
    .insert(payroll)
    .select()
    .single()

  if (error) throw error
  return data as Payroll
}

// 설정 관련 함수
export async function getSetting(id: string) {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function updateSetting(id: string, value: any) {
  const { data, error } = await supabase
    .from('settings')
    .update({ value })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// 실시간 구독 헬퍼
export function subscribeToAttendance(callback: (payload: any) => void) {
  return supabase
    .channel('attendance-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, callback)
    .subscribe()
}

export function subscribeToEmployees(callback: (payload: any) => void) {
  return supabase
    .channel('employee-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, callback)
    .subscribe()
}
