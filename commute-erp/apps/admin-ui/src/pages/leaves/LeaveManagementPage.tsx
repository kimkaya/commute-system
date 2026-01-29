// =====================================================
// 휴가 승인 관리 페이지 (Supabase 연동)
// =====================================================

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle,
  XCircle,
  Search,
  User,
  Loader2,
  Calendar,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { getLeaves, getEmployees, approveLeave, rejectLeave, createLeave } from '../../lib/api';
import type { Leave, Employee } from '../../lib/api';

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

const leaveTypeLabels: Record<string, string> = {
  annual: '연차',
  sick: '병가',
  personal: '개인사유',
  maternity: '출산휴가',
  paternity: '육아휴직',
  bereavement: '경조사',
  unpaid: '무급휴가',
  half_am: '오전반차',
  half_pm: '오후반차',
};

const leaveTypeColors: Record<string, string> = {
  annual: 'bg-blue-100 text-blue-700',
  sick: 'bg-red-100 text-red-700',
  personal: 'bg-gray-100 text-gray-700',
  maternity: 'bg-pink-100 text-pink-700',
  paternity: 'bg-indigo-100 text-indigo-700',
  bereavement: 'bg-purple-100 text-purple-700',
  unpaid: 'bg-gray-100 text-gray-700',
  half_am: 'bg-cyan-100 text-cyan-700',
  half_pm: 'bg-cyan-100 text-cyan-700',
};

