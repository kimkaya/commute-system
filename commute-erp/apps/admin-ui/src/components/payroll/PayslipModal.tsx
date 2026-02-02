// =====================================================
// 급여명세서 모달 컴포넌트
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  User,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getEmployee,
  getPayrollPeriods,
  getPayrollLines,
  getAttendanceRecords,
} from '../../lib/api';
import type { PayrollLine } from '../../lib/api';
import { utils, writeFile } from 'xlsx';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
}

interface PayslipData {
  employee: {
    id: string;
    name: string;
    employeeNumber: string;
    department: string;
    position: string;
    hireDate: string;
    hourlyRate: number;
  };
  period: {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
  };
  workSummary: {
    workDays: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    nightHours: number;
    holidayHours: number;
    lateCount: number;
    earlyLeaveCount: number;
  };
  earnings: {
    basePay: number;
    overtimePay: number;
    nightPay: number;
    holidayPay: number;
    bonus: number;
    transportation: number;
    meal: number;
    other: number;
    total: number;
  };
  deductions: {
    incomeTax: number;
    localTax: number;
    nationalPension: number;
    healthInsurance: number;
    longTermCare: number;
    employmentInsurance: number;
    other: number;
    total: number;
  };
  netPay: number;
  status: 'draft' | 'confirmed' | 'paid';
}

