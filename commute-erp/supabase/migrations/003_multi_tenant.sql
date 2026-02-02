-- =====================================================
-- 멀티사업장 지원을 위한 스키마 마이그레이션
-- 버전: 1.1
-- 생성일: 2025-02-02
-- =====================================================

-- =====================================================
-- 1. businesses 테이블 수정
-- =====================================================

-- 회사코드 (로그인용, 고유, 소문자 저장)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS company_code VARCHAR(10);

-- 초대코드 (직원 가입용)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20);

-- company_code 유니크 인덱스 (대소문자 구분 없음)
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_company_code_lower 
ON businesses(LOWER(company_code));

-- invite_code 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_invite_code 
ON businesses(invite_code);

-- =====================================================
-- 2. admins 테이블 (관리자 계정)
-- =====================================================

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'manager')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  failed_login_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admins IS '관리자 계정';
COMMENT ON COLUMN admins.username IS '로그인 아이디 (@ 앞부분, 회사별 고유)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_business ON admins(business_id);

-- username 유니크 인덱스 (회사별 고유, 대소문자 구분 없음)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_username_per_business 
ON admins(business_id, LOWER(username));

-- RLS 활성화
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (개발용 - 모든 접근 허용)
DROP POLICY IF EXISTS "Allow all access to admins" ON admins;
CREATE POLICY "Allow all access to admins" ON admins FOR ALL USING (true);

-- 트리거
DROP TRIGGER IF EXISTS tr_admins_updated_at ON admins;
CREATE TRIGGER tr_admins_updated_at BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 3. employees 테이블 수정
-- =====================================================

-- 로그인 아이디 (@ 앞부분)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- 비밀번호 해시 (employee_credentials 대신 직접 저장)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 마지막 로그인
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 로그인 실패 횟수
ALTER TABLE employees ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0;

-- 계정 잠금
ALTER TABLE employees ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- username 유니크 인덱스 (회사별 고유, 대소문자 구분 없음)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username_per_business 
ON employees(business_id, LOWER(username)) WHERE username IS NOT NULL;

-- =====================================================
-- 4. kiosk_devices 테이블 (신규 생성 또는 수정)
-- =====================================================

-- 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS kiosk_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  device_name VARCHAR(100) NOT NULL,
  device_code VARCHAR(20),
  location VARCHAR(200),
  description TEXT,
  ip_address INET,
  is_registered BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE kiosk_devices IS '키오스크 기기 정보';

-- 기존 테이블에 컬럼 추가 (있을 경우)
DO $$
BEGIN
  -- device_code 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'kiosk_devices' AND column_name = 'device_code') THEN
    ALTER TABLE kiosk_devices ADD COLUMN device_code VARCHAR(20);
  END IF;
  
  -- is_registered 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'kiosk_devices' AND column_name = 'is_registered') THEN
    ALTER TABLE kiosk_devices ADD COLUMN is_registered BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- last_connected_at 컬럼 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'kiosk_devices' AND column_name = 'last_connected_at') THEN
    ALTER TABLE kiosk_devices ADD COLUMN last_connected_at TIMESTAMPTZ;
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_business ON kiosk_devices(business_id);

-- device_code 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_kiosk_devices_device_code 
ON kiosk_devices(device_code) WHERE device_code IS NOT NULL;

-- RLS 활성화
ALTER TABLE kiosk_devices ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (개발용 - 모든 접근 허용)
DROP POLICY IF EXISTS "Allow all access to kiosk_devices" ON kiosk_devices;
CREATE POLICY "Allow all access to kiosk_devices" ON kiosk_devices FOR ALL USING (true);

-- 트리거
DROP TRIGGER IF EXISTS tr_kiosk_devices_updated_at ON kiosk_devices;
CREATE TRIGGER tr_kiosk_devices_updated_at BEFORE UPDATE ON kiosk_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 5. 함수: 랜덤 코드 생성
-- =====================================================

