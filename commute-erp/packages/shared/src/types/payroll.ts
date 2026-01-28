// =====================================================
// 급여 타입
// =====================================================

export interface PayrollPeriod {
  id: string;
  business_id: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatus;
  closed_at?: string;
  closed_by?: string;
  created_at: string;
  updated_at: string;
}

export type PayrollPeriodStatus = 'open' | 'processing' | 'closed';

export interface PayrollRun {
  id: string;
  business_id: string;
  payroll_period_id: string;
  run_number: number;
  run_date: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  status: PayrollRunStatus;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
}

export type PayrollRunStatus = 'draft' | 'confirmed' | 'paid';

export interface PayrollLine {
  id: string;
  business_id: string;
  payroll_run_id: string;
  payroll_period_id: string;
  employee_id: string;
  
  // 근무시간
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
  total_hours: number;
  work_days: number;
  
  // 시급
  hourly_rate: number;
  
  // 지급 항목
  base_pay: number;
  overtime_pay: number;
  night_pay: number;
  holiday_pay: number;
  
  // 수당
  bonus: number;
  incentive: number;
  transportation: number;
  meal_allowance: number;
  other_allowance: number;
  total_allowances: number;
  
  // 총 지급액
  gross_pay: number;
  
  // 공제 항목
  income_tax: number;
  local_tax: number;
  national_pension: number;
  health_insurance: number;
  long_term_care: number;
  employment_insurance: number;
  other_deduction: number;
  total_deductions: number;
  
  // 실수령액
  net_pay: number;
  
  // 상태
  status: PayrollLineStatus;
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

export type PayrollLineStatus = 'draft' | 'confirmed' | 'paid';

export interface PayrollLineWithEmployee extends PayrollLine {
  employee?: {
    id: string;
    name: string;
    employee_number?: string;
    department?: string;
    position?: string;
  };
}

// Input types
export interface CreatePayrollPeriodInput {
  business_id: string;
  year: number;
  month: number;
  start_date?: string;
  end_date?: string;
}

export interface CalculatePayrollInput {
  business_id: string;
  payroll_period_id: string;
  employee_ids?: string[]; // 특정 직원만 계산 (없으면 전체)
}

export interface UpdatePayrollLineInput {
  // 수당 조정
  bonus?: number;
  incentive?: number;
  transportation?: number;
  meal_allowance?: number;
  other_allowance?: number;
  
  // 공제 조정
  other_deduction?: number;
  
  notes?: string;
}

// 급여 계산 설정
export interface PayrollSettings {
  overtime_rate: number;      // 연장근무 배율 (기본: 1.5)
  night_work_rate: number;    // 야간근무 배율 (기본: 1.5)
  holiday_work_rate: number;  // 휴일근무 배율 (기본: 2.0)
  weekly_regular_hours: number; // 주당 정규시간 (기본: 40)
  daily_regular_hours: number;  // 일일 정규시간 (기본: 8)
}

// 4대보험 요율 (2024년 기준)
export interface InsuranceRates {
  national_pension: number;        // 국민연금 4.5%
  health_insurance: number;        // 건강보험 3.545%
  long_term_care: number;          // 장기요양 12.95% (건강보험의)
  employment_insurance: number;    // 고용보험 0.9%
}

export const INSURANCE_RATES_2024: InsuranceRates = {
  national_pension: 0.045,
  health_insurance: 0.03545,
  long_term_care: 0.1295,
  employment_insurance: 0.009,
};

// 소득세 구간
export interface IncomeTaxBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

export const INCOME_TAX_BRACKETS: IncomeTaxBracket[] = [
  { min: 0, max: 14000000, rate: 0.06, deduction: 0 },
  { min: 14000000, max: 50000000, rate: 0.15, deduction: 1260000 },
  { min: 50000000, max: 88000000, rate: 0.24, deduction: 5760000 },
  { min: 88000000, max: 150000000, rate: 0.35, deduction: 15440000 },
  { min: 150000000, max: 300000000, rate: 0.38, deduction: 19940000 },
  { min: 300000000, max: 500000000, rate: 0.40, deduction: 25940000 },
  { min: 500000000, max: 1000000000, rate: 0.42, deduction: 35940000 },
  { min: 1000000000, max: Infinity, rate: 0.45, deduction: 65940000 },
];

// 급여명세서
export interface Payslip {
  employee: {
    name: string;
    employee_number?: string;
    department?: string;
    position?: string;
  };
  period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
  };
  work_summary: {
    work_days: number;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    night_hours: number;
    holiday_hours: number;
  };
  earnings: {
    base_pay: number;
    overtime_pay: number;
    night_pay: number;
    holiday_pay: number;
    allowances: {
      bonus: number;
      incentive: number;
      transportation: number;
      meal: number;
      other: number;
    };
    gross_pay: number;
  };
  deductions: {
    income_tax: number;
    local_tax: number;
    national_pension: number;
    health_insurance: number;
    long_term_care: number;
    employment_insurance: number;
    other: number;
    total: number;
  };
  net_pay: number;
  pay_date?: string;
}
