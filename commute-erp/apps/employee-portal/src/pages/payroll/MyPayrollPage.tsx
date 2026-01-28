// =====================================================
// 내 급여명세서 페이지
// =====================================================

import { useState } from 'react';
import {
  Wallet,
  Download,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Calendar,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';

// 데모 급여 데이터
const mockPayrollData = [
  {
    id: '1',
    period: '2024-01',
    periodLabel: '2024년 1월',
    payDate: '2024-02-10',
    baseSalary: 3500000,
    overtime: 320000,
    bonus: 0,
    totalEarnings: 3820000,
    incomeTax: 152800,
    healthInsurance: 133700,
    nationalPension: 167580,
    employmentInsurance: 30560,
    totalDeductions: 484640,
    netPay: 3335360,
    status: 'paid',
  },
  {
    id: '2',
    period: '2023-12',
    periodLabel: '2023년 12월',
    payDate: '2024-01-10',
    baseSalary: 3500000,
    overtime: 450000,
    bonus: 3500000, // 연말보너스
    totalEarnings: 7450000,
    incomeTax: 745000,
    healthInsurance: 133700,
    nationalPension: 167580,
    employmentInsurance: 59600,
    totalDeductions: 1105880,
    netPay: 6344120,
    status: 'paid',
  },
  {
    id: '3',
    period: '2023-11',
    periodLabel: '2023년 11월',
    payDate: '2023-12-10',
    baseSalary: 3500000,
    overtime: 280000,
    bonus: 0,
    totalEarnings: 3780000,
    incomeTax: 151200,
    healthInsurance: 133700,
    nationalPension: 167580,
    employmentInsurance: 30240,
    totalDeductions: 482720,
    netPay: 3297280,
    status: 'paid',
  },
];

// 금액 포맷팅
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function MyPayrollPage() {
  const { employee } = useAuthStore();
  const [selectedPayroll, setSelectedPayroll] = useState<typeof mockPayrollData[0] | null>(null);

  // 최근 급여
  const latestPayroll = mockPayrollData[0];

  // 전월 대비 변화
  const previousPayroll = mockPayrollData[1];
  const netPayDiff = latestPayroll.netPay - (previousPayroll?.netPay || 0);
  const netPayDiffPercent = previousPayroll
    ? ((netPayDiff / previousPayroll.netPay) * 100).toFixed(1)
    : 0;

  return (
    <div className="py-4 space-y-4">
      {/* 최근 급여 요약 */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-200 text-sm">{latestPayroll.periodLabel} 급여</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(latestPayroll.netPay)}원</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet size={24} />
          </div>
        </div>

        {/* 전월 대비 */}
        <div className="flex items-center gap-2 text-sm">
          {netPayDiff > 0 ? (
            <>
              <TrendingUp size={16} className="text-green-300" />
              <span className="text-green-300">
                전월 대비 +{formatCurrency(netPayDiff)}원 ({netPayDiffPercent}%)
              </span>
            </>
          ) : netPayDiff < 0 ? (
            <>
              <TrendingDown size={16} className="text-red-300" />
              <span className="text-red-300">
                전월 대비 {formatCurrency(netPayDiff)}원 ({netPayDiffPercent}%)
              </span>
            </>
          ) : (
            <>
              <MinusCircle size={16} className="text-primary-200" />
              <span className="text-primary-200">전월과 동일</span>
            </>
          )}
        </div>

        {/* 지급일 */}
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
          <Calendar size={14} />
          <span className="text-sm text-primary-200">
            지급일: {format(new Date(latestPayroll.payDate), 'yyyy년 M월 d일', { locale: ko })}
          </span>
        </div>
      </div>

      {/* 급여 상세 (최근) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">급여 내역</h3>

        {/* 지급 항목 */}
        <div className="space-y-3 mb-4">
          <p className="text-xs text-gray-500 font-medium">지급 항목</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">기본급</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(latestPayroll.baseSalary)}원
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">연장근무수당</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(latestPayroll.overtime)}원
            </span>
          </div>
          {latestPayroll.bonus > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">상여금</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(latestPayroll.bonus)}원
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">지급액 합계</span>
            <span className="text-sm font-bold text-primary-600">
              {formatCurrency(latestPayroll.totalEarnings)}원
            </span>
          </div>
        </div>

        {/* 공제 항목 */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">공제 항목</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">소득세</span>
            <span className="text-sm font-medium text-red-500">
              -{formatCurrency(latestPayroll.incomeTax)}원
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">건강보험</span>
            <span className="text-sm font-medium text-red-500">
              -{formatCurrency(latestPayroll.healthInsurance)}원
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">국민연금</span>
            <span className="text-sm font-medium text-red-500">
              -{formatCurrency(latestPayroll.nationalPension)}원
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">고용보험</span>
            <span className="text-sm font-medium text-red-500">
              -{formatCurrency(latestPayroll.employmentInsurance)}원
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">공제액 합계</span>
            <span className="text-sm font-bold text-red-500">
              -{formatCurrency(latestPayroll.totalDeductions)}원
            </span>
          </div>
        </div>

        {/* 실수령액 */}
        <div className="mt-4 pt-4 border-t-2 border-gray-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">실수령액</span>
            <span className="text-xl font-bold text-primary-600">
              {formatCurrency(latestPayroll.netPay)}원
            </span>
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <button className="w-full mt-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
          <Download size={18} />
          급여명세서 다운로드
        </button>
      </div>

      {/* 이전 급여 목록 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">급여 이력</h3>
        <div className="space-y-2">
          {mockPayrollData.map((payroll) => (
            <button
              key={payroll.id}
              onClick={() => setSelectedPayroll(payroll)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <FileText size={18} className="text-primary-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{payroll.periodLabel}</p>
                  <p className="text-xs text-gray-500">
                    지급일: {format(new Date(payroll.payDate), 'M.d')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(payroll.netPay)}원
                </span>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 연간 급여 요약 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">2024년 급여 요약</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">총 지급액</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(
                mockPayrollData.reduce((sum, p) => sum + p.totalEarnings, 0)
              )}
              원
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">총 공제액</p>
            <p className="text-lg font-bold text-red-500">
              {formatCurrency(
                mockPayrollData.reduce((sum, p) => sum + p.totalDeductions, 0)
              )}
              원
            </p>
          </div>
          <div className="bg-primary-50 rounded-xl p-4 col-span-2">
            <p className="text-xs text-primary-600 mb-1">총 실수령액</p>
            <p className="text-xl font-bold text-primary-700">
              {formatCurrency(mockPayrollData.reduce((sum, p) => sum + p.netPay, 0))}원
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
