// =====================================================
// 사내 메신저 페이지 (직원 포털용)
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Plus, 
  Smile,
  Image as ImageIcon,
  Users,
  Edit2,
  Trash2,
  Reply,
  Check,
  X,
  ChevronLeft,
  MoreVertical,
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
  getEmployeeList,
} from '../../lib/api';
import type { Conversation, Message, Employee } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';

// 날짜 포맷 함수
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return '어제 ' + format(date, 'HH:mm');
  return format(date, 'M/d HH:mm');
}

function formatConversationTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return '어제';
  return format(date, 'M/d');
}

// 이모지 피커
const QUICK_EMOJIS = ['👍', '❤️', '😀', '😮', '😢', '🎉'];

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border p-2 flex gap-1 z-50">
      {QUICK_EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }} className="w-8 h-8 text-lg hover:bg-gray-100 rounded">
          {emoji}
        </button>
      ))}
    </div>
  );
}

// 채팅방 목록 아이템
function ConversationItem({
  conversation, isActive, currentUserId, onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const getConversationName = () => {
    if (conversation.type === 'direct') {
      const other = conversation.participants?.find(p => p.employee_id !== currentUserId);
      return other?.employee?.name || '알 수 없음';
    }
    return conversation.name || '그룹 채팅';
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b ${isActive ? 'bg-primary-50' : ''}`}
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
        conversation.type === 'group' ? 'bg-green-500' : 'bg-primary-500'
      }`}>
        {conversation.type === 'group' ? <Users size={18} /> : getConversationName().charAt(0)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 truncate text-sm">{getConversationName()}</span>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
            {formatConversationTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-500 truncate">
            {conversation.last_message_preview || '메시지가 없습니다'}
          </span>
          {(conversation.unread_count || 0) > 0 && (
            <span className="ml-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
              {conversation.unread_count! > 9 ? '9+' : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// 메시지 아이템
function MessageItem({
  message, isOwnMessage, showSender, onReply, onEdit, onDelete, onReaction,
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

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{message.content}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
      onTouchStart={() => setShowActions(true)}
    >
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[80%]`}>
        {!isOwnMessage && showSender && (
          <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
            {message.sender?.name?.charAt(0) || '?'}
          </div>
        )}
        {!isOwnMessage && !showSender && <div className="w-7" />}

        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {!isOwnMessage && showSender && (
            <span className="text-xs text-gray-500 mb-1 ml-1">{message.sender?.name}</span>
          )}

          <div className="relative">
            <div className={`px-3 py-2 rounded-2xl text-sm ${
              isOwnMessage ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-900'
            } ${message.is_edited ? 'pb-4' : ''}`}>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {message.is_edited && (
                <span className={`absolute bottom-1 right-2 text-[10px] ${isOwnMessage ? 'text-primary-200' : 'text-gray-400'}`}>
                  (수정됨)
                </span>
              )}
            </div>

            {showActions && (
              <div className={`absolute top-0 ${isOwnMessage ? 'right-full mr-1' : 'left-full ml-1'} flex items-center gap-0.5`}>
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-1 bg-white rounded-full shadow hover:bg-gray-100">
                  <Smile size={12} className="text-gray-500" />
                </button>
                <button onClick={onReply} className="p-1 bg-white rounded-full shadow hover:bg-gray-100">
                  <Reply size={12} className="text-gray-500" />
                </button>
                {isOwnMessage && (
                  <>
                    <button onClick={onEdit} className="p-1 bg-white rounded-full shadow hover:bg-gray-100">
                      <Edit2 size={12} className="text-gray-500" />
                    </button>
                    <button onClick={onDelete} className="p-1 bg-white rounded-full shadow hover:bg-gray-100">
                      <Trash2 size={12} className="text-gray-500" />
                    </button>
                  </>
                )}
              </div>
            )}

            {showEmoji && (
              <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'}`}>
                <EmojiPicker onSelect={onReaction} onClose={() => setShowEmoji(false)} />
              </div>
            )}
          </div>

          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {Object.entries(
                message.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {} as Record<string, number>)
              ).map(([emoji, count]) => (
                <span key={emoji} className="px-1.5 py-0.5 bg-gray-100 rounded-full text-xs">
                  {emoji} {count > 1 && count}
                </span>
              ))}
            </div>
          )}

          <span className={`text-[10px] text-gray-400 mt-0.5 ${isOwnMessage ? 'mr-1' : 'ml-1'}`}>
            {formatMessageTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// 새 대화 모달
function NewConversationModal({
  isOpen, onClose, onCreateDirect, onCreateGroup, employees, currentUserId,
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
    e.id !== currentUserId && e.is_active && e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateGroup = () => {
    if (!groupName.trim()) { toast.error('그룹 이름을 입력하세요'); return; }
    if (selectedMembers.length < 2) { toast.error('최소 2명 이상 선택하세요'); return; }
    onCreateGroup(groupName, selectedMembers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">{mode === 'select' ? '새 대화' : '그룹 만들기'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="flex border-b">
          <button onClick={() => setMode('select')} className={`flex-1 py-2 text-sm font-medium ${mode === 'select' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
            1:1 대화
          </button>
          <button onClick={() => setMode('group')} className={`flex-1 py-2 text-sm font-medium ${mode === 'group' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
            그룹 채팅
          </button>
        </div>

        {mode === 'group' && (
          <div className="p-3 border-b">
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="그룹 이름"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
        )}

        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="직원 검색..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEmployees.map(emp => (
            <button
              key={emp.id}
              onClick={() => {
                if (mode === 'select') onCreateDirect(emp.id);
                else setSelectedMembers(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]);
              }}
              className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b"
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm">
                {emp.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                <p className="text-xs text-gray-500">{emp.department || '부서 미지정'}</p>
              </div>
              {mode === 'group' && (
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedMembers.includes(emp.id) ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                }`}>
                  {selectedMembers.includes(emp.id) && <Check size={14} className="text-white" />}
                </div>
              )}
            </button>
          ))}
        </div>

        {mode === 'group' && (
          <div className="p-3 border-t">
            <button onClick={handleCreateGroup} className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 text-sm">
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
  const { employee } = useAuthStore();
  const currentUserId = employee?.id || '';
  
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
  const [showChatView, setShowChatView] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations(currentUserId);
      setConversations(data);
      setSetupRequired(false);
    } catch (error: unknown) {
      console.error('Failed to load conversations:', error);
      // 테이블이 없는 경우 (401/404 오류)
      if (error && typeof error === 'object' && 'code' in error) {
        setSetupRequired(true);
      }
    }
  }, [currentUserId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      await markMessagesAsRead(conversationId, currentUserId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadConversations();
      try {
        const emps = await getEmployeeList();
        setEmployees(emps);
      } catch (e) {
        console.error('Failed to load employees:', e);
      }
      setIsLoading(false);
    };
    init();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversation) loadMessages(activeConversation.id);
  }, [activeConversation, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeConversation) return;
    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversation.id}`,
      }, async (payload) => {
        const newMessage = payload.new as Message;
        const { data: sender } = await supabase.from('employees').select('*').eq('id', newMessage.sender_id).limit(1);
        setMessages(prev => [...prev, { ...newMessage, sender: sender?.[0] }]);
        if (newMessage.sender_id !== currentUserId) {
          await markMessagesAsRead(activeConversation.id, currentUserId);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, currentUserId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || isSending) return;
    setIsSending(true);
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, messageInput);
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: messageInput, is_edited: true } : m));
        setEditingMessage(null);
        toast.success('메시지 수정됨');
      } else {
        await sendMessage(activeConversation.id, currentUserId, messageInput);
      }
      setMessageInput('');
      loadConversations();
    } catch (error) {
      toast.error('전송 실패');
    }
    setIsSending(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('메시지를 삭제할까요?')) return;
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('삭제됨');
    } catch { toast.error('삭제 실패'); }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleMessageReaction(messageId, currentUserId, emoji);
      loadMessages(activeConversation!.id);
    } catch (error) { console.error('Failed to add reaction:', error); }
  };

  const handleCreateDirect = async (employeeId: string) => {
    try {
      const conv = await getOrCreateDirectConversation(currentUserId, employeeId);
      setActiveConversation(conv);
      setShowNewConversation(false);
      await loadConversations();
      setShowChatView(true);
    } catch { toast.error('대화 생성 실패'); }
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    try {
      const conv = await createGroupConversation(name, memberIds, currentUserId);
      setActiveConversation(conv);
      setShowNewConversation(false);
      await loadConversations();
      setShowChatView(true);
      toast.success('그룹 생성됨');
    } catch { toast.error('그룹 생성 실패'); }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'direct') {
      const other = conv.participants?.find(p => p.employee_id !== currentUserId);
      return other?.employee?.name || '알 수 없음';
    }
    return conv.name || '그룹 채팅';
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    return getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // 메신저 테이블이 없는 경우
  if (setupRequired) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500 p-8">
        <MessageSquare size={64} className="mb-4 opacity-30" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">메신저 준비 중</h2>
        <p className="text-center text-sm mb-4">
          메신저 기능을 사용하기 위해<br />
          관리자의 설정이 필요합니다.
        </p>
        <p className="text-xs text-gray-400">
          관리자에게 문의해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-white rounded-xl shadow-sm overflow-hidden -mx-4 md:mx-0">
      {/* 채팅방 목록 */}
      <div className={`${showChatView ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r bg-white`}>
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="text-primary-500" size={18} />
              메신저
            </h1>
            <button onClick={() => setShowNewConversation(true)} className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="검색..."
              className="w-full pl-9 pr-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <MessageSquare size={40} className="mb-2 opacity-50" />
              <p className="text-sm">대화가 없습니다</p>
              <button onClick={() => setShowNewConversation(true)} className="mt-2 text-primary-500 hover:underline text-sm">
                새 대화 시작
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversation?.id === conv.id}
                currentUserId={currentUserId}
                onClick={() => { setActiveConversation(conv); setShowChatView(true); }}
              />
            ))
          )}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className={`${showChatView ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-50`}>
        {activeConversation ? (
          <>
            <div className="p-3 border-b flex items-center gap-3 bg-white">
              <button onClick={() => setShowChatView(false)} className="md:hidden p-1 hover:bg-gray-100 rounded">
                <ChevronLeft size={22} />
              </button>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold ${
                activeConversation.type === 'group' ? 'bg-green-500' : 'bg-primary-500'
              }`}>
                {activeConversation.type === 'group' ? <Users size={16} /> : getConversationName(activeConversation).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm truncate">{getConversationName(activeConversation)}</h2>
                <p className="text-xs text-gray-500">
                  {activeConversation.type === 'group' ? `${activeConversation.participants?.length || 0}명` : '온라인'}
                </p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {messages.map((msg, idx) => {
                const prevMsg = messages[idx - 1];
                const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id ||
                  new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 60000;
                return (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.sender_id === currentUserId}
                    showSender={showSender}
                    onReply={() => { setMessageInput(`@${msg.sender?.name} `); inputRef.current?.focus(); }}
                    onEdit={() => { setEditingMessage(msg); setMessageInput(msg.content || ''); inputRef.current?.focus(); }}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    onReaction={(emoji) => handleReaction(msg.id, emoji)}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {editingMessage && (
              <div className="px-3 py-2 bg-yellow-50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Edit2 size={12} className="text-yellow-600" />
                  <span className="text-yellow-600">메시지 수정 중</span>
                </div>
                <button onClick={() => { setEditingMessage(null); setMessageInput(''); }} className="text-gray-500">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="p-3 border-t bg-white">
              <div className="flex items-end gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
                  <ImageIcon size={18} className="text-gray-500" />
                </button>
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="메시지 입력..."
                  rows={1}
                  className="flex-1 px-3 py-2 bg-gray-100 rounded-2xl resize-none text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  style={{ minHeight: '38px', maxHeight: '100px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex-shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageSquare size={48} className="mb-3 opacity-30" />
            <h3 className="font-medium mb-1">채팅방을 선택하세요</h3>
            <p className="text-sm text-gray-400">대화를 시작하거나 채팅방을 선택하세요</p>
            <button onClick={() => setShowNewConversation(true)} className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600">
              새 대화 시작
            </button>
          </div>
        )}
      </div>

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
