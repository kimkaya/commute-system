// =====================================================
// 보고서 페이지 (API 연동 + 엑셀 내보내기)
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Users,
  Clock,
  Wallet,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  Printer,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import {
  getReportData,
  getPayrollPeriods,
  getPayrollLines,
  generateDefaultPayrollExcel,
  generateInsuranceReportExcel,
  calculateTaxes,
  getTaxSettings,
} from '../../lib/api';
import type { PayrollLine } from '../../lib/api';

// 보고서 유형
const reportTypes = [
  {
    id: 'attendance',
    label: '출퇴근 현황',
    description: '기간별 출퇴근 기록 및 통계',
    icon: Clock,
    color: 'bg-blue-500',
  },
  {
    id: 'payroll',
    label: '급여 보고서',
    description: '급여 지급 내역 및 통계',
    icon: Wallet,
    color: 'bg-green-500',
  },
  {
    id: 'leave',
    label: '휴가 현황',
    description: '직원별 휴가 사용 현황',
    icon: Calendar,
    color: 'bg-purple-500',
  },
  {
    id: 'employee',
    label: '직원 현황',
    description: '직원 정보 및 근속 현황',
    icon: Users,
    color: 'bg-orange-500',
  },
  {
    id: 'overtime',
    label: '연장근무 현황',
    description: '연장근무 시간 및 수당 내역',
    icon: TrendingUp,
    color: 'bg-red-500',
  },
  {
    id: 'insurance',
    label: '4대보험 신고',
    description: '4대보험 신고 자료',
    icon: FileText,
    color: 'bg-indigo-500',
  },
];