export function LeaveManagementPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    employee_id: '',
    type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // 휴가 목록 조회
  const { data: leaves, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => getLeaves(),
  });

  // 직원 목록
  const { data: employees } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => getEmployees({ is_active: true }),
  });

  // 승인 mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('휴가가 승인되었습니다');
      setSelectedLeave(null);
    },
    onError: () => {
      toast.error('승인 처리 중 오류가 발생했습니다');
    },
  });

  // 반려 mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectLeave(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('휴가가 반려되었습니다');
      setSelectedLeave(null);
      setRejectReason('');
    },
    onError: () => {
      toast.error('반려 처리 중 오류가 발생했습니다');
    },
  });

  // 휴가 생성 mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof newLeave) => createLeave({
      employee_id: data.employee_id,
      type: data.type as Leave['type'],
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason,
      duration: calculateDuration(data.start_date, data.end_date, data.type),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('휴가가 등록되었습니다');
      setShowCreateModal(false);
      setNewLeave({ employee_id: '', type: 'annual', start_date: '', end_date: '', reason: '' });
    },
    onError: () => {
      toast.error('휴가 등록 중 오류가 발생했습니다');
    },
  });

  // 필터링된 목록
  const filteredLeaves = useMemo(() => {
    if (!leaves) return [];
    return leaves.filter((leave) => {
      const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
      const matchesSearch =
        (leave.employee?.name || '').includes(searchQuery) ||
        (leave.employee?.employee_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (leave.employee?.department || '').includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [leaves, statusFilter, searchQuery]);

  // 통계
  const stats = useMemo(() => ({
    pending: leaves?.filter((r) => r.status === 'pending').length || 0,
    approved: leaves?.filter((r) => r.status === 'approved').length || 0,
    rejected: leaves?.filter((r) => r.status === 'rejected').length || 0,
  }), [leaves]);

  // 휴가 일수 계산
  function calculateDuration(startDate: string, endDate: string, type: string): number {
    if (type === 'half_am' || type === 'half_pm') return 0.5;
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('반려 사유를 입력해주세요');
      return;
    }
    rejectMutation.mutate({ id, reason: rejectReason });
  };

  const handleCreateLeave = () => {
    if (!newLeave.employee_id) {
      toast.error('직원을 선택해주세요');
      return;
    }
    if (!newLeave.start_date || !newLeave.end_date) {
      toast.error('날짜를 입력해주세요');
      return;
    }
    createMutation.mutate(newLeave);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">휴가 관리</h1>
          <p className="text-gray-500 mt-1">직원들의 휴가 신청을 승인/반려합니다</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          휴가 등록
        </button>
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">신청자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">휴가 유형</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">기간</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">사유</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">신청일</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {leave.employee?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {leave.employee?.name || '알 수 없음'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {leave.employee?.employee_number || '-'} · {leave.employee?.department || '-'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        leaveTypeColors[leave.type] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {leaveTypeLabels[leave.type] || leave.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">
                      {format(new Date(leave.start_date), 'M.d', { locale: ko })}
                      {leave.start_date !== leave.end_date &&
                        ` ~ ${format(new Date(leave.end_date), 'M.d', { locale: ko })}`}
                    </p>
                    <p className="text-xs text-gray-500">{leave.duration}일</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 truncate max-w-[200px]">
                      {leave.reason || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        statusConfig[leave.status as LeaveStatus]?.bgColor || 'bg-gray-50'
                      } ${statusConfig[leave.status as LeaveStatus]?.color || 'text-gray-600'}`}
                    >
                      {statusConfig[leave.status as LeaveStatus]?.icon}
                      {statusConfig[leave.status as LeaveStatus]?.label || leave.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(leave.requested_at), 'M.d HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {leave.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleApprove(leave.id)}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                          title="승인"
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => setSelectedLeave(leave)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          title="반려"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedLeave(leave)}
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

        {filteredLeaves.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            해당하는 휴가 신청이 없습니다
          </div>
        )}
      </div>

      {/* 상세/반려 모달 */}
      {selectedLeave && (
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
                  <p className="font-medium text-gray-900">{selectedLeave.employee?.name || '알 수 없음'}</p>
                  <p className="text-sm text-gray-500">
                    {selectedLeave.employee?.employee_number || '-'} · {selectedLeave.employee?.department || '-'}
                  </p>
                </div>
              </div>

              {/* 휴가 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">휴가 유형</p>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-sm font-medium ${
                      leaveTypeColors[selectedLeave.type] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {leaveTypeLabels[selectedLeave.type] || selectedLeave.type}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">신청 일수</p>
                  <p className="text-sm font-medium text-gray-900">{selectedLeave.duration}일</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">기간</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(selectedLeave.start_date), 'yyyy년 M월 d일 (E)', { locale: ko })}
                    {selectedLeave.start_date !== selectedLeave.end_date &&
                      ` ~ ${format(new Date(selectedLeave.end_date), 'M월 d일 (E)', { locale: ko })}`}
                  </p>
                </div>
              </div>

              {/* 사유 */}
              <div>
                <p className="text-xs text-gray-500 mb-1">사유</p>
                <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">
                  {selectedLeave.reason || '없음'}
                </p>
              </div>

              {/* 처리 상태 표시 */}
              {selectedLeave.status === 'approved' && selectedLeave.reviewed_at && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    {format(new Date(selectedLeave.reviewed_at), 'M월 d일 HH:mm')}에 승인됨
                  </p>
                </div>
              )}

              {selectedLeave.status === 'rejected' && (
                <div className="p-3 bg-red-50 rounded-lg">
                  {selectedLeave.reviewed_at && (
                    <p className="text-sm text-red-700 mb-1">
                      {format(new Date(selectedLeave.reviewed_at), 'M월 d일 HH:mm')}에 반려됨
                    </p>
                  )}
                  {selectedLeave.review_notes && (
                    <p className="text-sm text-red-600">사유: {selectedLeave.review_notes}</p>
                  )}
                </div>
              )}

              {/* 반려 사유 입력 */}
              {selectedLeave.status === 'pending' && (
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
                  setSelectedLeave(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                닫기
              </button>
              {selectedLeave.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedLeave.id)}
                    disabled={rejectMutation.isPending}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    반려
                  </button>
                  <button
                    onClick={() => handleApprove(selectedLeave.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    승인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 휴가 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">휴가 등록</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원 선택</label>
                <select
                  value={newLeave.employee_id}
                  onChange={(e) => setNewLeave({ ...newLeave, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">직원을 선택하세요</option>
                  {employees?.map((emp: Employee) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_number || emp.department || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴가 유형</label>
                <select
                  value={newLeave.type}
                  onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(leaveTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={newLeave.start_date}
                    onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={newLeave.end_date}
                    onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
                <textarea
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  placeholder="휴가 사유를 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewLeave({ employee_id: '', type: 'annual', start_date: '', end_date: '', reason: '' });
                }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateLeave}
                disabled={createMutation.isPending}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
