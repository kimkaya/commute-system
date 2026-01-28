# commute-erp 차세대 ERP 개발 요구사항

## 프로젝트 개요

기존 Electron 기반 Commute/CommuteAdmin 앱을 웹 기반 SaaS로 전환하는 프로젝트

### 기술 스택
- **프론트엔드**: React 19 + TypeScript + Vite 7
- **백엔드**: Supabase (PostgreSQL + Edge Functions + Auth)
- **상태관리**: Zustand 또는 TanStack Query
- **UI 라이브러리**: Tailwind CSS + shadcn/ui (권장)
- **폼 처리**: React Hook Form + Zod

---

## 1. 공통 인프라 (packages/shared)

### 1.1 Supabase 클라이언트 설정
```
packages/
└── shared/
    ├── supabase/
    │   ├── client.ts          # Supabase 클라이언트 초기화
    │   ├── types.ts           # Database 타입 정의 (자동생성)
    │   └── hooks.ts           # 공통 훅 (useSupabase, useAuth)
    ├── types/
    │   ├── employee.ts        # 직원 타입
    │   ├── record.ts          # 출퇴근 기록 타입
    │   ├── payroll.ts         # 급여 타입
    │   ├── leave.ts           # 휴가 타입
    │   ├── schedule.ts        # 스케줄 타입
    │   └── compliance.ts      # 컴플라이언스 타입
    ├── utils/
    │   ├── date.ts            # 날짜 유틸리티
    │   ├── time.ts            # 시간 계산 유틸리티
    │   ├── currency.ts        # 금액 포맷팅
    │   └── validation.ts      # 공통 검증 함수
    └── constants/
        ├── workSettings.ts    # 근무 설정 기본값
        └── taxRates.ts        # 세율 상수
```

### 1.2 Supabase 데이터베이스 스키마 (PostgreSQL)

```sql
-- 사업장 (멀티테넌시 지원)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_number TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 직원
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
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
  salary_type TEXT CHECK (salary_type IN ('hourly', 'monthly')),
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

-- 직원 얼굴 템플릿 (안면인식용)
CREATE TABLE employee_face_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  embedding FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 직원 인증정보
CREATE TABLE employee_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  password_hash TEXT,
  registered_devices TEXT[] DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 출퇴근 기록
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  total_break_minutes INTEGER DEFAULT 0,
  break_start TIME,
  break_end TIME,
  work_location TEXT,
  notes TEXT,
  device_id TEXT,
  ip_address INET,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'modified')),
  original_check_in TIME,
  original_check_out TIME,
  modified_by UUID,
  modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, employee_id, date)
);

-- 휴가/결근
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration NUMERIC,
  unit TEXT DEFAULT 'days' CHECK (unit IN ('days', 'hours')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  is_paid BOOLEAN DEFAULT TRUE,
  deduct_from_salary BOOLEAN DEFAULT FALSE,
  remaining_balance NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 근무 스케줄
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night', 'off')),
  start_time TIME,
  end_time TIME,
  break_duration INTEGER DEFAULT 60,
  location TEXT,
  notes TEXT,
  is_holiday BOOLEAN DEFAULT FALSE,
  holiday_type TEXT,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, employee_id, date)
);

-- 급여 기간
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, month)
);

-- 급여 실행
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  payroll_period_id UUID REFERENCES payroll_periods(id),
  run_date TIMESTAMPTZ DEFAULT NOW(),
  total_gross NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 급여 상세
CREATE TABLE payroll_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  payroll_run_id UUID REFERENCES payroll_runs(id),
  employee_id UUID REFERENCES employees(id),
  month TEXT NOT NULL,
  work_hours JSONB DEFAULT '{"regular": 0, "overtime": 0, "night": 0, "holiday": 0}',
  hourly_rate INTEGER,
  base_pay NUMERIC DEFAULT 0,
  overtime_pay NUMERIC DEFAULT 0,
  night_pay NUMERIC DEFAULT 0,
  holiday_pay NUMERIC DEFAULT 0,
  allowances JSONB DEFAULT '{}',
  gross_pay NUMERIC DEFAULT 0,
  deductions JSONB DEFAULT '{}',
  net_pay NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid')),
  calculated_by UUID,
  calculated_at TIMESTAMPTZ,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 컴플라이언스 체크
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  weekly_hours NUMERIC,
  weekly_overtime NUMERIC,
  continuous_work_days INTEGER,
  night_work_days INTEGER,
  status TEXT DEFAULT 'good' CHECK (status IN ('good', 'warning', 'violation')),
  violations JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  checked_by UUID,
  checked_at TIMESTAMPTZ,
  review_required BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 백업 메타데이터
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  type TEXT DEFAULT 'manual' CHECK (type IN ('auto', 'manual')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('creating', 'completed', 'failed')),
  description TEXT,
  data_types TEXT[] DEFAULT '{}',
  record_count JSONB DEFAULT '{}',
  compression TEXT,
  encrypted BOOLEAN DEFAULT FALSE,
  checksum TEXT,
  created_by UUID,
  completed_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  restored_by UUID,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 감사 로그
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
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
  duration INTEGER
);

-- 알림
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES employees(id),
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

-- 시스템 설정
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  admin_password_hash TEXT,
  fail_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  session_timeout INTEGER DEFAULT 30,
  default_hourly_rate INTEGER DEFAULT 10000,
  overtime_rate NUMERIC DEFAULT 1.5,
  night_work_rate NUMERIC DEFAULT 1.5,
  holiday_work_rate NUMERIC DEFAULT 2.0,
  weekly_regular_hours INTEGER DEFAULT 40,
  standard_start_time TIME DEFAULT '09:00',
  standard_end_time TIME DEFAULT '18:00',
  night_work_start_time TIME DEFAULT '22:00',
  lunch_break_duration INTEGER DEFAULT 60,
  allowed_ip_ranges INET[] DEFAULT '{}',
  backup_settings JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  compliance_settings JSONB DEFAULT '{"maxWeeklyHours": 52, "maxContinuousWorkDays": 6}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) 정책
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_leaves_employee ON leaves(employee_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_payroll_month ON payroll_lines(month);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
```

