// =====================================================
// 출퇴근 관리 페이지 (Supabase 연동) - 반응형
// =====================================================

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponsiveTable, MobileFullModal } from '../../components/common/ResponsiveTable';
import type { Column } from '../../components/common/ResponsiveTable';
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
  CalendarDays,
  LayoutGrid,
  Filter,
  X,
} from 'lucide-react';
import { getAttendanceRecords, getEmployees, updateAttendance, checkIn, checkOut } from '../../lib/api';
import type { AttendanceRecord, Employee } from '../../lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ check_in: '', check_out: '', notes: '' });
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // 출퇴근 기록 조회
  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance', viewMode === 'day' ? selectedDate : selectedMonth, viewMode],
    queryFn: () => {
      if (viewMode === 'day') {
        return getAttendanceRecords({ date: selectedDate });
      } else {
        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        return getAttendanceRecords({ start_date: startDate, end_date: endDate });
      }
    },
  });

  // 직원 목록
  const { data: employees } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => getEmployees({ is_active: true }),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AttendanceRecord> }) =>
      updateAttendance(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('출퇴근 기록이 수정되었습니다');
      setEditingRecord(null);
    },
    onError: () => toast.error('수정 중 오류가 발생했습니다'),
  });

  const checkInMutation = useMutation({
    mutationFn: (employeeId: string) => checkIn(employeeId, 'admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('출근 처리되었습니다');
      setShowManualCheckIn(false);
      setSelectedEmployeeId('');
    },
    onError: () => toast.error('출근 처리 중 오류가 발생했습니다'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (employeeId: string) => checkOut(employeeId, 'admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('퇴근 처리되었습니다');
    },
    onError: () => toast.error('퇴근 처리 중 오류가 발생했습니다'),
  });

  // 부서 목록
  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [employees]);

  // 필터링
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
    if (viewMode === 'day') {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + days);
      setSelectedDate(date.toISOString().split('T')[0]);
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      const date = new Date(year, month - 1 + days, 1);
      setSelectedMonth(date.toISOString().slice(0, 7));
    }
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

  // 엑셀 다운로드
  const handleExportExcel = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      toast.error('다운로드할 데이터가 없습니다');
      return;
    }

    const headers = ['날짜', '사번', '이름', '부서', '출근시간', '퇴근시간', '근무시간', '인증방법', '비고'];
    const rows = filteredRecords.map(record => {
      const workMinutes = calculateWorkMinutes(record.check_in, record.check_out);
      return [
        record.date,
        record.employee?.employee_number || '-',
        record.employee?.name || '알 수 없음',
        record.employee?.department || '-',
        record.check_in || '-',
        record.check_out || '-',
        workMinutes > 0 ? formatDuration(workMinutes) : (record.check_in && !record.check_out ? '근무중' : '-'),
        record.check_in_method === 'face' ? '얼굴' :
          record.check_in_method === 'password' ? '비밀번호' :
          record.check_in_method === 'admin' ? '관리자' : '-',
        record.notes || '',
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, '출퇴근기록');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = viewMode === 'day' 
      ? `출퇴근기록_${selectedDate}.xlsx`
      : `출퇴근기록_${selectedMonth}.xlsx`;
    saveAs(blob, fileName);
    toast.success('엑셀 파일이 다운로드되었습니다');
  };

  const activeFilterCount = departmentFilter !== 'all' ? 1 : 0;

  // ResponsiveTable 컬럼 정의
  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employee',
      header: '직원',
      mobileHighlight: 'title',
      render: (record) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm font-medium text-primary-700">
              {record.employee?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {record.employee?.name || '알 수 없음'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {record.employee?.employee_number || '-'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: '부서',
      mobileHighlight: 'subtitle',
      showInMobile: false,
      render: (record) => (
        <span className="text-sm text-gray-600">{record.employee?.department || '-'}</span>
      ),
    },
    ...(viewMode === 'month' ? [{
      key: 'date',
      header: '날짜',
      mobileLabel: '날짜',
      render: (record: AttendanceRecord) => (
        <span className="text-sm text-gray-900">{record.date}</span>
      ),
    }] : []),
    {
      key: 'check_in',
      header: '출근',
      mobileLabel: '출근',
      className: 'text-center',
      render: (record) => (
        record.check_in ? (
          <span className="text-sm font-medium text-green-600 whitespace-nowrap">
            <LogIn className="w-3.5 h-3.5 inline mr-1" />
            {record.check_in}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'check_out',
      header: '퇴근',
      mobileLabel: '퇴근',
      className: 'text-center',
      render: (record) => (
        record.check_out ? (
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
            <LogOut className="w-3.5 h-3.5 inline mr-1" />
            {record.check_out}
          </span>
        ) : record.check_in ? (
          isToday ? (
            <button
              onClick={(e) => { e.stopPropagation(); checkOutMutation.mutate(record.employee_id); }}
              className="btn btn-primary btn-sm text-xs"
              disabled={checkOutMutation.isPending}
            >
              퇴근
            </button>
          ) : (
            <span className="text-sm text-orange-500">미퇴근</span>
          )
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'work_time',
      header: '근무시간',
      mobileHighlight: 'badge',
      className: 'text-center',
      render: (record) => {
        const workMinutes = calculateWorkMinutes(record.check_in, record.check_out);
        return workMinutes > 0 ? (
          <span className="text-sm font-medium text-gray-900">{formatDuration(workMinutes)}</span>
        ) : record.check_in && !record.check_out ? (
          <span className="badge badge-success text-xs">근무중</span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    {
      key: 'method',
      header: '인증',
      showInMobile: false,
      className: 'text-center',
      render: (record) => (
        <span className={`badge text-xs ${
          record.check_in_method === 'face' ? 'badge-primary' :
          record.check_in_method === 'password' ? 'badge-gray' :
          record.check_in_method === 'admin' ? 'badge-warning' : 'badge-gray'
        }`}>
          {record.check_in_method === 'face' ? '얼굴' :
           record.check_in_method === 'password' ? '비번' :
           record.check_in_method === 'admin' ? '관리자' : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      mobileHighlight: 'action',
      className: 'text-right',
      render: (record) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
          className="btn btn-ghost btn-sm"
          title="수정"
        >
          <Edit size={16} />
        </button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      {/* 날짜 선택 - 모바일 최적화 */}
      <div className="flex flex-col gap-3 mb-4">
          {/* 보기 모드 + 날짜 선택 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 일/월 전환 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  viewMode === 'day' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays size={14} className="inline mr-1" />
                <span className="hidden sm:inline">일별</span>
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={14} className="inline mr-1" />
                <span className="hidden sm:inline">월별</span>
              </button>
            </div>

            {/* 날짜/월 선택 */}
            <div className="flex items-center gap-1">
              <button onClick={() => handleDateChange(-1)} className="btn btn-ghost btn-sm p-1.5">
                <ChevronLeft size={18} />
              </button>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                {viewMode === 'day' ? (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input pl-8 w-32 sm:w-40 text-sm"
                  />
                ) : (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="input pl-8 w-32 sm:w-40 text-sm"
                  />
                )}
              </div>
              <button onClick={() => handleDateChange(1)} className="btn btn-ghost btn-sm p-1.5">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* 오늘/이번달 버튼 */}
            <button
              onClick={() => viewMode === 'day' 
                ? setSelectedDate(new Date().toISOString().split('T')[0])
                : setSelectedMonth(new Date().toISOString().slice(0, 7))
              }
              className="btn btn-secondary btn-sm text-xs"
            >
              {viewMode === 'day' ? '오늘' : '이번달'}
            </button>
          </div>

          {/* 통계 요약 - 모바일에서는 그리드 */}
          <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-4 text-xs sm:text-sm">
            <div className="text-center sm:text-left">
              <span className="text-gray-500">전체</span>
              <p className="font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-success-600">출근</span>
              <p className="font-bold text-success-600">{stats.checkedIn}</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-primary-600">근무중</span>
              <p className="font-bold text-primary-600">{stats.working}</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-gray-500">퇴근</span>
              <p className="font-bold text-gray-500">{stats.checkedOut}</p>
            </div>
          </div>
        </div>

        {/* 필터 및 액션 */}
        <div className="flex flex-col gap-3 mb-4">
          {/* 상단: 검색 + 버튼 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="이름, 사번..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full text-sm"
              />
            </div>

            {/* 필터 토글 (모바일) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-ghost md:hidden relative ${showFilters ? 'bg-primary-50 text-primary-600' : ''}`}
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* 수동 출퇴근 (오늘만) */}
            {isToday && (
              <button onClick={() => setShowManualCheckIn(true)} className="btn btn-primary whitespace-nowrap text-sm">
                <Plus size={16} />
                <span className="hidden sm:inline">수동</span>
              </button>
            )}

            {/* 엑셀 */}
            <button 
              onClick={handleExportExcel}
              disabled={!filteredRecords || filteredRecords.length === 0}
              className="btn btn-secondary whitespace-nowrap text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">엑셀</span>
            </button>
          </div>

          {/* 필터 (데스크톱 항상, 모바일 토글) */}
          <div className={`flex flex-col sm:flex-row gap-2 ${showFilters ? 'block' : 'hidden md:flex'}`}>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input text-sm w-full sm:w-36"
            >
              <option value="all">모든 부서</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button onClick={() => setDepartmentFilter('all')} className="btn btn-ghost text-sm text-gray-500">
                <X size={16} />
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 출퇴근 테이블 - ResponsiveTable */}
        <div className="card overflow-hidden">
          <ResponsiveTable
            data={filteredRecords}
            columns={columns}
            keyExtractor={(record) => record.id}
            isLoading={isLoading}
            emptyMessage={viewMode === 'day' 
              ? `${selectedDate}의 출퇴근 기록이 없습니다.`
              : `${selectedMonth}의 출퇴근 기록이 없습니다.`
            }
            emptyIcon={<Clock size={48} />}
            cardClassName="mx-4 my-2 first:mt-4 last:mb-4"
          />
        </div>

        {/* 수동 출퇴근 모달 */}
        <MobileFullModal
          isOpen={showManualCheckIn}
          onClose={() => setShowManualCheckIn(false)}
          title="수동 출퇴근"
          actions={
            <div className="flex gap-3">
              <button onClick={() => setShowManualCheckIn(false)} className="btn btn-secondary flex-1">
                취소
              </button>
              <button
                onClick={() => selectedEmployeeId && checkInMutation.mutate(selectedEmployeeId)}
                disabled={!selectedEmployeeId || checkInMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {checkInMutation.isPending ? '처리 중...' : '출근 처리'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">직원을 선택하여 출근 처리합니다.</p>
            <div>
              <label className="label">직원 선택</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="input w-full"
              >
                <option value="">직원을 선택하세요</option>
                {employees?.filter(emp => {
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
                관리자 권한으로 출근 처리됩니다.
              </p>
            </div>
          </div>
        </MobileFullModal>

        {/* 수정 모달 */}
        <MobileFullModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          title="출퇴근 기록 수정"
          actions={
            <div className="flex gap-3">
              <button onClick={() => setEditingRecord(null)} className="btn btn-secondary flex-1">
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {editingRecord?.employee?.name} ({editingRecord?.date})
            </p>
            <div>
              <label className="label">출근 시간</label>
              <input
                type="time"
                className="input w-full"
                value={editForm.check_in}
                onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
              />
            </div>
            <div>
              <label className="label">퇴근 시간</label>
              <input
                type="time"
                className="input w-full"
                value={editForm.check_out}
                onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
              />
            </div>
            <div>
              <label className="label">메모</label>
              <textarea
                className="input min-h-[80px] w-full"
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
        </MobileFullModal>
      </div>
  );
}
