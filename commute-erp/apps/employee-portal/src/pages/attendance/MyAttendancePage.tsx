// =====================================================
// 내 출퇴근 조회 페이지
// =====================================================

import { useState, useMemo } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';

// 데모 출퇴근 데이터
const mockAttendanceData = [
  {
    id: '1',
    date: new Date().toISOString().split('T')[0],
    checkIn: '08:55',
    checkOut: null,
    status: 'working',
    location: '본사',
  },
  {
    id: '2',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    checkIn: '09:02',
    checkOut: '18:15',
    status: 'completed',
    location: '본사',
    overtime: '0:15',
  },
  {
    id: '3',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    checkIn: '08:48',
    checkOut: '19:30',
    status: 'completed',
    location: '본사',
    overtime: '1:30',
  },
  {
    id: '4',
    date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    checkIn: '09:15',
    checkOut: '18:00',
    status: 'late',
    location: '본사',
  },
  {
    id: '5',
    date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
    checkIn: null,
    checkOut: null,
    status: 'absent',
    location: null,
  },
];

type AttendanceStatus = 'working' | 'completed' | 'late' | 'absent' | 'leave' | 'holiday';

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string }> = {
  working: { label: '근무중', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  completed: { label: '정상', color: 'text-green-600', bgColor: 'bg-green-50' },
  late: { label: '지각', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  absent: { label: '결근', color: 'text-red-600', bgColor: 'bg-red-50' },
  leave: { label: '휴가', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  holiday: { label: '휴일', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

export function MyAttendancePage() {
  const { employee } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 현재 월의 날짜들
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 이전/다음 월 이동
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // 특정 날짜의 출퇴근 기록 찾기
  const getAttendanceForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return mockAttendanceData.find((a) => a.date === dateStr);
  };

  // 오늘 출퇴근 현황
  const todayAttendance = mockAttendanceData.find(
    (a) => a.date === new Date().toISOString().split('T')[0]
  );

  // 이번 달 통계
  const monthStats = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    const monthData = mockAttendanceData.filter((a) => a.date.startsWith(monthStr));

    return {
      workDays: monthData.filter((a) => a.status === 'completed' || a.status === 'working').length,
      lateDays: monthData.filter((a) => a.status === 'late').length,
      absentDays: monthData.filter((a) => a.status === 'absent').length,
      leaveDays: monthData.filter((a) => a.status === 'leave').length,
    };
  }, [currentMonth]);

  return (
    <div className="py-4 space-y-4">
      {/* 오늘 현황 카드 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">
              {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
            </p>
            <h2 className="text-xl font-bold text-gray-900">{employee?.name}님의 출퇴근</h2>
          </div>
          {todayAttendance && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusConfig[todayAttendance.status as AttendanceStatus]?.bgColor
              } ${statusConfig[todayAttendance.status as AttendanceStatus]?.color}`}
            >
              {statusConfig[todayAttendance.status as AttendanceStatus]?.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 출근 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <LogIn size={18} className="text-green-600" />
              </div>
              <span className="text-sm text-gray-500">출근</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {todayAttendance?.checkIn || '--:--'}
            </p>
            {todayAttendance?.location && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400">{todayAttendance.location}</span>
              </div>
            )}
          </div>

          {/* 퇴근 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut size={18} className="text-red-600" />
              </div>
              <span className="text-sm text-gray-500">퇴근</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {todayAttendance?.checkOut || '--:--'}
            </p>
            {todayAttendance?.checkOut && (
              <p className="text-xs text-gray-400 mt-1">근무시간: 9시간 15분</p>
            )}
          </div>
        </div>
      </div>

      {/* 이번 달 통계 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">이번 달 현황</h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{monthStats.workDays}</p>
            <p className="text-xs text-gray-500">출근일</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{monthStats.lateDays}</p>
            <p className="text-xs text-gray-500">지각</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{monthStats.absentDays}</p>
            <p className="text-xs text-gray-500">결근</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-500">{monthStats.leaveDays}</p>
            <p className="text-xs text-gray-500">휴가</p>
          </div>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        {/* 월 선택 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h3 className="font-semibold text-gray-900">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-medium py-2 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 시작 요일 전 빈 칸 */}
          {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* 날짜 */}
          {daysInMonth.map((date) => {
            const attendance = getAttendanceForDate(date);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div
                key={date.toISOString()}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                  isToday(date)
                    ? 'bg-primary-600 text-white'
                    : attendance
                    ? statusConfig[attendance.status as AttendanceStatus]?.bgColor
                    : isWeekend
                    ? 'bg-gray-50'
                    : ''
                }`}
              >
                <span
                  className={`${
                    isToday(date)
                      ? 'text-white'
                      : dayOfWeek === 0
                      ? 'text-red-500'
                      : dayOfWeek === 6
                      ? 'text-blue-500'
                      : 'text-gray-700'
                  }`}
                >
                  {format(date, 'd')}
                </span>
                {attendance && !isToday(date) && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      attendance.status === 'completed'
                        ? 'bg-green-500'
                        : attendance.status === 'late'
                        ? 'bg-orange-500'
                        : attendance.status === 'absent'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 최근 기록 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">최근 출퇴근 기록</h3>
        <div className="space-y-3">
          {mockAttendanceData.slice(0, 5).map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(record.date), 'M월 d일 (E)', { locale: ko })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {record.checkIn || '--:--'} ~ {record.checkOut || '--:--'}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  statusConfig[record.status as AttendanceStatus]?.bgColor
                } ${statusConfig[record.status as AttendanceStatus]?.color}`}
              >
                {statusConfig[record.status as AttendanceStatus]?.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
