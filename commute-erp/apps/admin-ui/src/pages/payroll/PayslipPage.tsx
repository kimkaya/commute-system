// =====================================================
// 급여명세서 페이지
// =====================================================

import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
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
} from 'lucide-react';

interface PayslipData {
  employee: {
    name: string;
    employeeNumber: string;
    department: string;
    position: string;
    hireDate: string;
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
}

// 데모 데이터
const demoPayslip: PayslipData = {
  employee: {
    name: '김철수',
    employeeNumber: 'EMP001',
    department: '개발팀',
    position: '선임',
    hireDate: '2023-03-15',
  },
  period: {
    year: 2025,
    month: 1,
    startDate: '2025-01-01',
    endDate: '2025-01-31',
  },
  workSummary: {
    workDays: 22,
    totalHours: 184,
    regularHours: 176,
    overtimeHours: 8,
    nightHours: 0,
    holidayHours: 0,
    lateCount: 1,
    earlyLeaveCount: 0,
  },
  earnings: {
    basePay: 2640000,
    overtimePay: 180000,
    nightPay: 0,
    holidayPay: 0,
    bonus: 0,
    transportation: 100000,
    meal: 100000,
    other: 0,
    total: 3020000,
  },
  deductions: {
    incomeTax: 121000,
    localTax: 12100,
    nationalPension: 135900,
    healthInsurance: 107059,
    longTermCare: 13864,
    employmentInsurance: 27180,
    other: 0,
    total: 417103,
  },
  netPay: 2602897,
};

export function PayslipPage() {
  const { year, month, employeeId } = useParams();
  const [payslip] = useState<PayslipData>(demoPayslip);
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <Header
        title="급여명세서"
        subtitle={`${payslip.period.year}년 ${payslip.period.month}월`}
      />

      <div className="mt-16">
        {/* 액션 바 */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/payroll" className="btn btn-secondary">
            <ArrowLeft size={18} />
            목록으로
          </Link>
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary">
              <Mail size={18} />
              이메일 발송
            </button>
            <button className="btn btn-secondary">
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
                </div>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">기본급</td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {formatCurrency(payslip.earnings.basePay)}원
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-gray-600">연장근무수당</td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrency(payslip.earnings.overtimePay)}원
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
                          {formatCurrency(payslip.earnings.total)}원
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
