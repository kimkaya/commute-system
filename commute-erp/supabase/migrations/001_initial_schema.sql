-- =====================================================
-- commute-erp 초기 데이터베이스 스키마
-- 버전: 1.0
-- 생성일: 2025-01-28
-- =====================================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 사업장 (멀티테넌시 지원)
-- =====================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_number TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE businesses IS '사업장 정보 (멀티테넌시)';

-- =====================================================
-- 2. 직원
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_number TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  position TEXT,
  hire_date DATE,
  birth_date DATE,
  hourly_rate INTEGER DEFAULT 10000,
  monthly_salary INTEGER,
  salary_type TEXT DEFAULT 'hourly' CHECK (salary_type IN ('hourly', 'monthly')),
  contract JSONB DEFAULT '{}',
  schedule JSONB DEFAULT '[]',
  privacy_consent JSONB DEFAULT '{}',
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  inactive_reason TEXT,
  inactive_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, employee_number)
);

COMMENT ON TABLE employees IS '직원 정보';
COMMENT ON COLUMN employees.schedule IS '개인별 근무 스케줄 JSON 배열';
COMMENT ON COLUMN employees.contract IS '계약 정보 (유형, 시작일, 종료일 등)';

-- =====================================================
-- 3. 직원 얼굴 템플릿 (안면인식용)
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_face_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  embedding FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE employee_face_templates IS '직원 얼굴 인식 템플릿';
COMMENT ON COLUMN employee_face_templates.embedding IS 'face-api.js 128차원 임베딩 벡터';

-- =====================================================
-- 4. 직원 인증정보
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  password_hash TEXT,
  registered_devices TEXT[] DEFAULT '{}',
  failed_login_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE employee_credentials IS '직원 로그인 인증 정보';

-- =====================================================
-- 5. 출퇴근 기록
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  total_break_minutes INTEGER DEFAULT 0,
  break_start TIME,
  break_end TIME,
  work_location TEXT,
  notes TEXT,
  device_id TEXT,
  ip_address INET,
  check_in_method TEXT DEFAULT 'face' CHECK (check_in_method IN ('face', 'password', 'emergency', 'admin')),
  check_out_method TEXT CHECK (check_out_method IN ('face', 'password', 'emergency', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'modified')),
  original_check_in TIME,
  original_check_out TIME,
  modified_by UUID REFERENCES employees(id),
  modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, employee_id, date)
);

COMMENT ON TABLE attendance_records IS '출퇴근 기록';
COMMENT ON COLUMN attendance_records.check_in_method IS '출근 인증 방법';

-- =====================================================
-- 6. 휴가/결근
-- =====================================================
CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'half_am', 'half_pm')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'days' CHECK (unit IN ('days', 'hours')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID REFERENCES employees(id),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  is_paid BOOLEAN DEFAULT TRUE,
  deduct_from_salary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE leaves IS '휴가 및 결근 정보';

-- =====================================================
-- 7. 휴가 잔여
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  annual_total NUMERIC DEFAULT 15,
  annual_used NUMERIC DEFAULT 0,
  sick_total NUMERIC DEFAULT 0,
  sick_used NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, employee_id, year)
);

COMMENT ON TABLE leave_balances IS '직원별 연간 휴가 잔여';

-- =====================================================
-- 8. 근무 스케줄
-- =====================================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night', 'full', 'off')),
  start_time TIME,
  end_time TIME,
  break_duration INTEGER DEFAULT 60,
  location TEXT,
  notes TEXT,
  is_holiday BOOLEAN DEFAULT FALSE,
  holiday_type TEXT,
  assigned_by UUID REFERENCES employees(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, employee_id, date)
);

COMMENT ON TABLE schedules IS '근무 스케줄';

-- =====================================================
-- 9. 공휴일
-- =====================================================
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'public' CHECK (type IN ('public', 'company', 'substitute')),
  is_paid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE holidays IS '공휴일 및 회사 휴일';

-- =====================================================
-- 10. 급여 기간
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, year, month)
);

