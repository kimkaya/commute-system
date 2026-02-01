// =====================================================
// 급여명세서 페이지
// =====================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
  Building2,
  User,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import {
  getEmployee,
  getPayrollPeriods,
  getPayrollLines,
  getAttendanceRecords,
  updatePayrollLine,
} from '../../lib/api';
import type {
  Employee,
  PayrollLine,
  AttendanceRecord,
} from '../../lib/api';

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
  payrollLineId: string | null;
}

export function PayslipPage() {
  const { year, month, employeeId } = useParams();
  const [payslip, setPayslip] = useState<PayslipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    basePay: 0,
    overtimePay: 0,
  });
  const printRef = useRef<HTMLDivElement>(null);

  const loadPayslipData = useCallback(async () => {
    if (!year || !month || !employeeId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      // 직원 정보 조회
      const employee = await getEmployee(employeeId);
      if (!employee) {
        setError('직원을 찾을 수 없습니다.');
        return;
      }

      // 급여 기간 조회
      const periods = await getPayrollPeriods();
      const currentPeriod = periods.find(
        (p) => p.year === yearNum && p.month === monthNum
      );

      // 기간 시작/종료일 계산
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
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

      // 급여 계산 (급여 라인이 있으면 사용, 없으면 기본값)
      const grossPay = payrollLine?.gross_pay || 0;
      const totalDeductions = payrollLine?.total_deductions || 0;
      
      // 공제 항목 추정 (총 공제액 기준 비율)
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
          year: yearNum,
          month: monthNum,
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
        payrollLineId: payrollLine?.id || null,
      };

      setPayslip(payslipData);
      setEditForm({
        basePay: payslipData.earnings.basePay,
        overtimePay: payslipData.earnings.overtimePay,
      });
    } catch (err) {
      console.error('Failed to load payslip:', err);
      setError('급여명세서를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, employeeId]);

  useEffect(() => {
    loadPayslipData();
  }, [loadPayslipData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!payslip?.payrollLineId) return;
    
    setIsSaving(true);
    try {
      const grossPay = editForm.basePay + editForm.overtimePay;
      const totalDeductions = Math.round(grossPay * 0.13); // 약 13% 공제
      const netPay = grossPay - totalDeductions;

      await updatePayrollLine(payslip.payrollLineId, {
        base_pay: editForm.basePay,
        overtime_pay: editForm.overtimePay,
        gross_pay: grossPay,
        total_deductions: totalDeductions,
        net_pay: netPay,
      });

      await loadPayslipData();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
      setError('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    // 인쇄 기능으로 PDF 저장 안내
    alert('인쇄 대화상자에서 "PDF로 저장"을 선택하세요.');
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary-500" />
          <p className="text-gray-500">급여명세서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Link to="/payroll" className="btn btn-secondary">
            <ArrowLeft size={18} />
            목록으로
          </Link>
        </div>
        <div className="card p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-danger-500 mb-4" />
          <p className="text-gray-700 font-medium">{error || '데이터를 찾을 수 없습니다.'}</p>
          <p className="text-gray-500 text-sm mt-2">해당 기간의 급여가 계산되지 않았을 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 액션 바 */}
      <div className="flex items-center justify-between mb-6">
          <Link to="/payroll" className="btn btn-secondary">
            <ArrowLeft size={18} />
            목록으로
          </Link>
          <div className="flex items-center gap-3">
            {/* 상태 표시 */}
            <span className={`badge ${
              payslip.status === 'draft' ? 'badge-gray' : 
              payslip.status === 'confirmed' ? 'badge-success' : 
              'bg-primary-50 text-primary-600'
            }`}>
              {payslip.status === 'draft' ? '임시' : payslip.status === 'confirmed' ? '확정' : '지급완료'}
            </span>
            
            {/* 수정 버튼 (draft 상태일 때만) */}
            {payslip.status === 'draft' && payslip.payrollLineId && (
              isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="btn btn-secondary"
                    disabled={isSaving}
                  >
                    <X size={18} />
                    취소
                  </button>
                  <button 
                    onClick={handleSave} 
                    className="btn btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    저장
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
                  <Edit3 size={18} />
                  수정
                </button>
              )
            )}
            
            <button className="btn btn-secondary" disabled>
              <Mail size={18} />
              이메일 발송
            </button>
            <button onClick={handleDownloadPdf} className="btn btn-secondary">
              <Download size={18} />
              PDF 다운로드
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              <Printer size={18} />
              인쇄
            </button>
          </div>
        </div>

        {/* 급여명세서 */}
        <div ref={printRef} className="card max-w-4xl mx-auto print:shadow-none print:border-none">
          {/* 헤더 */}
          <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-xl print:bg-primary-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">급여명세서</h1>
                  <p className="text-white/80">PAYSLIP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {payslip.period.year}년 {payslip.period.month}월
                </p>
                <p className="text-white/80">
                  {payslip.period.startDate} ~ {payslip.period.endDate}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* 직원 정보 */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <User size={18} />
                  <span className="font-medium">직원 정보</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">성명</span>
                  <span className="font-medium">{payslip.employee.name}</span>
                  <span className="text-gray-500">사번</span>
                  <span>{payslip.employee.employeeNumber}</span>
                  <span className="text-gray-500">부서</span>
                  <span>{payslip.employee.department}</span>
                  <span className="text-gray-500">직급</span>
                  <span>{payslip.employee.position}</span>
                  <span className="text-gray-500">입사일</span>
                  <span>{payslip.employee.hireDate}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Clock size={18} />
                  <span className="font-medium">근무 현황</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">근무일수</span>
                  <span className="font-medium">{payslip.workSummary.workDays}일</span>
                  <span className="text-gray-500">총 근무시간</span>
                  <span>{payslip.workSummary.totalHours}시간</span>
                  <span className="text-gray-500">정규 근무</span>
                  <span>{payslip.workSummary.regularHours}시간</span>
                  <span className="text-gray-500">연장 근무</span>
                  <span className="text-warning-600 font-medium">
                    {payslip.workSummary.overtimeHours}시간
                  </span>
                  <span className="text-gray-500">지각/조퇴</span>
                  <span>
                    {payslip.workSummary.lateCount}회 / {payslip.workSummary.earlyLeaveCount}회
                  </span>
                </div>
              </div>
            </div>

            {/* 급여 내역 */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* 지급 내역 */}
              <div>
                <div className="flex items-center gap-2 text-success-600 mb-4">
                  <DollarSign size={18} />
                  <span className="font-semibold">지급 내역</span>
                  {isEditing && <span className="text-xs text-gray-500">(수정 중)</span>}
                </div>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-200">
                      <tr className={isEditing ? 'bg-warning-50' : ''}>
                        <td className="px-4 py-2.5 text-gray-600">기본급</td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editForm.basePay}
                              onChange={(e) => setEditForm({ ...editForm, basePay: parseInt(e.target.value) || 0 })}
                              className="w-32 px-2 py-1 text-right border border-gray-300 rounded"
                            />
                          ) : (
                            <>{formatCurrency(payslip.earnings.basePay)}원</>
                          )}
                        </td>
                      </tr>
                      <tr className={isEditing ? 'bg-warning-50' : ''}>
                        <td className="px-4 py-2.5 text-gray-600">연장근무수당</td>
                        <td className="px-4 py-2.5 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editForm.overtimePay}
                              onChange={(e) => setEditForm({ ...editForm, overtimePay: parseInt(e.target.value) || 0 })}
                              className="w-32 px-2 py-1 text-right border border-gray-300 rounded"
                            />
                          ) : (
                            <>{formatCurrency(payslip.earnings.overtimePay)}원</>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">야간근무수당</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.earnings.nightPay)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">휴일근무수당</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.earnings.holidayPay)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">상여금</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.earnings.bonus)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">교통비</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.earnings.transportation)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">식대</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.earnings.meal)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">기타수당</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.earnings.other)}원
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-success-50">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-success-700">
                          지급액 계
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-success-700">
                          {isEditing 
                            ? formatCurrency(editForm.basePay + editForm.overtimePay)
                            : formatCurrency(payslip.earnings.total)
                          }원
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 공제 내역 */}
              <div>
                <div className="flex items-center gap-2 text-danger-500 mb-4">
                  <DollarSign size={18} />
                  <span className="font-semibold">공제 내역</span>
                </div>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">소득세</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.deductions.incomeTax)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">지방소득세</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.deductions.localTax)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">국민연금</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.deductions.nationalPension)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">건강보험</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.deductions.healthInsurance)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">장기요양보험</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.deductions.longTermCare)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">고용보험</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.deductions.employmentInsurance)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">기타공제</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.deductions.other)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">&nbsp;</td>
                        <td className="px-4 py-2.5">&nbsp;</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-danger-50">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-danger-700">
                          공제액 계
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-danger-700">
                          {formatCurrency(payslip.deductions.total)}원
                        </td>
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
                    지급액 {formatCurrency(payslip.earnings.total)}원 - 공제액{' '}
                    {formatCurrency(payslip.deductions.total)}원
                  </p>
                </div>
                <p className="text-4xl font-bold text-primary-700">
                  {formatCurrency(payslip.netPay)}원
                </p>
              </div>
            </div>

            {/* 서명 영역 */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-8 text-center text-sm">
                <div>
                  <div className="h-16 border-b border-gray-300 mb-2"></div>
                  <p className="text-gray-500">작성자</p>
                </div>
                <div>
                  <div className="h-16 border-b border-gray-300 mb-2"></div>
                  <p className="text-gray-500">검토자</p>
                </div>
                <div>
                  <div className="h-16 border-b border-gray-300 mb-2"></div>
                  <p className="text-gray-500">승인자</p>
                </div>
              </div>
            </div>

            {/* 안내 문구 */}
            <div className="mt-8 text-xs text-gray-400 text-center">
              <p>본 급여명세서는 전자문서로 발급되었으며, 별도의 서명 없이 유효합니다.</p>
              <p className="mt-1">
                문의사항은 인사팀(내선 1234)으로 연락 바랍니다.
              </p>
            </div>
          </div>
        </div>

      {/* 인쇄 스타일 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          [class*="mt-16"] {
            margin-top: 0 !important;
          }
          .card {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .card * {
            visibility: visible;
          }
          button, a {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
