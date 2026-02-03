-- 006_individual_tax_rates.sql
-- 개인별 세율 설정 컬럼 추가

-- 세금 유형: 일반(4대보험) vs 프리랜서(3.3%)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'regular' CHECK (tax_type IN ('regular', 'freelancer'));

COMMENT ON COLUMN employees.tax_type IS '세금 유형: regular(일반/4대보험), freelancer(프리랜서/3.3%)';

-- 프리랜서 세율 (기본 3.3%)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS freelancer_tax_rate NUMERIC(5,4) DEFAULT 0.033;

COMMENT ON COLUMN employees.freelancer_tax_rate IS '프리랜서 원천징수 세율 (기본 3.3%)';

-- 4대보험 개별 세율 (NULL이면 기본 요율 사용)
-- 국민연금: 기본 4.5%
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS national_pension_rate NUMERIC(5,4) DEFAULT NULL;

COMMENT ON COLUMN employees.national_pension_rate IS '국민연금 개인 요율 (NULL=기본 4.5%)';

-- 건강보험: 기본 3.545%
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS health_insurance_rate NUMERIC(5,4) DEFAULT NULL;

COMMENT ON COLUMN employees.health_insurance_rate IS '건강보험 개인 요율 (NULL=기본 3.545%)';

-- 장기요양보험: 건강보험의 12.81%
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS long_term_care_rate NUMERIC(5,4) DEFAULT NULL;

COMMENT ON COLUMN employees.long_term_care_rate IS '장기요양보험 개인 요율 (NULL=건강보험의 12.81%)';

-- 고용보험: 기본 0.9%
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employment_insurance_rate NUMERIC(5,4) DEFAULT NULL;

COMMENT ON COLUMN employees.employment_insurance_rate IS '고용보험 개인 요율 (NULL=기본 0.9%)';

-- 산재보험: 기본 0% (보통 사업주 부담)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS industrial_accident_rate NUMERIC(5,4) DEFAULT NULL;

COMMENT ON COLUMN employees.industrial_accident_rate IS '산재보험 개인 요율 (NULL=기본 0%)';

-- 지방소득세율: 기본 소득세의 10%
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS local_income_tax_rate NUMERIC(5,4) DEFAULT NULL;

COMMENT ON COLUMN employees.local_income_tax_rate IS '지방소득세 요율 (NULL=소득세의 10%)';
