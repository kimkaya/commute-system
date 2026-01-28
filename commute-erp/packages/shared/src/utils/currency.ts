// =====================================================
// 금액 포맷팅 유틸리티
// =====================================================

/**
 * 숫자를 원화 형식으로 포맷 (예: 1,234,567원)
 */
export function formatKRW(amount: number, includeSymbol: boolean = true): string {
  const formatted = new Intl.NumberFormat('ko-KR').format(Math.round(amount));
  return includeSymbol ? `${formatted}원` : formatted;
}

/**
 * 숫자를 천 단위로 구분 (예: 1,234,567)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

/**
 * 금액을 축약 형식으로 표시 (예: 1.2억, 340만)
 */
export function formatAmountShort(amount: number): string {
  if (amount >= 100000000) {
    const value = amount / 100000000;
    return `${value.toFixed(1).replace(/\.0$/, '')}억`;
  }
  if (amount >= 10000) {
    const value = amount / 10000;
    return `${value.toFixed(0)}만`;
  }
  return formatNumber(amount);
}

/**
 * 시급 포맷 (예: 10,000원/시간)
 */
export function formatHourlyRate(rate: number): string {
  return `${formatKRW(rate)}/시간`;
}

/**
 * 백분율 포맷 (예: 1.5배 → 150%)
 */
export function formatMultiplier(multiplier: number): string {
  return `${Math.round(multiplier * 100)}%`;
}

/**
 * 배율 포맷 (예: 1.5배)
 */
export function formatRate(rate: number): string {
  return `${rate}배`;
}

/**
 * 금액 변화 포맷 (양수: +, 음수: -)
 */
export function formatAmountChange(amount: number): string {
  const prefix = amount >= 0 ? '+' : '';
  return `${prefix}${formatKRW(amount)}`;
}

/**
 * 소득세 계산 (간소화된 간이세액표 기준)
 */
export function calculateIncomeTax(monthlyIncome: number): number {
  // 2024년 간이세액표 기준 (간소화)
  if (monthlyIncome <= 1060000) return 0;
  if (monthlyIncome <= 1500000) return monthlyIncome * 0.01;
  if (monthlyIncome <= 2000000) return monthlyIncome * 0.02;
  if (monthlyIncome <= 3000000) return monthlyIncome * 0.05;
  if (monthlyIncome <= 4500000) return monthlyIncome * 0.08;
  if (monthlyIncome <= 8000000) return monthlyIncome * 0.12;
  return monthlyIncome * 0.15;
}

/**
 * 지방소득세 계산 (소득세의 10%)
 */
export function calculateLocalTax(incomeTax: number): number {
  return Math.round(incomeTax * 0.1);
}

/**
 * 국민연금 계산 (2024년 기준)
 */
export function calculateNationalPension(monthlyIncome: number): number {
  const maxBase = 5900000; // 2024년 기준 상한
  const minBase = 370000;  // 2024년 기준 하한
  const rate = 0.045; // 4.5%
  
  const base = Math.min(Math.max(monthlyIncome, minBase), maxBase);
  return Math.round(base * rate);
}

/**
 * 건강보험 계산 (2024년 기준)
 */
export function calculateHealthInsurance(monthlyIncome: number): number {
  const rate = 0.03545; // 3.545%
  return Math.round(monthlyIncome * rate);
}

/**
 * 장기요양보험 계산 (건강보험의 12.95%)
 */
export function calculateLongTermCare(healthInsurance: number): number {
  return Math.round(healthInsurance * 0.1295);
}

/**
 * 고용보험 계산 (2024년 기준)
 */
export function calculateEmploymentInsurance(monthlyIncome: number): number {
  const rate = 0.009; // 0.9%
  return Math.round(monthlyIncome * rate);
}

/**
 * 4대보험 총액 계산
 */
export function calculateTotalInsurance(monthlyIncome: number): {
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  total: number;
} {
  const nationalPension = calculateNationalPension(monthlyIncome);
  const healthInsurance = calculateHealthInsurance(monthlyIncome);
  const longTermCare = calculateLongTermCare(healthInsurance);
  const employmentInsurance = calculateEmploymentInsurance(monthlyIncome);
  
  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    total: nationalPension + healthInsurance + longTermCare + employmentInsurance,
  };
}

/**
 * 급여에서 공제 총액 계산
 */
export function calculateTotalDeductions(monthlyIncome: number): {
  incomeTax: number;
  localTax: number;
  insurance: ReturnType<typeof calculateTotalInsurance>;
  total: number;
} {
  const incomeTax = calculateIncomeTax(monthlyIncome);
  const localTax = calculateLocalTax(incomeTax);
  const insurance = calculateTotalInsurance(monthlyIncome);
  
  return {
    incomeTax: Math.round(incomeTax),
    localTax,
    insurance,
    total: Math.round(incomeTax) + localTax + insurance.total,
  };
}

/**
 * 실수령액 계산
 */
export function calculateNetPay(grossPay: number): {
  grossPay: number;
  deductions: ReturnType<typeof calculateTotalDeductions>;
  netPay: number;
} {
  const deductions = calculateTotalDeductions(grossPay);
  return {
    grossPay,
    deductions,
    netPay: grossPay - deductions.total,
  };
}
