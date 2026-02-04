-- =====================================================
-- 사내 메신저 데이터베이스 스키마
-- 버전: 1.0
-- 생성일: 2025-01-28
-- =====================================================

-- =====================================================
-- 1. 채팅방 (Conversations)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel')),
  name TEXT,  -- 그룹/채널의 경우 이름
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE conversations IS '채팅방 (1:1, 그룹, 채널)';
COMMENT ON COLUMN conversations.type IS 'direct: 1:1 대화, group: 그룹 채팅, channel: 공개 채널';

-- =====================================================
-- 2. 채팅방 참여자 (Conversation Participants)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  nickname TEXT,  -- 채팅방 내 별명
  is_muted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  notification_settings JSONB DEFAULT '{"sound": true, "push": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, employee_id)
);

COMMENT ON TABLE conversation_participants IS '채팅방 참여자';

-- =====================================================
-- 3. 메시지 (Messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES employees(id),
  content TEXT,  -- 텍스트 메시지 내용
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'reply', 'forward')),
  
  -- 답장/전달 메시지의 경우
  reply_to_id UUID REFERENCES messages(id),
  forwarded_from_id UUID REFERENCES messages(id),
  
  -- 파일 첨부
  attachments JSONB DEFAULT '[]',  -- [{name, url, size, type}]
  
  -- 메시지 상태
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- 멘션
  mentions UUID[] DEFAULT '{}',  -- 멘션된 직원 ID 목록
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE messages IS '채팅 메시지';
COMMENT ON COLUMN messages.attachments IS '첨부 파일 목록 [{name, url, size, type}]';

-- =====================================================
-- 4. 메시지 읽음 상태 (Message Read Receipts)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, employee_id)
);

COMMENT ON TABLE message_read_receipts IS '메시지 읽음 확인';

-- =====================================================
-- 5. 메시지 반응 (Message Reactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,  -- 이모지 (예: "👍", "❤️", "😀")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, employee_id, emoji)
);

COMMENT ON TABLE message_reactions IS '메시지 반응 (이모지)';

-- =====================================================
-- 6. 메신저 파일 저장소 (첨부 파일 관리)
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  uploader_id UUID NOT NULL REFERENCES employees(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  thumbnail_url TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE messenger_files IS '메신저 첨부 파일';

-- =====================================================
-- 인덱스 생성
-- =====================================================

-- conversations
CREATE INDEX idx_conversations_business ON conversations(business_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- conversation_participants
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_employee ON conversation_participants(employee_id);
CREATE INDEX idx_participants_unread ON conversation_participants(employee_id, unread_count) WHERE unread_count > 0;

-- messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE is_deleted = FALSE;

-- message_read_receipts
CREATE INDEX idx_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_receipts_employee ON message_read_receipts(employee_id);

-- message_reactions
CREATE INDEX idx_reactions_message ON message_reactions(message_id);

-- messenger_files
CREATE INDEX idx_messenger_files_conversation ON messenger_files(conversation_id);
CREATE INDEX idx_messenger_files_message ON messenger_files(message_id);

-- =====================================================
-- Row Level Security (RLS) 정책
-- =====================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 트리거: updated_at 자동 업데이트
-- =====================================================

CREATE TRIGGER tr_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_conversation_participants_updated_at BEFORE UPDATE ON conversation_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 트리거: 새 메시지 시 채팅방 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- 채팅방의 마지막 메시지 정보 업데이트
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  -- 참여자들의 unread_count 증가 (발신자 제외)
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND employee_id != NEW.sender_id
    AND is_active = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =====================================================
-- 트리거: 메시지 읽음 시 unread_count 감소
-- =====================================================

CREATE OR REPLACE FUNCTION update_unread_on_read()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- 메시지의 conversation_id 가져오기
  SELECT conversation_id INTO v_conversation_id
  FROM messages
  WHERE id = NEW.message_id;
  
  -- 해당 참여자의 unread_count를 0으로 리셋
  -- (실제로는 마지막 읽은 시간 기준으로 계산해야 함)
  UPDATE conversation_participants
  SET 
    last_read_at = NOW(),
    unread_count = 0
  WHERE conversation_id = v_conversation_id
    AND employee_id = NEW.employee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_read_receipt_insert
  AFTER INSERT ON message_read_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_on_read();

-- =====================================================
-- Realtime 구독 설정 (Supabase)
-- =====================================================

-- messages 테이블에 대한 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
