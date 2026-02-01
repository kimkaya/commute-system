// =====================================================
// 스케줄 관리 페이지 (API 연동) - 모바일 반응형
// =====================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  X,
  Copy,
  Loader2,
  AlertCircle,
  Clock,
  Coffee,
  List,
  Calendar,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  getEmployees,
  getSchedules,
  createSchedule,
} from '../../lib/api';
import type { Employee, Schedule } from '../../lib/api';

// 근무 유형
const shiftTypes = [
  { id: 'full', label: '주간', time: '09:00-18:00', color: 'bg-blue-500', icon: Sun },
  { id: 'morning', label: '오전', time: '06:00-14:00', color: 'bg-cyan-500', icon: Sun },
  { id: 'afternoon', label: '오후', time: '14:00-22:00', color: 'bg-orange-500', icon: Coffee },
  { id: 'night', label: '야간', time: '22:00-06:00', color: 'bg-purple-500', icon: Moon },
  { id: 'off', label: '휴무', time: '-', color: 'bg-gray-400', icon: Clock },
];

// shift 타입 매핑
const shiftTimeMap: Record<string, { start: string; end: string; break: number }> = {
  full: { start: '09:00', end: '18:00', break: 60 },
  morning: { start: '06:00', end: '14:00', break: 30 },
  afternoon: { start: '14:00', end: '22:00', break: 30 },
  night: { start: '22:00', end: '06:00', break: 30 },
  off: { start: '', end: '', break: 0 },
};

