-- =====================================================
-- 메신저 파일 저장소 설정
-- =====================================================

-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messenger-files',
  'messenger-files',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책 설정: 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messenger-files');

-- Storage 정책 설정: 모든 사용자가 파일 읽기 가능 (public bucket)
CREATE POLICY "Anyone can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'messenger-files');

-- Storage 정책 설정: 업로드한 사용자만 삭제 가능
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'messenger-files' AND auth.uid()::text = owner);

-- messenger_files 테이블에 파일 정보 저장하는 함수 업데이트
CREATE OR REPLACE FUNCTION log_messenger_file()
RETURNS TRIGGER AS $$
DECLARE
  msg_id UUID;
  conv_id UUID;
  sender_id UUID;
BEGIN
  -- 파일 경로에서 정보 추출 (예: conversations/{conv_id}/messages/{msg_id}/{filename})
  -- 실제로는 메시지 전송 시 messages 테이블의 attachments 필드에 저장됨
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
