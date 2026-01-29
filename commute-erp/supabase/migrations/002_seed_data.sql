-- =====================================================
-- 초기 시드 데이터
-- =====================================================

-- 기본 사업장이 없으면 생성
INSERT INTO businesses (id, name, business_number, settings) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '기본 사업장',
  '000-00-00000',
  '{"timezone": "Asia/Seoul"}'
) ON CONFLICT (id) DO NOTHING;

-- 시스템 설정
INSERT INTO system_settings (business_id, admin_password_hash, default_hourly_rate) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin1234', 10000)
ON CONFLICT (business_id) DO UPDATE SET admin_password_hash = 'admin1234';

-- =====================================================
-- 샘플 직원 데이터
-- =====================================================

INSERT INTO employees (id, business_id, employee_number, name, email, phone, department, position, hire_date, hourly_rate, salary_type, is_active)
VALUES 
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'EMP001', '김철수', 'kim@example.com', '010-1234-5678', '개발팀', '선임', '2023-03-15', 15000, 'hourly', true),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'EMP002', '이영희', 'lee@example.com', '010-2345-6789', '디자인팀', '주임', '2023-06-01', 12000, 'hourly', true),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'EMP003', '박지성', 'park@example.com', '010-3456-7890', '영업팀', '대리', '2022-11-20', 14000, 'hourly', true),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'EMP004', '최민수', 'choi@example.com', '010-4567-8901', '개발팀', '사원', '2024-01-08', 10000, 'hourly', true),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'EMP005', '정유진', 'jung@example.com', '010-5678-9012', '인사팀', '과장', '2021-05-10', 18000, 'hourly', true)
ON CONFLICT (business_id, employee_number) DO NOTHING;

-- =====================================================
-- 직원 인증 정보 (비밀번호: 1234)
-- =====================================================

INSERT INTO employee_credentials (employee_id, password_hash)
VALUES 
  ('00000000-0000-0000-0001-000000000001', '1234'),
  ('00000000-0000-0000-0001-000000000002', '1234'),
  ('00000000-0000-0000-0001-000000000003', '1234'),
  ('00000000-0000-0000-0001-000000000004', '1234'),
  ('00000000-0000-0000-0001-000000000005', '1234')
ON CONFLICT (employee_id) DO UPDATE SET password_hash = '1234';

-- =====================================================
-- 샘플 출퇴근 기록 (최근 7일)
-- =====================================================

INSERT INTO attendance_records (business_id, employee_id, date, check_in, check_out, check_in_method, check_out_method, status)
VALUES 
  -- 오늘
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', CURRENT_DATE, '08:55', NULL, 'face', NULL, 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', CURRENT_DATE, '09:02', NULL, 'password', NULL, 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', CURRENT_DATE, '09:15', NULL, 'face', NULL, 'active'),
  
  -- 어제
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', CURRENT_DATE - INTERVAL '1 day', '08:48', '18:15', 'face', 'face', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', CURRENT_DATE - INTERVAL '1 day', '08:55', '18:00', 'password', 'password', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', CURRENT_DATE - INTERVAL '1 day', '09:00', '19:30', 'face', 'face', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', CURRENT_DATE - INTERVAL '1 day', '08:58', '18:05', 'password', 'password', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000005', CURRENT_DATE - INTERVAL '1 day', '08:45', '18:00', 'face', 'face', 'active'),
  
  -- 이틀 전
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', CURRENT_DATE - INTERVAL '2 days', '09:05', '18:30', 'face', 'face', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', CURRENT_DATE - INTERVAL '2 days', '08:50', '17:45', 'password', 'password', 'active'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', CURRENT_DATE - INTERVAL '2 days', '08:55', '18:10', 'face', 'face', 'active')
ON CONFLICT (business_id, employee_id, date) DO NOTHING;

-- =====================================================
-- 샘플 휴가 데이터
-- =====================================================

INSERT INTO leaves (business_id, employee_id, type, start_date, end_date, duration, reason, status, requested_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'annual', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '8 days', 2, '개인 사유', 'pending', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 'half_am', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '3 days', 0.5, '병원 방문', 'pending', NOW()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 'sick', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '4 days', 2, '감기', 'approved', NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000005', 'annual', CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '16 days', 3, '해외여행', 'pending', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- 휴가 잔여 데이터
-- =====================================================

INSERT INTO leave_balances (business_id, employee_id, year, annual_total, annual_used)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 2025, 15, 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 2025, 15, 5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 2025, 15, 8),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', 2025, 11, 0),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000005', 2025, 18, 6)
ON CONFLICT (business_id, employee_id, year) DO NOTHING;

-- =====================================================
-- RLS 정책 (모든 테이블에 읽기 허용 - 개발용)
-- =====================================================

-- businesses
CREATE POLICY "Allow all access to businesses" ON businesses FOR ALL USING (true);

-- employees
CREATE POLICY "Allow all access to employees" ON employees FOR ALL USING (true);

-- employee_face_templates
CREATE POLICY "Allow all access to employee_face_templates" ON employee_face_templates FOR ALL USING (true);

-- employee_credentials
CREATE POLICY "Allow all access to employee_credentials" ON employee_credentials FOR ALL USING (true);

-- attendance_records
CREATE POLICY "Allow all access to attendance_records" ON attendance_records FOR ALL USING (true);

-- leaves
CREATE POLICY "Allow all access to leaves" ON leaves FOR ALL USING (true);

-- leave_balances
CREATE POLICY "Allow all access to leave_balances" ON leave_balances FOR ALL USING (true);

-- schedules
CREATE POLICY "Allow all access to schedules" ON schedules FOR ALL USING (true);

-- holidays
CREATE POLICY "Allow all access to holidays" ON holidays FOR ALL USING (true);

-- payroll_periods
CREATE POLICY "Allow all access to payroll_periods" ON payroll_periods FOR ALL USING (true);

-- payroll_runs
CREATE POLICY "Allow all access to payroll_runs" ON payroll_runs FOR ALL USING (true);

-- payroll_lines
CREATE POLICY "Allow all access to payroll_lines" ON payroll_lines FOR ALL USING (true);

-- compliance_checks
CREATE POLICY "Allow all access to compliance_checks" ON compliance_checks FOR ALL USING (true);

-- backups
CREATE POLICY "Allow all access to backups" ON backups FOR ALL USING (true);

-- audit_logs
CREATE POLICY "Allow all access to audit_logs" ON audit_logs FOR ALL USING (true);

-- notifications
CREATE POLICY "Allow all access to notifications" ON notifications FOR ALL USING (true);

-- system_settings
CREATE POLICY "Allow all access to system_settings" ON system_settings FOR ALL USING (true);