export function SchedulePage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCell, setSelectedCell] = useState<{
    employeeId: string;
    date: string;
  } | null>(null);
  
  // 일괄 적용 모달
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkShift, setBulkShift] = useState('full');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  
  // 모바일: 일간 뷰 인덱스 (0~6)
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  // 모바일: 뷰 모드 (calendar | list)
  const [mobileViewMode, setMobileViewMode] = useState<'calendar' | 'list'>('list');

  // 이번 주 날짜
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 직원 목록 로드
      const emps = await getEmployees({ is_active: true });
      setEmployees(emps);
      
      // 스케줄 로드
      const startDate = format(weekDays[0], 'yyyy-MM-dd');
      const endDate = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');
      const scheds = await getSchedules({ start_date: startDate, end_date: endDate });
      
      // 스케줄 데이터 변환 (employeeId -> date -> shift)
      const scheduleMap: Record<string, Record<string, string>> = {};
      
      // 기본값 설정 (주말은 휴무, 평일은 주간)
      emps.forEach(emp => {
        scheduleMap[emp.id] = {};
        weekDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayOfWeek = day.getDay();
          scheduleMap[emp.id][dateStr] = (dayOfWeek === 0 || dayOfWeek === 6) ? 'off' : 'full';
        });
      });
      
      // DB에서 가져온 스케줄 적용
      scheds.forEach((sched: Schedule) => {
        if (scheduleMap[sched.employee_id]) {
          scheduleMap[sched.employee_id][sched.date] = sched.shift;
        }
      });
      
      setSchedules(scheduleMap);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [weekDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 주 이동
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  // 스케줄 변경
  const handleShiftChange = async (employeeId: string, date: string, shiftId: string) => {
    setIsSaving(true);
    
    try {
      const shiftInfo = shiftTimeMap[shiftId];
      
      await createSchedule({
        employee_id: employeeId,
        date,
        shift: shiftId as Schedule['shift'],
        start_time: shiftInfo.start || null,
        end_time: shiftInfo.end || null,
        break_duration: shiftInfo.break,
        status: 'scheduled',
      });
      
      // 로컬 상태 업데이트
      setSchedules(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: shiftId,
        },
      }));
      
      setSelectedCell(null);
      toast.success('스케줄이 변경되었습니다');
    } catch (err) {
      console.error('Failed to update schedule:', err);
      toast.error('스케줄 변경에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // 일괄 적용
  const handleBulkApply = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('직원을 선택해주세요');
      return;
    }
    if (!bulkStartDate || !bulkEndDate) {
      toast.error('날짜를 선택해주세요');
      return;
    }

    setIsSaving(true);
    
    try {
      const start = new Date(bulkStartDate);
      const end = new Date(bulkEndDate);
      const days = eachDayOfInterval({ start, end });
      const shiftInfo = shiftTimeMap[bulkShift];

      // 모든 스케줄 저장
      const promises: Promise<Schedule>[] = [];
      
      for (const empId of selectedEmployees) {
        for (const day of days) {
          promises.push(
            createSchedule({
              employee_id: empId,
              date: format(day, 'yyyy-MM-dd'),
              shift: bulkShift as Schedule['shift'],
              start_time: shiftInfo.start || null,
              end_time: shiftInfo.end || null,
              break_duration: shiftInfo.break,
              status: 'scheduled',
            })
          );
        }
      }
      
      await Promise.all(promises);

      // 로컬 상태 업데이트
      setSchedules(prev => {
        const newSchedules = { ...prev };
        selectedEmployees.forEach(empId => {
          days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            if (!newSchedules[empId]) {
              newSchedules[empId] = {};
            }
            newSchedules[empId][dateStr] = bulkShift;
          });
        });
        return newSchedules;
      });

      toast.success(`${selectedEmployees.length}명의 스케줄이 일괄 적용되었습니다`);
      setShowBulkModal(false);
      setSelectedEmployees([]);
      setBulkStartDate('');
      setBulkEndDate('');
    } catch (err) {
      console.error('Failed to bulk apply:', err);
      toast.error('일괄 적용에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // 이번 주 통계
  const weekStats = useMemo(() => {
    const stats = { full: 0, night: 0, morning: 0, afternoon: 0, off: 0 };
    employees.forEach(emp => {
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const shift = schedules[emp.id]?.[dateStr] || 'full';
        if (stats[shift as keyof typeof stats] !== undefined) {
          stats[shift as keyof typeof stats]++;
        }
      });
    });
    return stats;
  }, [schedules, weekDays, employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <p className="text-gray-500">스케줄을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">스케줄 관리</h1>
          <p className="text-sm text-gray-500 mt-1 hidden sm:block">직원들의 근무 스케줄을 관리합니다</p>
        </div>
        <button
          onClick={() => {
            setShowBulkModal(true);
            setBulkStartDate(format(weekDays[0], 'yyyy-MM-dd'));
            setBulkEndDate(format(weekDays[weekDays.length - 1], 'yyyy-MM-dd'));
          }}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base"
        >
          <Copy size={18} />
          <span>일괄 적용</span>
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* 이번 주 통계 - 모바일: 2x3 그리드, 데스크톱: 5열 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        {shiftTypes.map(shift => {
          const Icon = shift.icon;
          return (
            <div
              key={shift.id}
              className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200"
            >
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 ${shift.color} rounded-lg flex items-center justify-center`}
                >
                  <Icon size={14} className="text-white sm:hidden" />
                  <Icon size={16} className="text-white hidden sm:block" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">{shift.label}</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {weekStats[shift.id as keyof typeof weekStats] || 0}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">이번 주</p>
            </div>
          );
        })}
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 주간 네비게이션 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <button
              onClick={prevWeek}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900 text-center">
              <span className="hidden sm:inline">
                {format(weekDays[0], 'yyyy년 M월 d일', { locale: ko })} ~{' '}
                {format(weekDays[weekDays.length - 1], 'M월 d일', { locale: ko })}
              </span>
              <span className="sm:hidden">
                {format(weekDays[0], 'M/d', { locale: ko })} ~ {format(weekDays[weekDays.length - 1], 'M/d', { locale: ko })}
              </span>
            </h2>
            <button
              onClick={nextWeek}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={goToToday}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              오늘
            </button>
          </div>
          
          {/* 범례 - 데스크톱만 표시 */}
          <div className="hidden lg:flex items-center gap-2">
            {shiftTypes.map(shift => (
              <div key={shift.id} className="flex items-center gap-1 text-xs">
                <div className={`w-3 h-3 ${shift.color} rounded`} />
                <span className="text-gray-600">{shift.label}</span>
              </div>
            ))}
          </div>
          
          {/* 모바일: 뷰 모드 토글 */}
          <div className="flex lg:hidden items-center gap-2 justify-center sm:justify-end">
            <button
              onClick={() => setMobileViewMode('list')}
              className={`p-2 rounded-lg ${mobileViewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setMobileViewMode('calendar')}
              className={`p-2 rounded-lg ${mobileViewMode === 'calendar' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Calendar size={18} />
            </button>
          </div>
        </div>

        {/* 모바일: 일간 날짜 선택 탭 (리스트 뷰일 때) */}
        {mobileViewMode === 'list' && (
          <div className="lg:hidden flex overflow-x-auto border-b border-gray-200 scrollbar-hide">
            {weekDays.map((day, idx) => (
              <button
                key={day.toISOString()}
                onClick={() => setMobileDayIndex(idx)}
                className={`flex-1 min-w-[50px] py-2 px-1 text-center border-b-2 transition-colors ${
                  mobileDayIndex === idx
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-transparent hover:bg-gray-50'
                } ${
                  isToday(day)
                    ? 'text-primary-600 font-bold'
                    : day.getDay() === 0
                    ? 'text-red-500'
                    : day.getDay() === 6
                    ? 'text-blue-500'
                    : 'text-gray-700'
                }`}
              >
                <div className="text-[10px] sm:text-xs">{format(day, 'E', { locale: ko })}</div>
                <div className="text-sm sm:text-base font-medium">{format(day, 'd')}</div>
              </button>
            ))}
          </div>
        )}

        {/* 모바일: 리스트 뷰 */}
        <div className={`lg:hidden ${mobileViewMode === 'list' ? 'block' : 'hidden'}`}>
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {employees.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                등록된 직원이 없습니다
              </div>
            ) : (
              employees.map(employee => {
                const dateStr = format(weekDays[mobileDayIndex], 'yyyy-MM-dd');
                const shiftId = schedules[employee.id]?.[dateStr] || 'full';
                const shift = shiftTypes.find(s => s.id === shiftId);
                const isSelected =
                  selectedCell?.employeeId === employee.id &&
                  selectedCell?.date === dateStr;

                return (
                  <div key={employee.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {employee.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.department || '-'}</p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() =>
                          setSelectedCell(
                            isSelected ? null : { employeeId: employee.id, date: dateStr }
                          )
                        }
                        disabled={isSaving}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium text-white transition-all ${
                          shift?.color || 'bg-gray-400'
                        } ${isSelected ? 'ring-2 ring-primary-500' : ''} ${
                          isSaving ? 'opacity-50' : ''
                        }`}
                      >
                        {shift?.label}
                        <span className="ml-1 opacity-80">{shift?.time !== '-' ? shift?.time?.split('-')[0] : ''}</span>
                      </button>

                      {/* 드롭다운 */}
                      {isSelected && !isSaving && (
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1 min-w-[120px]">
                          {shiftTypes.map(s => (
                            <button
                              key={s.id}
                              onClick={() => handleShiftChange(employee.id, dateStr, s.id)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                s.id === shiftId ? 'bg-gray-50' : ''
                              }`}
                            >
                              <div className={`w-3 h-3 ${s.color} rounded`} />
                              <span>{s.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 모바일: 캘린더 뷰 (가로 스크롤) */}
        <div className={`lg:hidden ${mobileViewMode === 'calendar' ? 'block' : 'hidden'} overflow-x-auto`}>
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-700 w-24 border-r border-gray-200 z-10">
                  직원
                </th>
                {weekDays.map(day => (
                  <th
                    key={day.toISOString()}
                    className={`px-1 py-2 text-center text-xs font-medium min-w-[60px] ${
                      isToday(day)
                        ? 'bg-primary-50 text-primary-700'
                        : day.getDay() === 0
                        ? 'text-red-500'
                        : day.getDay() === 6
                        ? 'text-blue-500'
                        : 'text-gray-700'
                    }`}
                  >
                    <div>{format(day, 'E', { locale: ko })}</div>
                    <div className="text-sm">{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                    등록된 직원이 없습니다
                  </td>
                </tr>
              ) : (
                employees.map(employee => (
                  <tr key={employee.id} className="border-t border-gray-100">
                    <td className="sticky left-0 bg-white px-2 py-2 border-r border-gray-200 z-10">
                      <p className="text-xs font-medium text-gray-900 truncate">{employee.name}</p>
                    </td>
                    {weekDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const shiftId = schedules[employee.id]?.[dateStr] || 'full';
                      const shift = shiftTypes.find(s => s.id === shiftId);

                      return (
                        <td
                          key={dateStr}
                          className={`px-1 py-1 text-center ${isToday(day) ? 'bg-primary-50' : ''}`}
                        >
                          <div
                            className={`py-1 px-1 rounded text-[10px] font-medium text-white ${shift?.color || 'bg-gray-400'}`}
                          >
                            {shift?.label}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 데스크톱: 스케줄 테이블 */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 w-48 border-r border-gray-200 z-10">
                  직원
                </th>
                {weekDays.map(day => (
                  <th
                    key={day.toISOString()}
                    className={`px-2 py-3 text-center text-sm font-medium min-w-[100px] ${
                      isToday(day)
                        ? 'bg-primary-50 text-primary-700'
                        : day.getDay() === 0
                        ? 'text-red-500'
                        : day.getDay() === 6
                        ? 'text-blue-500'
                        : 'text-gray-700'
                    }`}
                  >
                    <div>{format(day, 'E', { locale: ko })}</div>
                    <div className="text-lg">{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    등록된 직원이 없습니다
                  </td>
                </tr>
              ) : (
                employees.map(employee => (
                  <tr key={employee.id} className="border-t border-gray-100">
                    <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200 z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.department || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const shiftId = schedules[employee.id]?.[dateStr] || 'full';
                      const shift = shiftTypes.find(s => s.id === shiftId);
                      const isSelected =
                        selectedCell?.employeeId === employee.id &&
                        selectedCell?.date === dateStr;

                      return (
                        <td
                          key={dateStr}
                          className={`px-2 py-2 text-center relative ${
                            isToday(day) ? 'bg-primary-50' : ''
                          }`}
                        >
                          <button
                            onClick={() =>
                              setSelectedCell(
                                isSelected ? null : { employeeId: employee.id, date: dateStr }
                              )
                            }
                            disabled={isSaving}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-medium text-white transition-all ${
                              shift?.color || 'bg-gray-400'
                            } hover:opacity-80 ${isSelected ? 'ring-2 ring-primary-500' : ''} ${
                              isSaving ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {shift?.label}
                            <div className="text-[10px] opacity-80">{shift?.time}</div>
                          </button>

                          {/* 드롭다운 */}
                          {isSelected && !isSaving && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1 min-w-[120px]">
                              {shiftTypes.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() =>
                                    handleShiftChange(employee.id, dateStr, s.id)
                                  }
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                    s.id === shiftId ? 'bg-gray-50' : ''
                                  }`}
                                >
                                  <div className={`w-3 h-3 ${s.color} rounded`} />
                                  <span>{s.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 일괄 적용 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">스케줄 일괄 적용</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 직원 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  직원 선택
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {employees.map(emp => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        selectedEmployees.includes(emp.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedEmployees([...selectedEmployees, emp.id]);
                          } else {
                            setSelectedEmployees(
                              selectedEmployees.filter(id => id !== emp.id)
                            );
                          }
                        }}
                        className="rounded text-primary-600"
                      />
                      <span className="truncate">{emp.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setSelectedEmployees(
                      selectedEmployees.length === employees.length
                        ? []
                        : employees.map(e => e.id)
                    )
                  }
                  className="text-xs text-primary-600 mt-2"
                >
                  {selectedEmployees.length === employees.length
                    ? '전체 해제'
                    : '전체 선택'}
                </button>
              </div>

              {/* 근무 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  근무 유형
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {shiftTypes.map(shift => (
                    <button
                      key={shift.id}
                      onClick={() => setBulkShift(shift.id)}
                      className={`p-2 rounded-lg text-xs font-medium text-white ${shift.color} ${
                        bulkShift === shift.id ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                    >
                      {shift.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 날짜 범위 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={e => setBulkStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={e => setBulkEndDate(e.target.value)}
                    min={bulkStartDate}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                취소
              </button>
              <button
                onClick={handleBulkApply}
                disabled={isSaving}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
