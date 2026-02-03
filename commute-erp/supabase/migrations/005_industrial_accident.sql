-- 005_industrial_accident.sql
-- 산재보험 제외 여부 컬럼 추가

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS industrial_accident_exempt BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN employees.industrial_accident_exempt IS '산재보험 제외 여부';
