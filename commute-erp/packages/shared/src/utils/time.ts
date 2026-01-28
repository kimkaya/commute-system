// =====================================================
// 시간 유틸리티
// =====================================================

/**
 * 현재 시간을 HH:mm 형식으로 반환
 */
export function getCurrentTime(): string {
  const now = new Date();
  return formatTime(now);
}

/**
 * Date 객체를 HH:mm 형식으로 변환
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * HH:mm 문자열을 분(minutes)으로 변환
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 분(minutes)을 HH:mm 형식으로 변환
 */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 분을 시간:분 형식으로 표시 (예: "8시간 30분")
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

/**
 * 분을 소수점 시간으로 변환 (예: 90분 → 1.5)
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * 소수점 시간을 분으로 변환 (예: 1.5 → 90분)
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

/**
 * 두 시간 사이의 분 계산 (자정을 넘는 경우 처리)
 */
export function getMinutesBetween(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  // 자정을 넘는 경우 (예: 22:00 ~ 06:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return endMinutes - startMinutes;
}

/**
 * 근무시간 계산 (출근 ~ 퇴근 - 휴게시간)
 */
export function calculateWorkMinutes(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  breakMinutes: number = 0
): number {
  if (!checkIn || !checkOut) return 0;
  
  const totalMinutes = getMinutesBetween(checkIn, checkOut);
  return Math.max(0, totalMinutes - breakMinutes);
}

/**
 * 시간 비교 (time1 < time2)
 */
export function isBefore(time1: string, time2: string): boolean {
  return timeToMinutes(time1) < timeToMinutes(time2);
}

/**
 * 시간 비교 (time1 > time2)
 */
export function isAfter(time1: string, time2: string): boolean {
  return timeToMinutes(time1) > timeToMinutes(time2);
}

/**
 * 야간근무 시간 계산
 */
export function calculateNightMinutes(
  checkIn: string,
  checkOut: string,
  nightStart: string = '22:00',
  nightEnd: string = '06:00'
): number {
  const nightStartMin = timeToMinutes(nightStart);
  const nightEndMin = timeToMinutes(nightEnd);
  const checkInMin = timeToMinutes(checkIn);
  let checkOutMin = timeToMinutes(checkOut);
  
  // 자정을 넘는 경우
  if (checkOutMin < checkInMin) {
    checkOutMin += 24 * 60;
  }
  
  let nightMinutes = 0;
  
  // 22:00 이후 근무
  if (checkOutMin > nightStartMin) {
    const start = Math.max(checkInMin, nightStartMin);
    const end = Math.min(checkOutMin, 24 * 60);
    nightMinutes += Math.max(0, end - start);
  }
  
  // 06:00 이전 근무 (자정 이후)
  if (checkOutMin > 24 * 60) {
    const adjustedEnd = checkOutMin - 24 * 60;
    const end = Math.min(adjustedEnd, nightEndMin);
    nightMinutes += Math.max(0, end);
  }
  
  return nightMinutes;
}

/**
 * 지각 여부 확인
 */
export function isLate(checkIn: string, standardStart: string, graceMinutes: number = 0): boolean {
  const checkInMin = timeToMinutes(checkIn);
  const standardMin = timeToMinutes(standardStart);
  return checkInMin > standardMin + graceMinutes;
}

/**
 * 조퇴 여부 확인
 */
export function isEarlyLeave(checkOut: string, standardEnd: string): boolean {
  return isBefore(checkOut, standardEnd);
}

/**
 * 시간 범위 내 여부 확인
 */
export function isTimeInRange(time: string, rangeStart: string, rangeEnd: string): boolean {
  const timeMin = timeToMinutes(time);
  const startMin = timeToMinutes(rangeStart);
  let endMin = timeToMinutes(rangeEnd);
  
  // 자정을 넘는 범위 처리
  if (endMin < startMin) {
    endMin += 24 * 60;
    const adjustedTime = timeMin < startMin ? timeMin + 24 * 60 : timeMin;
    return adjustedTime >= startMin && adjustedTime <= endMin;
  }
  
  return timeMin >= startMin && timeMin <= endMin;
}

/**
 * ISO 타임스탬프에서 시간 추출
 */
export function extractTimeFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return formatTime(date);
}

/**
 * 현재 시간이 근무시간인지 확인
 */
export function isWorkingHours(
  currentTime: string,
  startTime: string,
  endTime: string
): boolean {
  return isTimeInRange(currentTime, startTime, endTime);
}
