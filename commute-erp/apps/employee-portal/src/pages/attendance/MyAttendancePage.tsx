// =====================================================
// 내 출퇴근 조회 페이지 (Supabase 연동)
// =====================================================

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';
import { getMyAttendance, getTodayAttendance, getAttendanceStats } from '../../lib/api';
import type { AttendanceRecord } from '../../lib/api';

type AttendanceStatus = 'working' | 'completed' | 'late' | 'absent' | 'leave' | 'holiday';

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string }> = {
  working: { label: '근무중', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  completed: { label: '정상', color: 'text-green-600', bgColor: 'bg-green-50' },
  late: { label: '지각', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  absent: { label: '결근', color: 'text-red-600', bgColor: 'bg-red-50' },
  leave: { label: '휴가', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  holiday: { label: '휴일', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

function getRecordStatus(record: AttendanceRecord): AttendanceStatus {
  if (!record.check_in) return 'absent';
  if (record.check_in && !record.check_out) return 'working';
  
  const [h, m] = (record.check_in || '09:00').split(':').map(Number);
  if (h > 9 || (h === 9 && m > 0)) return 'late';
  
  return 'completed';
}

function calculateWorkTime(checkIn: string | null, checkOut: string | null, breakMinutes: number = 60): string {
  if (!checkIn || !checkOut) return '-';
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - breakMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}시간 ${mins}분`;
}

export function MyAttendancePage() {
  const { employee } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStr = format(currentMonth, 'yyyy-MM');

  // 오늘 출퇴근
  const { data: todayRecord, isLoading: todayLoading } = useQuery({
    queryKey: ['my-today-attendance', employee?.id],
    queryFn: () => getTodayAttendance(employee!.id),
    enabled: !!employee?.id,
    refetchInterval: 30000,
  });

  // 이번 달 출퇴근 기록
  const { data: monthRecords, isLoading: monthLoading } = useQuery({
    queryKey: ['my-attendance', employee?.id, monthStr],
    queryFn: () => getMyAttendance(employee!.id, { month: monthStr }),
    enabled: !!employee?.id,
  });

  // 이번 달 통계
  const { data: stats } = useQuery({
    queryKey: ['my-attendance-stats', employee?.id, monthStr],
    queryFn: () => getAttendanceStats(employee!.id, monthStr),
    enabled: !!employee?.id,
  });

  // 현재 월의 날짜들
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 날짜별 기록 맵
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    monthRecords?.forEach(r => map.set(r.date, r));
    return map;
  }, [monthRecords]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const todayStatus = todayRecord ? getRecordStatus(todayRecord) : null;

  if (todayLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

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
          {todayStatus && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[todayStatus]?.bgColor} ${statusConfig[todayStatus]?.color}`}
            >
              {statusConfig[todayStatus]?.label}
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
              {todayRecord?.check_in || '--:--'}
            </p>
            {todayRecord?.check_in_method && (
              <p className="text-xs text-gray-400 mt-1">
                {todayRecord.check_in_method === 'face' ? '얼굴 인식' : 
                 todayRecord.check_in_method === 'password' ? '비밀번호' : '관리자'}
              </p>
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
              {todayRecord?.check_out || '--:--'}
            </p>
            {todayRecord?.check_in && todayRecord?.check_out && (
              <p className="text-xs text-gray-400 mt-1">
                근무시간: {calculateWorkTime(todayRecord.check_in, todayRecord.check_out, todayRecord.total_break_minutes || 60)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 이번 달 통계 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">이번 달 현황</h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats?.workDays || 0}</p>
            <p className="text-xs text-gray-500">출근일</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{stats?.lateDays || 0}</p>
            <p className="text-xs text-gray-500">지각</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">{stats?.totalHours || 0}h</p>
            <p className="text-xs text-gray-500">총 근무</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{stats?.averageCheckIn || '-'}</p>
            <p className="text-xs text-gray-500">평균출근</p>
          </div>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        {/* 월 선택 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h3 className="font-semibold text-gray-900">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
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

        {monthLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* 시작 요일 전 빈 칸 */}
            {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* 날짜 */}
            {daysInMonth.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const record = recordMap.get(dateStr);
              const status = record ? getRecordStatus(record) : null;
              const dayOfWeek = date.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <div
                  key={date.toISOString()}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                    isToday(date)
                      ? 'bg-primary-600 text-white'
                      : status
                      ? statusConfig[status]?.bgColor
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
                  {status && !isToday(date) && (
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        status === 'completed' ? 'bg-green-500' :
                        status === 'late' ? 'bg-orange-500' :
                        status === 'working' ? 'bg-blue-500' :
                        status === 'absent' ? 'bg-red-500' : 'bg-gray-400'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 최근 기록 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">최근 출퇴근 기록</h3>
        {!monthRecords || monthRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>출퇴근 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthRecords.slice(0, 7).map((record) => {
              const status = getRecordStatus(record);
              return (
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
                        {record.check_in || '--:--'} ~ {record.check_out || '--:--'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${statusConfig[status]?.bgColor} ${statusConfig[status]?.color}`}
                  >
                    {statusConfig[status]?.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