---

## 2. admin-ui (관리자 웹 UI)

### 2.1 페이지 구조
```
apps/admin-ui/src/
├── main.tsx
├── App.tsx
├── routes/
│   └── index.tsx              # 라우팅 설정
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx      # 로그인
│   │   └── ChangePasswordPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx  # 대시보드 (오늘 현황, 알림)
│   ├── employees/
│   │   ├── EmployeeListPage.tsx    # 직원 목록
│   │   ├── EmployeeDetailPage.tsx  # 직원 상세/편집
│   │   ├── EmployeeCreatePage.tsx  # 직원 등록
│   │   └── FaceRegistrationPage.tsx # 얼굴 등록
│   ├── attendance/
│   │   ├── AttendanceListPage.tsx  # 출퇴근 기록 목록
│   │   ├── AttendanceEditPage.tsx  # 출퇴근 수정
│   │   └── AttendanceReportPage.tsx # 출퇴근 보고서
│   ├── schedules/
│   │   ├── ScheduleCalendarPage.tsx # 스케줄 캘린더
│   │   ├── ScheduleEditPage.tsx     # 스케줄 편집
│   │   └── ShiftManagementPage.tsx  # 교대근무 관리
│   ├── leaves/
│   │   ├── LeaveListPage.tsx       # 휴가 신청 목록
│   │   ├── LeaveApprovalPage.tsx   # 휴가 승인
│   │   └── LeaveBalancePage.tsx    # 휴가 잔여 현황
│   ├── payroll/
│   │   ├── PayrollListPage.tsx     # 급여 목록
│   │   ├── PayrollCalculatePage.tsx # 급여 계산
│   │   ├── PayrollDetailPage.tsx   # 급여 상세
│   │   ├── PayrollClosePage.tsx    # 급여 마감
│   │   └── PayslipPage.tsx         # 급여명세서
│   ├── compliance/
│   │   ├── ComplianceOverviewPage.tsx  # 컴플라이언스 현황
│   │   ├── ViolationListPage.tsx       # 위반 목록
│   │   └── ComplianceReportPage.tsx    # 컴플라이언스 보고서
│   ├── reports/
│   │   ├── AttendanceReportPage.tsx    # 출퇴근 보고서
│   │   ├── PayrollReportPage.tsx       # 급여 보고서
│   │   └── ExportPage.tsx              # 엑셀/PDF 내보내기
│   ├── settings/
│   │   ├── GeneralSettingsPage.tsx     # 일반 설정
│   │   ├── WorkSettingsPage.tsx        # 근무 설정
│   │   ├── PayrollSettingsPage.tsx     # 급여 설정
│   │   ├── BackupSettingsPage.tsx      # 백업 설정
│   │   └── NotificationSettingsPage.tsx # 알림 설정
│   └── audit/
│       └── AuditLogPage.tsx            # 감사 로그
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx          # 메인 레이아웃
│   │   ├── Sidebar.tsx            # 사이드바 네비게이션
│   │   ├── Header.tsx             # 상단 헤더
│   │   └── Breadcrumb.tsx         # 브레드크럼
│   ├── common/
│   │   ├── DataTable.tsx          # 데이터 테이블
│   │   ├── SearchBar.tsx          # 검색 바
│   │   ├── DateRangePicker.tsx    # 날짜 범위 선택
│   │   ├── Modal.tsx              # 모달
│   │   ├── ConfirmDialog.tsx      # 확인 다이얼로그
│   │   ├── LoadingSpinner.tsx     # 로딩 스피너
│   │   └── EmptyState.tsx         # 빈 상태
│   ├── employees/
│   │   ├── EmployeeCard.tsx       # 직원 카드
│   │   ├── EmployeeForm.tsx       # 직원 폼
│   │   ├── FaceCapture.tsx        # 얼굴 캡처
│   │   └── ContractUpload.tsx     # 계약서 업로드
│   ├── attendance/
│   │   ├── AttendanceTable.tsx    # 출퇴근 테이블
│   │   ├── AttendanceCalendar.tsx # 출퇴근 캘린더
│   │   └── TimeEditor.tsx         # 시간 편집
│   ├── schedules/
│   │   ├── ScheduleCalendar.tsx   # 스케줄 캘린더
│   │   ├── ShiftSelector.tsx      # 시프트 선택
│   │   └── BulkScheduleForm.tsx   # 일괄 스케줄 설정
│   ├── payroll/
│   │   ├── PayrollTable.tsx       # 급여 테이블
│   │   ├── PayrollCalculator.tsx  # 급여 계산기
│   │   ├── AllowanceForm.tsx      # 수당 입력
│   │   ├── DeductionForm.tsx      # 공제 입력
│   │   └── PayslipPreview.tsx     # 급여명세서 미리보기
│   ├── compliance/
│   │   ├── ComplianceCard.tsx     # 컴플라이언스 카드
│   │   ├── ViolationAlert.tsx     # 위반 알림
│   │   └── WeeklyHoursChart.tsx   # 주간 근무시간 차트
│   └── charts/
│       ├── AttendanceChart.tsx    # 출퇴근 차트
│       ├── PayrollChart.tsx       # 급여 차트
│       └── TrendChart.tsx         # 트렌드 차트
├── hooks/
│   ├── useAuth.ts                 # 인증 훅
│   ├── useEmployees.ts            # 직원 CRUD
│   ├── useAttendance.ts           # 출퇴근 CRUD
│   ├── useSchedules.ts            # 스케줄 CRUD
│   ├── useLeaves.ts               # 휴가 CRUD
│   ├── usePayroll.ts              # 급여 관련
│   ├── useCompliance.ts           # 컴플라이언스
│   ├── useSettings.ts             # 설정
│   └── useAuditLog.ts             # 감사 로그
├── stores/
│   ├── authStore.ts               # 인증 상태
│   ├── uiStore.ts                 # UI 상태 (사이드바, 테마)
│   └── filterStore.ts             # 필터 상태
├── services/
│   ├── api.ts                     # API 클라이언트
│   ├── authService.ts             # 인증 서비스
│   ├── employeeService.ts         # 직원 서비스
│   ├── attendanceService.ts       # 출퇴근 서비스
│   ├── payrollService.ts          # 급여 서비스
│   └── exportService.ts           # 내보내기 서비스
└── utils/
    ├── formatters.ts              # 포맷팅 유틸
    ├── validators.ts              # 검증 유틸
    └── calculations.ts            # 계산 유틸
```