COMMENT ON TABLE payroll_periods IS '급여 기간';

-- =====================================================
-- 11. 급여 실행
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id),
  run_number INTEGER DEFAULT 1,
  run_date TIMESTAMPTZ DEFAULT NOW(),
  total_gross NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid')),
  confirmed_by UUID REFERENCES employees(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payroll_runs IS '급여 실행 (한 기간에 여러 번 실행 가능)';

-- =====================================================
-- 12. 급여 상세
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  -- 근무시간
  regular_hours NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  night_hours NUMERIC DEFAULT 0,
  holiday_hours NUMERIC DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  work_days INTEGER DEFAULT 0,
  
  -- 시급/월급
  hourly_rate INTEGER,
  
  -- 지급 항목
  base_pay NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  night_pay NUMERIC DEFAULT 0,
  holiday_pay NUMERIC DEFAULT 0,
  
  -- 수당
  bonus NUMERIC DEFAULT 0,
  incentive NUMERIC DEFAULT 0,
  transportation NUMERIC DEFAULT 0,
  meal_allowance NUMERIC DEFAULT 0,
  other_allowance NUMERIC DEFAULT 0,
  total_allowances NUMERIC DEFAULT 0,
  
  -- 총 지급액
  gross_pay NUMERIC DEFAULT 0,
  
  -- 공제 항목
  income_tax NUMERIC DEFAULT 0,
  local_tax NUMERIC DEFAULT 0,
  national_pension NUMERIC DEFAULT 0,
  health_insurance NUMERIC DEFAULT 0,
  long_term_care NUMERIC DEFAULT 0,
  employment_insurance NUMERIC DEFAULT 0,
  other_deduction NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  
  -- 실수령액
  net_pay NUMERIC DEFAULT 0,
  
  -- 상태
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid')),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payroll_lines IS '급여 상세 내역';

-- =====================================================
-- 13. 컴플라이언스 체크
-- =====================================================
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  weekly_hours NUMERIC DEFAULT 0,
  weekly_overtime NUMERIC DEFAULT 0,
  continuous_work_days INTEGER DEFAULT 0,
  night_work_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'good' CHECK (status IN ('good', 'warning', 'violation')),
  violations JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  checked_by UUID REFERENCES employees(id),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  review_required BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, employee_id, week_start)
);

COMMENT ON TABLE compliance_checks IS '근로기준법 컴플라이언스 체크';

-- =====================================================
-- 14. 백업 메타데이터
-- =====================================================
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  type TEXT DEFAULT 'manual' CHECK (type IN ('auto', 'manual')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('creating', 'completed', 'failed')),
  description TEXT,
  data_types TEXT[] DEFAULT '{}',
  record_counts JSONB DEFAULT '{}',
  checksum TEXT,
  created_by UUID REFERENCES employees(id),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE backups IS '백업 메타데이터';

-- =====================================================
-- 15. 감사 로그
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  before_value JSONB,
  after_value JSONB,
  ip_address INET,
  user_agent TEXT,
  device_id TEXT,
  level TEXT DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error')),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  duration_ms INTEGER
);

COMMENT ON TABLE audit_logs IS '시스템 감사 로그';

