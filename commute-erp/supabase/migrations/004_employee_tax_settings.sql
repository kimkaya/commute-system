-- =====================================================
-- 직원별 소득세 설정 마이그레이션
-- 버전: 1.0
-- 생성일: 2025-02-02
-- 설명: 개인별 부양가족 수, 세금 설정 추가
-- =====================================================

-- =====================================================
-- 1. employees 테이블에 세금 관련 컬럼 추가
-- =====================================================

-- 부양가족 수 (본인 포함, 기본값 1)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 1;

-- 20세 이하 자녀 수 (추가 공제용)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS children_under_20 INTEGER DEFAULT 0;

-- 소득세 수동 오버라이드 (NULL이면 자동계산)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS income_tax_override DECIMAL(5,4) DEFAULT NULL;

-- 비과세 식대 (월, 기본 20만원까지 비과세)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_free_meals INTEGER DEFAULT 200000;

-- 비과세 자가운전보조금 (월, 기본 20만원까지)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_free_car_allowance INTEGER DEFAULT 0;

-- 비과세 기타
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_free_other INTEGER DEFAULT 0;

-- 4대보험 가입 여부
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_pension_exempt BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS health_insurance_exempt BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_insurance_exempt BOOLEAN DEFAULT FALSE;

-- 코멘트 추가
COMMENT ON COLUMN employees.dependents_count IS '부양가족 수 (본인 포함, 간이세액표 기준)';
COMMENT ON COLUMN employees.children_under_20 IS '20세 이하 자녀 수';
COMMENT ON COLUMN employees.income_tax_override IS '소득세율 수동 지정 (NULL=자동계산)';
COMMENT ON COLUMN employees.tax_free_meals IS '비과세 식대 (월)';
COMMENT ON COLUMN employees.tax_free_car_allowance IS '비과세 자가운전보조금 (월)';
COMMENT ON COLUMN employees.tax_free_other IS '기타 비과세';
COMMENT ON COLUMN employees.national_pension_exempt IS '국민연금 제외 여부';
COMMENT ON COLUMN employees.health_insurance_exempt IS '건강보험 제외 여부';
COMMENT ON COLUMN employees.employment_insurance_exempt IS '고용보험 제외 여부';

-- =====================================================
-- 2. 간이세액표 테이블 (2024년 기준)
-- =====================================================

