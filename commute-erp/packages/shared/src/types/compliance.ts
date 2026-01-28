// =====================================================
// 컴플라이언스 타입
// =====================================================

export interface ComplianceCheck {
  id: string;
  business_id: string;
  employee_id: string;
  week_start: string;
  week_end: string;
  weekly_hours: number;
  weekly_overtime: number;
  continuous_work_days: number;
  night_work_days: number;
  status: ComplianceStatus;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  recommendations: string[];
  checked_by?: string;
  checked_at: string;
  review_required: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  action_taken?: string;
  created_at: string;
  updated_at: string;
}

export type ComplianceStatus = 'good' | 'warning' | 'violation';

export interface ComplianceViolation {
  code: ViolationCode;
  message: string;
  details?: Record<string, unknown>;
  severity: 'high' | 'critical';
}

export interface ComplianceWarning {
  code: WarningCode;
  message: string;
  details?: Record<string, unknown>;
  severity: 'low' | 'medium';
}

export type ViolationCode = 
  | 'WEEKLY_HOURS_EXCEEDED'       // 주 52시간 초과
  | 'CONTINUOUS_WORK_EXCEEDED'    // 연속 근무일 초과
  | 'NO_WEEKLY_REST'              // 주휴일 미부여
  | 'MINOR_NIGHT_WORK'            // 미성년자 야간근무
  | 'OVERTIME_WITHOUT_CONSENT';   // 연장근무 동의 없음

export type WarningCode = 
  | 'WEEKLY_HOURS_WARNING'        // 주 40시간 초과 (52시간 미만)
  | 'OVERTIME_WARNING'            // 연장근무 많음
  | 'CONTINUOUS_WORK_WARNING'     // 연속 근무일 경고
  | 'NIGHT_WORK_FREQUENT'         // 야간근무 빈번
  | 'NO_BREAK_WARNING';           // 휴게시간 미부여

export interface ComplianceCheckWithEmployee extends ComplianceCheck {
  employee?: {
    id: string;
    name: string;
    employee_number?: string;
    department?: string;
  };
}

// Input types
export interface RunComplianceCheckInput {
  business_id: string;
  week_start: string;
  employee_ids?: string[]; // 특정 직원만 체크 (없으면 전체)
  checked_by?: string;
}

// 컴플라이언스 설정
export interface ComplianceSettings {
  max_weekly_hours: number;           // 주간 최대 근무시간 (기본: 52)
  max_overtime_hours: number;         // 주간 최대 연장근무 (기본: 12)
  max_continuous_work_days: number;   // 연속 근무일 한도 (기본: 6)
  mandatory_break_after_hours: number; // 의무 휴게 시작 시간 (기본: 4)
  night_work_start: string;           // 야간근무 시작 (기본: 22:00)
  night_work_end: string;             // 야간근무 종료 (기본: 06:00)
}

export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettings = {
  max_weekly_hours: 52,
  max_overtime_hours: 12,
  max_continuous_work_days: 6,
  mandatory_break_after_hours: 4,
  night_work_start: '22:00',
  night_work_end: '06:00',
};

// 컴플라이언스 요약
export interface ComplianceSummary {
  period_start: string;
  period_end: string;
  total_employees: number;
  good_count: number;
  warning_count: number;
  violation_count: number;
  top_violations: {
    code: ViolationCode;
    count: number;
  }[];
  top_warnings: {
    code: WarningCode;
    count: number;
  }[];
}

// 위반/경고 코드 정보
export interface ViolationInfo {
  code: ViolationCode;
  label: string;
  label_ko: string;
  description: string;
  law_reference?: string;
}

export const VIOLATION_INFO: ViolationInfo[] = [
  {
    code: 'WEEKLY_HOURS_EXCEEDED',
    label: 'Weekly Hours Exceeded',
    label_ko: '주 52시간 초과',
    description: '근로기준법 제53조에 따른 주 52시간 한도 초과',
    law_reference: '근로기준법 제53조',
  },
  {
    code: 'CONTINUOUS_WORK_EXCEEDED',
    label: 'Continuous Work Days Exceeded',
    label_ko: '연속 근무일 초과',
    description: '7일 이상 연속 근무',
    law_reference: '근로기준법 제55조',
  },
  {
    code: 'NO_WEEKLY_REST',
    label: 'No Weekly Rest',
    label_ko: '주휴일 미부여',
    description: '1주일에 1일 이상의 유급휴일 미부여',
    law_reference: '근로기준법 제55조',
  },
  {
    code: 'MINOR_NIGHT_WORK',
    label: 'Minor Night Work',
    label_ko: '미성년자 야간근무',
    description: '18세 미만 근로자의 야간근무',
    law_reference: '근로기준법 제70조',
  },
  {
    code: 'OVERTIME_WITHOUT_CONSENT',
    label: 'Overtime Without Consent',
    label_ko: '연장근무 동의 없음',
    description: '근로자 동의 없는 연장근무',
    law_reference: '근로기준법 제53조',
  },
];

export interface WarningInfo {
  code: WarningCode;
  label: string;
  label_ko: string;
  description: string;
}

export const WARNING_INFO: WarningInfo[] = [
  {
    code: 'WEEKLY_HOURS_WARNING',
    label: 'Weekly Hours Warning',
    label_ko: '주간 근무시간 경고',
    description: '주 40시간 초과 근무 중',
  },
  {
    code: 'OVERTIME_WARNING',
    label: 'Overtime Warning',
    label_ko: '연장근무 경고',
    description: '연장근무가 한도에 가까움',
  },
  {
    code: 'CONTINUOUS_WORK_WARNING',
    label: 'Continuous Work Warning',
    label_ko: '연속 근무 경고',
    description: '5일 이상 연속 근무 중',
  },
  {
    code: 'NIGHT_WORK_FREQUENT',
    label: 'Frequent Night Work',
    label_ko: '야간근무 빈번',
    description: '야간근무가 빈번함',
  },
  {
    code: 'NO_BREAK_WARNING',
    label: 'No Break Warning',
    label_ko: '휴게시간 미부여 경고',
    description: '4시간 이상 근무 시 휴게시간 미부여',
  },
];