// 금액 포맷팅
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// CSV 생성 함수
function generateCSV(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',');
  const dataRows = data.map((row) =>
    headers.map((h) => `"${row[h] || ''}"`).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

// 다운로드 함수
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface DepartmentStat {
  name: string;
  employees: number;
  totalHours: number;
  lateCount: number;
  overtimeHours: number;
}

interface SummaryData {
  attendance: {
    totalEmployees: number;
    avgWorkDays: number;
    lateCount: number;
    absentCount: number;
    overtimeHours: number;
  };
  payroll: {
    totalPaid: number;
    avgSalary: number;
    totalDeductions: number;
    totalOvertimePay: number;
  };
  leave: {
    totalUsed: number;
    avgRemaining: number;
    pendingRequests: number;
    rejectedRequests: number;
  };
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API 데이터
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData>({
    attendance: { totalEmployees: 0, avgWorkDays: 0, lateCount: 0, absentCount: 0, overtimeHours: 0 },
    payroll: { totalPaid: 0, avgSalary: 0, totalDeductions: 0, totalOvertimePay: 0 },
    leave: { totalUsed: 0, avgRemaining: 0, pendingRequests: 0, rejectedRequests: 0 },
  });
  const [payrollLines, setPayrollLines] = useState<PayrollLine[]>([]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 보고서 데이터 조회
      const reportData = await getReportData(dateRange.start, dateRange.end);
      
      // 부서별 통계 설정
      setDepartmentStats(reportData.departmentStats);
      
      // 요약 데이터 계산
      const totalEmployees = reportData.summary.totalEmployees;
      const totalAttendance = reportData.summary.totalAttendance;
      const totalLeaves = reportData.summary.totalLeaves;
      const pendingLeaves = reportData.summary.pendingLeaves;
      
      // 지각 횟수 계산
      const lateCount = reportData.departmentStats.reduce((sum, d) => sum + d.lateCount, 0);
      // 연장근무 시간 계산
      const overtimeHours = reportData.departmentStats.reduce((sum, d) => sum + d.overtimeHours, 0);
      
      // 급여 데이터 조회 (현재 월)
      const startDate = new Date(dateRange.start);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      const periods = await getPayrollPeriods();
      const currentPeriod = periods.find(p => p.year === year && p.month === month);
      
      let totalPaid = 0;
      let totalDeductions = 0;
      let totalOvertimePay = 0;
      let lines: PayrollLine[] = [];
      
      if (currentPeriod) {
        lines = await getPayrollLines(currentPeriod.id);
        setPayrollLines(lines);
        
        totalPaid = lines.reduce((sum, l) => sum + l.gross_pay, 0);
        totalOvertimePay = lines.reduce((sum, l) => sum + l.overtime_pay, 0);
        totalDeductions = lines.reduce((sum, l) => {
          const taxes = calculateTaxes(l.gross_pay);
          return sum + taxes.totalDeductions;
        }, 0);
      }
      
      setSummaryData({
        attendance: {
          totalEmployees,
          avgWorkDays: totalAttendance > 0 ? Math.round(totalAttendance / totalEmployees * 10) / 10 : 0,
          lateCount,
          absentCount: 0, // 추후 계산 로직 추가
          overtimeHours: Math.round(overtimeHours * 10) / 10,
        },
        payroll: {
          totalPaid,
          avgSalary: lines.length > 0 ? Math.round(totalPaid / lines.length) : 0,
          totalDeductions,
          totalOvertimePay,
        },
        leave: {
          totalUsed: totalLeaves,
          avgRemaining: 15 - (totalLeaves / Math.max(totalEmployees, 1)), // 기본 15일 가정
          pendingRequests: pendingLeaves,
          rejectedRequests: 0,
        },
      });
      
    } catch (err) {
      console.error('Failed to load report data:', err);
      setError('보고서 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 보고서 생성
  const handleGenerate = async (reportId: string) => {
    setIsGenerating(true);
    
    const reportType = reportTypes.find((r) => r.id === reportId);
    
    try {
      let csvContent = '';
      let filename = '';

      switch (reportId) {
        case 'attendance':
          csvContent = generateCSV(
            departmentStats.map((d) => ({
              부서: d.name,
              직원수: d.employees,
              총근무시간: Math.round(d.totalHours * 10) / 10,
              지각횟수: d.lateCount,
              연장근무: Math.round(d.overtimeHours * 10) / 10 + '시간',
            })),
            ['부서', '직원수', '총근무시간', '지각횟수', '연장근무']
          );
          filename = `출퇴근현황_${dateRange.start}_${dateRange.end}.csv`;
          break;
          
        case 'payroll':
          if (payrollLines.length > 0) {
            const startDate = new Date(dateRange.start);
            generateDefaultPayrollExcel(payrollLines, startDate.getFullYear(), startDate.getMonth() + 1);
            toast.success('급여 보고서가 다운로드되었습니다');
            setIsGenerating(false);
            return;
          } else {
            csvContent = generateCSV(
              [
                { 항목: '총지급액', 금액: formatCurrency(summaryData.payroll.totalPaid) + '원' },
                { 항목: '평균급여', 금액: formatCurrency(summaryData.payroll.avgSalary) + '원' },
                { 항목: '총공제액', 금액: formatCurrency(summaryData.payroll.totalDeductions) + '원' },
                { 항목: '연장수당합계', 금액: formatCurrency(summaryData.payroll.totalOvertimePay) + '원' },
              ],
              ['항목', '금액']
            );
            filename = `급여보고서_${dateRange.start}_${dateRange.end}.csv`;
          }
          break;
          
        case 'leave':
          csvContent = generateCSV(
            [
              { 항목: '총사용일', 값: summaryData.leave.totalUsed + '일' },
              { 항목: '평균잔여일', 값: summaryData.leave.avgRemaining.toFixed(1) + '일' },
              { 항목: '대기신청', 값: summaryData.leave.pendingRequests + '건' },
            ],
            ['항목', '값']
          );
          filename = `휴가현황_${dateRange.start}_${dateRange.end}.csv`;
          break;
          
        case 'insurance':
          if (payrollLines.length > 0) {
            const startDate = new Date(dateRange.start);
            generateInsuranceReportExcel(payrollLines, startDate.getFullYear(), startDate.getMonth() + 1);
            toast.success('4대보험 신고자료가 다운로드되었습니다');
            setIsGenerating(false);
            return;
          } else {
            toast.error('해당 기간의 급여 데이터가 없습니다');
            setIsGenerating(false);
            return;
          }
          
        default:
          csvContent = `보고서 유형: ${reportType?.label}\n생성일: ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n기간: ${dateRange.start} ~ ${dateRange.end}`;
          filename = `${reportType?.label}_${dateRange.start}_${dateRange.end}.csv`;
      }

      downloadFile(csvContent, filename, 'text/csv');
      toast.success(`${reportType?.label} 보고서가 다운로드되었습니다`);
    } catch (err) {
      console.error('Report generation error:', err);
      toast.error('보고서 생성 중 오류가 발생했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

  // 보고서 인쇄 기능
  const handlePrint = (reportId: string) => {
    const reportType = reportTypes.find((r) => r.id === reportId);
    const taxSettings = getTaxSettings();
    
    // 인쇄용 HTML 생성
    let printContent = '';
    
    switch (reportId) {
      case 'attendance':
        printContent = `
          <h1>${taxSettings.companyName} - 출퇴근 현황 보고서</h1>
          <p>기간: ${dateRange.start} ~ ${dateRange.end}</p>
          <p>생성일: ${format(new Date(), 'yyyy년 M월 d일 HH:mm')}</p>
          <hr />
          <h2>요약</h2>
          <ul>
            <li>총 직원수: ${summaryData.attendance.totalEmployees}명</li>
            <li>평균 근무일: ${summaryData.attendance.avgWorkDays}일</li>
            <li>지각 횟수: ${summaryData.attendance.lateCount}회</li>
            <li>연장근무: ${summaryData.attendance.overtimeHours}시간</li>
          </ul>
          <h2>부서별 현황</h2>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th>부서</th>
                <th>직원수</th>
                <th>총 근무시간</th>
                <th>지각 횟수</th>
                <th>연장근무</th>
              </tr>
            </thead>
            <tbody>
              ${departmentStats.map(d => `
                <tr>
                  <td>${d.name}</td>
                  <td style="text-align: center;">${d.employees}명</td>
                  <td style="text-align: center;">${Math.round(d.totalHours * 10) / 10}시간</td>
                  <td style="text-align: center;">${d.lateCount}회</td>
                  <td style="text-align: center;">${Math.round(d.overtimeHours * 10) / 10}시간</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        break;
        
      case 'payroll':
        printContent = `
          <h1>${taxSettings.companyName} - 급여 보고서</h1>
          <p>기간: ${dateRange.start} ~ ${dateRange.end}</p>
          <p>생성일: ${format(new Date(), 'yyyy년 M월 d일 HH:mm')}</p>
          <hr />
          <h2>급여 현황 요약</h2>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tr><th style="background: #f0f0f0;">항목</th><th style="background: #f0f0f0;">금액</th></tr>
            <tr><td>총 지급액</td><td style="text-align: right;">${formatCurrency(summaryData.payroll.totalPaid)}원</td></tr>
            <tr><td>평균 급여</td><td style="text-align: right;">${formatCurrency(summaryData.payroll.avgSalary)}원</td></tr>
            <tr><td>총 공제액</td><td style="text-align: right;">${formatCurrency(summaryData.payroll.totalDeductions)}원</td></tr>
            <tr><td>연장수당 합계</td><td style="text-align: right;">${formatCurrency(summaryData.payroll.totalOvertimePay)}원</td></tr>
          </table>
        `;
        break;
        
      case 'leave':
        printContent = `
          <h1>${taxSettings.companyName} - 휴가 현황 보고서</h1>
          <p>기간: ${dateRange.start} ~ ${dateRange.end}</p>
          <p>생성일: ${format(new Date(), 'yyyy년 M월 d일 HH:mm')}</p>
          <hr />
          <h2>휴가 현황 요약</h2>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
            <tr><th style="background: #f0f0f0;">항목</th><th style="background: #f0f0f0;">값</th></tr>
            <tr><td>총 사용일</td><td>${summaryData.leave.totalUsed}일</td></tr>
            <tr><td>평균 잔여일</td><td>${summaryData.leave.avgRemaining.toFixed(1)}일</td></tr>
            <tr><td>대기 신청</td><td>${summaryData.leave.pendingRequests}건</td></tr>
          </table>
        `;
        break;
        
      default:
        printContent = `
          <h1>${taxSettings.companyName} - ${reportType?.label}</h1>
          <p>기간: ${dateRange.start} ~ ${dateRange.end}</p>
          <p>생성일: ${format(new Date(), 'yyyy년 M월 d일 HH:mm')}</p>
          <hr />
          <p>보고서 내용</p>
        `;
    }

    // 새 창에서 인쇄
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${reportType?.label || '보고서'}</title>
          <style>
            body { font-family: 'Malgun Gothic', sans-serif; padding: 20px; }
            h1 { font-size: 20px; margin-bottom: 10px; }
            h2 { font-size: 16px; margin-top: 20px; }
            table { margin-top: 10px; }
            th, td { padding: 8px; text-align: left; }
            hr { margin: 15px 0; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      // 인쇄 후 창 닫기 (약간의 딜레이 후)
      setTimeout(() => printWindow.close(), 500);
    }
    
    toast.success(`${reportType?.label} 인쇄 준비 완료`);
  };

  // 전체 보고서 다운로드
  const handleDownloadAll = async () => {
    setIsGenerating(true);

    const taxSettings = getTaxSettings();
    
    const allData = [
      `=== ${taxSettings.companyName} 종합 보고서 ===`,
      `생성일: ${format(new Date(), 'yyyy년 M월 d일 HH:mm')}`,
      `기간: ${dateRange.start} ~ ${dateRange.end}`,
      '',
      '--- 출퇴근 현황 ---',
      `총 직원수: ${summaryData.attendance.totalEmployees}명`,
      `평균 근무일: ${summaryData.attendance.avgWorkDays}일`,
      `지각 횟수: ${summaryData.attendance.lateCount}회`,
      `연장근무: ${summaryData.attendance.overtimeHours}시간`,
      '',
      '--- 급여 현황 ---',
      `총 지급액: ${formatCurrency(summaryData.payroll.totalPaid)}원`,
      `평균 급여: ${formatCurrency(summaryData.payroll.avgSalary)}원`,
      `총 공제액: ${formatCurrency(summaryData.payroll.totalDeductions)}원`,
      `연장수당: ${formatCurrency(summaryData.payroll.totalOvertimePay)}원`,
      '',
      '--- 휴가 현황 ---',
      `총 사용일: ${summaryData.leave.totalUsed}일`,
      `평균 잔여: ${summaryData.leave.avgRemaining.toFixed(1)}일`,
      `대기 신청: ${summaryData.leave.pendingRequests}건`,
      '',
      '--- 부서별 현황 ---',
      ...departmentStats.map(
        (d) =>
          `${d.name}: ${d.employees}명, 총 ${Math.round(d.totalHours)}시간, 지각 ${d.lateCount}회, 연장 ${Math.round(d.overtimeHours)}시간`
      ),
    ].join('\n');

    downloadFile(allData, `종합보고서_${dateRange.start}_${dateRange.end}.txt`, 'text/plain');
    toast.success('종합 보고서가 다운로드되었습니다');
    setIsGenerating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <p className="text-gray-500">보고서 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보고서</h1>
          <p className="text-gray-500 mt-1">각종 보고서를 생성하고 내보냅니다</p>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          전체 보고서 다운로드
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* 기간 선택 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">기간 설정</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <span className="text-gray-500">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const now = new Date();
                setDateRange({
                  start: format(startOfMonth(now), 'yyyy-MM-dd'),
                  end: format(endOfMonth(now), 'yyyy-MM-dd'),
                });
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              이번 달
            </button>
            <button
              onClick={() => {
                const lastMonth = subMonths(new Date(), 1);
                setDateRange({
                  start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
                  end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
                });
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              지난 달
            </button>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">총 직원</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {summaryData.attendance.totalEmployees}명
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="text-green-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">총 급여</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {summaryData.payroll.totalPaid > 0 
              ? formatCurrency(Math.round(summaryData.payroll.totalPaid / 10000)) + '만원'
              : '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-purple-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">휴가 사용</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summaryData.leave.totalUsed}일</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-orange-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">연장근무</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {summaryData.attendance.overtimeHours}시간
          </p>
        </div>
      </div>

      {/* 보고서 목록 */}
      <div className="grid grid-cols-3 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${report.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.label}</h3>
              <p className="text-sm text-gray-500 mb-4">{report.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(report.id)}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
                >
                  {isGenerating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={16} />
                  )}
                  다운로드
                </button>
                <button
                  onClick={() => handlePrint(report.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Printer size={16} />
                  인쇄
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 부서별 현황 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">부서별 현황</h3>
          <button
            onClick={() => handleGenerate('attendance')}
            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            <Download size={14} />
            내보내기
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">부서</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">직원수</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  총 근무시간
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">지각 횟수</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  연장근무
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departmentStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    해당 기간의 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                departmentStats.map((dept) => (
                  <tr key={dept.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{dept.employees}명</td>
                    <td className="px-4 py-3 text-right text-gray-600">{Math.round(dept.totalHours * 10) / 10}시간</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          dept.lateCount > 5
                            ? 'bg-red-100 text-red-700'
                            : dept.lateCount > 2
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {dept.lateCount}회
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{Math.round(dept.overtimeHours * 10) / 10}시간</td>
                  </tr>
                ))
              )}
            </tbody>
            {departmentStats.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-900">합계</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {departmentStats.reduce((sum, d) => sum + d.employees, 0)}명
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {Math.round(departmentStats.reduce((sum, d) => sum + d.totalHours, 0) * 10) / 10}시간
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {departmentStats.reduce((sum, d) => sum + d.lateCount, 0)}회
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {Math.round(departmentStats.reduce((sum, d) => sum + d.overtimeHours, 0) * 10) / 10}시간
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