export function PayslipModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  year,
  month,
}: PayslipModalProps) {
  const [payslip, setPayslip] = useState<PayslipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const loadPayslipData = useCallback(async () => {
    if (!employeeId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // 직원 정보 조회
      const employee = await getEmployee(employeeId);
      if (!employee) {
        setError('직원을 찾을 수 없습니다.');
        return;
      }

      // 급여 기간 조회
      const periods = await getPayrollPeriods();
      const currentPeriod = periods.find(
        (p) => p.year === year && p.month === month
      );

      // 기간 시작/종료일 계산
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // 출퇴근 기록 조회 (지각/조퇴 계산용)
      const attendanceRecords = await getAttendanceRecords({
        employee_id: employeeId,
        start_date: startDateStr,
        end_date: endDateStr,
      });

      // 지각/조퇴 계산 (09:00 기준)
      let lateCount = 0;
      let earlyLeaveCount = 0;
      for (const record of attendanceRecords) {
        if (record.check_in) {
          const [h, m] = record.check_in.split(':').map(Number);
          if (h > 9 || (h === 9 && m > 0)) lateCount++;
        }
        if (record.check_out) {
          const [h, m] = record.check_out.split(':').map(Number);
          if (h < 18) earlyLeaveCount++;
        }
      }

      // 급여 라인 조회
      let payrollLine: PayrollLine | null = null;
      if (currentPeriod) {
        const lines = await getPayrollLines(currentPeriod.id);
        payrollLine = lines.find((l) => l.employee_id === employeeId) || null;
      }

      // 급여 계산
      const grossPay = payrollLine?.gross_pay || 0;
      const totalDeductions = payrollLine?.total_deductions || 0;
      
      // 공제 항목 추정
      const incomeTax = Math.round(grossPay * 0.04);
      const localTax = Math.round(incomeTax * 0.1);
      const nationalPension = Math.round(grossPay * 0.045);
      const healthInsurance = Math.round(grossPay * 0.03545);
      const longTermCare = Math.round(healthInsurance * 0.1295);
      const employmentInsurance = Math.round(grossPay * 0.009);

      const payslipData: PayslipData = {
        employee: {
          id: employee.id,
          name: employee.name,
          employeeNumber: employee.employee_number || '-',
          department: employee.department || '-',
          position: employee.position || '-',
          hireDate: employee.hire_date || '-',
          hourlyRate: employee.hourly_rate || 0,
        },
        period: {
          year,
          month,
          startDate: startDateStr,
          endDate: endDateStr,
        },
        workSummary: {
          workDays: payrollLine?.work_days || 0,
          totalHours: payrollLine?.total_hours || 0,
          regularHours: payrollLine?.regular_hours || 0,
          overtimeHours: payrollLine?.overtime_hours || 0,
          nightHours: 0,
          holidayHours: 0,
          lateCount,
          earlyLeaveCount,
        },
        earnings: {
          basePay: payrollLine?.base_pay || 0,
          overtimePay: payrollLine?.overtime_pay || 0,
          nightPay: 0,
          holidayPay: 0,
          bonus: 0,
          transportation: 0,
          meal: 0,
          other: 0,
          total: grossPay,
        },
        deductions: {
          incomeTax,
          localTax,
          nationalPension,
          healthInsurance,
          longTermCare,
          employmentInsurance,
          other: Math.max(0, totalDeductions - (incomeTax + localTax + nationalPension + healthInsurance + longTermCare + employmentInsurance)),
          total: totalDeductions,
        },
        netPay: payrollLine?.net_pay || 0,
        status: payrollLine?.status || 'draft',
      };

      setPayslip(payslipData);
    } catch (err) {
      console.error('Failed to load payslip:', err);
      setError('급여명세서를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, year, month]);

  useEffect(() => {
    if (isOpen) {
      loadPayslipData();
    }
  }, [isOpen, loadPayslipData]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>급여명세서 - ${employeeName} - ${year}년 ${month}월</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Pretendard', -apple-system, sans-serif; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
            .header-content { display: flex; justify-content: space-between; align-items: center; }
            .header-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
            .content { padding: 24px; border: 1px solid #e5e7eb; border-top: none; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .section-title { font-weight: 600; color: #6b7280; margin-bottom: 12px; }
            .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .info-label { color: #6b7280; }
            .table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .table td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
            .table tfoot td { background: #f3f4f6; font-weight: 600; }
            .net-pay { background: linear-gradient(135deg, #ede9fe, #ddd6fe); padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
            .net-pay-amount { font-size: 28px; font-weight: 700; color: #4f46e5; }
            .text-success { color: #10b981; }
            .text-danger { color: #ef4444; }
            .text-warning { color: #f59e0b; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadExcel = () => {
    if (!payslip) return;

    const wb = utils.book_new();
    
    // 급여명세서 데이터
    const data = [
      ['급여명세서'],
      [''],
      ['귀속년월', `${payslip.period.year}년 ${payslip.period.month}월`],
      ['지급기간', `${payslip.period.startDate} ~ ${payslip.period.endDate}`],
      [''],
      ['[직원 정보]'],
      ['성명', payslip.employee.name],
      ['사번', payslip.employee.employeeNumber],
      ['부서', payslip.employee.department],
      ['직급', payslip.employee.position],
      ['입사일', payslip.employee.hireDate],
      [''],
      ['[근무 현황]'],
      ['근무일수', `${payslip.workSummary.workDays}일`],
      ['총 근무시간', `${payslip.workSummary.totalHours}시간`],
      ['정규 근무', `${payslip.workSummary.regularHours}시간`],
      ['연장 근무', `${payslip.workSummary.overtimeHours}시간`],
      ['지각', `${payslip.workSummary.lateCount}회`],
      ['조퇴', `${payslip.workSummary.earlyLeaveCount}회`],
      [''],
      ['[지급 내역]'],
      ['기본급', payslip.earnings.basePay],
      ['연장근무수당', payslip.earnings.overtimePay],
      ['야간근무수당', payslip.earnings.nightPay],
      ['휴일근무수당', payslip.earnings.holidayPay],
      ['상여금', payslip.earnings.bonus],
      ['교통비', payslip.earnings.transportation],
      ['식대', payslip.earnings.meal],
      ['기타수당', payslip.earnings.other],
      ['지급액 계', payslip.earnings.total],
      [''],
      ['[공제 내역]'],
      ['소득세', payslip.deductions.incomeTax],
      ['지방소득세', payslip.deductions.localTax],
      ['국민연금', payslip.deductions.nationalPension],
      ['건강보험', payslip.deductions.healthInsurance],
      ['장기요양보험', payslip.deductions.longTermCare],
      ['고용보험', payslip.deductions.employmentInsurance],
      ['기타공제', payslip.deductions.other],
      ['공제액 계', payslip.deductions.total],
      [''],
      ['실수령액', payslip.netPay],
    ];

    const ws = utils.aoa_to_sheet(data);
    
    // 열 너비 설정
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }];
    
    utils.book_append_sheet(wb, ws, '급여명세서');
    writeFile(wb, `급여명세서_${payslip.employee.name}_${year}년${month}월.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* 모달 헤더 */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              급여명세서 - {employeeName}
            </h2>
            <div className="flex items-center gap-2">
              {payslip && (
                <>
                  <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Excel 다운로드"
                  >
                    <FileSpreadsheet size={18} />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="인쇄"
                  >
                    <Printer size={18} />
                    <span className="hidden sm:inline">인쇄</span>
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 모달 본문 */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={48} className="animate-spin text-primary-500 mb-4" />
                <p className="text-gray-500">급여명세서를 불러오는 중...</p>
              </div>
            ) : error || !payslip ? (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle size={48} className="text-danger-500 mb-4" />
                <p className="text-gray-700 font-medium">{error || '데이터를 찾을 수 없습니다.'}</p>
                <p className="text-gray-500 text-sm mt-2">해당 기간의 급여가 계산되지 않았을 수 있습니다.</p>
              </div>
            ) : (
              <div ref={printRef}>
                {/* 헤더 */}
                <div className="p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold">급여명세서</h1>
                        <p className="text-white/80 text-sm">PAYSLIP</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {payslip.period.year}년 {payslip.period.month}월
                      </p>
                      <p className="text-white/80 text-sm">
                        {payslip.period.startDate} ~ {payslip.period.endDate}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* 직원 정보 & 근무 현황 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="flex items-center gap-2 text-gray-500 mb-3">
                        <User size={16} />
                        <span className="font-medium text-sm">직원 정보</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">성명</span>
                          <span className="font-medium">{payslip.employee.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">사번</span>
                          <span>{payslip.employee.employeeNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">부서</span>
                          <span>{payslip.employee.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">직급</span>
                          <span>{payslip.employee.position}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-gray-500 mb-3">
                        <Clock size={16} />
                        <span className="font-medium text-sm">근무 현황</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">근무일수</span>
                          <span className="font-medium">{payslip.workSummary.workDays}일</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">총 근무시간</span>
                          <span>{payslip.workSummary.totalHours}시간</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">연장 근무</span>
                          <span className="text-warning-600 font-medium">{payslip.workSummary.overtimeHours}시간</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">지각/조퇴</span>
                          <span>{payslip.workSummary.lateCount}회 / {payslip.workSummary.earlyLeaveCount}회</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 급여 내역 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* 지급 내역 */}
                    <div>
                      <div className="flex items-center gap-2 text-success-600 mb-3">
                        <DollarSign size={16} />
                        <span className="font-semibold text-sm">지급 내역</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">기본급</td>
                              <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(payslip.earnings.basePay)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">연장근무수당</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.earnings.overtimePay)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">야간근무수당</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.earnings.nightPay)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">휴일근무수당</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.earnings.holidayPay)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">상여금</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.earnings.bonus)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">기타수당</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.earnings.other)}원</td>
                            </tr>
                          </tbody>
                          <tfoot className="bg-success-50">
                            <tr>
                              <td className="px-4 py-3 font-semibold text-success-700">지급액 계</td>
                              <td className="px-4 py-3 text-right font-bold text-success-700">{formatCurrency(payslip.earnings.total)}원</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* 공제 내역 */}
                    <div>
                      <div className="flex items-center gap-2 text-danger-500 mb-3">
                        <DollarSign size={16} />
                        <span className="font-semibold text-sm">공제 내역</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">소득세</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.deductions.incomeTax)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">지방소득세</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.deductions.localTax)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">국민연금</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.deductions.nationalPension)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">건강보험</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.deductions.healthInsurance)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">장기요양보험</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.deductions.longTermCare)}원</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-gray-600">고용보험</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(payslip.deductions.employmentInsurance)}원</td>
                            </tr>
                          </tbody>
                          <tfoot className="bg-danger-50">
                            <tr>
                              <td className="px-4 py-3 font-semibold text-danger-700">공제액 계</td>
                              <td className="px-4 py-3 text-right font-bold text-danger-700">{formatCurrency(payslip.deductions.total)}원</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 실수령액 */}
                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-primary-600 font-medium mb-1">실수령액</p>
                        <p className="text-sm text-primary-500">
                          지급액 {formatCurrency(payslip.earnings.total)}원 - 공제액 {formatCurrency(payslip.deductions.total)}원
                        </p>
                      </div>
                      <p className="text-3xl md:text-4xl font-bold text-primary-700">
                        {formatCurrency(payslip.netPay)}원
                      </p>
                    </div>
                  </div>

                  {/* 안내 문구 */}
                  <div className="mt-6 text-xs text-gray-400 text-center">
                    <p>본 급여명세서는 전자문서로 발급되었으며, 별도의 서명 없이 유효합니다.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
