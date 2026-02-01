// =====================================================
// 컴플라이언스 대시보드 페이지 (API 연동)
// =====================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Moon,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  getComplianceChecks,
  runComplianceCheck,
  getComplianceSummary,
} from '../../lib/api';
import type { ComplianceCheck } from '../../lib/api';

export function CompliancePage() {
  const [complianceData, setComplianceData] = useState<ComplianceCheck[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 최근 7일간 컴플라이언스 체크
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const [checks, summary] = await Promise.all([
        getComplianceChecks({
          start_date: weekAgo.toISOString().split('T')[0],
        }),
        getComplianceSummary(),
      ]);
      
      setComplianceData(checks);
      setLastChecked(summary.lastChecked);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
      toast.error('컴플라이언스 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 컴플라이언스 체크 실행
  const handleRunCheck = async () => {
    setIsRunning(true);
    try {
      const result = await runComplianceCheck();
      if (result.success) {
        setComplianceData(result.checks);
        setLastChecked(new Date().toISOString().split('T')[0]);
        toast.success(`컴플라이언스 체크 완료: ${result.violations}건 위반, ${result.warnings}건 경고`);
      } else {
        toast.error('컴플라이언스 체크에 실패했습니다');
      }
    } catch (err) {
      console.error('Compliance check error:', err);
      toast.error('컴플라이언스 체크 중 오류가 발생했습니다');
    } finally {
      setIsRunning(false);
    }
  };

  // 통계
  const stats = useMemo(() => {
    // 최신 체크 날짜의 데이터만 사용
    const latestDate = complianceData.length > 0 
      ? complianceData.reduce((max, c) => c.check_date > max ? c.check_date : max, complianceData[0].check_date)
      : null;
    
    const latestData = latestDate 
      ? complianceData.filter(c => c.check_date === latestDate)
      : [];
    
    // 직원별로 그룹화 (가장 심각한 상태 기준)
    // status는 'good' | 'warning' | 'violation' (DB) 또는 'compliant' (레거시)
    const employeeStatus = new Map<string, 'good' | 'compliant' | 'warning' | 'violation'>();
    latestData.forEach(c => {
      const empId = c.employee_id || 'unknown';
      const current = employeeStatus.get(empId);
      if (!current || 
          (c.status === 'violation') || 
          (c.status === 'warning' && (current === 'compliant' || current === 'good'))) {
        employeeStatus.set(empId, c.status);
      }
    });
    
    const total = employeeStatus.size;
    const good = Array.from(employeeStatus.values()).filter(s => s === 'compliant' || s === 'good').length;
    const warning = Array.from(employeeStatus.values()).filter(s => s === 'warning').length;
    const violation = Array.from(employeeStatus.values()).filter(s => s === 'violation').length;
    
    const weeklyHoursChecks = latestData.filter(c => c.check_type === 'weekly_hours');
    const avgHours = weeklyHoursChecks.length > 0
      ? weeklyHoursChecks.reduce((sum, c) => sum + (c.value || 0), 0) / weeklyHoursChecks.length
      : 0;
    
    const overtimeChecks = latestData.filter(c => c.check_type === 'overtime');
    const totalOvertime = overtimeChecks.reduce((sum, c) => sum + Math.max(0, (c.value || 0) - (c.threshold || 8)), 0);

    return { total, good, warning, violation, avgHours, totalOvertime, latestDate };
  }, [complianceData]);

  // 필터링
  const filteredData = useMemo(() => {
    // 최신 날짜 + weekly_hours 타입만 표시
    const latestData = stats.latestDate 
      ? complianceData.filter(c => c.check_date === stats.latestDate && c.check_type === 'weekly_hours')
      : [];
    
    if (filterStatus === 'all') return latestData;
    // compliant 필터는 'good'도 포함
    if (filterStatus === 'compliant') {
      return latestData.filter(c => c.status === 'compliant' || c.status === 'good');
    }
    return latestData.filter(c => c.status === filterStatus);
  }, [complianceData, filterStatus, stats.latestDate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'good':
        return <CheckCircle className="text-success-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-warning-500" size={20} />;
      case 'violation':
        return <AlertCircle className="text-danger-500" size={20} />;
      default:
        return null;
    }
  };

  const getHoursColor = (hours: number) => {
    if (hours > 52) return 'text-danger-600 font-bold';
    if (hours > 40) return 'text-warning-600 font-medium';
    return 'text-gray-900';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 액션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="text-xs sm:text-sm text-gray-500">
          {lastChecked ? (
            <>마지막 체크: {format(new Date(lastChecked), 'yyyy년 M월 d일')}</>
          ) : (
            '아직 컴플라이언스 체크가 실행되지 않았습니다'
          )}
        </div>
        <button
          onClick={handleRunCheck}
          disabled={isRunning}
          className="btn btn-primary w-full sm:w-auto text-sm"
        >
          {isRunning ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          <span className="hidden sm:inline">{isRunning ? '체크 중...' : '컴플라이언스 체크'}</span>
          <span className="sm:hidden">{isRunning ? '체크 중...' : '체크 실행'}</span>
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <div
          className={`stat-card cursor-pointer transition-all ${
            filterStatus === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
          onClick={() => setFilterStatus('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label text-xs sm:text-sm">전체 직원</p>
              <p className="stat-value text-lg sm:text-2xl">{stats.total}명</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="text-primary-600" size={20} />
            </div>
          </div>
        </div>

        <div
          className={`stat-card cursor-pointer transition-all ${
            filterStatus === 'compliant' ? 'ring-2 ring-success-500' : ''
          }`}
          onClick={() => setFilterStatus('compliant')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label text-xs sm:text-sm">양호</p>
              <p className="stat-value text-lg sm:text-2xl text-success-600">{stats.good}명</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-success-600" size={20} />
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
              <p className="stat-label text-xs sm:text-sm">경고</p>
              <p className="stat-value text-lg sm:text-2xl text-warning-600">{stats.warning}명</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-warning-600" size={20} />
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
              <p className="stat-label text-xs sm:text-sm">위반</p>
              <p className="stat-value text-lg sm:text-2xl text-danger-500">{stats.violation}명</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-danger-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-danger-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 주간 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Clock className="text-primary-600" size={18} />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">평균 주간 근무시간</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
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
            <span className="text-xs sm:text-sm text-gray-500">/ 52시간</span>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <TrendingUp className="text-warning-600" size={18} />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">총 연장근무</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-warning-600">
            {stats.totalOvertime.toFixed(1)}시간
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            인당 평균 {stats.total > 0 ? (stats.totalOvertime / stats.total).toFixed(1) : 0}시간
          </p>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Shield className="text-success-600" size={18} />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">준수율</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-success-600">
            {stats.total > 0 ? ((stats.good / stats.total) * 100).toFixed(0) : 0}%
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            {stats.good}명 양호 / {stats.total}명 전체
          </p>
        </div>
      </div>

      {/* 위반 목록 */}
      {stats.violation > 0 && (
        <div className="card mb-6 border-danger-200">
          <div className="card-header bg-danger-50 border-danger-200">
            <h2 className="text-base sm:text-lg font-semibold text-danger-700 flex items-center gap-2">
              <AlertCircle size={18} />
              즉시 조치 필요 ({stats.violation}건)
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {complianceData
              .filter(c => c.status === 'violation' && c.check_date === stats.latestDate)
              .map(item => (
                <div key={item.id} className="p-3 sm:p-4 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-danger-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-danger-600">
                          {item.employee?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base">
                          {item.employee?.name || '알 수 없음'}
                          <span className="text-gray-500 font-normal ml-2 text-xs sm:text-sm">
                            {item.employee?.employee_number || '-'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 sm:hidden">
                          {item.employee?.department || '-'}
                        </p>
                        <p className="text-gray-500 font-normal hidden sm:block text-sm">
                          {item.employee?.department || '-'}
                        </p>
                        <div className="mt-1 sm:mt-2">
                          <p className="text-xs sm:text-sm text-danger-600 flex items-center gap-1">
                            <AlertCircle size={12} className="sm:hidden" />
                            <AlertCircle size={14} className="hidden sm:block" />
                            <span className="truncate">{item.details?.violations?.join(', ') || item.details?.warnings?.join(', ') || '-'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-11 sm:ml-0">
                      <p className={`text-xl sm:text-2xl font-bold ${getHoursColor(item.value || 0)}`}>
                        {item.value?.toFixed(1)}h
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
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            주간 근무현황 상세
            {stats.latestDate && (
              <span className="text-xs sm:text-sm text-gray-500 font-normal ml-2">
                ({format(new Date(stats.latestDate), 'yyyy-MM-dd')} 기준)
              </span>
            )}
          </h2>
        </div>
        
        {/* 데스크톱 테이블 */}
        <div className="hidden sm:block overflow-x-auto">
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
                    기준
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  상세
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {complianceData.length === 0 
                      ? '컴플라이언스 체크를 실행해주세요'
                      : '해당하는 데이터가 없습니다'}
                  </td>
                </tr>
              ) : (
                filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {getStatusIcon(item.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.employee?.name || '알 수 없음'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.employee?.employee_number || '-'} · {item.employee?.department || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={getHoursColor(item.value || 0)}>
                        {item.value?.toFixed(1)}h
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-500">
                        {item.threshold}h
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {item.details?.violations?.join(', ') || item.details?.warnings?.join(', ') || '양호'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 모바일 카드 뷰 */}
        <div className="sm:hidden divide-y divide-gray-100">
          {filteredData.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              {complianceData.length === 0 
                ? '컴플라이언스 체크를 실행해주세요'
                : '해당하는 데이터가 없습니다'}
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span className="font-medium text-gray-900 text-sm">
                      {item.employee?.name || '알 수 없음'}
                    </span>
                  </div>
                  <span className={`text-base font-bold ${getHoursColor(item.value || 0)}`}>
                    {item.value?.toFixed(1)}h
                  </span>
                </div>
                <div className="ml-7 text-xs text-gray-500 space-y-1">
                  <p>{item.employee?.employee_number || '-'} · {item.employee?.department || '-'}</p>
                  <p className="flex items-center gap-1">
                    <span>기준: {item.threshold}h</span>
                    <span className="mx-1">·</span>
                    <span className={item.status === 'violation' ? 'text-danger-600' : item.status === 'warning' ? 'text-warning-600' : ''}>
                      {item.details?.violations?.join(', ') || item.details?.warnings?.join(', ') || '양호'}
                    </span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 근로기준법 안내 */}
      <div className="mt-6 card bg-gray-50">
        <div className="card-body p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Shield size={18} />
            근로기준법 주요 기준
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-sm">
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-gray-500 mb-1 text-xs sm:text-sm">주간 최대 근무시간</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">52시간</p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">기본 40시간 + 연장 12시간</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-gray-500 mb-1 text-xs sm:text-sm">연속 근무일 한도</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">6일</p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">7일째 휴무 필수</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-gray-500 mb-1 text-xs sm:text-sm">야간근무 시간대</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">22~06시</p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">50% 가산수당</p>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg">
              <p className="text-gray-500 mb-1 text-xs sm:text-sm">휴게시간</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">8h당 1h</p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">4시간당 30분</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
