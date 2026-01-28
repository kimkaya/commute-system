// =====================================================
// 스케줄 관리 페이지
// =====================================================

import { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Clock,
  Sun,
  Moon,
  X,
  Copy,
  Trash2,
  Edit2,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

// 근무 유형
const shiftTypes = [
  { id: 'day', label: '주간', time: '09:00-18:00', color: 'bg-blue-500', icon: Sun },
  { id: 'night', label: '야간', time: '18:00-03:00', color: 'bg-purple-500', icon: Moon },
  { id: 'morning', label: '오전', time: '06:00-14:00', color: 'bg-cyan-500', icon: Sun },
  { id: 'afternoon', label: '오후', time: '14:00-22:00', color: 'bg-orange-500', icon: Moon },
  { id: 'off', label: '휴무', time: '-', color: 'bg-gray-400', icon: Clock },
];

// 직원 목록
const employees = [
  { id: '1', name: '홍길동', department: '개발팀', position: '선임' },
  { id: '2', name: '김영희', department: '영업팀', position: '대리' },
  { id: '3', name: '박철수', department: '개발팀', position: '주임' },
  { id: '4', name: '이민수', department: '인사팀', position: '과장' },
  { id: '5', name: '최지영', department: '마케팅팀', position: '사원' },
];

// 데모 스케줄 데이터
const generateMockSchedules = () => {
  const schedules: Record<string, Record<string, string>> = {};
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const days = eachDayOfInterval({ start, end });

  employees.forEach((emp) => {
    schedules[emp.id] = {};
    days.forEach((day) => {
      const dayOfWeek = day.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        schedules[emp.id][format(day, 'yyyy-MM-dd')] = 'off';
      } else {
        schedules[emp.id][format(day, 'yyyy-MM-dd')] = 'day';
      }
    });
  });

  return schedules;
};

export function SchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState(generateMockSchedules);
  const [selectedCell, setSelectedCell] = useState<{
    employeeId: string;
    date: string;
  } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkShift, setBulkShift] = useState('day');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');

  // 현재 월의 날짜들
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // 이번 주 날짜만 (간단 뷰)
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, []);

  // 월 이동
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // 스케줄 변경
  const handleShiftChange = (employeeId: string, date: string, shiftId: string) => {
    setSchedules((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: shiftId,
      },
    }));
    setSelectedCell(null);
    toast.success('스케줄이 변경되었습니다');
  };

  // 일괄 적용
  const handleBulkApply = () => {
    if (selectedEmployees.length === 0) {
      toast.error('직원을 선택해주세요');
      return;
    }
    if (!bulkStartDate || !bulkEndDate) {
      toast.error('날짜를 선택해주세요');
      return;
    }

    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    const days = eachDayOfInterval({ start, end });

    setSchedules((prev) => {
      const newSchedules = { ...prev };
      selectedEmployees.forEach((empId) => {
        days.forEach((day) => {
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
  };

  // 이번 주 통계
  const weekStats = useMemo(() => {
    const stats = { day: 0, night: 0, morning: 0, afternoon: 0, off: 0 };
    employees.forEach((emp) => {
      weekDays.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const shift = schedules[emp.id]?.[dateStr] || 'day';
        stats[shift as keyof typeof stats]++;
      });
    });
    return stats;
  }, [schedules, weekDays]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">스케줄 관리</h1>
          <p className="text-gray-500 mt-1">직원들의 근무 스케줄을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowBulkModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Copy size={18} />
          일괄 적용
        </button>
      </div>

      {/* 이번 주 통계 */}
      <div className="grid grid-cols-5 gap-4">
        {shiftTypes.map((shift) => {
          const Icon = shift.icon;
          return (
            <div
              key={shift.id}
              className="bg-white rounded-xl p-4 border border-gray-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 ${shift.color} rounded-lg flex items-center justify-center`}
                >
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{shift.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {weekStats[shift.id as keyof typeof weekStats]}
              </p>
              <p className="text-xs text-gray-500">이번 주 배정</p>
            </div>
          );
        })}
      </div>

      {/* 캘린더 헤더 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {shiftTypes.map((shift) => (
              <div key={shift.id} className="flex items-center gap-1 text-xs">
                <div className={`w-3 h-3 ${shift.color} rounded`} />
                <span className="text-gray-600">{shift.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 스케줄 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 w-40 border-r border-gray-200">
                  직원
                </th>
                {weekDays.map((day) => (
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
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-gray-100">
                  <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200">
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
                        <p className="text-xs text-gray-500">{employee.department}</p>
                      </div>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const shiftId = schedules[employee.id]?.[dateStr] || 'day';
                    const shift = shiftTypes.find((s) => s.id === shiftId);
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
                          className={`w-full py-2 px-3 rounded-lg text-xs font-medium text-white transition-all ${
                            shift?.color || 'bg-gray-400'
                          } hover:opacity-80 ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
                        >
                          {shift?.label}
                          <div className="text-[10px] opacity-80">{shift?.time}</div>
                        </button>

                        {/* 드롭다운 */}
                        {isSelected && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 min-w-[120px]">
                            {shiftTypes.map((s) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 일괄 적용 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedEmployees.includes(emp.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees([...selectedEmployees, emp.id]);
                          } else {
                            setSelectedEmployees(
                              selectedEmployees.filter((id) => id !== emp.id)
                            );
                          }
                        }}
                        className="rounded text-primary-600"
                      />
                      <span className="text-sm">{emp.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setSelectedEmployees(
                      selectedEmployees.length === employees.length
                        ? []
                        : employees.map((e) => e.id)
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
                <div className="grid grid-cols-5 gap-2">
                  {shiftTypes.map((shift) => (
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    min={bulkStartDate}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleBulkApply}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
