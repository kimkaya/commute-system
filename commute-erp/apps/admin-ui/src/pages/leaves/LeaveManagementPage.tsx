// =====================================================
// 휴가 승인 관리 페이지
// =====================================================

import { useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

// 휴가 신청 타입 정의
interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  type: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  leaveBalance: { total: number; used: number; remaining: number };
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectReason?: string;
}

// 데모 휴가 신청 데이터
const mockLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: '홍길동',
    employeeNumber: 'EMP001',
    department: '개발팀',
    type: 'annual',
    typeLabel: '연차',
    startDate: '2024-02-15',
    endDate: '2024-02-16',
    days: 2,
    reason: '개인 사유로 인한 휴가 신청합니다.',
    status: 'pending',
    createdAt: '2024-02-01T09:30:00',
    leaveBalance: { total: 15, used: 8, remaining: 7 },
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: '김영희',
    employeeNumber: 'EMP002',
    department: '영업팀',
    type: 'half_am',
    typeLabel: '오전반차',
    startDate: '2024-02-20',
    endDate: '2024-02-20',
    days: 0.5,
    reason: '병원 진료',
    status: 'pending',
    createdAt: '2024-02-05T14:20:00',
    leaveBalance: { total: 15, used: 5, remaining: 10 },
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: '박철수',
    employeeNumber: 'EMP003',
    department: '개발팀',
    type: 'sick',
    typeLabel: '병가',
    startDate: '2024-02-08',
    endDate: '2024-02-09',
    days: 2,
    reason: '감기 몸살로 인한 병가 신청',
    status: 'approved',
    approvedAt: '2024-02-07T10:00:00',
    approvedBy: '이부장',
    createdAt: '2024-02-06T16:45:00',
    leaveBalance: { total: 3, used: 2, remaining: 1 },
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: '이민수',
    employeeNumber: 'EMP004',
    department: '인사팀',
    type: 'annual',
    typeLabel: '연차',
    startDate: '2024-02-12',
    endDate: '2024-02-14',
    days: 3,
    reason: '가족 여행',
    status: 'rejected',
    rejectedAt: '2024-02-10T11:30:00',
    rejectedBy: '김과장',
    rejectReason: '해당 기간 중요 업무가 예정되어 있어 승인이 어렵습니다.',
    createdAt: '2024-02-08T09:15:00',
    leaveBalance: { total: 15, used: 3, remaining: 12 },
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: '최지영',
    employeeNumber: 'EMP005',
    department: '마케팅팀',
    type: 'special',
    typeLabel: '경조사',
    startDate: '2024-02-22',
    endDate: '2024-02-23',
    days: 2,
    reason: '결혼식 참석',
    status: 'pending',
    createdAt: '2024-02-10T10:00:00',
    leaveBalance: { total: 5, used: 0, remaining: 5 },
  },
];

type LeaveStatus = 'pending' | 'approved' | 'rejected';

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
};

const leaveTypeColors: Record<string, string> = {
  annual: 'bg-blue-100 text-blue-700',
  half_am: 'bg-cyan-100 text-cyan-700',
  half_pm: 'bg-cyan-100 text-cyan-700',
  sick: 'bg-red-100 text-red-700',
  special: 'bg-purple-100 text-purple-700',
  official: 'bg-green-100 text-green-700',
};

