// =====================================================
// 계산 유틸리티
// =====================================================

import { timeToMinutes, getMinutesBetween, minutesToHours } from './time';
import type { AttendanceRecord, PayrollSettings } from '../types';

/**
 * 기본 급여 설정
 */
export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  overtime_rate: 1.5,
  night_work_rate: 1.5,
  holiday_work_rate: 2.0,
  weekly_regular_hours: 40,
  daily_regular_hours: 8,
};

/**
 * 일일 근무시간 계산
 */
export function calculateDailyWorkHours(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  breakMinutes: number = 0
): {
  totalMinutes: number;
  totalHours: number;
  regularMinutes: number;
  regularHours: number;
  overtimeMinutes: number;
  overtimeHours: number;
} {
  if (!checkIn || !checkOut) {
    return {
      totalMinutes: 0,
      totalHours: 0,
      regularMinutes: 0,
      regularHours: 0,
      overtimeMinutes: 0,
      overtimeHours: 0,
    };
  }

  const totalMinutes = Math.max(0, getMinutesBetween(checkIn, checkOut) - breakMinutes);
  const dailyRegularMinutes = DEFAULT_PAYROLL_SETTINGS.daily_regular_hours * 60;
  
  const regularMinutes = Math.min(totalMinutes, dailyRegularMinutes);
  const overtimeMinutes = Math.max(0, totalMinutes - dailyRegularMinutes);

  return {
    totalMinutes,
    totalHours: minutesToHours(totalMinutes),
    regularMinutes,
    regularHours: minutesToHours(regularMinutes),
    overtimeMinutes,
    overtimeHours: minutesToHours(overtimeMinutes),
  };
}

/**
 * 야간근무시간 계산
 */
export function calculateNightHours(
  checkIn: string,
  checkOut: string,
  nightStart: string = '22:00',
  nightEnd: string = '06:00'
): number {
  const checkInMin = timeToMinutes(checkIn);
  let checkOutMin = timeToMinutes(checkOut);
  const nightStartMin = timeToMinutes(nightStart);
  const nightEndMin = timeToMinutes(nightEnd);

  // 자정을 넘는 경우
  if (checkOutMin < checkInMin) {
    checkOutMin += 24 * 60;
  }

  let nightMinutes = 0;

  // 22:00 ~ 24:00 구간
  if (checkOutMin > nightStartMin) {
    const start = Math.max(checkInMin, nightStartMin);
    const end = Math.min(checkOutMin, 24 * 60);
    nightMinutes += Math.max(0, end - start);
  }

  // 00:00 ~ 06:00 구간
  if (checkOutMin > 24 * 60) {
    const adjustedCheckOut = checkOutMin - 24 * 60;
    nightMinutes += Math.min(adjustedCheckOut, nightEndMin);
  } else if (checkInMin < nightEndMin) {
    const end = Math.min(timeToMinutes(checkOut), nightEndMin);
    nightMinutes += Math.max(0, end - checkInMin);
  }

  return minutesToHours(nightMinutes);
}

/**
 * 주간 근무시간 통계 계산
 */
export function calculateWeeklyStats(
  records: AttendanceRecord[],
  settings: PayrollSettings = DEFAULT_PAYROLL_SETTINGS
): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  workDays: number;
} {
  let totalMinutes = 0;
  let nightMinutes = 0;
  let workDays = 0;

  records.forEach((record) => {
    if (record.check_in && record.check_out) {
      const dailyMinutes = getMinutesBetween(record.check_in, record.check_out) - (record.total_break_minutes || 0);
      totalMinutes += Math.max(0, dailyMinutes);
      
      nightMinutes += calculateNightHours(record.check_in, record.check_out) * 60;
      workDays++;
    }
  });

  const totalHours = minutesToHours(totalMinutes);
  const regularHours = Math.min(totalHours, settings.weekly_regular_hours);
  const overtimeHours = Math.max(0, totalHours - settings.weekly_regular_hours);

  return {
    totalHours,
    regularHours,
    overtimeHours,
    nightHours: minutesToHours(nightMinutes),
    workDays,
  };
}

/**
 * 월간 근무시간 통계 계산
 */
