// =====================================================
// 출퇴근 관리 페이지 (Supabase 연동)
// =====================================================

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import {
  Search,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit,
  Clock,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  Plus,
} from 'lucide-react';
import { getAttendanceRecords, getEmployees, updateAttendance, checkIn, checkOut } from '../../lib/api';
import type { AttendanceRecord, Employee } from '../../lib/api';
import toast from 'react-hot-toast';

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

function calculateWorkMinutes(checkInTime: string | null, checkOutTime: string | null, breakMinutes: number = 60): number {
  if (!checkInTime || !checkOutTime) return 0;
  const [inH, inM] = checkInTime.split(':').map(Number);
  const [outH, outM] = checkOutTime.split(':').map(Number);
  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  return Math.max(0, totalMinutes - breakMinutes);
}

export function AttendanceListPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ check_in: '', check_out: '', notes: '' });
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // 출퇴근 기록 조회
  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => getAttendanceRecords({ date: selectedDate }),
  });

  // 직원 목록
  const { data: employees } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => getEmployees({ is_active: true }),
  });

  // 출퇴근 수정
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AttendanceRecord> }) =>
      updateAttendance(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('출퇴근 기록이 수정되었습니다');
      setEditingRecord(null);
    },
    onError: () => {
      toast.error('수정 중 오류가 발생했습니다');
    },
  });

  // 수동 출근
  const checkInMutation = useMutation({
    mutationFn: (employeeId: string) => checkIn(employeeId, 'admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('출근 처리되었습니다');
      setShowManualCheckIn(false);
      setSelectedEmployeeId('');
    },
    onError: () => {
      toast.error('출근 처리 중 오류가 발생했습니다');
    },
  });

  // 수동 퇴근
  const checkOutMutation = useMutation({
    mutationFn: (employeeId: string) => checkOut(employeeId, 'admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('퇴근 처리되었습니다');
    },
    onError: () => {
      toast.error('퇴근 처리 중 오류가 발생했습니다');
    },
  });

  // 부서 목록
  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [employees]);

  // 필터링된 기록
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter((record) => {
      const matchesSearch =
        (record.employee?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.employee?.employee_number || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment =
        departmentFilter === 'all' || record.employee?.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [records, searchTerm, departmentFilter]);

  // 통계
  const stats = useMemo(() => {
    const total = employees?.length || 0;
    const checkedIn = records?.filter(r => r.check_in).length || 0;
    const checkedOut = records?.filter(r => r.check_out).length || 0;
    const working = checkedIn - checkedOut;
    return { total, checkedIn, checkedOut, working };
  }, [records, employees]);

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditForm({
      check_in: record.check_in || '',
      check_out: record.check_out || '',
      notes: record.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateMutation.mutate({
      id: editingRecord.id,
      updates: {
        check_in: editForm.check_in || null,
        check_out: editForm.check_out || null,
        notes: editForm.notes || null,
      },
    });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <div>
        <Header title="출퇴근 관리" subtitle="로딩 중..." />
        <div className="mt-16 flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="출퇴근 관리" subtitle="출퇴근 기록 조회 및 관리" />

      <div className="mt-16">
        {/* 날짜 선택 및 통계 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* 날짜 선택 */}
          <div className="flex items-center gap-2">
            <button onClick={() => handleDateChange(-1)} className="btn btn-ghost btn-sm">
              <ChevronLeft size={18} />
            </button>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input pl-10 w-44"
              />
            </div>
            <button onClick={() => handleDateChange(1)} className="btn btn-ghost btn-sm">
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="btn btn-secondary btn-sm"
            >
              오늘
            </button>
          </div>

          {/* 통계 요약 */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              전체 <strong className="text-gray-900">{stats.total}</strong>명
            </span>
            <span className="text-success-600">
              출근 <strong>{stats.checkedIn}</strong>명
            </span>
            <span className="text-primary-600">
              근무중 <strong>{stats.working}</strong>명
            </span>
            <span className="text-gray-500">
              퇴근 <strong>{stats.checkedOut}</strong>명
            </span>
          </div>
        </div>

        {/* 필터 및 액션 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="이름, 사번 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full sm:w-56"
              />
            </div>

            {/* 부서 필터 */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input w-full sm:w-36"
            >
              <option value="all">모든 부서</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {/* 수동 출퇴근 버튼 (오늘만) */}
            {isToday && (
              <button
                onClick={() => setShowManualCheckIn(true)}
                className="btn btn-primary"
              >
                <Plus size={18} />
                수동 출퇴근
              </button>
            )}
            
            {/* 엑셀 내보내기 */}
            <button className="btn btn-secondary">
              <Download size={18} />
              엑셀 다운로드
            </button>
          </div>
        </div>

        {/* 출퇴근 테이블 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">직원</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">부서</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">출근</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">퇴근</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">근무시간</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">인증방법</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => {
                  const workMinutes = calculateWorkMinutes(record.check_in, record.check_out);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {record.employee?.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {record.employee?.name || '알 수 없음'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.employee?.employee_number || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{record.employee?.department || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {record.check_in ? (
                          <span className="text-sm font-medium text-green-600">
                            <LogIn className="w-4 h-4 inline mr-1" />
                            {record.check_in}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {record.check_out ? (
                          <span className="text-sm font-medium text-gray-600">
                            <LogOut className="w-4 h-4 inline mr-1" />
                            {record.check_out}
                          </span>
                        ) : record.check_in ? (
                          isToday ? (
                            <button
                              onClick={() => checkOutMutation.mutate(record.employee_id)}
                              className="btn btn-primary btn-sm"
                              disabled={checkOutMutation.isPending}
                            >
                              퇴근처리
                            </button>
                          ) : (
                            <span className="text-sm text-orange-500">미퇴근</span>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {workMinutes > 0 ? (
                          <span className="text-sm font-medium text-gray-900">
                            {formatDuration(workMinutes)}
                          </span>
                        ) : record.check_in && !record.check_out ? (
                          <span className="badge badge-success">근무중</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`badge ${
                          record.check_in_method === 'face' ? 'badge-primary' :
                          record.check_in_method === 'password' ? 'badge-gray' :
                          record.check_in_method === 'admin' ? 'badge-warning' : 'badge-gray'
                        }`}>
                          {record.check_in_method === 'face' ? '얼굴' :
                           record.check_in_method === 'password' ? '비밀번호' :
                           record.check_in_method === 'admin' ? '관리자' : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(record)}
                          className="btn btn-ghost btn-sm"
                          title="수정"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="py-12 text-center">
              <Clock className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">
                {selectedDate}의 출퇴근 기록이 없습니다.
              </p>
            </div>
          )}
        </div>

        {/* 수동 출퇴근 모달 */}
        {showManualCheckIn && (
          <div className="modal-overlay" onClick={() => setShowManualCheckIn(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">수동 출퇴근</h2>
                <p className="text-sm text-gray-500 mt-1">직원을 선택하여 출근 처리합니다.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">직원 선택</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">직원을 선택하세요</option>
                    {employees?.filter(emp => {
                      // 이미 출근한 직원 제외
                      const alreadyCheckedIn = records?.some(r => r.employee_id === emp.id);
                      return !alreadyCheckedIn;
                    }).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_number || emp.department || '-'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <AlertCircle className="text-blue-600 flex-shrink-0" size={18} />
                  <p className="text-sm text-blue-700">
                    관리자 권한으로 출근 처리됩니다. 감사 로그에 기록됩니다.
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setShowManualCheckIn(false)} className="btn btn-secondary">
                  취소
                </button>
                <button
                  onClick={() => selectedEmployeeId && checkInMutation.mutate(selectedEmployeeId)}
                  disabled={!selectedEmployeeId || checkInMutation.isPending}
                  className="btn btn-primary"
                >
                  {checkInMutation.isPending ? '처리 중...' : '출근 처리'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 수정 모달 */}
        {editingRecord && (
          <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">출퇴근 기록 수정</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingRecord.employee?.name} ({editingRecord.date})
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">출근 시간</label>
                  <input
                    type="time"
                    className="input"
                    value={editForm.check_in}
                    onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">퇴근 시간</label>
                  <input
                    type="time"
                    className="input"
                    value={editForm.check_out}
                    onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">메모</label>
                  <textarea
                    className="input min-h-[80px]"
                    placeholder="수정 사유를 입력하세요"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 p-3 bg-warning-50 rounded-lg">
                  <AlertCircle className="text-warning-600 flex-shrink-0" size={18} />
                  <p className="text-sm text-warning-700">
                    수정 내역은 감사 로그에 기록됩니다.
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setEditingRecord(null)} className="btn btn-secondary">
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="btn btn-primary"
                >
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