### 2.2 주요 기능 목록

| 카테고리 | 기능 | 우선순위 | 상태 |
|---------|------|---------|------|
| **인증** | 관리자 로그인 | P0 | 미구현 |
| | 비밀번호 변경 | P0 | 미구현 |
| | 로그인 실패 잠금 | P1 | 미구현 |
| **대시보드** | 오늘 출퇴근 현황 | P0 | 미구현 |
| | 미출근/미퇴근 알림 | P0 | 미구현 |
| | 컴플라이언스 경고 | P1 | 미구현 |
| | 주간/월간 통계 | P2 | 미구현 |
| **직원관리** | 직원 목록 조회 | P0 | 미구현 |
| | 직원 등록/수정/삭제 | P0 | 미구현 |
| | 얼굴 등록 (웹캠) | P0 | 미구현 |
| | 비밀번호 재설정 | P1 | 미구현 |
| | 기기 초기화 | P1 | 미구현 |
| | 개인별 스케줄 설정 | P1 | 미구현 |
| | 계약 정보 관리 | P2 | 미구현 |
| **출퇴근관리** | 출퇴근 기록 조회 | P0 | 미구현 |
| | 출퇴근 기록 수정 | P0 | 미구현 |
| | 출퇴근 기록 삭제 | P0 | 미구현 |
| | 날짜/직원 필터링 | P0 | 미구현 |
| | 엑셀 내보내기 | P1 | 미구현 |
| **스케줄관리** | 캘린더 뷰 | P1 | 미구현 |
| | 개인별 스케줄 설정 | P1 | 미구현 |
| | 일괄 스케줄 설정 | P2 | 미구현 |
| | 공휴일 관리 | P2 | 미구현 |
| **휴가관리** | 휴가 신청 목록 | P1 | 미구현 |
| | 휴가 승인/반려 | P1 | 미구현 |
| | 휴가 잔여 현황 | P2 | 미구현 |
| **급여관리** | 급여 계산 | P0 | 미구현 |
| | 급여 목록 조회 | P0 | 미구현 |
| | 수당/공제 입력 | P0 | 미구현 |
| | 급여명세서 출력 | P1 | 미구현 |
| | 급여 마감 | P1 | 미구현 |
| | 4대보험 자동계산 | P1 | 미구현 |
| **컴플라이언스** | 주간 근무시간 체크 | P0 | 미구현 |
| | 연속근무일 체크 | P1 | 미구현 |
| | 야간근무 현황 | P1 | 미구현 |
| | 위반 알림 | P0 | 미구현 |
| **보고서** | 출퇴근 보고서 | P1 | 미구현 |
| | 급여 보고서 | P1 | 미구현 |
| | PDF/엑셀 내보내기 | P1 | 미구현 |
| **설정** | 일반 설정 | P1 | 미구현 |
| | 근무 시간 설정 | P1 | 미구현 |
| | 급여 설정 (배율 등) | P1 | 미구현 |
| | 백업 설정 | P2 | 미구현 |
| | 알림 설정 | P2 | 미구현 |
| **감사로그** | 로그 조회 | P2 | 미구현 |
| | 로그 필터링 | P2 | 미구현 |

