// =====================================================
// 급여 관리 페이지
// =====================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  CreditCard,
  Loader2,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  getPayrollPeriods,
  getPayrollLines,
  runPayroll,
  confirmPayroll,
  markPayrollAsPaid,
  getExcelTemplates,
  generateDefaultPayrollExcel,
  generateWithholdingExcel,
  generateInsuranceReportExcel,
  downloadPayslipExcel,
  downloadPayslipsZip,
  convertPayrollToExcelData,
} from '../../lib/api';
import type {
  PayrollPeriod,
  PayrollLine as ApiPayrollLine,
  ExcelTemplate,
} from '../../lib/api';

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

export function PayrollListPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [payrollLines, setPayrollLines] = useState<PayrollLine[]>([]);
  const [rawPayrollLines, setRawPayrollLines] = useState<ApiPayrollLine[]>([]); // API 원본 데이터
  const [isCalculating, setIsCalculating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [periodStatus, setPeriodStatus] = useState<'open' | 'processing' | 'closed'>('open');
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 세금 서류 다운로드 모달
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [excelTemplates, setExcelTemplates] = useState<ExcelTemplate[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // API에서 급여 데이터 로드
  const loadPayrollData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 급여 기간 목록 조회
      const periods = await getPayrollPeriods();
      const currentPeriod = periods.find(
        (p) => p.year === selectedYear && p.month === selectedMonth
      );

      if (currentPeriod) {
        setCurrentPeriodId(currentPeriod.id);
        setPeriodStatus(currentPeriod.status);

        // 해당 기간의 급여 라인 조회
        const lines = await getPayrollLines(currentPeriod.id);
        setRawPayrollLines(lines); // 원본 데이터 저장
        const mappedLines: PayrollLine[] = lines.map((line: ApiPayrollLine) => ({
          id: line.id,
          employeeId: line.employee_id,
          employeeName: line.employee?.name || '알 수 없음',
          employeeNumber: line.employee?.employee_number || '-',
          department: line.employee?.department || '-',
          workDays: line.work_days,
          totalHours: line.total_hours,
          regularHours: line.regular_hours,
          overtimeHours: line.overtime_hours,
          basePay: line.base_pay,
          overtimePay: line.overtime_pay,
          totalAllowances: 0, // 추후 수당 필드 추가 시 수정
          grossPay: line.gross_pay,
          totalDeductions: line.total_deductions,
          netPay: line.net_pay,
          status: line.status,
        }));
        setPayrollLines(mappedLines);
      } else {
        // 해당 기간의 급여 데이터 없음
        setCurrentPeriodId(null);
        setPeriodStatus('open');
        setPayrollLines([]);
        setRawPayrollLines([]);
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
      setError('급여 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // 템플릿 목록 로드
  const loadTemplates = useCallback(() => {
    const templates = getExcelTemplates();
    setExcelTemplates(templates);
  }, []);

  useEffect(() => {
    loadPayrollData();
    loadTemplates();
  }, [loadPayrollData, loadTemplates]);

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
    setError(null);
    try {
      const result = await runPayroll(selectedYear, selectedMonth);
      if (result.success) {
        await loadPayrollData();
      } else {
        setError(result.error || '급여 계산에 실패했습니다.');
      }
    } catch (err) {
      console.error('Payroll calculation error:', err);
      setError('급여 계산 중 오류가 발생했습니다.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleConfirmPayroll = async () => {
    if (!currentPeriodId) return;
    if (!confirm('급여를 확정하시겠습니까? 확정 후에는 수정할 수 없습니다.')) return;
    
    setIsConfirming(true);
    setError(null);
    try {
      const result = await confirmPayroll(currentPeriodId);
      if (result.success) {
        await loadPayrollData();
      } else {
        setError(result.error || '급여 확정에 실패했습니다.');
      }
    } catch (err) {
      console.error('Payroll confirm error:', err);
      setError('급여 확정 중 오류가 발생했습니다.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!currentPeriodId) return;
    if (!confirm('급여를 지급 완료 처리하시겠습니까?')) return;
    
    setIsPaying(true);
    setError(null);
    try {
      const result = await markPayrollAsPaid(currentPeriodId);
      if (result.success) {
        await loadPayrollData();
      } else {
        setError(result.error || '지급 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('Mark as paid error:', err);
      setError('지급 처리 중 오류가 발생했습니다.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleExportExcel = () => {
    // CSV 형태로 내보내기
    const headers = ['사번', '이름', '부서', '근무일', '총시간', '정규', '연장', '기본급', '연장수당', '총지급액', '공제액', '실수령액', '상태'];
    const rows = payrollLines.map(line => [
      line.employeeNumber,
      line.employeeName,
      line.department,
      line.workDays,
      line.totalHours,
      line.regularHours,
      line.overtimeHours,
      line.basePay,
      line.overtimePay,
      line.grossPay,
      line.totalDeductions,
      line.netPay,
      line.status === 'draft' ? '임시' : line.status === 'confirmed' ? '확정' : '지급완료',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `급여내역_${selectedYear}년${selectedMonth}월.csv`;
    link.click();
  };

  // 세금 서류 다운로드 모달 열기
  const handleOpenDownloadModal = () => {
    loadTemplates();
    setShowDownloadModal(true);
  };

  // 기본 급여대장 Excel 다운로드
  const handleDownloadPayrollExcel = () => {
    setIsDownloading(true);
    try {
      generateDefaultPayrollExcel(rawPayrollLines, selectedYear, selectedMonth);
    } catch (err) {
      console.error('Excel download error:', err);
      setError('Excel 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 원천징수영수증 다운로드
  const handleDownloadWithholding = () => {
    setIsDownloading(true);
    try {
      generateWithholdingExcel(rawPayrollLines, selectedYear);
    } catch (err) {
      console.error('Withholding excel error:', err);
      setError('원천징수영수증 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 4대보험 신고자료 다운로드
  const handleDownloadInsurance = () => {
    setIsDownloading(true);
    try {
      generateInsuranceReportExcel(rawPayrollLines, selectedYear, selectedMonth);
    } catch (err) {
      console.error('Insurance report error:', err);
      setError('4대보험 신고자료 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 커스텀 템플릿으로 전체 급여명세서 다운로드
  const handleDownloadWithTemplate = async (template: ExcelTemplate) => {
    setIsDownloading(true);
    try {
      const payrollDataList = rawPayrollLines.map(line => 
        convertPayrollToExcelData(line, selectedYear, selectedMonth)
      );
      
      if (payrollDataList.length === 1) {
        // 단일 직원
        downloadPayslipExcel(template, payrollDataList[0]);
      } else {
        // 여러 직원 - ZIP으로 다운로드
        await downloadPayslipsZip(template, payrollDataList);
      }
    } catch (err) {
      console.error('Template download error:', err);
      setError('템플릿 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
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
              {isLoading && (
                <span className="badge bg-gray-100 text-gray-600">
                  <Loader2 size={12} className="mr-1 animate-spin" />
                  로딩 중
                </span>
              )}
              {!isLoading && periodStatus === 'open' && payrollLines.length === 0 && (
                <span className="badge bg-gray-100 text-gray-600">
                  <Clock size={12} className="mr-1" />
                  미계산
                </span>
              )}
              {!isLoading && periodStatus === 'open' && payrollLines.length > 0 && (
                <span className="badge bg-primary-50 text-primary-600">
                  <Clock size={12} className="mr-1" />
                  진행중
                </span>
              )}
              {!isLoading && periodStatus === 'processing' && (
                <span className="badge badge-warning">
                  <AlertCircle size={12} className="mr-1" />
                  계산완료 (미확정)
                </span>
              )}
              {!isLoading && (periodStatus === 'closed' || payrollLines.every(l => l.status === 'confirmed' || l.status === 'paid')) && payrollLines.length > 0 && (
                <>
                  {payrollLines.every(l => l.status === 'paid') ? (
                    <span className="badge badge-success">
                      <CreditCard size={12} className="mr-1" />
                      지급완료
                    </span>
                  ) : (
                    <span className="badge badge-success">
                      <CheckCircle size={12} className="mr-1" />
                      확정완료
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleOpenDownloadModal} 
              className="btn btn-secondary" 
              disabled={payrollLines.length === 0}
            >
              <FileSpreadsheet size={18} />
              세금 서류
            </button>
            <button onClick={handleExportExcel} className="btn btn-secondary" disabled={payrollLines.length === 0}>
              <Download size={18} />
              CSV
            </button>
            {periodStatus === 'open' && (
              <button
                onClick={handleCalculatePayroll}
                disabled={isCalculating}
                className="btn btn-primary"
              >
                {isCalculating ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />}
                {isCalculating ? '계산 중...' : '급여 계산'}
              </button>
            )}
            {periodStatus === 'processing' && payrollLines.some(l => l.status === 'draft') && (
              <>
                <button
                  onClick={handleCalculatePayroll}
                  disabled={isCalculating}
                  className="btn btn-secondary"
                >
                  {isCalculating ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />}
                  재계산
                </button>
                <button 
                  onClick={handleConfirmPayroll} 
                  disabled={isConfirming}
                  className="btn btn-primary"
                >
                  {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  급여 확정
                </button>
              </>
            )}
            {(periodStatus === 'closed' || payrollLines.every(l => l.status === 'confirmed')) && 
             payrollLines.length > 0 && payrollLines.some(l => l.status === 'confirmed') && (
              <button 
                onClick={handleMarkAsPaid} 
                disabled={isPaying}
                className="btn btn-primary"
              >
                {isPaying ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                지급 완료
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

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </div>
        )}

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
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    명세서 뽑기
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={32} className="animate-spin text-primary-500" />
                        <p className="text-gray-500">급여 데이터를 불러오는 중...</p>
                      </div>
                    </td>
                  </tr>
                ) : payrollLines.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calculator size={48} className="text-gray-300" />
                        <p className="text-gray-500 font-medium">{selectedYear}년 {selectedMonth}월 급여 데이터가 없습니다</p>
                        <p className="text-gray-400 text-sm">위의 '급여 계산' 버튼을 클릭하여 급여를 계산하세요</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payrollLines.map((line) => (
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
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/payroll/${selectedYear}/${selectedMonth}/${line.employeeId}`}
                          className="btn btn-ghost btn-sm"
                          title="급여명세서 보기"
                        >
                          <FileText size={16} />
                        </Link>
                        <button
                          onClick={() => {
                            const rawLine = rawPayrollLines.find(r => r.id === line.id);
                            if (rawLine) {
                              const payrollData = convertPayrollToExcelData(rawLine, selectedYear, selectedMonth);
                              // 기본 템플릿으로 Excel 다운로드
                              const worksheet = {
                                '!ref': 'A1:H20',
                                'A1': { t: 's', v: '급 여 명 세 서' },
                                'A3': { t: 's', v: '지급년월' },
                                'B3': { t: 's', v: `${selectedYear}년 ${selectedMonth}월` },
                                'D3': { t: 's', v: '성명' },
                                'E3': { t: 's', v: payrollData.employeeName },
                                'G3': { t: 's', v: '사번' },
                                'H3': { t: 's', v: payrollData.employeeNumber },
                                'A5': { t: 's', v: '부서' },
                                'B5': { t: 's', v: payrollData.department },
                                'D5': { t: 's', v: '직급' },
                                'E5': { t: 's', v: payrollData.position },
                                'A7': { t: 's', v: '[ 지급 내역 ]' },
                                'A8': { t: 's', v: '기본급' },
                                'B8': { t: 'n', v: payrollData.basePay },
                                'A9': { t: 's', v: '연장수당' },
                                'B9': { t: 'n', v: payrollData.overtimePay },
                                'A10': { t: 's', v: '총지급액' },
                                'B10': { t: 'n', v: payrollData.grossPay },
                                'D7': { t: 's', v: '[ 공제 내역 ]' },
                                'D8': { t: 's', v: '소득세' },
                                'E8': { t: 'n', v: payrollData.incomeTax },
                                'D9': { t: 's', v: '지방소득세' },
                                'E9': { t: 'n', v: payrollData.localTax },
                                'D10': { t: 's', v: '국민연금' },
                                'E10': { t: 'n', v: payrollData.nationalPension },
                                'D11': { t: 's', v: '건강보험' },
                                'E11': { t: 'n', v: payrollData.healthInsurance },
                                'D12': { t: 's', v: '공제합계' },
                                'E12': { t: 'n', v: payrollData.totalDeductions },
                                'A14': { t: 's', v: '실수령액' },
                                'B14': { t: 'n', v: payrollData.netPay },
                              };
                              const workbook = XLSX.utils.book_new();
                              const ws = worksheet as XLSX.WorkSheet;
                              // 셀 병합 설정
                              ws['!merges'] = [
                                { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // 제목 병합
                              ];
                              // 열 너비 설정
                              ws['!cols'] = [
                                { wch: 12 }, { wch: 15 }, { wch: 5 },
                                { wch: 12 }, { wch: 15 }, { wch: 5 },
                                { wch: 10 }, { wch: 12 }
                              ];
                              XLSX.utils.book_append_sheet(workbook, ws, '급여명세서');
                              const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                              const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                              saveAs(blob, `급여명세서_${payrollData.employeeName}_${selectedYear}년${selectedMonth}월.xlsx`);
                            }
                          }}
                          className="btn btn-ghost btn-sm text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Excel 다운로드"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
              {payrollLines.length > 0 && (
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
              )}
            </table>
          </div>
        </div>
      </div>

      {/* 세금 서류 다운로드 모달 */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* 배경 오버레이 */}
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowDownloadModal(false)}
            />
            
            {/* 모달 컨텐츠 */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">세금 서류 다운로드</h2>
                <button 
                  onClick={() => setShowDownloadModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* 기본 서류 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">기본 서류</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleDownloadPayrollExcel}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="text-green-600" size={24} />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">급여대장</p>
                          <p className="text-sm text-gray-500">{selectedYear}년 {selectedMonth}월 전체 직원 급여 내역</p>
                        </div>
                      </div>
                      <Download size={18} className="text-gray-400" />
                    </button>

                    <button
                      onClick={handleDownloadWithholding}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="text-blue-600" size={24} />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">원천징수영수증</p>
                          <p className="text-sm text-gray-500">{selectedYear}년 소득세 원천징수 내역</p>
                        </div>
                      </div>
                      <Download size={18} className="text-gray-400" />
                    </button>

                    <button
                      onClick={handleDownloadInsurance}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="text-purple-600" size={24} />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">4대보험 신고자료</p>
                          <p className="text-sm text-gray-500">{selectedYear}년 {selectedMonth}월 4대보험 내역</p>
                        </div>
                      </div>
                      <Download size={18} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* 커스텀 템플릿 */}
                {excelTemplates.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">내 템플릿</h3>
                    <div className="space-y-2">
                      {excelTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleDownloadWithTemplate(template)}
                          disabled={isDownloading}
                          className="w-full flex items-center justify-between p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="text-primary-600" size={24} />
                            <div className="text-left">
                              <p className="font-medium text-gray-900">{template.name}</p>
                              <p className="text-sm text-gray-500">{template.description || template.fileName}</p>
                            </div>
                          </div>
                          <Download size={18} className="text-primary-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {excelTemplates.length === 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">
                      등록된 커스텀 템플릿이 없습니다.
                    </p>
                    <Link 
                      to="/settings" 
                      className="text-sm text-primary-600 hover:underline mt-1 inline-block"
                    >
                      설정 → Excel 템플릿에서 등록하세요
                    </Link>
                  </div>
                )}
              </div>

              {isDownloading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  다운로드 준비 중...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
