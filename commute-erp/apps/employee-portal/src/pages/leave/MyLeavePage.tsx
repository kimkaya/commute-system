// =====================================================
// 휴가 신청/조회 페이지
// =====================================================

import { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  X,
  Calendar,
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

// 휴가 유형
const leaveTypes = [
  { id: 'annual', label: '연차', color: 'blue' },
  { id: 'half_am', label: '오전반차', color: 'cyan' },
  { id: 'half_pm', label: '오후반차', color: 'cyan' },
  { id: 'sick', label: '병가', color: 'red' },
  { id: 'special', label: '경조사', color: 'purple' },
  { id: 'official', label: '공가', color: 'green' },
];

// 휴가 잔여 현황
const leaveBalance = {
  annual: { total: 15, used: 8, remaining: 7 },
  sick: { total: 3, used: 1, remaining: 2 },
};

// 데모 휴가 신청 내역
const mockLeaveRequests = [
  {
    id: '1',
    type: 'annual',
    typeLabel: '연차',
    startDate: '2024-02-15',
    endDate: '2024-02-16',
    days: 2,
    reason: '개인 사유',
    status: 'approved',
    approver: '김부장',
    approvedAt: '2024-02-01',
    createdAt: '2024-01-28',
  },
  {
    id: '2',
    type: 'half_am',
    typeLabel: '오전반차',
    startDate: '2024-02-20',
    endDate: '2024-02-20',
    days: 0.5,
    reason: '병원 진료',
    status: 'pending',
    approver: null,
    approvedAt: null,
    createdAt: '2024-02-05',
  },
  {
    id: '3',
    type: 'annual',
    typeLabel: '연차',
    startDate: '2024-01-08',
    endDate: '2024-01-08',
    days: 1,
    reason: '개인 사유',
    status: 'approved',
    approver: '김부장',
    approvedAt: '2024-01-05',
    createdAt: '2024-01-03',
  },
  {
    id: '4',
    type: 'annual',
    typeLabel: '연차',
    startDate: '2024-01-02',
    endDate: '2024-01-05',
    days: 4,
    reason: '가족여행',
    status: 'rejected',
    approver: '김부장',
    approvedAt: '2023-12-28',
    rejectReason: '연초 업무로 인해 휴가 사용 불가',
    createdAt: '2023-12-25',
  },
];

type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

const statusConfig: Record<
  LeaveStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: '승인대기',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: <Clock size={14} />,
  },
  approved: {
    label: '승인완료',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: <CheckCircle size={14} />,
  },
  rejected: {
    label: '반려',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: <XCircle size={14} />,
  },
  cancelled: {
    label: '취소',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: <AlertCircle size={14} />,
  },
};

export function MyLeavePage() {
  const { employee } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      toast.error('시작일을 선택해주세요');
      return;
    }
    if (!endDate) {
      toast.error('종료일을 선택해주세요');
      return;
    }
    if (!reason.trim()) {
      toast.error('사유를 입력해주세요');
      return;
    }

    // TODO: API 연동
    toast.success('휴가가 신청되었습니다');
    setShowModal(false);
    setSelectedType('annual');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
    if (selectedType === 'half_am' || selectedType === 'half_pm') {
      return 0.5;
    }
    return days;
  };

  return (
    <div className="py-4 space-y-4">
      {/* 휴가 잔여 현황 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">휴가 잔여 현황</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />
            신청하기
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 연차 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-800">연차</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-blue-600">
                {leaveBalance.annual.remaining}
              </span>
              <span className="text-sm text-blue-400 mb-1">
                / {leaveBalance.annual.total}일
              </span>
            </div>
            <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${(leaveBalance.annual.used / leaveBalance.annual.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-blue-400 mt-1">
              사용: {leaveBalance.annual.used}일
            </p>
          </div>

          {/* 병가 */}
          <div className="bg-red-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-600" />
              <span className="text-sm font-medium text-red-800">병가</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-red-600">
                {leaveBalance.sick.remaining}
              </span>
              <span className="text-sm text-red-400 mb-1">/ {leaveBalance.sick.total}일</span>
            </div>
            <div className="mt-2 h-2 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{
                  width: `${(leaveBalance.sick.used / leaveBalance.sick.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-red-400 mt-1">사용: {leaveBalance.sick.used}일</p>
          </div>
        </div>
      </div>

      {/* 휴가 신청 내역 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">신청 내역</h3>
        <div className="space-y-3">
          {mockLeaveRequests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    statusConfig[request.status as LeaveStatus].bgColor
                  }`}
                >
                  <Calendar
                    size={18}
                    className={statusConfig[request.status as LeaveStatus].color}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {request.typeLabel}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        statusConfig[request.status as LeaveStatus].bgColor
                      } ${statusConfig[request.status as LeaveStatus].color}`}
                    >
                      {statusConfig[request.status as LeaveStatus].icon}
                      {statusConfig[request.status as LeaveStatus].label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(request.startDate), 'M.d', { locale: ko })}
                    {request.startDate !== request.endDate &&
                      ` ~ ${format(new Date(request.endDate), 'M.d', { locale: ko })}`}
                    {' '}({request.days}일)
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* 휴가 정책 안내 */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">휴가 정책 안내</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>- 연차는 입사일 기준으로 매년 발생합니다.</li>
          <li>- 휴가 신청은 최소 3일 전에 해주세요.</li>
          <li>- 반차는 4시간 단위로 사용 가능합니다.</li>
          <li>- 미사용 연차는 연말에 소멸됩니다.</li>
        </ul>
      </div>

      {/* 휴가 신청 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">휴가 신청</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* 휴가 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  휴가 유형
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {leaveTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedType === type.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 날짜 선택 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate || e.target.value > endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || format(new Date(), 'yyyy-MM-dd')}
                    disabled={selectedType === 'half_am' || selectedType === 'half_pm'}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              {/* 휴가 일수 */}
              {startDate && endDate && (
                <div className="p-3 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-700">
                    신청 일수: <span className="font-bold">{calculateDays()}일</span>
                  </p>
                </div>
              )}

              {/* 사유 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사유
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="휴가 사유를 입력해주세요"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  신청하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