---

## 3. kiosk (출퇴근 단말기 앱)

### 3.1 페이지 구조
```
apps/kiosk/src/
├── main.tsx
├── App.tsx
├── pages/
│   ├── StandbyPage.tsx        # 대기 화면 (시계, 날짜)
│   ├── FaceRecognitionPage.tsx # 얼굴 인식 화면
│   ├── PasswordAuthPage.tsx    # 비밀번호 인증 (대체)
│   ├── CheckInOutPage.tsx      # 출퇴근 선택
│   ├── ConfirmationPage.tsx    # 확인 화면
│   └── ErrorPage.tsx           # 오류 화면
├── components/
│   ├── Camera.tsx              # 웹캠 컴포넌트
│   ├── FaceDetector.tsx        # 얼굴 감지
│   ├── Clock.tsx               # 실시간 시계
│   ├── NumPad.tsx              # 숫자 패드
│   ├── EmployeeSelector.tsx    # 직원 선택 (비밀번호 모드)
│   └── StatusIndicator.tsx     # 상태 표시
├── hooks/
│   ├── useFaceRecognition.ts   # 얼굴 인식 훅
│   ├── useCamera.ts            # 카메라 제어
│   └── useCheckInOut.ts        # 출퇴근 처리
├── services/
│   ├── faceApi.ts              # face-api.js 래퍼
│   └── attendanceApi.ts        # 출퇴근 API
└── utils/
    └── faceUtils.ts            # 얼굴 유틸리티
```

### 3.2 주요 기능 목록

