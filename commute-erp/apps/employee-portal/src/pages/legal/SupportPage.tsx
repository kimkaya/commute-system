// =====================================================
// 관리자에게 문의하기 페이지
// =====================================================

import { useState } from 'react';
import { ArrowLeft, Send, ChevronDown, ChevronUp, Clock, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { createInquiry } from '../../lib/api';

interface FAQItem {
  question: string;
  answer: string;
}

const faqList: FAQItem[] = [
  {
    question: '출퇴근 기록이 누락되었어요. 어떻게 해야 하나요?',
    answer: '아래 문의하기 기능을 통해 누락된 날짜와 출퇴근 시간을 관리자에게 알려주세요. 확인 후 수정해 드립니다.',
  },
  {
    question: '비밀번호를 잊어버렸어요.',
    answer: '아래 문의하기를 통해 비밀번호 초기화를 요청해 주세요. 확인 후 초기화해 드립니다.',
  },
  {
    question: '휴가 신청은 어떻게 하나요?',
    answer: '하단 메뉴에서 "휴가" 탭을 선택하신 후, "휴가 신청" 버튼을 눌러 휴가 종류, 기간, 사유를 입력하시면 됩니다.',
  },
  {
    question: '급여 명세서는 어디서 확인하나요?',
    answer: '"급여" 탭에서 월별 급여 명세서를 확인하실 수 있습니다. 급여 지급일 이후에 해당 월의 명세서가 업데이트됩니다.',
  },
  {
    question: '개인정보를 수정하고 싶어요.',
    answer: '이름, 사번, 부서 등 주요 정보 변경은 아래 문의하기를 통해 요청해 주세요.',
  },
];

const inquiryTypes = [
  { value: 'attendance', label: '출퇴근 기록 문의' },
  { value: 'leave', label: '휴가 관련 문의' },
  { value: 'payroll', label: '급여 관련 문의' },
  { value: 'password', label: '비밀번호 초기화 요청' },
  { value: 'info_change', label: '개인정보 변경 요청' },
  { value: 'other', label: '기타 문의' },
];

export function SupportPage() {
  const navigate = useNavigate();
  const { employee } = useAuthStore();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [inquiryType, setInquiryType] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inquiryType) {
      toast.error('문의 유형을 선택해주세요');
      return;
    }
    if (!inquiryContent.trim()) {
      toast.error('문의 내용을 입력해주세요');
      return;
    }
    if (inquiryContent.trim().length < 10) {
      toast.error('문의 내용을 10자 이상 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createInquiry({
        employee_id: employee?.id || '',
        employee_name: employee?.name || '',
        employee_number: employee?.employee_number || '',
        department: employee?.department || '',
        type: inquiryType,
        content: inquiryContent.trim(),
      });

      if (result.success) {
        setSubmitted(true);
        toast.success('문의가 접수되었습니다');
      } else {
        toast.error(result.error || '문의 접수에 실패했습니다');
      }
    } catch (error) {
      console.error('Inquiry submit error:', error);
      toast.error('문의 접수 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewInquiry = () => {
    setSubmitted(false);
    setInquiryType('');
    setInquiryContent('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="ml-2 text-lg font-semibold text-gray-900">관리자에게 문의하기</h1>
        </div>
      </header>

      {/* 내용 */}
      <div className="p-4 space-y-4">
        {/* 문의하기 폼 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">문의하기</h2>
          
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">문의가 접수되었습니다</h3>
              <p className="text-sm text-gray-500 mb-6">
                관리자 확인 후 빠른 시일 내에 답변 드리겠습니다.
              </p>
              <button
                onClick={handleNewInquiry}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                새 문의하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문의 유형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                >
                  <option value="">선택해주세요</option>
                  {inquiryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문의 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={inquiryContent}
                  onChange={(e) => setInquiryContent(e.target.value)}
                  placeholder="문의하실 내용을 자세히 작성해주세요.&#10;&#10;예) 2024년 1월 15일 출근 기록이 누락되었습니다. 09:00에 출근했습니다."
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {inquiryContent.length}/500자
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    접수 중...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    문의 접수하기
                  </>
                )}
              </button>
            </form>
          )}

          {/* 안내 */}
          {!submitted && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} />
                <span>평일 기준 1~2일 내 답변 드립니다</span>
              </div>
            </div>
          )}
        </div>

        {/* 자주 묻는 질문 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">자주 묻는 질문</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {faqList.map((faq, index) => (
              <div key={index}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.question}</span>
                  {expandedIndex === index ? (
                    <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedIndex === index && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 앱 정보 */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">출퇴근 관리 시스템 v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
