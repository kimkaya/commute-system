// =====================================================
// 컴플라이언스 대시보드 페이지
// =====================================================

import { useState, useMemo } from 'react';
import { Header } from '../../components/layout/Header';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  Calendar,
  Moon,
} from 'lucide-react';

interface ComplianceCheck {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  weekStart: string;
  weeklyHours: number;
  overtimeHours: number;
  continuousWorkDays: number;
  nightWorkDays: number;
  status: 'good' | 'warning' | 'violation';
  violations: string[];
  warnings: string[];
}

// 데모 데이터
const demoComplianceData: ComplianceCheck[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: '김철수',
    employeeNumber: 'EMP001',
    department: '개발팀',
    weekStart: '2025-01-20',
    weeklyHours: 48,
    overtimeHours: 8,
    continuousWorkDays: 5,
    nightWorkDays: 0,
    status: 'warning',
    violations: [],
    warnings: ['주간 근무시간 48시간 (40시간 초과)'],
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: '이영희',
    employeeNumber: 'EMP002',
    department: '디자인팀',
    weekStart: '2025-01-20',
    weeklyHours: 40,
    overtimeHours: 0,
    continuousWorkDays: 5,
    nightWorkDays: 0,
    status: 'good',
    violations: [],
    warnings: [],
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: '박지성',
    employeeNumber: 'EMP003',
    department: '영업팀',
    weekStart: '2025-01-20',
    weeklyHours: 54,
    overtimeHours: 14,
    continuousWorkDays: 6,
    nightWorkDays: 2,
    status: 'violation',
    violations: ['주간 근무시간 54시간 (52시간 한도 초과)'],
    warnings: ['연속 근무 6일', '야간근무 2일'],
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: '최민수',
    employeeNumber: 'EMP004',
    department: '개발팀',
    weekStart: '2025-01-20',
    weeklyHours: 44,
    overtimeHours: 4,
    continuousWorkDays: 5,
    nightWorkDays: 1,
    status: 'warning',
    violations: [],
    warnings: ['야간근무 1일'],
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: '정유진',
    employeeNumber: 'EMP005',
    department: '인사팀',
    weekStart: '2025-01-20',
    weeklyHours: 36,
    overtimeHours: 0,
    continuousWorkDays: 4,
    nightWorkDays: 0,
    status: 'good',
    violations: [],
    warnings: [],
  },
];

