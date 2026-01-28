// =====================================================
// 검증 유틸리티
// =====================================================

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * 시간 형식 검증 (HH:mm)
 */
export function isValidTime(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
}

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 전화번호 형식 검증 (한국)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // 010-1234-5678, 01012345678, 02-123-4567 등
  const regex = /^(0[1-9]{1,2})-?([0-9]{3,4})-?([0-9]{4})$/;
  return regex.test(phone.replace(/\s/g, ''));
}

/**
 * 사업자등록번호 형식 검증
 */
export function isValidBusinessNumber(bn: string): boolean {
  if (!bn || typeof bn !== 'string') return false;
  const cleaned = bn.replace(/-/g, '');
  if (!/^\d{10}$/.test(cleaned)) return false;
  
  // 사업자등록번호 체크섬 검증
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  sum += Math.floor((parseInt(cleaned[8]) * 5) / 10);
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[9]);
}

/**
 * 비밀번호 강도 검증
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('비밀번호는 8자 이상이어야 합니다');
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('영문자를 포함해야 합니다');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 포함해야 합니다');
  }
  
  // 강도 계산
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 2) strength = 'medium';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * 이름 검증
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
}

/**
 * 문자열 sanitize (XSS 방지)
 */
export function sanitizeString(str: string, maxLength: number = 100): string {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>\"\'&]/g, '');
}

/**
 * 숫자 범위 검증
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * UUID 형식 검증
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * 양수 검증
 */
export function isPositive(value: number): boolean {
  return typeof value === 'number' && value > 0;
}

/**
 * 음수가 아닌 수 검증
 */
export function isNonNegative(value: number): boolean {
  return typeof value === 'number' && value >= 0;
}

/**
 * 배열이 비어있지 않은지 검증
 */
export function isNonEmptyArray<T>(arr: T[]): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * 객체가 비어있지 않은지 검증
 */
export function isNonEmptyObject(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null && Object.keys(obj).length > 0;
}

/**
 * 출퇴근 기록 검증
 */
export function validateAttendanceRecord(record: {
  date: string;
  checkIn?: string;
  checkOut?: string;
  totalBreakMinutes?: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isValidDate(record.date)) {
    errors.push('잘못된 날짜 형식입니다');
  }
  
  if (record.checkIn && !isValidTime(record.checkIn)) {
    errors.push('잘못된 출근 시간 형식입니다');
  }
  
  if (record.checkOut && !isValidTime(record.checkOut)) {
    errors.push('잘못된 퇴근 시간 형식입니다');
  }
  
  if (record.totalBreakMinutes !== undefined && !isInRange(record.totalBreakMinutes, 0, 1440)) {
    errors.push('휴게시간은 0분에서 1440분 사이여야 합니다');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 직원 정보 검증
 */
export function validateEmployee(employee: {
  name: string;
  email?: string;
  phone?: string;
  hourlyRate?: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isValidName(employee.name)) {
    errors.push('이름은 2~50자 사이여야 합니다');
  }
  
  if (employee.email && !isValidEmail(employee.email)) {
    errors.push('잘못된 이메일 형식입니다');
  }
  
  if (employee.phone && !isValidPhone(employee.phone)) {
    errors.push('잘못된 전화번호 형식입니다');
  }
  
  if (employee.hourlyRate !== undefined && !isPositive(employee.hourlyRate)) {
    errors.push('시급은 양수여야 합니다');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
