// =====================================================
// 급여 관리 페이지
// =====================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  status: 'open' | 'processing' | 'closed';
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  closedAt?: string;
}

interface PayrollLine {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  workDays: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  basePay: number;
  overtimePay: number;
  totalAllowances: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: 'draft' | 'confirmed' | 'paid';
}

// 데모 데이터
const demoPayrollLines: PayrollLine[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: '김철수',
    employeeNumber: 'EMP001',
    department: '개발팀',
    workDays: 22,
    totalHours: 184,
    regularHours: 176,
    overtimeHours: 8,
    basePay: 2640000,
    overtimePay: 180000,
    totalAllowances: 200000,
    grossPay: 3020000,
    totalDeductions: 302000,
    netPay: 2718000,
    status: 'draft',
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: '이영희',
    employeeNumber: 'EMP002',
    department: '디자인팀',
    workDays: 20,
    totalHours: 160,
    regularHours: 160,
    overtimeHours: 0,
    basePay: 1920000,
    overtimePay: 0,
    totalAllowances: 150000,
    grossPay: 2070000,
    totalDeductions: 207000,
    netPay: 1863000,
    status: 'draft',
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: '박지성',
    employeeNumber: 'EMP003',
    department: '영업팀',
    workDays: 21,
    totalHours: 180,
    regularHours: 168,
    overtimeHours: 12,
    basePay: 2352000,
    overtimePay: 252000,
    totalAllowances: 300000,
    grossPay: 2904000,
    totalDeductions: 290400,
    netPay: 2613600,
    status: 'draft',
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: '최민수',
    employeeNumber: 'EMP004',
    department: '개발팀',
    workDays: 22,
    totalHours: 176,
    regularHours: 176,
    overtimeHours: 0,
    basePay: 1760000,
    overtimePay: 0,
    totalAllowances: 100000,
    grossPay: 1860000,
    totalDeductions: 186000,
    netPay: 1674000,
    status: 'draft',
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: '정유진',
    employeeNumber: 'EMP005',
    department: '인사팀',
    workDays: 18,
    totalHours: 144,
    regularHours: 144,
    overtimeHours: 0,
    basePay: 2592000,
    overtimePay: 0,
    totalAllowances: 250000,
    grossPay: 2842000,
    totalDeductions: 284200,
    netPay: 2557800,
    status: 'draft',
  },
];

export function PayrollListPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [payrollLines, setPayrollLines] = useState<PayrollLine[]>(demoPayrollLines);
  const [isCalculating, setIsCalculating] = useState(false);
  const [periodStatus, setPeriodStatus] = useState<'open' | 'processing' | 'closed'>('open');

  // 통계 계산
  const stats = useMemo(() => {
    const totalGross = payrollLines.reduce((sum, line) => sum + line.grossPay, 0);
    const totalDeductions = payrollLines.reduce((sum, line) => sum + line.totalDeductions, 0);
    const totalNet = payrollLines.reduce((sum, line) => sum + line.netPay, 0);
    const totalOvertime = payrollLines.reduce((sum, line) => sum + line.overtimeHours, 0);
    
    return {
      employeeCount: payrollLines.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalOvertime,
    };
  }, [payrollLines]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const handleCalculatePayroll = async () => {
    setIsCalculating(true);
    // TODO: 실제 급여 계산 API 호출
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsCalculating(false);
    setPeriodStatus('processing');
  };

  const handleClosePayroll = async () => {
    if (!confirm('급여를 마감하시겠습니까? 마감 후에는 수정할 수 없습니다.')) return;
    
    // TODO: 급여 마감 API 호출
    setPeriodStatus('closed');
  };

  const getStatusBadge = (status: PayrollLine['status']) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-gray">임시</span>;
      case 'confirmed':
        return <span className="badge badge-success">확정</span>;
      case 'paid':
        return <span className="badge bg-primary-50 text-primary-600">지급완료</span>;
    }
  };

  return (
    <div>
      <Header title="급여 관리" subtitle="월별 급여 계산 및 관리" />

      <div className="mt-16">
        {/* 월 선택 및 상태 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* 월 선택 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMonthChange(-1)}
                className="btn btn-ghost btn-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 font-medium">
                {selectedYear}년 {selectedMonth}월
              </div>
              <button
                onClick={() => handleMonthChange(1)}
                className="btn btn-ghost btn-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* 기간 상태 */}
            <div className="flex items-center gap-2">
              {periodStatus === 'open' && (
                <span className="badge bg-primary-50 text-primary-600">
                  <Clock size={12} className="mr-1" />
                  진행중
                </span>
              )}
              {periodStatus === 'processing' && (
                <span className="badge badge-warning">
                  <AlertCircle size={12} className="mr-1" />
                  계산완료 (미마감)
                </span>
              )}
              {periodStatus === 'closed' && (
                <span className="badge badge-success">
                  <CheckCircle size={12} className="mr-1" />
                  마감완료
                </span>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary">
              <Download size={18} />
              엑셀 다운로드
            </button>
            {periodStatus === 'open' && (
              <button
                onClick={handleCalculatePayroll}
                disabled={isCalculating}
                className="btn btn-primary"
              >
                <Calculator size={18} />
                {isCalculating ? '계산 중...' : '급여 계산'}
              </button>
            )}
            {periodStatus === 'processing' && (
              <button onClick={handleClosePayroll} className="btn btn-primary">
                <CheckCircle size={18} />
                급여 마감
              </button>
            )}
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">대상 인원</p>
                <p className="stat-value">{stats.employeeCount}명</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="text-primary-600" size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">총 지급액</p>
                <p className="stat-value text-lg">{formatCurrency(stats.totalGross)}</p>
              </div>
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <DollarSign className="text-success-600" size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">총 공제액</p>
                <p className="stat-value text-lg">{formatCurrency(stats.totalDeductions)}</p>
              </div>
              <div className="w-12 h-12 bg-danger-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-danger-500" size={24} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">총 실지급액</p>
                <p className="stat-value text-lg text-primary-600">
                  {formatCurrency(stats.totalNet)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <DollarSign className="text-primary-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* 급여 테이블 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    직원
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    근무일
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    총 시간
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    연장
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    기본급
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    연장수당
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    수당
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    총지급액
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    공제액
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    실수령액
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    상태
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    명세서
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollLines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {line.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {line.employeeNumber} · {line.department}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-900">{line.workDays}일</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-900">{line.totalHours}h</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {line.overtimeHours > 0 ? (
                        <span className="text-sm font-medium text-warning-600">
                          +{line.overtimeHours}h
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-900">
                        {formatCurrency(line.basePay)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {line.overtimePay > 0 ? (
                        <span className="text-sm text-warning-600">
                          {formatCurrency(line.overtimePay)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-900">
                        {formatCurrency(line.totalAllowances)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(line.grossPay)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-danger-500">
                        -{formatCurrency(line.totalDeductions)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-primary-600">
                        {formatCurrency(line.netPay)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(line.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/payroll/${selectedYear}/${selectedMonth}/${line.employeeId}`}
                        className="btn btn-ghost btn-sm"
                        title="급여명세서"
                      >
                        <FileText size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-900">
                    합계
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(payrollLines.reduce((s, l) => s + l.basePay, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-warning-600">
                    {formatCurrency(payrollLines.reduce((s, l) => s + l.overtimePay, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(payrollLines.reduce((s, l) => s + l.totalAllowances, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(stats.totalGross)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-danger-500">
                    -{formatCurrency(stats.totalDeductions)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-primary-600">
                    {formatCurrency(stats.totalNet)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
