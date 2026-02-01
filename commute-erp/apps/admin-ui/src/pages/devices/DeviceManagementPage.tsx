// =====================================================
// 키오스크 기기 관리 페이지
// =====================================================

import { useState, useEffect } from 'react';
import {
  Monitor,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Clock,
  MapPin,
  Wifi,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// 타입 정의
interface KioskDevice {
  id: string;
  business_id: string;
  device_name: string;
  fixed_ip: string | null;
  location: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  requested_ip: string | null;
  requested_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  last_access_ip: string | null;
  last_access_at: string | null;
  created_at: string;
}

interface IPAccessLog {
  id: string;
  business_id: string;
  employee_id: string | null;
  employee_name: string | null;
  access_ip: string;
  device_id: string | null;
  action: string;
  is_suspicious: boolean;
  reason: string | null;
  user_agent: string | null;
  created_at: string;
}

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '승인 대기', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} /> },
  approved: { label: '승인됨', color: 'bg-green-100 text-green-700', icon: <ShieldCheck size={14} /> },
  rejected: { label: '거부됨', color: 'bg-red-100 text-red-700', icon: <ShieldX size={14} /> },
  disabled: { label: '비활성', color: 'bg-gray-100 text-gray-700', icon: <ShieldAlert size={14} /> },
};

const actionLabels: Record<string, string> = {
  check_in: '출근',
  check_out: '퇴근',
  face_auth: '얼굴 인증',
  password_auth: '비밀번호 인증',
};