CREATE OR REPLACE FUNCTION generate_random_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_random_code IS '랜덤 코드 생성 (혼동하기 쉬운 문자 제외: 0, O, I, 1)';

-- =====================================================
-- 6. 함수: 초대코드 생성
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'INV-' || generate_random_code(8);
    SELECT EXISTS(SELECT 1 FROM businesses WHERE invite_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. 함수: 기기코드 생성
-- =====================================================

CREATE OR REPLACE FUNCTION generate_device_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'DEV-' || generate_random_code(8);
    SELECT EXISTS(SELECT 1 FROM kiosk_devices WHERE device_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. 기존 데모 데이터 업데이트
-- =====================================================

-- 기본 사업장에 회사코드와 초대코드 추가
UPDATE businesses 
SET 
  company_code = 'demo',
  invite_code = 'INV-DEMO0001'
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND company_code IS NULL;

-- 기존 시스템 설정의 비밀번호를 admins 테이블로 이전
-- admin1234의 해시값을 사용하여 기본 관리자 생성
INSERT INTO admins (business_id, username, password_hash, name, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'admin',
  ss.admin_password_hash,
  '관리자',
  'super_admin'
FROM system_settings ss
WHERE ss.business_id = '00000000-0000-0000-0000-000000000001'
  AND ss.admin_password_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM admins 
    WHERE business_id = '00000000-0000-0000-0000-000000000001' 
      AND LOWER(username) = 'admin'
  );

-- 기존 직원들에게 기본 username과 password 설정
-- username = employee_number, password = 1234 (해시)
UPDATE employees
SET 
  username = employee_number,
  password_hash = '$2a$10$rQEY7.3pX5Kj1vBpF8Q5h.gZ2Q1YfZm3M4Lm0nV6X8z9A0w2E4K6C'  -- 1234의 bcrypt 해시
WHERE business_id = '00000000-0000-0000-0000-000000000001'
  AND username IS NULL
  AND employee_number IS NOT NULL;

-- =====================================================
-- 9. RLS 정책 업데이트 (개발용 - 모든 접근 허용)
-- =====================================================

-- businesses
DROP POLICY IF EXISTS "Allow all access to businesses" ON businesses;
CREATE POLICY "Allow all access to businesses" ON businesses FOR ALL USING (true);

-- employees
DROP POLICY IF EXISTS "Allow all access to employees" ON employees;
CREATE POLICY "Allow all access to employees" ON employees FOR ALL USING (true);

-- =====================================================
-- 10. 뷰: 관리자 로그인 정보 (이메일 형식)
-- =====================================================

CREATE OR REPLACE VIEW admin_login_view AS
SELECT 
  a.id,
  a.business_id,
  a.username,
  LOWER(a.username) || '@' || LOWER(b.company_code) || '.com' AS email,
  a.password_hash,
  a.name,
  a.role,
  a.is_active,
  a.failed_login_count,
  a.locked_until,
  b.name AS business_name,
  b.company_code
FROM admins a
JOIN businesses b ON a.business_id = b.id;

-- =====================================================
-- 11. 뷰: 직원 로그인 정보 (이메일 형식)
-- =====================================================

CREATE OR REPLACE VIEW employee_login_view AS
SELECT 
  e.id,
  e.business_id,
  e.username,
  LOWER(e.username) || '@' || LOWER(b.company_code) || '.com' AS email,
  e.password_hash,
  e.name,
  e.employee_number,
  e.department,
  e.position,
  e.is_active,
  e.failed_login_count,
  e.locked_until,
  b.name AS business_name,
  b.company_code
FROM employees e
JOIN businesses b ON e.business_id = b.id
WHERE e.username IS NOT NULL;

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '멀티사업장 마이그레이션이 완료되었습니다.';
  RAISE NOTICE '기본 사업장 정보:';
  RAISE NOTICE '  - 회사코드: demo';
  RAISE NOTICE '  - 초대코드: INV-DEMO0001';
  RAISE NOTICE '  - 관리자 로그인: admin@demo.com';
END $$;