CREATE TABLE IF NOT EXISTS income_tax_table (
  id SERIAL PRIMARY KEY,
  min_salary INTEGER NOT NULL,           -- 최소 급여 (이상)
  max_salary INTEGER NOT NULL,           -- 최대 급여 (미만)
  dependents_1 INTEGER NOT NULL,         -- 부양가족 1명
  dependents_2 INTEGER NOT NULL,         -- 부양가족 2명
  dependents_3 INTEGER NOT NULL,         -- 부양가족 3명
  dependents_4 INTEGER NOT NULL,         -- 부양가족 4명
  dependents_5 INTEGER NOT NULL,         -- 부양가족 5명
  dependents_6 INTEGER NOT NULL,         -- 부양가족 6명
  dependents_7 INTEGER NOT NULL,         -- 부양가족 7명
  dependents_8 INTEGER NOT NULL,         -- 부양가족 8명
  dependents_9 INTEGER NOT NULL,         -- 부양가족 9명
  dependents_10 INTEGER NOT NULL,        -- 부양가족 10명
  dependents_11_plus INTEGER NOT NULL,   -- 부양가족 11명 이상
  year INTEGER DEFAULT 2024,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE income_tax_table IS '근로소득 간이세액표 (국세청 기준)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_income_tax_salary ON income_tax_table(min_salary, max_salary, year);

-- =====================================================
-- 3. 2024년 간이세액표 데이터 (주요 구간)
-- 단위: 원
-- =====================================================

INSERT INTO income_tax_table (min_salary, max_salary, dependents_1, dependents_2, dependents_3, dependents_4, dependents_5, dependents_6, dependents_7, dependents_8, dependents_9, dependents_10, dependents_11_plus, year) VALUES
-- 106만원 이하: 세금 없음
(0, 1060000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2024),
-- 106만원 ~ 150만원
(1060000, 1500000, 9470, 3130, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2024),
-- 150만원 ~ 200만원
(1500000, 2000000, 19520, 10600, 3130, 0, 0, 0, 0, 0, 0, 0, 0, 2024),
-- 200만원 ~ 250만원
(2000000, 2500000, 40880, 26250, 14640, 5590, 0, 0, 0, 0, 0, 0, 0, 2024),
-- 250만원 ~ 300만원
(2500000, 3000000, 72940, 52040, 34700, 20890, 9490, 0, 0, 0, 0, 0, 0, 2024),
-- 300만원 ~ 350만원
(3000000, 3500000, 104990, 78390, 55210, 38050, 23490, 10850, 0, 0, 0, 0, 0, 2024),
-- 350만원 ~ 400만원
(3500000, 4000000, 136960, 104660, 78400, 56350, 39190, 24780, 11850, 0, 0, 0, 0, 2024),
-- 400만원 ~ 450만원
(4000000, 4500000, 172260, 135260, 103000, 76570, 55240, 38410, 24000, 11070, 0, 0, 0, 2024),
-- 450만원 ~ 500만원
(4500000, 5000000, 208560, 167260, 130910, 99290, 73070, 52240, 36120, 22710, 10510, 0, 0, 2024),
-- 500만원 ~ 600만원
(5000000, 6000000, 251910, 206200, 165230, 129170, 98250, 72390, 52130, 35480, 21070, 8140, 0, 2024),
-- 600만원 ~ 700만원
(6000000, 7000000, 318820, 264540, 219160, 179090, 143810, 113230, 87010, 64720, 46040, 29760, 15420, 2024),
-- 700만원 ~ 800만원
(7000000, 8000000, 392040, 330200, 279970, 235470, 195790, 160850, 130270, 103880, 81080, 61310, 43860, 2024),
-- 800만원 ~ 1000만원
(8000000, 10000000, 488140, 416570, 355990, 306460, 262170, 222830, 187890, 157310, 130920, 107820, 87420, 2024),
-- 1000만원 이상 (대략적인 값, 실제는 더 복잡)
(10000000, 999999999, 680000, 580000, 500000, 430000, 370000, 320000, 280000, 240000, 210000, 180000, 150000, 2024)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. payroll_lines 테이블에 세부 공제 컬럼 추가
-- =====================================================

-- 소득세
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS income_tax INTEGER DEFAULT 0;
-- 지방소득세
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS local_tax INTEGER DEFAULT 0;
-- 국민연금
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS national_pension INTEGER DEFAULT 0;
-- 건강보험
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS health_insurance INTEGER DEFAULT 0;
-- 장기요양보험
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS long_term_care INTEGER DEFAULT 0;
-- 고용보험
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS employment_insurance INTEGER DEFAULT 0;
-- 비과세 총액
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS tax_free_amount INTEGER DEFAULT 0;
-- 과세 대상 급여
ALTER TABLE payroll_lines ADD COLUMN IF NOT EXISTS taxable_income INTEGER DEFAULT 0;

COMMENT ON COLUMN payroll_lines.income_tax IS '소득세';
COMMENT ON COLUMN payroll_lines.local_tax IS '지방소득세 (소득세의 10%)';
COMMENT ON COLUMN payroll_lines.national_pension IS '국민연금';
COMMENT ON COLUMN payroll_lines.health_insurance IS '건강보험';
COMMENT ON COLUMN payroll_lines.long_term_care IS '장기요양보험';
COMMENT ON COLUMN payroll_lines.employment_insurance IS '고용보험';
COMMENT ON COLUMN payroll_lines.tax_free_amount IS '비과세 총액';
COMMENT ON COLUMN payroll_lines.taxable_income IS '과세대상 급여';

-- =====================================================
-- 5. 기존 직원 데이터 기본값 설정
-- =====================================================

UPDATE employees 
SET dependents_count = 1 
WHERE dependents_count IS NULL;

-- =====================================================
-- 6. RLS 정책
-- =====================================================

-- income_tax_table은 읽기 전용 공개
ALTER TABLE income_tax_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_tax_table_read_all" ON income_tax_table
  FOR SELECT USING (true);
