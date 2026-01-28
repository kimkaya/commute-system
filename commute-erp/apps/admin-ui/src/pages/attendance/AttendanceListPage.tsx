// =====================================================
// 출퇴근 관리 페이지
// =====================================================

import { useState, useMemo } from 'react';
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
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakMinutes: number;
  workMinutes: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'on_leave';
  notes: string | null;
}

// 데모 데이터
const generateDemoRecords = (): AttendanceRecord[] => {
  const today = new Date();
  const records: AttendanceRecord[] = [];
  const employees = [
    { id: '1', name: '김철수', number: 'EMP001', department: '개발팀' },
    { id: '2', name: '이영희', number: 'EMP002', department: '디자인팀' },
    { id: '3', name: '박지성', number: 'EMP003', department: '영업팀' },
    { id: '4', name: '최민수', number: 'EMP004', department: '개발팀' },
    { id: '5', name: '정유진', number: 'EMP005', department: '인사팀' },
  ];

  employees.forEach((emp, idx) => {
    const checkIn = idx === 2 ? '09:15' : idx === 4 ? null : `0${8 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
    const checkOut = idx === 4 ? null : idx === 1 ? '17:30' : null;
    const status = idx === 2 ? 'late' : idx === 1 ? 'early_leave' : idx === 4 ? 'on_leave' : 'normal';

    records.push({
      id: `${idx + 1}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeNumber: emp.number,
      department: emp.department,
      date: today.toISOString().split('T')[0],
      checkIn,
      checkOut,
      breakMinutes: 60,
      workMinutes: checkIn && checkOut ? calculateWorkMinutes(checkIn, checkOut, 60) : 0,
      status,
      notes: status === 'on_leave' ? '연차' : null,
    });
  });

  return records;
};

function calculateWorkMinutes(checkIn: string, checkOut: string, breakMinutes: number): number {
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  return Math.max(0, totalMinutes - breakMinutes);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

export function AttendanceListPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>(generateDemoRecords());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // 필터링된 기록
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        record.employeeName.includes(searchTerm) ||
        record.employeeNumber.includes(searchTerm);
      const matchesDepartment =
        departmentFilter === 'all' || record.department === departmentFilter;
      const matchesStatus =
        statusFilter === 'all' || record.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [records, searchTerm, departmentFilter, statusFilter]);

  // 통계
  const stats = useMemo(() => {
    const total = records.length;
    const checkedIn = records.filter((r) => r.checkIn && r.status !== 'on_leave').length;
    const checkedOut = records.filter((r) => r.checkOut).length;
    const late = records.filter((r) => r.status === 'late').length;
    const onLeave = records.filter((r) => r.status === 'on_leave').length;
    return { total, checkedIn, checkedOut, late, onLeave };
  }, [records]);

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'normal':
        return <span className="badge badge-success">정상</span>;
      case 'late':
        return <span className="badge badge-warning">지각</span>;
      case 'early_leave':
        return <span className="badge badge-warning">조퇴</span>;
      case 'absent':
        return <span className="badge badge-danger">결근</span>;
      case 'on_leave':
        return <span className="badge bg-primary-50 text-primary-600">휴가</span>;
    }
  };

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div>
      <Header title="출퇴근 관리" subtitle="출퇴근 기록 조회 및 관리" />

      <div className="mt-16">
        {/* 날짜 선택 및 통계 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* 날짜 선택 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange(-1)}
              className="btn btn-ghost btn-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input pl-10 w-44"
              />
            </div>
            <button
              onClick={() => handleDateChange(1)}
              className="btn btn-ghost btn-sm"
            >
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
              퇴근 <strong>{stats.checkedOut}</strong>명
            </span>
            {stats.late > 0 && (
              <span className="text-warning-600">
                지각 <strong>{stats.late}</strong>명
              </span>
            )}
            {stats.onLeave > 0 && (
              <span className="text-gray-500">
                휴가 <strong>{stats.onLeave}</strong>명
              </span>
            )}
          </div>
        </div>

        {/* 필터 및 액션 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 검색 */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
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
              <option value="개발팀">개발팀</option>
              <option value="디자인팀">디자인팀</option>
              <option value="영업팀">영업팀</option>
              <option value="인사팀">인사팀</option>
            </select>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full sm:w-32"
            >
              <option value="all">모든 상태</option>
              <option value="normal">정상</option>
              <option value="late">지각</option>
              <option value="early_leave">조퇴</option>
              <option value="on_leave">휴가</option>
            </select>
          </div>

          {/* 엑셀 내보내기 */}
          <button className="btn btn-secondary">
            <Download size={18} />
            엑셀 다운로드
          </button>
        </div>

        {/* 출퇴근 테이블 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    직원
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    부서
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    출근
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    퇴근
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    휴게
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    근무시간
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    상태
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {record.employeeName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.employeeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.employeeNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{record.department}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.checkIn ? (
                        <span
                          className={`text-sm font-medium ${
                            record.status === 'late' ? 'text-warning-600' : 'text-gray-900'
                          }`}
                        >
                          {record.checkIn}
                        </span>
                      ) : record.status === 'on_leave' ? (
                        <span className="text-sm text-gray-400">-</span>
                      ) : (
                        <span className="text-sm text-gray-400">미출근</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.checkOut ? (
                        <span
                          className={`text-sm font-medium ${
                            record.status === 'early_leave'
                              ? 'text-warning-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {record.checkOut}
                        </span>
                      ) : record.status === 'on_leave' ? (
                        <span className="text-sm text-gray-400">-</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600">
                        {record.breakMinutes}분
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.workMinutes > 0 ? (
                        <span className="text-sm font-medium text-gray-900">
                          {formatDuration(record.workMinutes)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="btn btn-ghost btn-sm"
                        title="수정"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="py-12 text-center">
              <Clock className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-500">출퇴근 기록이 없습니다.</p>
            </div>
          )}
        </div>

        {/* 수정 모달 */}
        {editingRecord && (
          <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  출퇴근 기록 수정
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingRecord.employeeName} ({editingRecord.date})
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label">출근 시간</label>
                  <input
                    type="time"
                    className="input"
                    defaultValue={editingRecord.checkIn || ''}
                  />
                </div>
                <div>
                  <label className="label">퇴근 시간</label>
                  <input
                    type="time"
                    className="input"
                    defaultValue={editingRecord.checkOut || ''}
                  />
                </div>
                <div>
                  <label className="label">휴게 시간 (분)</label>
                  <input
                    type="number"
                    className="input"
                    defaultValue={editingRecord.breakMinutes}
                  />
                </div>
                <div>
                  <label className="label">메모</label>
                  <textarea
                    className="input min-h-[80px]"
                    placeholder="수정 사유를 입력하세요"
                    defaultValue={editingRecord.notes || ''}
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
                <button
                  onClick={() => setEditingRecord(null)}
                  className="btn btn-secondary"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    // TODO: 저장 로직
                    setEditingRecord(null);
                  }}
                  className="btn btn-primary"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