export function calculateMonthlyStats(
  records: AttendanceRecord[],
  settings: PayrollSettings = DEFAULT_PAYROLL_SETTINGS
): {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  workDays: number;
  lateCount: number;
  earlyLeaveCount: number;
} {
  let totalMinutes = 0;
  let nightMinutes = 0;
  let workDays = 0;
  let lateCount = 0;
  let earlyLeaveCount = 0;

  records.forEach((record) => {
    if (record.check_in && record.check_out) {
      const dailyMinutes = getMinutesBetween(record.check_in, record.check_out) - (record.total_break_minutes || 0);
      totalMinutes += Math.max(0, dailyMinutes);
      
      nightMinutes += calculateNightHours(record.check_in, record.check_out) * 60;
      workDays++;

      // 지각/조퇴 체크 (기본 09:00 ~ 18:00)
      if (timeToMinutes(record.check_in) > timeToMinutes('09:00')) {
        lateCount++;
      }
      if (timeToMinutes(record.check_out) < timeToMinutes('18:00')) {
        earlyLeaveCount++;
      }
    }
  });

  const totalHours = minutesToHours(totalMinutes);
  const weeklyRegular = settings.weekly_regular_hours;
  const weeks = Math.ceil(workDays / 5);
  const regularHours = Math.min(totalHours, weeklyRegular * weeks);
  const overtimeHours = Math.max(0, totalHours - regularHours);

  return {
    totalHours,
    regularHours,
    overtimeHours,
    nightHours: minutesToHours(nightMinutes),
    holidayHours: 0, // TODO: 휴일 근무 계산
    workDays,
    lateCount,
    earlyLeaveCount,
  };
}

/**
 * 급여 계산
 */
export function calculatePayroll(
  workStats: {
    regularHours: number;
    overtimeHours: number;
    nightHours: number;
    holidayHours: number;
  },
  hourlyRate: number,
  settings: PayrollSettings = DEFAULT_PAYROLL_SETTINGS,
  allowances: {
    bonus?: number;
    incentive?: number;
    transportation?: number;
    meal?: number;
    other?: number;
  } = {}
): {
  basePay: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  totalAllowances: number;
  grossPay: number;
} {
  const basePay = Math.round(workStats.regularHours * hourlyRate);
  const overtimePay = Math.round(workStats.overtimeHours * hourlyRate * settings.overtime_rate);
  const nightPay = Math.round(workStats.nightHours * hourlyRate * (settings.night_work_rate - 1)); // 야간 가산분만
  const holidayPay = Math.round(workStats.holidayHours * hourlyRate * settings.holiday_work_rate);
  
  const totalAllowances = (allowances.bonus || 0) +
    (allowances.incentive || 0) +
    (allowances.transportation || 0) +
    (allowances.meal || 0) +
    (allowances.other || 0);

  const grossPay = basePay + overtimePay + nightPay + holidayPay + totalAllowances;

  return {
    basePay,
    overtimePay,
    nightPay,
    holidayPay,
    totalAllowances,
    grossPay,
  };
}

/**
 * 연속 근무일 계산
 */
export function calculateContinuousWorkDays(
  records: AttendanceRecord[],
  targetDate: string
): number {
  // 날짜순 정렬
  const sortedRecords = [...records]
    .filter((r) => r.check_in && r.check_out)
    .sort((a, b) => b.date.localeCompare(a.date));

  let continuousDays = 0;
  let currentDate = targetDate;

  for (const record of sortedRecords) {
    if (record.date === currentDate) {
      continuousDays++;
      // 이전 날짜로 이동
      const [year, month, day] = currentDate.split('-').map(Number);
      const prevDate = new Date(year, month - 1, day - 1);
      currentDate = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
    } else if (record.date < currentDate) {
      break;
    }
  }

  return continuousDays;
}

/**
 * 컴플라이언스 체크
 */
export function checkCompliance(
  weeklyHours: number,
  continuousWorkDays: number,
  settings: {
    maxWeeklyHours: number;
    maxContinuousWorkDays: number;
  } = { maxWeeklyHours: 52, maxContinuousWorkDays: 6 }
): {
  status: 'good' | 'warning' | 'violation';
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];

  // 주 52시간 체크
  if (weeklyHours > settings.maxWeeklyHours) {
    violations.push(`주간 근무시간 ${weeklyHours.toFixed(1)}시간 (한도: ${settings.maxWeeklyHours}시간)`);
  } else if (weeklyHours > 40) {
    warnings.push(`주간 연장근무 ${(weeklyHours - 40).toFixed(1)}시간`);
  }

  // 연속 근무일 체크
  if (continuousWorkDays > settings.maxContinuousWorkDays) {
    violations.push(`연속 근무일 ${continuousWorkDays}일 (한도: ${settings.maxContinuousWorkDays}일)`);
  } else if (continuousWorkDays >= 5) {
    warnings.push(`연속 근무 ${continuousWorkDays}일째`);
  }

  return {
    status: violations.length > 0 ? 'violation' : warnings.length > 0 ? 'warning' : 'good',
    violations,
    warnings,
  };
}
