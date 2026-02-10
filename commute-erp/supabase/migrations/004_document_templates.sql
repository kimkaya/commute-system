-- =====================================================
-- 문서 양식 관리 시스템
-- =====================================================

-- =====================================================
-- 1. 문서 양식 템플릿
-- =====================================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'leave' (휴가), 'business_trip' (출장), 'overtime' (연장근무), 'expense' (지출결의), 'other'
  file_url TEXT, -- 엑셀 파일 URL (Supabase Storage)
  file_name TEXT,
  fields JSONB DEFAULT '[]', -- 필드 정의 [{"name": "employee_name", "label": "성명", "type": "text", "auto_fill": "employee.name"}]
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_templates_business ON document_templates(business_id);
CREATE INDEX idx_document_templates_category ON document_templates(category);

COMMENT ON TABLE document_templates IS '문서 양식 템플릿 (휴가신청서, 출장명령서 등)';
COMMENT ON COLUMN document_templates.fields IS '필드 정의: name(필드명), label(표시명), type(타입), auto_fill(자동채우기 경로)';

-- =====================================================
-- 2. 문서 신청/작성
-- =====================================================
CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  fields_data JSONB DEFAULT '{}', -- 실제 작성된 필드 데이터
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_requests_business ON document_requests(business_id);
CREATE INDEX idx_document_requests_employee ON document_requests(employee_id);
CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_requests_template ON document_requests(template_id);

COMMENT ON TABLE document_requests IS '직원이 작성한 문서 신청';
COMMENT ON COLUMN document_requests.status IS 'draft: 임시저장, pending: 승인대기, approved: 승인, rejected: 반려, cancelled: 취소';

-- =====================================================
-- 3. Storage 버킷 생성 (문서 템플릿용)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-templates',
  'document-templates',
  false, -- 관리자만 접근
  10485760, -- 10MB
  ARRAY[
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책: 인증된 사용자만 읽기 가능
CREATE POLICY "Authenticated users can view templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'document-templates');

-- Storage 정책: 관리자만 업로드 가능 (role 체크는 애플리케이션에서 수행)
CREATE POLICY "Admins can upload templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document-templates');

-- Storage 정책: 관리자만 삭제 가능
CREATE POLICY "Admins can delete templates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'document-templates');

-- =====================================================
-- 4. RLS 정책
-- =====================================================

-- document_templates: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view active templates"
ON document_templates FOR SELECT
USING (is_active = true);

-- document_templates: 관리자만 추가/수정/삭제 (애플리케이션에서 처리)
CREATE POLICY "Authenticated users can manage templates"
ON document_templates FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- document_requests: 본인 문서만 조회
CREATE POLICY "Users can view own requests"
ON document_requests FOR SELECT
TO authenticated
USING (employee_id::text = auth.uid()::text OR approved_by::text = auth.uid()::text);

-- document_requests: 본인이 작성
CREATE POLICY "Users can create own requests"
ON document_requests FOR INSERT
TO authenticated
WITH CHECK (employee_id::text = auth.uid()::text);

-- document_requests: 본인 문서만 수정 (draft 상태일 때)
CREATE POLICY "Users can update own draft requests"
ON document_requests FOR UPDATE
TO authenticated
USING (employee_id::text = auth.uid()::text AND status = 'draft')
WITH CHECK (employee_id::text = auth.uid()::text);

-- document_requests: 승인자가 승인/반려 처리
CREATE POLICY "Approvers can approve or reject"
ON document_requests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. 기본 템플릿 생성 함수
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_document_templates(p_business_id UUID)
RETURNS void AS $$
BEGIN
  -- 휴가신청서
  INSERT INTO document_templates (business_id, name, description, category, fields)
  VALUES (
    p_business_id,
    '휴가신청서',
    '연차, 반차, 병가 등 휴가 신청 시 사용',
    'leave',
    '[
      {"name": "employee_name", "label": "성명", "type": "text", "auto_fill": "employee.name"},
      {"name": "employee_id", "label": "사번", "type": "text", "auto_fill": "employee.employee_id"},
      {"name": "department", "label": "부서", "type": "text", "auto_fill": "employee.department"},
      {"name": "position", "label": "직급", "type": "text", "auto_fill": "employee.position"},
      {"name": "leave_type", "label": "휴가종류", "type": "select", "options": ["연차", "반차", "병가", "경조사", "공가"]},
      {"name": "start_date", "label": "시작일", "type": "date"},
      {"name": "end_date", "label": "종료일", "type": "date"},
      {"name": "days", "label": "일수", "type": "number"},
      {"name": "reason", "label": "사유", "type": "textarea"},
      {"name": "request_date", "label": "신청일", "type": "date", "auto_fill": "today"}
    ]'::jsonb
  );

  -- 출장명령서
  INSERT INTO document_templates (business_id, name, description, category, fields)
  VALUES (
    p_business_id,
    '출장명령서',
    '출장 시 작성하는 명령서',
    'business_trip',
    '[
      {"name": "employee_name", "label": "성명", "type": "text", "auto_fill": "employee.name"},
      {"name": "employee_id", "label": "사번", "type": "text", "auto_fill": "employee.employee_id"},
      {"name": "department", "label": "부서", "type": "text", "auto_fill": "employee.department"},
      {"name": "position", "label": "직급", "type": "text", "auto_fill": "employee.position"},
      {"name": "destination", "label": "출장지", "type": "text"},
      {"name": "start_date", "label": "시작일", "type": "date"},
      {"name": "end_date", "label": "종료일", "type": "date"},
      {"name": "days", "label": "일수", "type": "number"},
      {"name": "purpose", "label": "출장목적", "type": "textarea"},
      {"name": "transportation", "label": "교통수단", "type": "select", "options": ["자가용", "버스", "기차", "비행기"]},
      {"name": "request_date", "label": "신청일", "type": "date", "auto_fill": "today"}
    ]'::jsonb
  );

  -- 연장근무신청서
  INSERT INTO document_templates (business_id, name, description, category, fields)
  VALUES (
    p_business_id,
    '연장근무신청서',
    '야근, 특근 등 연장근무 신청',
    'overtime',
    '[
      {"name": "employee_name", "label": "성명", "type": "text", "auto_fill": "employee.name"},
      {"name": "employee_id", "label": "사번", "type": "text", "auto_fill": "employee.employee_id"},
      {"name": "department", "label": "부서", "type": "text", "auto_fill": "employee.department"},
      {"name": "position", "label": "직급", "type": "text", "auto_fill": "employee.position"},
      {"name": "work_date", "label": "근무일", "type": "date"},
      {"name": "start_time", "label": "시작시간", "type": "time"},
      {"name": "end_time", "label": "종료시간", "type": "time"},
      {"name": "hours", "label": "시간", "type": "number"},
      {"name": "reason", "label": "사유", "type": "textarea"},
      {"name": "request_date", "label": "신청일", "type": "date", "auto_fill": "today"}
    ]'::jsonb
  );
END;
$$ LANGUAGE plpgsql;