| 기능 | 우선순위 | 상태 |
|------|---------|------|
| 대기 화면 (시계/날짜) | P0 | 미구현 |
| 웹캠 연동 | P0 | 미구현 |
| 얼굴 감지 (face-api.js) | P0 | 미구현 |
| 얼굴 매칭 (Edge Function 호출) | P0 | 미구현 |
| 출퇴근 기록 저장 | P0 | 미구현 |
| 비밀번호 인증 (대체) | P1 | 미구현 |
| 긴급 출퇴근 (감사 로그) | P1 | 미구현 |
| 오프라인 모드 | P2 | 미구현 |
| 풀스크린 모드 | P1 | 미구현 |
| 터치 최적화 UI | P1 | 미구현 |

---

## 4. employee-portal (직원 포털)

### 4.1 페이지 구조
```
apps/employee-portal/src/
├── main.tsx
├── App.tsx
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx          # 로그인
│   │   └── ChangePasswordPage.tsx # 비밀번호 변경
│   ├── home/
│   │   └── HomePage.tsx           # 홈 (오늘 출퇴근 현황)
│   ├── attendance/
│   │   ├── MyAttendancePage.tsx   # 내 출퇴근 기록
│   │   └── AttendanceCalendarPage.tsx # 캘린더 뷰
│   ├── leaves/
│   │   ├── LeaveRequestPage.tsx   # 휴가 신청
│   │   ├── MyLeavesPage.tsx       # 내 휴가 현황
│   │   └── LeaveBalancePage.tsx   # 휴가 잔여
│   ├── payroll/
│   │   ├── PayslipListPage.tsx    # 급여명세서 목록
│   │   └── PayslipDetailPage.tsx  # 급여명세서 상세
│   ├── schedule/
│   │   └── MySchedulePage.tsx     # 내 스케줄
│   └── profile/
│       └── ProfilePage.tsx        # 내 정보
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── BottomNav.tsx          # 하단 네비게이션 (모바일)
│   │   └── Header.tsx
│   ├── attendance/
│   │   ├── AttendanceCard.tsx
│   │   ├── TodayStatus.tsx
│   │   └── MonthlyCalendar.tsx
│   ├── leaves/
│   │   ├── LeaveRequestForm.tsx
│   │   └── LeaveCard.tsx
│   └── payroll/
│       ├── PayslipCard.tsx
│       └── PayslipDetail.tsx
├── hooks/
│   ├── useMyAttendance.ts
│   ├── useMyLeaves.ts
│   ├── useMyPayslip.ts
│   └── useMySchedule.ts
└── services/
    ├── authService.ts
    ├── attendanceService.ts
    ├── leaveService.ts
    └── payrollService.ts
```

### 4.2 주요 기능 목록

| 기능 | 우선순위 | 상태 |
|------|---------|------|
| 직원 로그인 | P0 | 미구현 |
| 비밀번호 변경 | P0 | 미구현 |
| 오늘 출퇴근 현황 | P0 | 미구현 |
| 내 출퇴근 기록 조회 | P0 | 미구현 |
| 출퇴근 캘린더 뷰 | P1 | 미구현 |
| 휴가 신청 | P1 | 미구현 |
| 휴가 현황 조회 | P1 | 미구현 |
| 휴가 잔여 확인 | P1 | 미구현 |
| 급여명세서 조회 | P1 | 미구현 |
| 급여명세서 다운로드 | P2 | 미구현 |
| 내 스케줄 조회 | P2 | 미구현 |
| 내 정보 조회/수정 | P2 | 미구현 |
| PWA 지원 | P1 | 미구현 |
| 모바일 반응형 | P0 | 미구현 |

---

## 5. Supabase Edge Functions (추가 필요)

### 5.1 현재 구현됨
- [x] `face-match` - 얼굴 매칭
- [x] `payroll-compute` - 급여 계산
- [x] `payroll-close` - 급여 마감

### 5.2 추가 개발 필요

```
supabase/functions/
├── auth/
│   ├── admin-login/index.ts       # 관리자 로그인
│   ├── employee-login/index.ts    # 직원 로그인
│   └── change-password/index.ts   # 비밀번호 변경
├── attendance/
│   ├── check-in/index.ts          # 출근 처리
│   ├── check-out/index.ts         # 퇴근 처리
│   └── emergency-record/index.ts  # 긴급 출퇴근
├── compliance/
│   ├── weekly-check/index.ts      # 주간 컴플라이언스 체크
│   └── violation-alert/index.ts   # 위반 알림 전송
├── reports/
│   ├── attendance-report/index.ts # 출퇴근 보고서 생성
│   └── payroll-report/index.ts    # 급여 보고서 생성
├── notifications/
│   ├── send-email/index.ts        # 이메일 발송
│   └── send-push/index.ts         # 푸시 알림
└── backups/
    ├── create-backup/index.ts     # 백업 생성
    └── restore-backup/index.ts    # 백업 복원
```

