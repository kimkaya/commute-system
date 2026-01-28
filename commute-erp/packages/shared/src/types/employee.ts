// =====================================================
// 직원 타입
// =====================================================

export interface Employee {
  id: string;
  business_id: string;
  employee_number?: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  birth_date?: string;
  hourly_rate: number;
  monthly_salary?: number;
  salary_type: SalaryType;
  contract: EmployeeContract;
  schedule: WeeklySchedule[];
  privacy_consent: PrivacyConsent;
  permissions: string[];
  is_active: boolean;
  inactive_reason?: string;
  inactive_date?: string;
  created_at: string;
  updated_at: string;
}

export type SalaryType = 'hourly' | 'monthly';

export interface EmployeeContract {
  type?: ContractType;
  start_date?: string;
  end_date?: string;
  work_hours_per_week?: number;
  contract_file_url?: string;
}

export type ContractType = 'permanent' | 'contract' | 'part_time' | 'intern';

export interface WeeklySchedule {
  day_of_week: number; // 0 = Sunday, 1 = Monday, ...
  is_work_day: boolean;
  start_time?: string; // HH:mm
  end_time?: string;   // HH:mm
  break_duration?: number; // minutes
}

export interface PrivacyConsent {
  agreed_at?: string;
  privacy_policy?: boolean;
  biometric_data?: boolean;
  data_retention?: boolean;
  retention_period?: RetentionPeriod;
}

export type RetentionPeriod = 'until_resignation' | '1year' | '3years' | '5years';

export interface EmployeeFaceTemplate {
  id: string;
  business_id: string;
  employee_id: string;
  embedding: number[];
  created_at: string;
  updated_at: string;
}

export interface EmployeeCredential {
  id: string;
  employee_id: string;
  password_hash?: string;
  registered_devices: string[];
  failed_login_count: number;
  locked_until?: string;
  last_login_at?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
}

// Input types
export interface CreateEmployeeInput {
  business_id: string;
  employee_number?: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  birth_date?: string;
  hourly_rate?: number;
  monthly_salary?: number;
  salary_type?: SalaryType;
  contract?: Partial<EmployeeContract>;
  schedule?: WeeklySchedule[];
}

export interface UpdateEmployeeInput extends Partial<Omit<CreateEmployeeInput, 'business_id'>> {
  is_active?: boolean;
  inactive_reason?: string;
}

// 직원 목록 조회용
export interface EmployeeListItem {
  id: string;
  employee_number?: string;
  name: string;
  department?: string;
  position?: string;
  is_active: boolean;
  hire_date?: string;
}

// 직원 상세 (얼굴 템플릿 포함)
export interface EmployeeWithFace extends Employee {
  face_template?: EmployeeFaceTemplate;
  has_face: boolean;
  has_password: boolean;
}