export function DeviceManagementPage() {
  const { businessId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'devices' | 'logs'>('devices');
  const [devices, setDevices] = useState<KioskDevice[]>([]);
  const [logs, setLogs] = useState<IPAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [selectedLog, setSelectedLog] = useState<IPAccessLog | null>(null);

  // 기기 목록 로드
  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('*')
        .eq('business_id', businessId || BUSINESS_ID)
        .order('created_at', { ascending: false });

      if (error) {
        // 테이블이 없거나 권한 문제인 경우 빈 배열 반환
        if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('kiosk_devices table not found, showing empty list');
          setDevices([]);
          return;
        }
        throw error;
      }
      setDevices(data || []);
    } catch (error: unknown) {
      console.error('Failed to load devices:', error);
      // 에러 발생 시에도 빈 배열로 설정하여 페이지가 정상 표시되도록 함
      setDevices([]);
    }
  };

  // 접속 로그 로드
  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('ip_access_logs')
        .select('*')
        .eq('business_id', businessId || BUSINESS_ID)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // 테이블이 없거나 권한 문제인 경우 빈 배열 반환
        if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.log('ip_access_logs table not found, showing empty list');
          setLogs([]);
          return;
        }
        throw error;
      }
      setLogs(data || []);
    } catch (error: unknown) {
      console.error('Failed to load logs:', error);
      // 에러 발생 시에도 빈 배열로 설정하여 페이지가 정상 표시되도록 함
      setLogs([]);
    }
  };

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadDevices(), loadLogs()]);
      setLoading(false);
    };
    loadData();
  }, [businessId]);

  // 기기 승인
  const handleApprove = async (device: KioskDevice) => {
    try {
      const { error } = await supabase
        .from('kiosk_devices')
        .update({
          status: 'approved',
          fixed_ip: device.requested_ip,
          approved_at: new Date().toISOString(),
        })
        .eq('id', device.id);

      if (error) throw error;

      toast.success(`${device.device_name} 기기가 승인되었습니다`);
      loadDevices();
    } catch (error) {
      console.error('Failed to approve device:', error);
      toast.error('기기 승인에 실패했습니다');
    }
  };

  // 기기 거부
  const handleReject = async (device: KioskDevice) => {
    if (!confirm(`${device.device_name} 기기를 거부하시겠습니까?`)) return;

    try {
      const { error } = await supabase
        .from('kiosk_devices')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
        })
        .eq('id', device.id);

      if (error) throw error;

      toast.success(`${device.device_name} 기기가 거부되었습니다`);
      loadDevices();
    } catch (error) {
      console.error('Failed to reject device:', error);
      toast.error('기기 거부에 실패했습니다');
    }
  };

  // 기기 비활성화/활성화
  const handleToggleStatus = async (device: KioskDevice) => {
    const newStatus = device.status === 'disabled' ? 'approved' : 'disabled';
    const message = newStatus === 'disabled' ? '비활성화' : '활성화';

    try {
      const { error } = await supabase
        .from('kiosk_devices')
        .update({ status: newStatus })
        .eq('id', device.id);

      if (error) throw error;

      toast.success(`${device.device_name} 기기가 ${message}되었습니다`);
      loadDevices();
    } catch (error) {
      console.error('Failed to toggle device status:', error);
      toast.error(`기기 ${message}에 실패했습니다`);
    }
  };

  // 필터링된 기기 목록
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.fixed_ip?.includes(searchTerm) ||
      device.requested_ip?.includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // 필터링된 로그 목록
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.access_ip.includes(searchTerm);

    const matchesSuspicious = !showOnlySuspicious || log.is_suspicious;

    return matchesSearch && matchesSuspicious;
  });

  // 통계
  const stats = {
    total: devices.length,
    pending: devices.filter((d) => d.status === 'pending').length,
    approved: devices.filter((d) => d.status === 'approved').length,
    suspicious: logs.filter((l) => l.is_suspicious).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">기기 관리</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-base">키오스크 기기 및 IP 접속 관리</p>
        </div>
        <button
          onClick={() => {
            loadDevices();
            loadLogs();
            toast.success('데이터를 새로고침했습니다');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 w-full sm:w-auto"
        >
          <RefreshCw size={18} />
          <span>새로고침</span>
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Monitor className="text-blue-600" size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">전체 기기</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="text-yellow-600" size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">승인 대기</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-green-600" size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">승인된 기기</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">비정상 접속</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">{stats.suspicious}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 min-w-[140px] py-3 text-center font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'devices'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Monitor size={16} className="inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">키오스크 기기</span>
            <span className="sm:hidden">기기</span>
            <span className="ml-1">({devices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 min-w-[140px] py-3 text-center font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'logs'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield size={16} className="inline mr-1 sm:mr-2" />
            <span className="hidden sm:inline">IP 접속 로그</span>
            <span className="sm:hidden">로그</span>
            <span className="ml-1">({logs.length})</span>
            {stats.suspicious > 0 && (
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                {stats.suspicious}
              </span>
            )}
          </button>
        </div>

        {/* 필터 */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'devices' ? '기기명, 위치, IP로 검색...' : '직원명, IP로 검색...'}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>

          {activeTab === 'devices' ? (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 상태</option>
              <option value="pending">승인 대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거부됨</option>
              <option value="disabled">비활성</option>
            </select>
          ) : (
            <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 w-full sm:w-auto">
              <input
                type="checkbox"
                checked={showOnlySuspicious}
                onChange={(e) => setShowOnlySuspicious(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-700">비정상 접속만</span>
            </label>
          )}
        </div>

        {/* 컨텐츠 */}
        <div className="p-3 sm:p-4">
          {activeTab === 'devices' ? (
            // 기기 목록
            filteredDevices.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Monitor size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">등록된 키오스크 기기가 없습니다</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  키오스크에서 고정 IP 등록 요청을 하면 여기에 표시됩니다
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {filteredDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`border rounded-lg p-3 sm:p-4 ${
                      device.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            device.status === 'approved'
                              ? 'bg-green-100'
                              : device.status === 'pending'
                              ? 'bg-yellow-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          <Monitor
                            size={20}
                            className={
                              device.status === 'approved'
                                ? 'text-green-600'
                                : device.status === 'pending'
                                ? 'text-yellow-600'
                                : 'text-gray-400'
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{device.device_name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                                statusConfig[device.status].color
                              }`}
                            >
                              {statusConfig[device.status].icon}
                              {statusConfig[device.status].label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                            {device.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {device.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Wifi size={12} />
                              <span className="font-mono">{device.fixed_ip || device.requested_ip || '미지정'}</span>
                            </span>
                          </div>
                          {device.last_access_at && (
                            <p className="mt-1 text-xs text-gray-400">
                              마지막: {new Date(device.last_access_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-13 sm:ml-0">
                        {device.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(device)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700"
                            >
                              <Check size={14} />
                              승인
                            </button>
                            <button
                              onClick={() => handleReject(device)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700"
                            >
                              <X size={14} />
                              거부
                            </button>
                          </>
                        )}
                        {device.status === 'approved' && (
                          <button
                            onClick={() => handleToggleStatus(device)}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-600 border border-gray-200 text-xs sm:text-sm rounded-lg hover:bg-gray-50"
                          >
                            비활성화
                          </button>
                        )}
                        {device.status === 'disabled' && (
                          <button
                            onClick={() => handleToggleStatus(device)}
                            className="flex items-center gap-1 px-3 py-1.5 text-primary-600 border border-primary-200 text-xs sm:text-sm rounded-lg hover:bg-primary-50"
                          >
                            활성화
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // IP 접속 로그
            filteredLogs.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Shield size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">접속 로그가 없습니다</p>
              </div>
            ) : (
              <>
                {/* 데스크톱 테이블 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                        <th className="pb-3 font-medium">시간</th>
                        <th className="pb-3 font-medium">직원</th>
                        <th className="pb-3 font-medium">IP 주소</th>
                        <th className="pb-3 font-medium">행동</th>
                        <th className="pb-3 font-medium">상태</th>
                        <th className="pb-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={`${log.is_suspicious ? 'bg-red-50' : ''}`}
                        >
                          <td className="py-3 text-sm text-gray-600">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 text-sm font-medium text-gray-900">
                            {log.employee_name || '-'}
                          </td>
                          <td className="py-3 text-sm text-gray-600 font-mono">
                            {log.access_ip}
                          </td>
                          <td className="py-3 text-sm text-gray-600">
                            {actionLabels[log.action] || log.action}
                          </td>
                          <td className="py-3">
                            {log.is_suspicious ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                <AlertTriangle size={12} />
                                비정상
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                <Check size={12} />
                                정상
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* 모바일 카드 뷰 */}
                <div className="md:hidden space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        log.is_suspicious ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 text-sm">{log.employee_name || '-'}</span>
                        {log.is_suspicious ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            <AlertTriangle size={10} />
                            비정상
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <Check size={10} />
                            정상
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p className="flex items-center justify-between">
                          <span className="font-mono">{log.access_ip}</span>
                          <span>{actionLabels[log.action] || log.action}</span>
                        </p>
                        <p>{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* 로그 상세 모달 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">접속 로그 상세</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">시간</p>
                  <p className="font-medium text-sm sm:text-base">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">직원</p>
                  <p className="font-medium text-sm sm:text-base">{selectedLog.employee_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">IP 주소</p>
                  <p className="font-medium font-mono text-sm sm:text-base">{selectedLog.access_ip}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">행동</p>
                  <p className="font-medium text-sm sm:text-base">{actionLabels[selectedLog.action] || selectedLog.action}</p>
                </div>
              </div>

              {selectedLog.is_suspicious && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle size={16} />
                    <span className="font-medium text-sm">비정상 접속 감지</span>
                  </div>
                  {selectedLog.reason && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1">{selectedLog.reason}</p>
                  )}
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">User Agent</p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono break-all">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