export function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>(mockLeaveRequests);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 필터링된 목록
  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesSearch =
      req.employeeName.includes(searchQuery) ||
      req.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.department.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  // 통계
  const stats = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  // 승인 처리
  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              status: 'approved' as const,
              approvedAt: new Date().toISOString(),
              approvedBy: '관리자',
            }
          : req
      )
    );
    toast.success('휴가가 승인되었습니다');
    setSelectedRequest(null);
  };

  // 반려 처리
  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('반려 사유를 입력해주세요');
      return;
    }
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              status: 'rejected' as const,
              rejectedAt: new Date().toISOString(),
              rejectedBy: '관리자',
              rejectReason,
            }
          : req
      )
    );
    toast.success('휴가가 반려되었습니다');
    setSelectedRequest(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">휴가 관리</h1>
        <p className="text-gray-500 mt-1">직원들의 휴가 신청을 승인/반려합니다</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-200 bg-white hover:border-yellow-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">승인 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
            statusFilter === 'approved'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-green-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">승인 완료</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
            statusFilter === 'rejected'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 bg-white hover:border-red-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">반려</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="직원명, 사원번호, 부서로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  신청자
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  휴가 유형
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  기간
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  사유
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  신청일
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  처리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {request.employeeName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {request.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.employeeNumber} · {request.department}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        leaveTypeColors[request.type]
                      }`}
                    >
                      {request.typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">
                      {format(new Date(request.startDate), 'M.d', { locale: ko })}
                      {request.startDate !== request.endDate &&
                        ` ~ ${format(new Date(request.endDate), 'M.d', { locale: ko })}`}
                    </p>
                    <p className="text-xs text-gray-500">{request.days}일</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 truncate max-w-[200px]">
                      {request.reason}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        statusConfig[request.status as LeaveStatus].bgColor
                      } ${statusConfig[request.status as LeaveStatus].color}`}
                    >
                      {statusConfig[request.status as LeaveStatus].icon}
                      {statusConfig[request.status as LeaveStatus].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(request.createdAt), 'M.d HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {request.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                          title="승인"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          title="반려"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        상세
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            해당하는 휴가 신청이 없습니다
          </div>
        )}
      </div>

      {/* 상세/반려 모달 */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">휴가 신청 상세</h3>
            </div>

            <div className="p-4 space-y-4">
              {/* 신청자 정보 */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User size={24} className="text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedRequest.employeeName}</p>
                  <p className="text-sm text-gray-500">
                    {selectedRequest.employeeNumber} · {selectedRequest.department}
                  </p>
                </div>
              </div>

              {/* 휴가 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">휴가 유형</p>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-sm font-medium ${
                      leaveTypeColors[selectedRequest.type]
                    }`}
                  >
                    {selectedRequest.typeLabel}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">신청 일수</p>
                  <p className="text-sm font-medium text-gray-900">{selectedRequest.days}일</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">기간</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(selectedRequest.startDate), 'yyyy년 M월 d일 (E)', {
                      locale: ko,
                    })}
                    {selectedRequest.startDate !== selectedRequest.endDate &&
                      ` ~ ${format(new Date(selectedRequest.endDate), 'M월 d일 (E)', {
                        locale: ko,
                      })}`}
                  </p>
                </div>
              </div>

              {/* 사유 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">사유</p>
                <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">
                  {selectedRequest.reason}
                </p>
              </div>

              {/* 휴가 잔여 */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">휴가 잔여 현황</p>
                <p className="text-sm text-blue-800">
                  총 {selectedRequest.leaveBalance.total}일 중{' '}
                  <span className="font-bold">{selectedRequest.leaveBalance.remaining}일</span> 남음
                  (사용: {selectedRequest.leaveBalance.used}일)
                </p>
              </div>

              {/* 처리 상태 표시 */}
              {selectedRequest.status === 'approved' && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    {selectedRequest.approvedBy}님이{' '}
                    {format(new Date(selectedRequest.approvedAt!), 'M월 d일 HH:mm')}에 승인함
                  </p>
                </div>
              )}

              {selectedRequest.status === 'rejected' && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 mb-1">
                    {selectedRequest.rejectedBy}님이{' '}
                    {format(new Date(selectedRequest.rejectedAt!), 'M월 d일 HH:mm')}에 반려함
                  </p>
                  <p className="text-sm text-red-600">사유: {selectedRequest.rejectReason}</p>
                </div>
              )}

              {/* 반려 사유 입력 (pending일 때만) */}
              {selectedRequest.status === 'pending' && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">반려 사유 (반려 시 필수)</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="반려 사유를 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                닫기
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    반려
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    승인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
