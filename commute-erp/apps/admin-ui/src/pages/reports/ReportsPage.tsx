// =====================================================
// 보고서 페이지 (엑셀 내보내기 포함)
// =====================================================

import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Users,
  Clock,
  Wallet,
  TrendingUp,
  BarChart3,
  PieChart,
  Filter,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import toast from 'react-hot-toast';

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
    id: 'compliance',
    label: '컴플라이언스',
    description: '근로기준법 준수 현황',
    icon: FileText,
    color: 'bg-indigo-500',
  },
];

// 데모 요약 데이터
const summaryData = {
  attendance: {
    totalEmployees: 45,
    avgWorkDays: 21.5,
    lateCount: 12,
    absentCount: 3,
    overtimeHours: 156,
  },
  payroll: {
    totalPaid: 156780000,
    avgSalary: 3484000,
    totalDeductions: 28450000,
    totalOvertimePay: 4520000,
  },
  leave: {
    totalUsed: 34,
    avgRemaining: 8.5,
    pendingRequests: 5,
    rejectedRequests: 2,
  },
};

// 부서별 출퇴근 데이터
const departmentStats = [
  { name: '개발팀', employees: 15, avgHours: 8.5, lateRate: 5.2, overtimeHours: 45 },
  { name: '영업팀', employees: 10, avgHours: 8.2, lateRate: 8.1, overtimeHours: 32 },
  { name: '인사팀', employees: 8, avgHours: 8.0, lateRate: 2.5, overtimeHours: 12 },
  { name: '마케팅팀', employees: 7, avgHours: 8.3, lateRate: 4.8, overtimeHours: 28 },
  { name: '재무팀', employees: 5, avgHours: 8.1, lateRate: 1.2, overtimeHours: 8 },
];

// 금액 포맷팅
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// CSV 생성 함수
function generateCSV(data: any[], headers: string[]): string {
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

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // 보고서 생성
  const handleGenerate = async (reportId: string) => {
    setIsGenerating(true);
    
    // 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const reportType = reportTypes.find((r) => r.id === reportId);
    
    // CSV 데이터 생성
    let csvContent = '';
    let filename = '';

    switch (reportId) {
      case 'attendance':
        csvContent = generateCSV(
          departmentStats.map((d) => ({
            부서: d.name,
            직원수: d.employees,
            평균근무시간: d.avgHours,
            지각률: d.lateRate + '%',
            연장근무: d.overtimeHours + '시간',
          })),
          ['부서', '직원수', '평균근무시간', '지각률', '연장근무']
        );
        filename = `출퇴근현황_${dateRange.start}_${dateRange.end}.csv`;
        break;
      case 'payroll':
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
        break;
      default:
        csvContent = `보고서 유형: ${reportType?.label}\n생성일: ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n기간: ${dateRange.start} ~ ${dateRange.end}`;
        filename = `${reportType?.label}_${dateRange.start}_${dateRange.end}.csv`;
    }

    downloadFile(csvContent, filename, 'text/csv');
    toast.success(`${reportType?.label} 보고서가 다운로드되었습니다`);
    setIsGenerating(false);
  };

  // 전체 보고서 다운로드
  const handleDownloadAll = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const allData = [
      '=== 출퇴근 ERP 종합 보고서 ===',
      `생성일: ${format(new Date(), 'yyyy년 M월 d일 HH:mm')}`,
      `기간: ${dateRange.start} ~ ${dateRange.end}`,
      '',
      '--- 출퇴근 현황 ---',
      `총 직원수: ${summaryData.attendance.totalEmployees}명`,
      `평균 근무일: ${summaryData.attendance.avgWorkDays}일`,
      `지각 횟수: ${summaryData.attendance.lateCount}회`,
      `결근 횟수: ${summaryData.attendance.absentCount}회`,
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
      `평균 잔여: ${summaryData.leave.avgRemaining}일`,
      `대기 신청: ${summaryData.leave.pendingRequests}건`,
      `반려: ${summaryData.leave.rejectedRequests}건`,
      '',
      '--- 부서별 현황 ---',
      ...departmentStats.map(
        (d) =>
          `${d.name}: ${d.employees}명, 평균 ${d.avgHours}시간, 지각률 ${d.lateRate}%`
      ),
    ].join('\n');

    downloadFile(allData, `종합보고서_${dateRange.start}_${dateRange.end}.txt`, 'text/plain');
    toast.success('종합 보고서가 다운로드되었습니다');
    setIsGenerating(false);
  };

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
          <Download size={18} />
          전체 보고서 다운로드
        </button>
      </div>

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
            {formatCurrency(summaryData.payroll.totalPaid / 10000)}만원
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
                  <FileSpreadsheet size={16} />
                  CSV
                </button>
                <button
                  onClick={() => toast.success('프린트 기능 준비 중')}
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
                  평균 근무시간
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">지각률</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  연장근무
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departmentStats.map((dept) => (
                <tr key={dept.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{dept.employees}명</td>
                  <td className="px-4 py-3 text-right text-gray-600">{dept.avgHours}시간</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        dept.lateRate > 5
                          ? 'bg-red-100 text-red-700'
                          : dept.lateRate > 3
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {dept.lateRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{dept.overtimeHours}시간</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-900">합계</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {departmentStats.reduce((sum, d) => sum + d.employees, 0)}명
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {(
                    departmentStats.reduce((sum, d) => sum + d.avgHours, 0) /
                    departmentStats.length
                  ).toFixed(1)}
                  시간
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {(
                    departmentStats.reduce((sum, d) => sum + d.lateRate, 0) /
                    departmentStats.length
                  ).toFixed(1)}
                  %
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {departmentStats.reduce((sum, d) => sum + d.overtimeHours, 0)}시간
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