| 함수 | 기능 | 우선순위 | 상태 |
|------|------|---------|------|
| admin-login | 관리자 로그인 (bcrypt) | P0 | 미구현 |
| employee-login | 직원 로그인 (SHA256) | P0 | 미구현 |
| change-password | 비밀번호 변경 | P0 | 미구현 |
| check-in | 출근 기록 | P0 | 미구현 |
| check-out | 퇴근 기록 | P0 | 미구현 |
| emergency-record | 긴급 출퇴근 (감사로그) | P1 | 미구현 |
| weekly-check | 주간 근로시간 체크 | P1 | 미구현 |
| violation-alert | 위반 알림 발송 | P1 | 미구현 |
| attendance-report | 출퇴근 보고서 | P2 | 미구현 |
| payroll-report | 급여 보고서 | P2 | 미구현 |
| send-email | 이메일 발송 | P2 | 미구현 |
| create-backup | 백업 생성 | P2 | 미구현 |

---

## 6. 개발 일정 (권장)

### Phase 1: 핵심 기능 (2-3주)
- [ ] Supabase 프로젝트 설정 및 DB 스키마 생성
- [ ] 공통 패키지 (types, utils, hooks) 구축
- [ ] admin-ui: 로그인, 직원관리, 출퇴근관리
- [ ] kiosk: 얼굴인식 출퇴근
- [ ] Edge Functions: 인증, 출퇴근 처리

### Phase 2: 급여 및 컴플라이언스 (2주)
- [ ] admin-ui: 급여관리, 컴플라이언스
- [ ] employee-portal: 기본 기능
- [ ] Edge Functions: 급여 계산, 컴플라이언스 체크

### Phase 3: 확장 기능 (2주)
- [ ] 스케줄관리, 휴가관리
- [ ] 보고서 및 내보내기
- [ ] 알림 시스템

### Phase 4: 마무리 (1주)
- [ ] 설정, 백업
- [ ] 감사 로그
- [ ] 테스트 및 버그 수정
- [ ] Railway 배포

---

## 7. 기술적 고려사항

### 7.1 face-api.js 웹 통합
```typescript
// kiosk에서 face-api.js 사용
import * as faceapi from 'face-api.js';

// 모델 로드 (CDN 또는 로컬)
await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

// 얼굴 임베딩 추출
const detection = await faceapi
  .detectSingleFace(videoElement)
  .withFaceLandmarks()
  .withFaceDescriptor();

// Edge Function으로 매칭 요청
const response = await supabase.functions.invoke('face-match', {
  body: { businessId, embedding: Array.from(detection.descriptor) }
});
```

### 7.2 실시간 구독 (Supabase Realtime)
```typescript
// 출퇴근 실시간 업데이트
const channel = supabase
  .channel('attendance')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'attendance_records',
    filter: `business_id=eq.${businessId}`
  }, (payload) => {
    // 실시간 업데이트 처리
  })
  .subscribe();
```

### 7.3 PWA 설정 (employee-portal)
```json
// manifest.json
{
  "name": "출퇴근 포털",
  "short_name": "출퇴근",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#ffffff",
  "icons": [...]
}
```

---

## 8. 환경 변수

### 8.1 공통
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### 8.2 Edge Functions
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
FACE_MATCH_THRESHOLD=0.76
```

---

## 9. 의존성 패키지 (권장)

### 9.1 공통
```json
{
  "@supabase/supabase-js": "^2.x",
  "zustand": "^4.x",
  "@tanstack/react-query": "^5.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "date-fns": "^3.x"
}
```

### 9.2 admin-ui
```json
{
  "react-router-dom": "^6.x",
  "@tanstack/react-table": "^8.x",
  "recharts": "^2.x",
  "xlsx": "^0.18.x",
  "@react-pdf/renderer": "^3.x"
}
```

### 9.3 kiosk
```json
{
  "face-api.js": "^0.22.x",
  "react-webcam": "^7.x"
}
```

### 9.4 employee-portal
```json
{
  "react-router-dom": "^6.x",
  "@capacitor/core": "^5.x" // (옵션: 네이티브 앱)
}
```
