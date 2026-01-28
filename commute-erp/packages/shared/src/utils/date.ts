// =====================================================
// 날짜 유틸리티
// =====================================================

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD 문자열을 Date 객체로 변환
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 날짜를 한국어 형식으로 포맷 (예: 2025년 1월 28일)
 */
export function formatDateKorean(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * 날짜를 짧은 한국어 형식으로 포맷 (예: 1/28)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

/**
 * 요일 반환 (0=일요일, 1=월요일, ...)
 */
export function getDayOfWeek(date: Date | string): number {
  const d = typeof date === 'string' ? parseDate(date) : date;
  return d.getDay();
}

/**
 * 요일 이름 반환
 */
export function getDayName(date: Date | string, short = false): string {
  const dayOfWeek = getDayOfWeek(date);
  const names = short 
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return names[dayOfWeek];
}

/**
 * 주의 시작일 반환 (월요일 기준)
 */
export function getWeekStart(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
  const monday = new Date(d.setDate(diff));
  return formatDate(monday);
}

/**
 * 주의 종료일 반환 (일요일 기준)
 */
export function getWeekEnd(date: Date | string): string {
  const weekStart = parseDate(getWeekStart(date));
  weekStart.setDate(weekStart.getDate() + 6);
  return formatDate(weekStart);
}

/**
 * 월의 시작일 반환
 */
export function getMonthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * 월의 종료일 반환
 */
export function getMonthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * 두 날짜 사이의 일수 계산
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 날짜 더하기
 */
export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * 날짜 범위 생성
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * 공휴일 여부 확인 (기본 공휴일 목록)
 */
export function isWeekend(date: Date | string): boolean {
  const dayOfWeek = getDayOfWeek(date);
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * 상대 시간 표시 (예: "3분 전", "2시간 전")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  
  return formatDateKorean(d);
}

/**
 * YYYY-MM 형식의 월 문자열 반환
 */
export function getMonthString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * 현재 연도와 월 반환
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}
