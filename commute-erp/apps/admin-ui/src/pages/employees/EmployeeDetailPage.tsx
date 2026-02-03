// =====================================================
// 직원 상세 페이지 - Supabase 연동 + 모바일 반응형
// =====================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  Clock,
  TrendingUp,
  CalendarDays,
  Camera,
  AlertTriangle,
  CheckCircle,
  User,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { getEmployee, deleteEmployee, getAttendanceRecords, getEmployeeLeaveBalance } from '../../lib/api';

const statusLabels: Record<string, { label: string; color: string }> = {
  normal: { label: '정상', color: 'text-green-600 bg-green-50' },
  late: { label: '지각', color: 'text-orange-600 bg-orange-50' },
  overtime: { label: '연장', color: 'text-blue-600 bg-blue-50' },
  absent: { label: '결근', color: 'text-red-600 bg-red-50' },
};

const employmentTypeLabels: Record<string, string> = {
  full_time: '정규직',
  contract: '계약직',
  part_time: '파트타임',
  intern: '인턴',
  hourly: '시급',
  monthly: '월급',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// 출근 상태 계산
function getAttendanceStatus(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return 'absent';
  
  const [inH, inM] = checkIn.split(':').map(Number);
  const checkInMinutes = inH * 60 + inM;
  const standardStart = 9 * 60; // 09:00
  
  // 지각: 9:00 이후 출근
  if (checkInMinutes > standardStart) return 'late';
  
  // 연장: 퇴근시간이 18:00 이후
  if (checkOut) {
    const [outH, outM] = checkOut.split(':').map(Number);
    const checkOutMinutes = outH * 60 + outM;
    if (checkOutMinutes > 18 * 60) return 'overtime';
  }
  
  return 'normal';
}

export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'leave' | 'salary'>('info');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 직원 데이터 조회
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id!),
    enabled: !!id,
  });

  // 출퇴근 기록 조회 (최근 30일)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendance', id, 'recent'],
    queryFn: () => getAttendanceRecords({
      employee_id: id!,
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
    }),
    enabled: !!id,
  });

  // 휴가 잔여 조회
  const currentYear = new Date().getFullYear();
  const { data: leaveBalance } = useQuery({
    queryKey: ['leaveBalance', id, currentYear],
    queryFn: () => getEmployeeLeaveBalance(id!, currentYear),
    enabled: !!id,
  });

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteEmployee(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('직원이 퇴사 처리되었습니다');
      navigate('/employees');
    },
    onError: () => {
      toast.error('직원 삭제 중 오류가 발생했습니다');
    },
  });

  // 수정 페이지로 이동
  const handleEdit = () => {
    navigate(`/employees/${id}/edit`);
  };

  // 삭제
  const handleDelete = async () => {
    deleteMutation.mutate();
    setShowDeleteModal(false);
  };

  // 얼굴 등록
  const handleFaceRegister = () => {
    toast.success('얼굴 등록 기능 준비 중');
  };

  const tabs = [
    { id: 'info', label: '기본 정보' },
    { id: 'attendance', label: '출퇴근 현황' },
    { id: 'leave', label: '휴가 현황' },
    { id: 'salary', label: '급여 정보' },
  ];

  // 출퇴근 통계 계산
  const attendanceStats = {
    thisMonth: {
      workDays: attendanceRecords?.filter(r => r.check_in).length || 0,
      lateDays: attendanceRecords?.filter(r => {
        if (!r.check_in) return false;
        const [h, m] = r.check_in.split(':').map(Number);
        return h > 9 || (h === 9 && m > 0);
      }).length || 0,
      absentDays: 0,
      overtimeHours: attendanceRecords?.reduce((total, r) => {
        if (!r.check_in || !r.check_out) return total;
        const [inH, inM] = r.check_in.split(':').map(Number);
        const [outH, outM] = r.check_out.split(':').map(Number);
        const worked = (outH * 60 + outM) - (inH * 60 + inM) - 60; // 점심 1시간 제외
        const overtime = Math.max(0, worked - 8 * 60) / 60;
        return total + overtime;
      }, 0) || 0,
    },
    total: {
      workDays: attendanceRecords?.filter(r => r.check_in).length || 0,
      lateDays: attendanceRecords?.filter(r => {
        if (!r.check_in) return false;
        const [h, m] = r.check_in.split(':').map(Number);
        return h > 9 || (h === 9 && m > 0);
      }).length || 0,
      leaveDays: leaveBalance?.annual_used || 0,
    },
  };

  // 최근 출퇴근 기록 (최근 5개)
  const recentAttendance = (attendanceRecords || [])
    .slice(0, 5)
    .map(record => ({
      date: record.date,
      checkIn: record.check_in || '-',
      checkOut: record.check_out || '-',
      status: getAttendanceStatus(record.check_in, record.check_out),
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <p className="text-gray-600">직원 정보를 불러오는 중 오류가 발생했습니다.</p>
          <button
            onClick={() => navigate('/employees')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">직원 상세</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{employee.employee_number || '-'}</p>
          </div>
        </div>
        
        {/* 데스크톱 버튼 */}
        <div className="hidden sm:flex gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Edit2 size={18} />
            수정
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm"
          >
            <Trash2 size={18} />
            퇴사처리
          </button>
        </div>
        
        {/* 모바일 메뉴 */}
        <div className="sm:hidden relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <MoreVertical size={20} />
          </button>
          {showMobileMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
              <button
                onClick={() => { handleEdit(); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 size={16} />
                수정
              </button>
              <button
                onClick={() => { setShowDeleteModal(true); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={16} />
                퇴사처리
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          {/* 프로필 이미지 */}
          <div className="flex items-center gap-4 sm:block">
            <div className="relative">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary-100 rounded-xl overflow-hidden flex items-center justify-center">
                <span className="text-2xl sm:text-4xl font-bold text-primary-600">
                  {employee.name.charAt(0)}
                </span>
              </div>
              <button
                onClick={handleFaceRegister}
                className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 p-1.5 sm:p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                title="얼굴 등록"
              >
                <Camera size={12} className="sm:hidden" />
                <Camera size={14} className="hidden sm:block" />
              </button>
            </div>
            
            {/* 모바일: 이름/상태 (이미지 옆) */}
            <div className="sm:hidden">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-gray-900">{employee.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    employee.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {employee.is_active ? '재직중' : '퇴사'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {employee.department || '-'} · {employee.position || '-'}
              </p>
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="flex-1">
            {/* 데스크톱: 이름/상태 */}
            <div className="hidden sm:flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">{employee.name}</h2>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  employee.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {employee.is_active ? '재직중' : '퇴사'}
              </span>
            </div>
            <p className="hidden sm:block text-gray-600 mb-4">
              {employee.department || '-'} · {employee.position || '-'} ·{' '}
              {employmentTypeLabels[employee.salary_type] || employee.salary_type}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{employee.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                {employee.phone || '-'}
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                입사: {employee.hire_date ? format(new Date(employee.hire_date), 'yyyy.MM.dd') : '-'}
              </div>
            </div>
          </div>

          {/* 이번 달 통계 */}
          <div className="grid grid-cols-4 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-blue-50 rounded-lg text-center sm:min-w-[100px]">
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {attendanceStats.thisMonth.workDays}
              </p>
              <p className="text-[10px] sm:text-xs text-blue-600">출근</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-50 rounded-lg text-center sm:min-w-[100px]">
              <p className="text-lg sm:text-2xl font-bold text-orange-600">
                {attendanceStats.thisMonth.lateDays}
              </p>
              <p className="text-[10px] sm:text-xs text-orange-600">지각</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-50 rounded-lg text-center sm:min-w-[100px]">
              <p className="text-lg sm:text-2xl font-bold text-purple-600">
                {leaveBalance?.annual_remaining || 0}
              </p>
              <p className="text-[10px] sm:text-xs text-purple-600">연차</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-50 rounded-lg text-center sm:min-w-[100px]">
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {attendanceStats.thisMonth.overtimeHours.toFixed(1)}h
              </p>
              <p className="text-[10px] sm:text-xs text-green-600">연장</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 - 모바일: 가로 스크롤 */}
      <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <nav className="flex gap-4 sm:gap-8 min-w-max px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 내용 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        {/* 기본 정보 */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 sm:mb-4">개인 정보</h3>
              <dl className="space-y-2 sm:space-y-3">
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">생년월일</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">
                    {employee.birth_date
                      ? format(new Date(employee.birth_date), 'yyyy년 M월 d일')
                      : '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">이메일</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">
                    {employee.email || '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">연락처</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">
                    {employee.phone || '-'}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 sm:mb-4">직무 정보</h3>
              <dl className="space-y-2 sm:space-y-3">
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">사원번호</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">
                    {employee.employee_number || '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">부서</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">{employee.department || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">직급</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">{employee.position || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">급여유형</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">
                    {employmentTypeLabels[employee.salary_type] || employee.salary_type}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs sm:text-sm text-gray-500">입사일</dt>
                  <dd className="text-xs sm:text-sm font-medium text-gray-900">
                    {employee.hire_date ? format(new Date(employee.hire_date), 'yyyy년 M월 d일') : '-'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* 출퇴근 현황 */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 sm:space-y-6">
            {/* 통계 - 모바일: 2x2, 데스크톱: 4열 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <Clock size={16} className="text-gray-500" />
                  <span className="text-xs sm:text-sm text-gray-500">총 출근일</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {attendanceStats.total.workDays}일
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  <span className="text-xs sm:text-sm text-gray-500">총 지각</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-orange-600">
                  {attendanceStats.total.lateDays}회
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <CalendarDays size={16} className="text-purple-500" />
                  <span className="text-xs sm:text-sm text-gray-500">휴가 사용</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">
                  {attendanceStats.total.leaveDays}일
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  <span className="text-xs sm:text-sm text-gray-500">이번 달 연장</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">
                  {attendanceStats.thisMonth.overtimeHours.toFixed(1)}시간
                </p>
              </div>
            </div>

            {/* 최근 기록 - 모바일: 카드, 데스크톱: 테이블 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">최근 출퇴근 기록</h3>
              
              {recentAttendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  출퇴근 기록이 없습니다.
                </div>
              ) : (
                <>
                  {/* 데스크톱 테이블 */}
                  <table className="hidden sm:table w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">날짜</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">출근</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">퇴근</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentAttendance.map((record, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {format(new Date(record.date), 'M월 d일 (E)', { locale: ko })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.checkIn}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.checkOut}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                statusLabels[record.status]?.color || 'text-gray-600 bg-gray-50'
                              }`}
                            >
                              {statusLabels[record.status]?.label || record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* 모바일 카드 */}
                  <div className="sm:hidden space-y-2">
                    {recentAttendance.map((record, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(record.date), 'M/d (E)', { locale: ko })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {record.checkIn} ~ {record.checkOut}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            statusLabels[record.status]?.color || 'text-gray-600 bg-gray-50'
                          }`}
                        >
                          {statusLabels[record.status]?.label || record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 휴가 현황 */}
        {activeTab === 'leave' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 연차 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-medium text-gray-900">연차</h3>
                  <span className="text-xs sm:text-sm text-gray-500">
                    {leaveBalance?.annual_used || 0} / {leaveBalance?.annual_total || 15}일 사용
                  </span>
                </div>
                <div className="h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${
                        ((leaveBalance?.annual_used || 0) / (leaveBalance?.annual_total || 15)) * 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {leaveBalance?.annual_remaining || 15}일 <span className="text-xs sm:text-sm font-normal text-gray-500">남음</span>
                </p>
              </div>

              {/* 병가 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-medium text-gray-900">병가</h3>
                  <span className="text-xs sm:text-sm text-gray-500">
                    {leaveBalance?.sick_used || 0} / {leaveBalance?.sick_total || 3}일 사용
                  </span>
                </div>
                <div className="h-2 sm:h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{
                      width: `${((leaveBalance?.sick_used || 0) / (leaveBalance?.sick_total || 3)) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-red-600">
                  {(leaveBalance?.sick_total || 3) - (leaveBalance?.sick_used || 0)}일 <span className="text-xs sm:text-sm font-normal text-gray-500">남음</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 급여 정보 */}
        {activeTab === 'salary' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 sm:mb-4">급여 정보</h3>
                <dl className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-xs sm:text-sm text-gray-500">급여 유형</dt>
                    <dd className="text-xs sm:text-sm font-medium text-gray-900">
                      {employee.salary_type === 'monthly' ? '월급제' : '시급제'}
                    </dd>
                  </div>
                  {employee.salary_type === 'monthly' ? (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-xs sm:text-sm text-gray-500">월급</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900">
                          {formatCurrency(employee.monthly_salary || 0)}원
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-xs sm:text-sm text-gray-500">연봉</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900">
                          {formatCurrency((employee.monthly_salary || 0) * 12)}원
                        </dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <dt className="text-xs sm:text-sm text-gray-500">시급</dt>
                      <dd className="text-xs sm:text-sm font-medium text-gray-900">
                        {formatCurrency(employee.hourly_rate || 0)}원
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 sm:mb-4">세금 설정</h3>
                <dl className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-xs sm:text-sm text-gray-500">부양가족 수</dt>
                    <dd className="text-xs sm:text-sm font-medium text-gray-900">
                      {employee.dependents_count || 1}명
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-xs sm:text-sm text-gray-500">비과세 식대</dt>
                    <dd className="text-xs sm:text-sm font-medium text-gray-900">
                      {formatCurrency(employee.tax_free_meals || 0)}원
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-xs sm:text-sm text-gray-500">4대보험 제외</dt>
                    <dd className="text-xs sm:text-sm font-medium text-gray-900">
                      {[
                        employee.national_pension_exempt && '국민연금',
                        employee.health_insurance_exempt && '건강보험',
                        employee.employment_insurance_exempt && '고용보험',
                        employee.industrial_accident_exempt && '산재보험',
                      ].filter(Boolean).join(', ') || '없음'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">직원 퇴사 처리</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              <strong>{employee.name}</strong> 직원을 퇴사 처리하시겠습니까? 
              퇴사 처리된 직원은 목록에서 비활성화됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {deleteMutation.isPending ? '처리 중...' : '퇴사 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