-- =====================================================
-- 16. 알림
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  channel TEXT DEFAULT 'system' CHECK (channel IN ('email', 'sms', 'push', 'system')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS '알림';

-- =====================================================
-- 17. 시스템 설정
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  
  -- 관리자 인증
  admin_password_hash TEXT,
  admin_fail_count INTEGER DEFAULT 0,
  admin_locked_until TIMESTAMPTZ,
  
  -- 세션 설정
  session_timeout_minutes INTEGER DEFAULT 30,
  
  -- 급여 설정
  default_hourly_rate INTEGER DEFAULT 10000,
  overtime_rate NUMERIC DEFAULT 1.5,
  night_work_rate NUMERIC DEFAULT 1.5,
  holiday_work_rate NUMERIC DEFAULT 2.0,
  
  -- 근무 설정
  weekly_regular_hours INTEGER DEFAULT 40,
  daily_regular_hours INTEGER DEFAULT 8,
  standard_start_time TIME DEFAULT '09:00',
  standard_end_time TIME DEFAULT '18:00',
  night_work_start_time TIME DEFAULT '22:00',
  night_work_end_time TIME DEFAULT '06:00',
  lunch_break_start TIME DEFAULT '12:00',
  lunch_break_duration INTEGER DEFAULT 60,
  
  -- 컴플라이언스 설정
  max_weekly_hours INTEGER DEFAULT 52,
  max_overtime_hours INTEGER DEFAULT 12,
  max_continuous_work_days INTEGER DEFAULT 6,
  mandatory_break_after_hours INTEGER DEFAULT 4,
  
  -- 백업 설정
  backup_enabled BOOLEAN DEFAULT TRUE,
  backup_frequency TEXT DEFAULT 'daily',
  backup_time TIME DEFAULT '03:00',
  backup_retention_days INTEGER DEFAULT 30,
  
  -- 알림 설정
  notification_settings JSONB DEFAULT '{}',
  
  -- 얼굴 인식 설정
  face_match_threshold NUMERIC DEFAULT 0.76,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_settings IS '사업장별 시스템 설정';

-- =====================================================
-- 인덱스 생성
-- =====================================================

-- employees
CREATE INDEX idx_employees_business ON employees(business_id);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_active ON employees(is_active);

-- employee_face_templates
CREATE INDEX idx_face_templates_business ON employee_face_templates(business_id);
CREATE INDEX idx_face_templates_employee ON employee_face_templates(employee_id);

-- attendance_records
CREATE INDEX idx_attendance_business ON attendance_records(business_id);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(date DESC);
CREATE INDEX idx_attendance_business_date ON attendance_records(business_id, date DESC);

-- leaves
CREATE INDEX idx_leaves_business ON leaves(business_id);
CREATE INDEX idx_leaves_employee ON leaves(employee_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_dates ON leaves(start_date, end_date);

-- schedules
CREATE INDEX idx_schedules_business ON schedules(business_id);
CREATE INDEX idx_schedules_employee ON schedules(employee_id);
CREATE INDEX idx_schedules_date ON schedules(date);

-- payroll_periods
CREATE INDEX idx_payroll_periods_business ON payroll_periods(business_id);
CREATE INDEX idx_payroll_periods_year_month ON payroll_periods(year, month);

-- payroll_lines
CREATE INDEX idx_payroll_lines_business ON payroll_lines(business_id);
CREATE INDEX idx_payroll_lines_employee ON payroll_lines(employee_id);
CREATE INDEX idx_payroll_lines_period ON payroll_lines(payroll_period_id);

-- compliance_checks
CREATE INDEX idx_compliance_business ON compliance_checks(business_id);
CREATE INDEX idx_compliance_employee ON compliance_checks(employee_id);
CREATE INDEX idx_compliance_week ON compliance_checks(week_start);
CREATE INDEX idx_compliance_status ON compliance_checks(status);

-- audit_logs
CREATE INDEX idx_audit_business ON audit_logs(business_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- notifications
CREATE INDEX idx_notifications_business ON notifications(business_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- =====================================================
-- Row Level Security (RLS) 정책
-- =====================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_face_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 트리거: updated_at 자동 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER tr_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_employee_face_templates_updated_at BEFORE UPDATE ON employee_face_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_employee_credentials_updated_at BEFORE UPDATE ON employee_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_leaves_updated_at BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_payroll_lines_updated_at BEFORE UPDATE ON payroll_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_compliance_checks_updated_at BEFORE UPDATE ON compliance_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 초기 데이터: 기본 사업장 (개발용)
-- =====================================================

INSERT INTO businesses (id, name, business_number, settings) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '기본 사업장',
  '000-00-00000',
  '{"timezone": "Asia/Seoul"}'
) ON CONFLICT DO NOTHING;

INSERT INTO system_settings (business_id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
