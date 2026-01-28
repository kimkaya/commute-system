// =====================================================
// 직원 상세 페이지
// =====================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

// 데모 직원 데이터
const mockEmployee = {
  id: '1',
  employeeNumber: 'EMP001',
  name: '홍길동',
  email: 'hong@example.com',
  phone: '010-1234-5678',
  birthDate: '1990-05-15',
  gender: 'male',
  address: '서울시 강남구 테헤란로 123',
  profileImage: null,
  department: '개발팀',
  position: '선임',
  employmentType: 'full_time',
  hireDate: '2022-03-01',
  resignDate: null,
  baseSalary: 4500000,
  bankName: '국민은행',
  accountNumber: '123-456-789012',
  accountHolder: '홍길동',
  status: 'active',
  createdAt: '2022-03-01T09:00:00',
};

// 출퇴근 통계
const attendanceStats = {
  thisMonth: {
    workDays: 18,
    lateDays: 1,
    absentDays: 0,
    overtimeHours: 12.5,
  },
  total: {
    workDays: 456,
    lateDays: 8,
    leaveDays: 25,
  },
};

// 최근 출퇴근 기록
const recentAttendance = [
  { date: '2024-02-10', checkIn: '08:55', checkOut: '18:30', status: 'normal' },
  { date: '2024-02-09', checkIn: '09:05', checkOut: '18:15', status: 'late' },
  { date: '2024-02-08', checkIn: '08:50', checkOut: '19:00', status: 'overtime' },
  { date: '2024-02-07', checkIn: '08:58', checkOut: '18:00', status: 'normal' },
  { date: '2024-02-06', checkIn: '08:45', checkOut: '18:30', status: 'normal' },
];

// 휴가 현황
const leaveBalance = {
  annual: { total: 15, used: 8, remaining: 7 },
  sick: { total: 3, used: 1, remaining: 2 },
};

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
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'leave' | 'salary'>('info');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 수정 페이지로 이동
  const handleEdit = () => {
    navigate(`/employees/${id}/edit`);
  };

  // 삭제
  const handleDelete = async () => {
    // TODO: API 연동
    toast.success('직원이 삭제되었습니다');
    navigate('/employees');
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">직원 상세</h1>
            <p className="text-gray-500 mt-1">{mockEmployee.employeeNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit2 size={18} />
            수정
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={18} />
            삭제
          </button>
        </div>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          {/* 프로필 이미지 */}
          <div className="relative">
            <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
              {mockEmployee.profileImage ? (
                <img
                  src={mockEmployee.profileImage}
                  alt={mockEmployee.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-gray-400" />
              )}
            </div>
            <button
              onClick={handleFaceRegister}
              className="absolute -bottom-2 -right-2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              title="얼굴 등록"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* 기본 정보 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">{mockEmployee.name}</h2>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  mockEmployee.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {mockEmployee.status === 'active' ? '재직중' : '퇴사'}
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              {mockEmployee.department} · {mockEmployee.position} ·{' '}
              {employmentTypeLabels[mockEmployee.employmentType]}
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={16} className="text-gray-400" />
                {mockEmployee.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" />
                {mockEmployee.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                입사일: {format(new Date(mockEmployee.hireDate), 'yyyy.MM.dd')}
              </div>
            </div>
          </div>

          {/* 이번 달 통계 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center min-w-[100px]">
              <p className="text-2xl font-bold text-blue-600">
                {attendanceStats.thisMonth.workDays}
              </p>
              <p className="text-xs text-blue-600">이번 달 출근</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center min-w-[100px]">
              <p className="text-2xl font-bold text-orange-600">
                {attendanceStats.thisMonth.lateDays}
              </p>
              <p className="text-xs text-orange-600">지각</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center min-w-[100px]">
              <p className="text-2xl font-bold text-purple-600">
                {leaveBalance.annual.remaining}
              </p>
              <p className="text-xs text-purple-600">잔여 연차</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center min-w-[100px]">
              <p className="text-2xl font-bold text-green-600">
                {attendanceStats.thisMonth.overtimeHours}h
              </p>
              <p className="text-xs text-green-600">연장근무</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* 기본 정보 */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-4">개인 정보</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">생년월일</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {mockEmployee.birthDate
                      ? format(new Date(mockEmployee.birthDate), 'yyyy년 M월 d일')
                      : '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">성별</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {mockEmployee.gender === 'male' ? '남성' : '여성'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">주소</dt>
                  <dd className="text-sm font-medium text-gray-900">{mockEmployee.address}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-4">직무 정보</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">사원번호</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {mockEmployee.employeeNumber}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">부서</dt>
                  <dd className="text-sm font-medium text-gray-900">{mockEmployee.department}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">직급</dt>
                  <dd className="text-sm font-medium text-gray-900">{mockEmployee.position}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">고용형태</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {employmentTypeLabels[mockEmployee.employmentType]}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">입사일</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {format(new Date(mockEmployee.hireDate), 'yyyy년 M월 d일')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">근속기간</dt>
                  <dd className="text-sm font-medium text-gray-900">2년 11개월</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* 출퇴근 현황 */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* 통계 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-gray-500" />
                  <span className="text-sm text-gray-500">총 출근일</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats.total.workDays}일
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-orange-500" />
                  <span className="text-sm text-gray-500">총 지각</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {attendanceStats.total.lateDays}회
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays size={18} className="text-purple-500" />
                  <span className="text-sm text-gray-500">총 휴가 사용</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {attendanceStats.total.leaveDays}일
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-blue-500" />
                  <span className="text-sm text-gray-500">이번 달 연장</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {attendanceStats.thisMonth.overtimeHours}시간
                </p>
              </div>
            </div>

            {/* 최근 기록 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">최근 출퇴근 기록</h3>
              <table className="w-full">
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
                            statusLabels[record.status].color
                          }`}
                        >
                          {statusLabels[record.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 휴가 현황 */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* 연차 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">연차</h3>
                  <span className="text-sm text-gray-500">
                    {leaveBalance.annual.used} / {leaveBalance.annual.total}일 사용
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${
                        (leaveBalance.annual.used / leaveBalance.annual.total) * 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {leaveBalance.annual.remaining}일 <span className="text-sm font-normal text-gray-500">남음</span>
                </p>
              </div>

              {/* 병가 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">병가</h3>
                  <span className="text-sm text-gray-500">
                    {leaveBalance.sick.used} / {leaveBalance.sick.total}일 사용
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{
                      width: `${(leaveBalance.sick.used / leaveBalance.sick.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {leaveBalance.sick.remaining}일 <span className="text-sm font-normal text-gray-500">남음</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 급여 정보 */}
        {activeTab === 'salary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-4">급여 정보</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">기본급</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(mockEmployee.baseSalary)}원
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">연봉</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(mockEmployee.baseSalary * 12)}원
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-4">계좌 정보</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">은행</dt>
                    <dd className="text-sm font-medium text-gray-900">{mockEmployee.bankName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">계좌번호</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {mockEmployee.accountNumber}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">예금주</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {mockEmployee.accountHolder}
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">직원 삭제</h3>
            </div>
            <p className="text-gray-600 mb-6">
              <strong>{mockEmployee.name}</strong> 직원을 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
