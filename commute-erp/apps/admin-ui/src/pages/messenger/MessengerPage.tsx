// =====================================================
// 사내 메신저 페이지
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Plus, 
  MoreVertical,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Phone,
  Video,
  Users,
  Pin,
  BellOff,
  LogOut,
  Edit2,
  Trash2,
  Reply,
  Check,
  CheckCheck,
  X,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  editMessage,
  toggleMessageReaction,
  createGroupConversation,
  getOrCreateDirectConversation,
  leaveConversation,
  togglePinConversation,
  toggleMuteConversation,
  getEmployees,
  getTotalUnreadCount,
  Conversation,
  Message,
  Employee,
} from '../../lib/api';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 날짜 포맷 함수
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return '어제 ' + format(date, 'HH:mm');
  }
  return format(date, 'M월 d일 HH:mm');
}

function formatConversationTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return '어제';
  }
  return format(date, 'M/d');
}

// 이모지 피커 컴포넌트
const QUICK_EMOJIS = ['👍', '❤️', '😀', '😮', '😢', '😡'];

function EmojiPicker({ 
  onSelect, 
  onClose 
}: { 
  onSelect: (emoji: string) => void; 
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border p-2 flex gap-1">
      {QUICK_EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-8 h-8 text-lg hover:bg-gray-100 rounded"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// 채팅방 목록 아이템
function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const getConversationName = () => {
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants?.find(
        p => p.employee_id !== currentUserId
      );
      return otherParticipant?.employee?.name || '알 수 없음';
    }
    return conversation.name || '그룹 채팅';
  };

  const getAvatarText = () => {
    const name = getConversationName();
    return name.charAt(0);
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-primary-50' : ''
      }`}
    >
      {/* 아바타 */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
        conversation.type === 'group' ? 'bg-green-500' : 'bg-primary-500'
      }`}>
        {conversation.type === 'group' ? (
          <Users size={20} />
        ) : (
          getAvatarText()
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 truncate">
            {getConversationName()}
          </span>
          <span className="text-xs text-gray-500">
            {formatConversationTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-sm text-gray-500 truncate">
            {conversation.last_message_preview || '메시지가 없습니다'}
          </span>
          {(conversation.unread_count || 0) > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// 메시지 아이템
function MessageItem({
  message,
  isOwnMessage,
  showSender,
  onReply,
  onEdit,
  onDelete,
  onReaction,
}: {
  message: Message;
  isOwnMessage: boolean;
  showSender: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReaction: (emoji: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  // 시스템 메시지
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmoji(false);
      }}
    >
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[70%]`}>
        {/* 아바타 (다른 사람 메시지만) */}
        {!isOwnMessage && showSender && (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
            {message.sender?.name?.charAt(0) || '?'}
          </div>
        )}
        {!isOwnMessage && !showSender && <div className="w-8" />}

        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {/* 발신자 이름 */}
          {!isOwnMessage && showSender && (
            <span className="text-xs text-gray-500 mb-1 ml-1">
              {message.sender?.name}
            </span>
          )}

          {/* 메시지 버블 */}
          <div className="relative">
            <div
              className={`px-4 py-2 rounded-2xl ${
                isOwnMessage
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              } ${message.is_edited ? 'pb-5' : ''}`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {message.is_edited && (
                <span className={`absolute bottom-1 right-2 text-[10px] ${
                  isOwnMessage ? 'text-primary-200' : 'text-gray-400'
                }`}>
                  (수정됨)
                </span>
              )}
            </div>

            {/* 액션 버튼 */}
            {showActions && (
              <div className={`absolute top-0 ${isOwnMessage ? 'right-full mr-1' : 'left-full ml-1'} flex items-center gap-1`}>
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <Smile size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={onReply}
                  className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <Reply size={14} className="text-gray-500" />
                </button>
                {isOwnMessage && (
                  <>
                    <button
                      onClick={onEdit}
                      className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      <Edit2 size={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={onDelete}
                      className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      <Trash2 size={14} className="text-gray-500" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* 이모지 피커 */}
            {showEmoji && (
              <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'}`}>
                <EmojiPicker
                  onSelect={onReaction}
                  onClose={() => setShowEmoji(false)}
                />
              </div>
            )}
          </div>

          {/* 반응 */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {Object.entries(
                message.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="px-1.5 py-0.5 bg-gray-100 rounded-full text-xs"
                >
                  {emoji} {count > 1 && count}
                </span>
              ))}
            </div>
          )}

          {/* 시간 */}
          <span className={`text-[10px] text-gray-400 mt-0.5 ${isOwnMessage ? 'mr-1' : 'ml-1'}`}>
            {formatMessageTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// 새 대화 생성 모달
function NewConversationModal({
  isOpen,
  onClose,
  onCreateDirect,
  onCreateGroup,
  employees,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateDirect: (employeeId: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  employees: Employee[];
  currentUserId: string;
}) {
  const [mode, setMode] = useState<'select' | 'group'>('select');
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUserId]);

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(e => 
    e.id !== currentUserId && 
    e.is_active &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast.error('그룹 이름을 입력하세요');
      return;
    }
    if (selectedMembers.length < 2) {
      toast.error('최소 2명 이상 선택하세요');
      return;
    }
    onCreateGroup(groupName, selectedMembers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {mode === 'select' ? '새 대화' : '그룹 채팅 만들기'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* 모드 선택 탭 */}
        <div className="flex border-b">
          <button
            onClick={() => setMode('select')}
            className={`flex-1 py-2 text-sm font-medium ${
              mode === 'select' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'
            }`}
          >
            1:1 대화
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-2 text-sm font-medium ${
              mode === 'group' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'
            }`}
          >
            그룹 채팅
          </button>
        </div>

        {/* 그룹 이름 입력 */}
        {mode === 'group' && (
          <div className="p-4 border-b">
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="그룹 이름"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* 검색 */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="직원 검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* 직원 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmployees.map(emp => (
            <button
              key={emp.id}
              onClick={() => {
                if (mode === 'select') {
                  onCreateDirect(emp.id);
                } else {
                  setSelectedMembers(prev =>
                    prev.includes(emp.id)
                      ? prev.filter(id => id !== emp.id)
                      : [...prev, emp.id]
                  );
                }
              }}
              className="w-full p-3 flex items-center gap-3 hover:bg-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                {emp.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{emp.name}</p>
                <p className="text-sm text-gray-500">{emp.department || '부서 미지정'}</p>
              </div>
              {mode === 'group' && (
                <div className={`w-5 h-5 rounded border-2 ${
                  selectedMembers.includes(emp.id)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-gray-300'
                }`}>
                  {selectedMembers.includes(emp.id) && (
                    <Check size={16} className="text-white" />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* 그룹 생성 버튼 */}
        {mode === 'group' && (
          <div className="p-4 border-t">
            <button
              onClick={handleCreateGroup}
              className="w-full py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
            >
              그룹 만들기 ({selectedMembers.length}명)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 메인 메신저 페이지
export function MessengerPage() {
  const { adminId } = useAuthStore();
  const currentUserId = adminId || '';
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 채팅방 목록 로드
  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations(currentUserId);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [currentUserId]);

  // 메시지 로드
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      await markMessagesAsRead(conversationId, currentUserId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentUserId]);

  // 초기 로드
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadConversations();
      const emps = await getEmployees({ is_active: true });
      setEmployees(emps);
      setIsLoading(false);
    };
    init();
  }, [loadConversations]);

  // 채팅방 선택 시 메시지 로드
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation, loadMessages]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Supabase Realtime 구독
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          // 발신자 정보 조회
          const { data: sender } = await supabase
            .from('employees')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMessage, sender }]);
          
          // 읽음 처리
          if (newMessage.sender_id !== currentUserId) {
            await markMessagesAsRead(activeConversation.id, currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, currentUserId]);

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, messageInput);
        setMessages(prev =>
          prev.map(m =>
            m.id === editingMessage.id
              ? { ...m, content: messageInput, is_edited: true }
              : m
          )
        );
        setEditingMessage(null);
        toast.success('메시지가 수정되었습니다');
      } else {
        await sendMessage(activeConversation.id, currentUserId, messageInput);
      }
      setMessageInput('');
      loadConversations(); // 목록 갱신
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('메시지 전송 실패');
    }
    setIsSending(false);
  };

  // 메시지 삭제
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('메시지를 삭제하시겠습니까?')) return;
    
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('메시지가 삭제되었습니다');
    } catch (error) {
      toast.error('삭제 실패');
    }
  };

  // 반응 추가
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleMessageReaction(messageId, currentUserId, emoji);
      loadMessages(activeConversation!.id);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // 1:1 대화 생성
  const handleCreateDirect = async (employeeId: string) => {
    try {
      const conv = await getOrCreateDirectConversation(currentUserId, employeeId);
      setActiveConversation(conv);
      setShowNewConversation(false);
      await loadConversations();
      setShowMobileChat(true);
    } catch (error) {
      toast.error('대화 생성 실패');
    }
  };

  // 그룹 생성
  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    try {
      const conv = await createGroupConversation(name, memberIds, currentUserId);
      setActiveConversation(conv);
      setShowNewConversation(false);
      await loadConversations();
      setShowMobileChat(true);
      toast.success('그룹이 생성되었습니다');
    } catch (error) {
      toast.error('그룹 생성 실패');
    }
  };

  // 채팅방 이름 가져오기
  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'direct') {
      const other = conv.participants?.find(p => p.employee_id !== currentUserId);
      return other?.employee?.name || '알 수 없음';
    }
    return conv.name || '그룹 채팅';
  };

  // 필터링된 채팅방
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = getConversationName(conv);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl shadow overflow-hidden">
      {/* 채팅방 목록 (사이드바) */}
      <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r`}>
        {/* 헤더 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="text-primary-500" size={20} />
              사내 메신저
            </h1>
            <button
              onClick={() => setShowNewConversation(true)}
              className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Plus size={18} />
            </button>
          </div>
          
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="채팅방 검색..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
          </div>
        </div>

        {/* 채팅방 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <MessageSquare size={48} className="mb-2 opacity-50" />
              <p>대화가 없습니다</p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="mt-2 text-primary-500 hover:underline"
              >
                새 대화 시작하기
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversation?.id === conv.id}
                currentUserId={currentUserId}
                onClick={() => {
                  setActiveConversation(conv);
                  setShowMobileChat(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {activeConversation ? (
          <>
            {/* 채팅 헤더 */}
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  activeConversation.type === 'group' ? 'bg-green-500' : 'bg-primary-500'
                }`}>
                  {activeConversation.type === 'group' ? (
                    <Users size={18} />
                  ) : (
                    getConversationName(activeConversation).charAt(0)
                  )}
                </div>
                <div>
                  <h2 className="font-bold">{getConversationName(activeConversation)}</h2>
                  <p className="text-xs text-gray-500">
                    {activeConversation.type === 'group' 
                      ? `${activeConversation.participants?.length || 0}명 참여중`
                      : '온라인'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Phone size={18} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Video size={18} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical size={18} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((msg, idx) => {
                const prevMsg = messages[idx - 1];
                const showSender = !prevMsg || 
                  prevMsg.sender_id !== msg.sender_id ||
                  new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 60000;
                
                return (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.sender_id === currentUserId}
                    showSender={showSender}
                    onReply={() => {
                      setMessageInput(`@${msg.sender?.name} `);
                      inputRef.current?.focus();
                    }}
                    onEdit={() => {
                      setEditingMessage(msg);
                      setMessageInput(msg.content || '');
                      inputRef.current?.focus();
                    }}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    onReaction={(emoji) => handleReaction(msg.id, emoji)}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 수정 모드 표시 */}
            {editingMessage && (
              <div className="px-4 py-2 bg-yellow-50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Edit2 size={14} className="text-yellow-600" />
                  <span className="text-yellow-600">메시지 수정 중</span>
                </div>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageInput('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* 메시지 입력 */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-end gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Paperclip size={20} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ImageIcon size={20} className="text-gray-500" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    rows={1}
                    className="w-full px-4 py-2 bg-gray-100 rounded-2xl resize-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Smile size={20} className="text-gray-500" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // 채팅방 미선택 상태
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageSquare size={64} className="mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">채팅방을 선택하세요</h3>
            <p className="text-sm">대화를 시작하거나 기존 채팅방을 선택하세요</p>
            <button
              onClick={() => setShowNewConversation(true)}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              새 대화 시작
            </button>
          </div>
        )}
      </div>

      {/* 새 대화 모달 */}
      <NewConversationModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onCreateDirect={handleCreateDirect}
        onCreateGroup={handleCreateGroup}
        employees={employees}
        currentUserId={currentUserId}
      />
    </div>
  );
}
