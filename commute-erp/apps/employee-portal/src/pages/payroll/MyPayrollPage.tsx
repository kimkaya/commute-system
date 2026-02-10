// =====================================================
// 내 급여명세서 페이지
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Download,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';
import { getMyPayslips } from '../../lib/api';
import type { PayrollLine } from '../../lib/api';
import { generatePayslipPdf } from '../../lib/payslipPdf';
import type { PayslipData } from '../../lib/payslipPdf';
import toast from 'react-hot-toast';

interface PayrollDisplayData {
  id: string;
  period: string;
  periodLabel: string;
  payDate: string;
  year: number;
  month: number;
  baseSalary: number;
  overtime: number;
  bonus: number;
  totalEarnings: number;
  incomeTax: number;
  healthInsurance: number;
  nationalPension: number;
  employmentInsurance: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  workDays: number;
  totalHours: number;
  overtimeHours: number;
}

// PayrollLine을 표시용 데이터로 변환
function transformPayrollData(payslips: PayrollLine[]): PayrollDisplayData[] {
  return payslips.map((p) => {
    const year = p.payroll_period?.year || new Date().getFullYear();
    const month = p.payroll_period?.month || 1;
    
    // 공제 항목 계산 (실제로는 DB에서 가져와야 함)
    const incomeTax = Math.round(p.gross_pay * 0.04);
    const healthInsurance = Math.round(p.gross_pay * 0.035);
    const nationalPension = Math.round(p.gross_pay * 0.045);
    const employmentInsurance = Math.round(p.gross_pay * 0.008);

    return {
      id: p.id,
      period: `${year}-${String(month).padStart(2, '0')}`,
      periodLabel: `${year}년 ${month}월`,
      payDate: `${year}-${String(month + 1).padStart(2, '0')}-10`,
      year,
      month,
      baseSalary: p.base_pay,
      overtime: p.overtime_pay,
      bonus: 0,
      totalEarnings: p.gross_pay,
      incomeTax,
      healthInsurance,
      nationalPension,
      employmentInsurance,
      totalDeductions: p.total_deductions || (incomeTax + healthInsurance + nationalPension + employmentInsurance),
      netPay: p.net_pay,
      status: p.status,
      workDays: p.work_days,
      totalHours: p.total_hours,
      overtimeHours: p.overtime_hours,
    };
  });
}

// 금액 포맷팅
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function MyPayrollPage() {
  const { employee } = useAuthStore();
  const [payrollData, setPayrollData] = useState<PayrollDisplayData[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDisplayData | null>(null);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (!employee?.id) return;

    setLoading(true);
    try {
      const payslips = await getMyPayslips(employee.id);
      const transformed = transformPayrollData(payslips);
      setPayrollData(transformed);
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // PDF 다운로드 핸들러
  const handleDownloadPdf = (payroll: PayrollDisplayData) => {
    if (!employee) return;

    try {
      const payslipData: PayslipData = {
        employeeName: employee.name,
        employeeNumber: employee.employee_number || '-',
        department: employee.department || '-',
        position: employee.position || '-',
        year: payroll.year,
        month: payroll.month,
        payDate: payroll.payDate,
        baseSalary: payroll.baseSalary,
        overtimePay: payroll.overtime,
        bonus: payroll.bonus,
        allowances: 0,
        totalEarnings: payroll.totalEarnings,
        incomeTax: payroll.incomeTax,
        healthInsurance: payroll.healthInsurance,
        nationalPension: payroll.nationalPension,
        employmentInsurance: payroll.employmentInsurance,
        otherDeductions: 0,
        totalDeductions: payroll.totalDeductions,
        netPay: payroll.netPay,
        workDays: payroll.workDays || 0,
        totalHours: payroll.totalHours || 0,
        overtimeHours: payroll.overtimeHours || 0,
      };

      generatePayslipPdf(payslipData);
      toast.success('급여명세서가 다운로드되었습니다');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF 생성에 실패했습니다');
    }
  };

  // 최근 급여
  const latestPayroll = payrollData[0];

  // 전월 대비 변화
  const previousPayroll = payrollData[1];
  const netPayDiff = latestPayroll ? latestPayroll.netPay - (previousPayroll?.netPay || 0) : 0;
  const netPayDiffPercent = previousPayroll && latestPayroll
    ? ((netPayDiff / previousPayroll.netPay) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="py-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (payrollData.length === 0) {
    return (
      <div className="py-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">급여 명세서가 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">급여가 지급되면 여기에 표시됩니다</p>
        </div>
      </div>
    );
  }

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
        <button 
          onClick={() => handleDownloadPdf(latestPayroll)}
          className="w-full mt-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
        >
          <Download size={18} />
          급여명세서 다운로드
        </button>
      </div>

      {/* 이전 급여 목록 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">급여 이력</h3>
        <div className="space-y-2">
          {payrollData.map((payroll) => (
            <div
              key={payroll.id}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
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
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(payroll.netPay)}원
                </span>
                <button
                  onClick={() => handleDownloadPdf(payroll)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="PDF 다운로드"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 연간 급여 요약 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">{new Date().getFullYear()}년 급여 요약</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">총 지급액</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(
                payrollData.reduce((sum, p) => sum + p.totalEarnings, 0)
              )}
              원
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">총 공제액</p>
            <p className="text-lg font-bold text-red-500">
              {formatCurrency(
                payrollData.reduce((sum, p) => sum + p.totalDeductions, 0)
              )}
              원
            </p>
          </div>
          <div className="bg-primary-50 rounded-xl p-4 col-span-2">
            <p className="text-xs text-primary-600 mb-1">총 실수령액</p>
            <p className="text-xl font-bold text-primary-700">
              {formatCurrency(payrollData.reduce((sum, p) => sum + p.netPay, 0))}원
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