export function CompliancePage() {
  const [complianceData] = useState<ComplianceCheck[]>(demoComplianceData);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 통계
  const stats = useMemo(() => {
    const total = complianceData.length;
    const good = complianceData.filter((c) => c.status === 'good').length;
    const warning = complianceData.filter((c) => c.status === 'warning').length;
    const violation = complianceData.filter((c) => c.status === 'violation').length;
    const avgHours =
      complianceData.reduce((sum, c) => sum + c.weeklyHours, 0) / total;
    const totalOvertime = complianceData.reduce((sum, c) => sum + c.overtimeHours, 0);

    return { total, good, warning, violation, avgHours, totalOvertime };
  }, [complianceData]);

  // 필터링
  const filteredData = useMemo(() => {
    if (filterStatus === 'all') return complianceData;
    return complianceData.filter((c) => c.status === filterStatus);
  }, [complianceData, filterStatus]);

  const getStatusIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="text-success-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-warning-500" size={20} />;
      case 'violation':
        return <AlertCircle className="text-danger-500" size={20} />;
    }
  };

  const getStatusBadge = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'good':
        return <span className="badge badge-success">양호</span>;
      case 'warning':
        return <span className="badge badge-warning">경고</span>;
      case 'violation':
        return <span className="badge badge-danger">위반</span>;
    }
  };

  const getHoursColor = (hours: number) => {
    if (hours > 52) return 'text-danger-600 font-bold';
    if (hours > 40) return 'text-warning-600 font-medium';
    return 'text-gray-900';
  };

  return (
    <div>
      <Header title="컴플라이언스" subtitle="근로기준법 준수 현황" />

      <div className="mt-16">
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            className={`stat-card cursor-pointer transition-all ${
              filterStatus === 'all' ? 'ring-2 ring-primary-500' : ''
            }`}
            onClick={() => setFilterStatus('all')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">전체 직원</p>
                <p className="stat-value">{stats.total}명</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="text-primary-600" size={24} />
              </div>
            </div>
          </div>

          <div
            className={`stat-card cursor-pointer transition-all ${
              filterStatus === 'good' ? 'ring-2 ring-success-500' : ''
            }`}
            onClick={() => setFilterStatus('good')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">양호</p>
                <p className="stat-value text-success-600">{stats.good}명</p>
              </div>
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-success-600" size={24} />
              </div>
            </div>
          </div>

          <div
            className={`stat-card cursor-pointer transition-all ${
              filterStatus === 'warning' ? 'ring-2 ring-warning-500' : ''
            }`}
            onClick={() => setFilterStatus('warning')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">경고</p>
                <p className="stat-value text-warning-600">{stats.warning}명</p>
              </div>
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-warning-600" size={24} />
              </div>
            </div>
          </div>

          <div
            className={`stat-card cursor-pointer transition-all ${
              filterStatus === 'violation' ? 'ring-2 ring-danger-500' : ''
            }`}
            onClick={() => setFilterStatus('violation')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">위반</p>
                <p className="stat-value text-danger-500">{stats.violation}명</p>
              </div>
              <div className="w-12 h-12 bg-danger-50 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-danger-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* 주간 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-primary-600" size={20} />
              <h3 className="font-semibold text-gray-900">평균 주간 근무시간</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats.avgHours.toFixed(1)}시간
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    stats.avgHours > 52
                      ? 'bg-danger-500'
                      : stats.avgHours > 40
                      ? 'bg-warning-500'
                      : 'bg-success-500'
                  }`}
                  style={{ width: `${Math.min((stats.avgHours / 52) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">/ 52시간</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-warning-600" size={20} />
              <h3 className="font-semibold text-gray-900">총 연장근무</h3>
            </div>
            <p className="text-3xl font-bold text-warning-600">
              {stats.totalOvertime}시간
            </p>
            <p className="text-sm text-gray-500 mt-2">
              인당 평균 {(stats.totalOvertime / stats.total).toFixed(1)}시간
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-success-600" size={20} />
              <h3 className="font-semibold text-gray-900">준수율</h3>
            </div>
            <p className="text-3xl font-bold text-success-600">
              {((stats.good / stats.total) * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.good}명 양호 / {stats.total}명 전체
            </p>
          </div>
        </div>

        {/* 위반/경고 목록 */}
        {stats.violation > 0 && (
          <div className="card mb-6 border-danger-200">
            <div className="card-header bg-danger-50 border-danger-200">
              <h2 className="text-lg font-semibold text-danger-700 flex items-center gap-2">
                <AlertCircle size={20} />
                즉시 조치 필요 ({stats.violation}건)
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {complianceData
                .filter((c) => c.status === 'violation')
                .map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-danger-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-danger-600">
                            {item.employeeName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.employeeName}
                            <span className="text-gray-500 font-normal ml-2">
                              {item.employeeNumber} · {item.department}
                            </span>
                          </p>
                          <div className="mt-2 space-y-1">
                            {item.violations.map((v, idx) => (
                              <p key={idx} className="text-sm text-danger-600 flex items-center gap-1">
                                <AlertCircle size={14} />
                                {v}
                              </p>
                            ))}
                            {item.warnings.map((w, idx) => (
                              <p key={idx} className="text-sm text-warning-600 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                {w}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getHoursColor(item.weeklyHours)}`}>
                          {item.weeklyHours}h
                        </p>
                        <p className="text-xs text-gray-500">주간 근무</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 상세 테이블 */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              주간 근무현황 상세
              <span className="text-sm text-gray-500 font-normal ml-2">
                (2025-01-20 ~ 2025-01-26)
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    직원
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={14} />
                      주간 근무
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp size={14} />
                      연장
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar size={14} />
                      연속근무
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    <div className="flex items-center justify-center gap-1">
                      <Moon size={14} />
                      야간
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    이슈
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {getStatusIcon(item.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.employeeNumber} · {item.department}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={getHoursColor(item.weeklyHours)}>
                        {item.weeklyHours}h
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.overtimeHours > 0 ? (
                        <span className="text-warning-600 font-medium">
                          +{item.overtimeHours}h
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          item.continuousWorkDays >= 6
                            ? 'text-danger-600 font-bold'
                            : item.continuousWorkDays >= 5
                            ? 'text-warning-600 font-medium'
                            : 'text-gray-900'
                        }
                      >
                        {item.continuousWorkDays}일
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.nightWorkDays > 0 ? (
                        <span className="text-purple-600 font-medium">
                          {item.nightWorkDays}일
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.violations.length === 0 && item.warnings.length === 0 ? (
                          <span className="text-sm text-gray-400">없음</span>
                        ) : (
                          <>
                            {item.violations.map((_, idx) => (
                              <span key={`v-${idx}`} className="badge badge-danger">
                                위반
                              </span>
                            ))}
                            {item.warnings.map((_, idx) => (
                              <span key={`w-${idx}`} className="badge badge-warning">
                                경고
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 근로기준법 안내 */}
        <div className="mt-6 card bg-gray-50">
          <div className="card-body">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={18} />
              근로기준법 주요 기준
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-500 mb-1">주간 최대 근무시간</p>
                <p className="text-xl font-bold text-gray-900">52시간</p>
                <p className="text-xs text-gray-400 mt-1">기본 40시간 + 연장 12시간</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-500 mb-1">연속 근무일 한도</p>
                <p className="text-xl font-bold text-gray-900">6일</p>
                <p className="text-xs text-gray-400 mt-1">7일째 휴무 필수</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-500 mb-1">야간근무 시간대</p>
                <p className="text-xl font-bold text-gray-900">22:00 ~ 06:00</p>
                <p className="text-xs text-gray-400 mt-1">50% 가산수당</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-500 mb-1">휴게시간</p>
                <p className="text-xl font-bold text-gray-900">8시간당 1시간</p>
                <p className="text-xs text-gray-400 mt-1">4시간당 30분</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
