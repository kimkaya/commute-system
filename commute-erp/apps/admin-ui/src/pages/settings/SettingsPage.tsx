// =====================================================
// 설정 페이지 (세금/공제 커스텀 설정 포함)
// =====================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Settings,
  Building2,
  Clock,
  Bell,
  Shield,
  Database,
  Users,
  Save,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Calculator,
  FileSpreadsheet,
  Upload,
  Download,
  Loader2,
  Info,
  AlertCircle,
  Copy,
  RefreshCw,
  UserPlus,
  Monitor,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getTaxSettings,
  saveTaxSettings,
  getExcelTemplates,
  saveExcelTemplate,
  deleteExcelTemplate,
  getSecuritySettings,
  saveSecuritySettings,
  getNotificationSettings,
  saveNotificationSettings,
  SUPABASE_URL,
} from '../../lib/api';
import type { TaxSettings, ExcelTemplate, TemplateCellMapping, SecuritySettings, NotificationSettings } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

// 설정 섹션
type SettingSection = 'company' | 'work' | 'tax' | 'templates' | 'notification' | 'security' | 'backup' | 'admin' | 'invite' | 'kiosk';

// 관리자 목록 (데모)
const adminUsers = [
  { id: '1', name: '관리자', email: 'admin@example.com', role: 'super', lastLogin: '2024-02-10 14:30' },
  { id: '2', name: '인사담당', email: 'hr@example.com', role: 'hr', lastLogin: '2024-02-09 09:15' },
];

const roleLabels: Record<string, string> = {
  super: '최고관리자',
  hr: '인사관리자',
  payroll: '급여관리자',
  viewer: '조회전용',
};

// 필드 매핑 옵션
const fieldMappingOptions = [
  { value: 'employeeName', label: '직원명' },
  { value: 'employeeNumber', label: '사번' },
  { value: 'department', label: '부서' },
  { value: 'position', label: '직급' },
  { value: 'hireDate', label: '입사일' },
  { value: 'basePay', label: '기본급' },
  { value: 'overtimePay', label: '연장수당' },
  { value: 'grossPay', label: '총지급액' },
  { value: 'incomeTax', label: '소득세' },
  { value: 'localTax', label: '지방소득세' },
  { value: 'nationalPension', label: '국민연금' },
  { value: 'healthInsurance', label: '건강보험' },
  { value: 'longTermCare', label: '장기요양보험' },
  { value: 'employmentInsurance', label: '고용보험' },
  { value: 'totalDeductions', label: '총공제액' },
  { value: 'netPay', label: '실수령액' },
  { value: 'workDays', label: '근무일수' },
  { value: 'totalHours', label: '총근무시간' },
  { value: 'companyName', label: '회사명' },
  { value: 'businessNumber', label: '사업자번호' },
  { value: 'ceoName', label: '대표자명' },
  { value: 'payPeriod', label: '급여기간' },
  { value: 'payDate', label: '지급일' },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingSection>('company');
  const [isSaving, setIsSaving] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // 세금 설정
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(getTaxSettings());
  
  // Excel 템플릿
  const [templates, setTemplates] = useState<ExcelTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ExcelTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 알림 설정
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(getNotificationSettings());
  
  // 보안 설정
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(getSecuritySettings());

  // 초대코드 상태
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isLoadingInviteCode, setIsLoadingInviteCode] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  
  // 키오스크 기기 상태
  interface KioskDevice {
    id: string;
    device_code: string;
    device_name: string;
    location: string;
    is_registered: boolean;
    last_active_at: string | null;
    created_at: string;
  }
  const [kioskDevices, setKioskDevices] = useState<KioskDevice[]>([]);
  const [isLoadingKiosks, setIsLoadingKiosks] = useState(false);
  const [showAddKioskModal, setShowAddKioskModal] = useState(false);
  const [newKioskName, setNewKioskName] = useState('');
  const [newKioskLocation, setNewKioskLocation] = useState('');
  const [isAddingKiosk, setIsAddingKiosk] = useState(false);

  // Auth store에서 businessId 가져오기
  const { businessId } = useAuthStore();

  useEffect(() => {
    setTemplates(getExcelTemplates());
  }, []);

  // 초대코드 로드
  useEffect(() => {
    if (activeSection === 'invite' && businessId) {
      loadInviteCode();
    }
  }, [activeSection, businessId]);

  // 키오스크 목록 로드
  useEffect(() => {
    if (activeSection === 'kiosk' && businessId) {
      loadKioskDevices();
    }
  }, [activeSection, businessId]);

  const loadInviteCode = async () => {
    if (!businessId) return;
    setIsLoadingInviteCode(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${businessId}&select=invite_code`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        setInviteCode(data[0].invite_code || '');
      }
    } catch (error) {
      console.error('Failed to load invite code:', error);
      toast.error('초대코드를 불러오는데 실패했습니다');
    } finally {
      setIsLoadingInviteCode(false);
    }
  };

  const handleRegenerateInviteCode = async () => {
    if (!businessId) return;
    setIsRegeneratingCode(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/regenerate-invite-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({ business_id: businessId }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setInviteCode(data.invite_code);
        toast.success('새 초대코드가 발급되었습니다');
      } else {
        throw new Error(data.error || '초대코드 재발급 실패');
      }
    } catch (error: any) {
      console.error('Failed to regenerate invite code:', error);
      toast.error(error.message || '초대코드 재발급에 실패했습니다');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast.success('초대코드가 복사되었습니다');
    }
  };

  const loadKioskDevices = async () => {
    if (!businessId) return;
    setIsLoadingKiosks(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/kiosk_devices?business_id=eq.${businessId}&order=created_at.desc`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setKioskDevices(data || []);
    } catch (error) {
      console.error('Failed to load kiosk devices:', error);
      toast.error('키오스크 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoadingKiosks(false);
    }
  };

  const handleAddKiosk = async () => {
    if (!businessId || !newKioskName.trim()) {
      toast.error('기기명을 입력해주세요');
      return;
    }
    
    setIsAddingKiosk(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/register-kiosk-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({
          business_id: businessId,
          device_name: newKioskName.trim(),
          location: newKioskLocation.trim() || null,
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(`키오스크가 등록되었습니다. 기기코드: ${data.device_code}`);
        setShowAddKioskModal(false);
        setNewKioskName('');
        setNewKioskLocation('');
        loadKioskDevices();
      } else {
        throw new Error(data.error || '키오스크 등록 실패');
      }
    } catch (error: any) {
      console.error('Failed to add kiosk:', error);
      toast.error(error.message || '키오스크 등록에 실패했습니다');
    } finally {
      setIsAddingKiosk(false);
    }
  };

  const handleDeleteKiosk = async (deviceId: string) => {
    if (!confirm('이 키오스크를 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/kiosk_devices?id=eq.${deviceId}`, {
        method: 'DELETE',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        toast.success('키오스크가 삭제되었습니다');
        loadKioskDevices();
      } else {
        throw new Error('삭제 실패');
      }
    } catch (error) {
      console.error('Failed to delete kiosk:', error);
      toast.error('키오스크 삭제에 실패했습니다');
    }
  };

  const handleCopyDeviceCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('기기코드가 복사되었습니다');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      saveTaxSettings(taxSettings);
      saveSecuritySettings(securitySettings);
      saveNotificationSettings(notificationSettings);
      toast.success('설정이 저장되었습니다');
    } catch (e) {
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    toast.success('백업이 시작되었습니다. 완료 시 알림을 보내드립니다.');
  };

  // 템플릿 파일 업로드
  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Excel 파일(.xlsx, .xls)만 업로드 가능합니다');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newTemplate: ExcelTemplate = {
        id: Date.now().toString(),
        name: file.name.replace(/\.(xlsx|xls)$/, ''),
        description: '',
        type: 'custom',
        fileName: file.name,
        fileData: base64,
        mappings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEditingTemplate(newTemplate);
      setShowTemplateModal(true);
    };
    reader.readAsDataURL(file);
    
    // 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    if (!editingTemplate.name.trim()) {
      toast.error('템플릿 이름을 입력하세요');
      return;
    }
    
    saveExcelTemplate({
      ...editingTemplate,
      updatedAt: new Date().toISOString(),
    });
    setTemplates(getExcelTemplates());
    setShowTemplateModal(false);
    setEditingTemplate(null);
    toast.success('템플릿이 저장되었습니다');
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm('템플릿을 삭제하시겠습니까?')) return;
    deleteExcelTemplate(id);
    setTemplates(getExcelTemplates());
    toast.success('템플릿이 삭제되었습니다');
  };

  const handleDownloadTemplate = (template: ExcelTemplate) => {
    const link = document.createElement('a');
    link.href = template.fileData;
    link.download = template.fileName;
    link.click();
  };

  const addMapping = () => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      mappings: [
        ...editingTemplate.mappings,
        { cell: '', field: 'employeeName', format: 'text' },
      ],
    });
  };

  const updateMapping = (index: number, updates: Partial<TemplateCellMapping>) => {
    if (!editingTemplate) return;
    const newMappings = [...editingTemplate.mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setEditingTemplate({ ...editingTemplate, mappings: newMappings });
  };

  const removeMapping = (index: number) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      mappings: editingTemplate.mappings.filter((_, i) => i !== index),
    });
  };

  const sections = [
    { id: 'company', label: '회사 정보', icon: Building2 },
    { id: 'work', label: '근무 설정', icon: Clock },
    { id: 'tax', label: '세금/공제 설정', icon: Calculator },
    { id: 'templates', label: 'Excel 템플릿', icon: FileSpreadsheet },
    { id: 'invite', label: '직원 초대', icon: UserPlus },
    { id: 'kiosk', label: '키오스크 관리', icon: Monitor },
    { id: 'notification', label: '알림 설정', icon: Bell },
    { id: 'security', label: '보안 설정', icon: Shield },
    { id: 'backup', label: '백업 관리', icon: Database },
    { id: 'admin', label: '관리자 계정', icon: Users },
  ];

  // 현재 선택된 섹션 정보
  const currentSection = useMemo(() => 
    sections.find(s => s.id === activeSection) || sections[0],
    [activeSection]
  );

  // 세율을 퍼센트로 표시하기 위한 헬퍼
  const toPercent = (rate: number) => (rate * 100).toFixed(2);
  const fromPercent = (percent: string) => parseFloat(percent) / 100;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-base">시스템 설정을 관리합니다</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors w-full sm:w-auto text-sm"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isSaving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>

      {/* 모바일 섹션 드롭다운 */}
      <div className="lg:hidden relative">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg text-left"
        >
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = currentSection.icon;
              return <Icon size={20} className="text-primary-600" />;
            })()}
            <span className="font-medium text-gray-900">{currentSection.label}</span>
          </div>
          <ChevronDown size={20} className={`text-gray-500 transition-transform ${showMobileMenu ? 'rotate-180' : ''}`} />
        </button>
        
        {showMobileMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id as SettingSection);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* 사이드 메뉴 - 데스크톱만 */}
        <div className="hidden lg:block w-64 shrink-0">
          <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as SettingSection)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 설정 내용 */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          {/* 회사 정보 */}
          {activeSection === 'company' && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">회사 정보</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">회사명</label>
                  <input
                    type="text"
                    value={taxSettings.companyName}
                    onChange={(e) => setTaxSettings({ ...taxSettings, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">사업자등록번호</label>
                  <input
                    type="text"
                    value={taxSettings.businessNumber}
                    onChange={(e) => setTaxSettings({ ...taxSettings, businessNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">대표자명</label>
                  <input
                    type="text"
                    value={taxSettings.ceoName}
                    onChange={(e) => setTaxSettings({ ...taxSettings, ceoName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">대표전화</label>
                  <input
                    type="text"
                    value={taxSettings.companyPhone}
                    onChange={(e) => setTaxSettings({ ...taxSettings, companyPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">주소</label>
                  <input
                    type="text"
                    value={taxSettings.companyAddress}
                    onChange={(e) => setTaxSettings({ ...taxSettings, companyAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 근무 설정 */}
          {activeSection === 'work' && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">근무 설정</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">출근 시간</label>
                  <input
                    type="time"
                    value={taxSettings.standardStartTime}
                    onChange={(e) => setTaxSettings({ ...taxSettings, standardStartTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">퇴근 시간</label>
                  <input
                    type="time"
                    value={taxSettings.standardEndTime}
                    onChange={(e) => setTaxSettings({ ...taxSettings, standardEndTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">점심시간 시작</label>
                  <input
                    type="time"
                    value={taxSettings.lunchStartTime}
                    onChange={(e) => setTaxSettings({ ...taxSettings, lunchStartTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">점심시간 종료</label>
                  <input
                    type="time"
                    value={taxSettings.lunchEndTime}
                    onChange={(e) => setTaxSettings({ ...taxSettings, lunchEndTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">지각 유예시간 (분)</label>
                  <input
                    type="number"
                    value={taxSettings.lateGraceMinutes}
                    onChange={(e) => setTaxSettings({ ...taxSettings, lateGraceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">출근 시간 이후 이 시간까지는 지각으로 처리하지 않습니다</p>
                </div>
              </div>
            </div>
          )}

          {/* 세금/공제 설정 */}
          {activeSection === 'tax' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">세금/공제 설정</h2>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                  <Info size={14} />
                  <span>2024년 기준 요율 적용</span>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-blue-700">
                  <strong>커스텀 세율 설정:</strong> 아래 요율을 수정하면 급여 계산 시 적용됩니다. 
                  세무소에서 안내받은 요율로 변경하실 수 있습니다.
                </p>
              </div>
              
              {/* 소득세 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">소득세</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      소득세율 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={toPercent(taxSettings.incomeTaxRate)}
                      onChange={(e) => setTaxSettings({ ...taxSettings, incomeTaxRate: fromPercent(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">기본: 4%</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      지방소득세율 (소득세의 %)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={toPercent(taxSettings.localTaxRate)}
                      onChange={(e) => setTaxSettings({ ...taxSettings, localTaxRate: fromPercent(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">기본: 10%</p>
                  </div>
                </div>
              </div>
              
              {/* 4대보험 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">4대보험 요율</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      국민연금 (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={toPercent(taxSettings.nationalPensionRate)}
                      onChange={(e) => setTaxSettings({ ...taxSettings, nationalPensionRate: fromPercent(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">기본: 4.5%</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      건강보험 (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={toPercent(taxSettings.healthInsuranceRate)}
                      onChange={(e) => setTaxSettings({ ...taxSettings, healthInsuranceRate: fromPercent(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">기본: 3.545%</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      장기요양보험 (건강보험의 %)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={toPercent(taxSettings.longTermCareRate)}
                      onChange={(e) => setTaxSettings({ ...taxSettings, longTermCareRate: fromPercent(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">기본: 12.95%</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      고용보험 (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={toPercent(taxSettings.employmentInsuranceRate)}
                      onChange={(e) => setTaxSettings({ ...taxSettings, employmentInsuranceRate: fromPercent(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">기본: 0.9%</p>
                  </div>
                </div>
              </div>
              
              {/* 계산 예시 */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">계산 예시 (월급 300만원 기준)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-500">소득세</p>
                    <p className="font-medium">{(3000000 * taxSettings.incomeTaxRate).toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-gray-500">지방소득세</p>
                    <p className="font-medium">{Math.round(3000000 * taxSettings.incomeTaxRate * taxSettings.localTaxRate).toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-gray-500">국민연금</p>
                    <p className="font-medium">{(3000000 * taxSettings.nationalPensionRate).toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-gray-500">건강보험</p>
                    <p className="font-medium">{Math.round(3000000 * taxSettings.healthInsuranceRate).toLocaleString()}원</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Excel 템플릿 */}
          {activeSection === 'templates' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Excel 템플릿 관리</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    세무소 서식 등 Excel 파일을 업로드하고, 셀 위치에 데이터를 매핑하세요
                  </p>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors text-sm w-full sm:w-auto">
                  <Upload size={18} />
                  템플릿 업로드
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleTemplateFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-600 flex-shrink-0" size={18} />
                  <div className="text-xs sm:text-sm text-yellow-800">
                    <p className="font-medium">사용 방법</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>세무소에서 받은 Excel 서식 파일을 업로드하세요</li>
                      <li>각 셀 위치(예: B5, C10)에 어떤 데이터를 넣을지 매핑하세요</li>
                      <li>급여 관리에서 "서류 다운로드" 시 데이터가 자동으로 채워집니다</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              {/* 템플릿 목록 */}
              {templates.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
                  <FileSpreadsheet size={40} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm">등록된 템플릿이 없습니다</p>
                  <p className="text-xs text-gray-400 mt-1">위의 "템플릿 업로드" 버튼으로 Excel 파일을 등록하세요</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="text-green-600" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base">{template.name}</h3>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{template.fileName}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {template.mappings.length}개 필드 매핑됨 · 
                              {new Date(template.updatedAt).toLocaleDateString()} 수정
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-13 sm:ml-0">
                          <button
                            onClick={() => handleDownloadTemplate(template)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="원본 다운로드"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(template);
                              setShowTemplateModal(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="편집"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 직원 초대 */}
          {activeSection === 'invite' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">직원 초대</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  직원이 회원가입 시 초대코드를 입력하면 자동으로 이 사업장에 소속됩니다
                </p>
              </div>

              {/* 초대코드 표시 */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">초대코드</p>
                    {isLoadingInviteCode ? (
                      <div className="flex items-center gap-2">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                        <span className="text-gray-400">로딩 중...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl font-mono font-bold text-primary-600 tracking-wider">
                          {inviteCode || '---'}
                        </span>
                        <button
                          onClick={handleCopyInviteCode}
                          disabled={!inviteCode}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          title="복사"
                        >
                          <Copy size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleRegenerateInviteCode}
                    disabled={isRegeneratingCode || !businessId}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
                  >
                    {isRegeneratingCode ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                    새 코드 발급
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  ⚠️ 새 코드를 발급하면 이전 코드는 더 이상 사용할 수 없습니다
                </p>
              </div>

              {/* 초대 방법 안내 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">직원 초대 방법</h3>
                <ol className="list-decimal list-inside text-xs sm:text-sm text-blue-800 space-y-2">
                  <li>위의 초대코드를 복사하세요</li>
                  <li>직원에게 초대코드를 전달하세요 (카톡, 문자 등)</li>
                  <li>직원은 Employee Portal에서 회원가입 시 초대코드를 입력합니다</li>
                  <li>가입이 완료되면 직원이 자동으로 이 사업장에 등록됩니다</li>
                </ol>
              </div>
            </div>
          )}

          {/* 키오스크 관리 */}
          {activeSection === 'kiosk' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">키오스크 관리</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    출퇴근 체크용 키오스크 기기를 등록하고 관리합니다
                  </p>
                </div>
                <button
                  onClick={() => setShowAddKioskModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm w-full sm:w-auto"
                >
                  <Plus size={18} />
                  키오스크 등록
                </button>
              </div>

              {/* 키오스크 목록 */}
              {isLoadingKiosks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : kioskDevices.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
                  <Monitor size={40} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm">등록된 키오스크가 없습니다</p>
                  <p className="text-xs text-gray-400 mt-1">위의 "키오스크 등록" 버튼으로 기기를 추가하세요</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {kioskDevices.map((device) => (
                    <div key={device.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            device.is_registered ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                            <Monitor className={device.is_registered ? 'text-green-600' : 'text-yellow-600'} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 text-sm sm:text-base">{device.device_name}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                device.is_registered 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {device.is_registered ? '연결됨' : '대기 중'}
                              </span>
                            </div>
                            {device.location && (
                              <p className="text-xs sm:text-sm text-gray-500">{device.location}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">기기코드:</span>
                              <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {device.device_code}
                              </code>
                              <button
                                onClick={() => handleCopyDeviceCode(device.device_code)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="복사"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                            {device.last_active_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                마지막 활동: {new Date(device.last_active_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-13 sm:ml-0">
                          <button
                            onClick={() => handleDeleteKiosk(device.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 키오스크 설정 안내 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">키오스크 설정 방법</h3>
                <ol className="list-decimal list-inside text-xs sm:text-sm text-blue-800 space-y-2">
                  <li>위에서 새 키오스크를 등록하세요</li>
                  <li>등록된 기기코드를 복사하세요</li>
                  <li>키오스크 앱에서 기기코드를 입력하세요</li>
                  <li>연결이 완료되면 직원들이 출퇴근 체크를 할 수 있습니다</li>
                </ol>
              </div>
            </div>
          )}

          {/* 알림 설정 */}
          {activeSection === 'notification' && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">알림 설정</h2>
              
              {/* 이메일 알림 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base">이메일 알림</h3>
                    <p className="text-xs sm:text-sm text-gray-500">이메일로 알림을 받습니다</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        email_enabled: !notificationSettings.email_enabled,
                      })
                    }
                    className={`relative w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-colors ${
                      notificationSettings.email_enabled ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notificationSettings.email_enabled ? 'translate-x-5 sm:translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>
                
                {notificationSettings.email_enabled && (
                  <div className="space-y-3 pl-3 sm:pl-4 border-l-2 border-gray-100">
                    {[
                      { key: 'email_leave_request', label: '휴가 신청 알림', desc: '휴가 신청/승인/반려 시 알림' },
                      { key: 'email_payroll_confirmed', label: '급여 확정 알림', desc: '급여가 확정되면 알림' },
                      { key: 'email_schedule_change', label: '스케줄 변경 알림', desc: '근무 스케줄 변경 시 알림' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-700">{item.label}</p>
                          <p className="text-xs text-gray-500 hidden sm:block">{item.desc}</p>
                        </div>
                        <button
                          onClick={() =>
                            setNotificationSettings({
                              ...notificationSettings,
                              [item.key]: !notificationSettings[item.key as keyof NotificationSettings],
                            })
                          }
                          className={`relative w-9 h-5 sm:w-10 sm:h-5 rounded-full transition-colors ${
                            notificationSettings[item.key as keyof NotificationSettings]
                              ? 'bg-primary-500'
                              : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                              notificationSettings[item.key as keyof NotificationSettings]
                                ? 'translate-x-4 sm:translate-x-5'
                                : ''
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 푸시 알림 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base">푸시 알림</h3>
                    <p className="text-xs sm:text-sm text-gray-500">브라우저 푸시 알림을 받습니다</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        push_enabled: !notificationSettings.push_enabled,
                      })
                    }
                    className={`relative w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-colors ${
                      notificationSettings.push_enabled ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notificationSettings.push_enabled ? 'translate-x-5 sm:translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>
                
                {notificationSettings.push_enabled && (
                  <div className="space-y-3 pl-3 sm:pl-4 border-l-2 border-gray-100">
                    {[
                      { key: 'push_leave_request', label: '휴가 신청 알림', desc: '휴가 신청/승인/반려 시 푸시 알림' },
                      { key: 'push_payroll_confirmed', label: '급여 확정 알림', desc: '급여가 확정되면 푸시 알림' },
                      { key: 'push_schedule_change', label: '스케줄 변경 알림', desc: '근무 스케줄 변경 시 푸시 알림' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-700">{item.label}</p>
                          <p className="text-xs text-gray-500 hidden sm:block">{item.desc}</p>
                        </div>
                        <button
                          onClick={() =>
                            setNotificationSettings({
                              ...notificationSettings,
                              [item.key]: !notificationSettings[item.key as keyof NotificationSettings],
                            })
                          }
                          className={`relative w-9 h-5 sm:w-10 sm:h-5 rounded-full transition-colors ${
                            notificationSettings[item.key as keyof NotificationSettings]
                              ? 'bg-primary-500'
                              : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                              notificationSettings[item.key as keyof NotificationSettings]
                                ? 'translate-x-4 sm:translate-x-5'
                                : ''
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 보안 설정 */}
          {activeSection === 'security' && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">보안 설정</h2>
              
              {/* 비밀번호 정책 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">비밀번호 정책</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">비밀번호 최소 길이</label>
                    <input
                      type="number"
                      min="4"
                      max="20"
                      value={securitySettings.min_password_length}
                      onChange={(e) =>
                        setSecuritySettings({ ...securitySettings, min_password_length: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">최소 4자 ~ 최대 20자</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">비밀번호 변경 주기 (일)</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={securitySettings.require_password_change_days}
                      onChange={(e) =>
                        setSecuritySettings({ ...securitySettings, require_password_change_days: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">0일 = 비밀번호 만료 없음</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-700">특수문자 필수</p>
                    <p className="text-xs text-gray-500 hidden sm:block">비밀번호에 특수문자(!@#$%^&*) 포함 필요</p>
                  </div>
                  <button
                    onClick={() =>
                      setSecuritySettings({ ...securitySettings, require_special_char: !securitySettings.require_special_char })
                    }
                    className={`relative w-9 h-5 sm:w-10 sm:h-5 rounded-full transition-colors flex-shrink-0 ${
                      securitySettings.require_special_char ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        securitySettings.require_special_char ? 'translate-x-4 sm:translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 로그인 보안 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">로그인 보안</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">로그인 시도 제한 (회)</label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={securitySettings.max_login_attempts}
                      onChange={(e) =>
                        setSecuritySettings({ ...securitySettings, max_login_attempts: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">연속 실패 시 계정 잠금</p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">계정 잠금 시간 (분)</label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={securitySettings.lockout_duration_minutes}
                      onChange={(e) =>
                        setSecuritySettings({ ...securitySettings, lockout_duration_minutes: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">잠금 후 자동 해제까지 시간</p>
                  </div>
                </div>
              </div>

              {/* 세션 설정 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">세션 설정</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">세션 타임아웃 (분)</label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={securitySettings.session_timeout_minutes}
                      onChange={(e) =>
                        setSecuritySettings({ ...securitySettings, session_timeout_minutes: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">비활성 상태 시 자동 로그아웃</p>
                  </div>
                </div>
              </div>

              {/* 2단계 인증 */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">2단계 인증 (2FA)</p>
                  <p className="text-xs sm:text-sm text-gray-500">관리자 로그인 시 2단계 인증 요구</p>
                </div>
                <button
                  onClick={() =>
                    setSecuritySettings({ ...securitySettings, enable_2fa: !securitySettings.enable_2fa })
                  }
                  className={`relative w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-colors flex-shrink-0 ${
                    securitySettings.enable_2fa ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      securitySettings.enable_2fa ? 'translate-x-5 sm:translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
              
              {/* IP 제한 */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">IP 접근 제한</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                  허용된 IP에서만 관리자 페이지 접근 가능 (비어있으면 모든 IP 허용)
                </p>
                <div className="space-y-2">
                  {securitySettings.allowed_ip_ranges.map((ip, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ip}
                        onChange={(e) => {
                          const newRanges = [...securitySettings.allowed_ip_ranges];
                          newRanges[index] = e.target.value;
                          setSecuritySettings({ ...securitySettings, allowed_ip_ranges: newRanges });
                        }}
                        placeholder="192.168.1.0/24"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <button
                        onClick={() => {
                          const newRanges = securitySettings.allowed_ip_ranges.filter((_, i) => i !== index);
                          setSecuritySettings({ ...securitySettings, allowed_ip_ranges: newRanges });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setSecuritySettings({
                        ...securitySettings,
                        allowed_ip_ranges: [...securitySettings.allowed_ip_ranges, ''],
                      });
                    }}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:underline"
                  >
                    <Plus size={14} />
                    IP 주소 추가
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 백업 관리 */}
          {activeSection === 'backup' && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">백업 관리</h2>
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-700">
                  데이터는 매일 자동으로 백업됩니다. 수동 백업을 원하시면 아래 버튼을 클릭하세요.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={handleBackup}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <Database className="mx-auto mb-2 text-gray-400" size={28} />
                  <p className="font-medium text-gray-900 text-sm sm:text-base">수동 백업</p>
                  <p className="text-xs sm:text-sm text-gray-500">지금 백업 시작</p>
                </button>
                <button
                  onClick={() => toast.success('최근 백업 파일 다운로드')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <Database className="mx-auto mb-2 text-gray-400" size={28} />
                  <p className="font-medium text-gray-900 text-sm sm:text-base">백업 다운로드</p>
                  <p className="text-xs sm:text-sm text-gray-500">최근 백업 파일</p>
                </button>
              </div>
            </div>
          )}

          {/* 관리자 계정 */}
          {activeSection === 'admin' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">관리자 계정</h2>
                <button
                  onClick={() => toast.success('관리자 추가 모달')}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 w-full sm:w-auto"
                >
                  <Plus size={16} />
                  관리자 추가
                </button>
              </div>
              <div className="space-y-3">
                {adminUsers.map((admin) => (
                  <div key={admin.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                    {/* 데스크톱 레이아웃 */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">{admin.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{admin.name}</p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            admin.role === 'super' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {roleLabels[admin.role]}
                        </span>
                        <span className="text-xs text-gray-500">최근 로그인: {admin.lastLogin}</span>
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-200">
                            <Edit2 size={16} className="text-gray-500" />
                          </button>
                          {admin.role !== 'super' && (
                            <button className="p-1.5 rounded hover:bg-red-100">
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 모바일 레이아웃 */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-gray-600">{admin.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{admin.name}</p>
                            <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button className="p-1.5 rounded hover:bg-gray-200">
                            <Edit2 size={16} className="text-gray-500" />
                          </button>
                          {admin.role !== 'super' && (
                            <button className="p-1.5 rounded hover:bg-red-100">
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 ml-13">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            admin.role === 'super' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {roleLabels[admin.role]}
                        </span>
                        <span className="text-xs text-gray-400">{admin.lastLogin}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 템플릿 편집 모달 */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">템플릿 설정</h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">템플릿 이름</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="예: 원천징수이행상황신고서"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">설명</label>
                  <input
                    type="text"
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="템플릿에 대한 간단한 설명"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">용도</label>
                  <select
                    value={editingTemplate.type}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value as ExcelTemplate['type'] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="payroll">급여명세서</option>
                    <option value="tax">세금신고서</option>
                    <option value="withholding">원천징수영수증</option>
                    <option value="custom">기타</option>
                  </select>
                </div>
                
                {/* 셀 매핑 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">셀 매핑</label>
                    <button
                      onClick={addMapping}
                      className="text-xs sm:text-sm text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} />
                      매핑 추가
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {editingTemplate.mappings.length === 0 ? (
                      <p className="text-xs sm:text-sm text-gray-500 p-4 bg-gray-50 rounded-lg text-center">
                        매핑이 없습니다. "매핑 추가"를 클릭하여 셀에 데이터를 연결하세요.
                      </p>
                    ) : (
                      editingTemplate.mappings.map((mapping, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={mapping.cell}
                              onChange={(e) => updateMapping(index, { cell: e.target.value.toUpperCase() })}
                              placeholder="셀 (예: B5)"
                              className="w-20 sm:w-24 px-2 py-1.5 border border-gray-200 rounded text-sm"
                            />
                            <span className="text-gray-400 hidden sm:inline">→</span>
                            <select
                              value={mapping.field}
                              onChange={(e) => updateMapping(index, { field: e.target.value })}
                              className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                            >
                              {fieldMappingOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => removeMapping(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded self-end sm:self-auto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm w-full sm:w-auto"
              >
                취소
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 text-sm w-full sm:w-auto"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 키오스크 추가 모달 */}
      {showAddKioskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">새 키오스크 등록</h3>
              <button onClick={() => setShowAddKioskModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  기기명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newKioskName}
                  onChange={(e) => setNewKioskName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="예: 1층 로비 키오스크"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  설치 위치
                </label>
                <input
                  type="text"
                  value={newKioskLocation}
                  onChange={(e) => setNewKioskLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="예: 본관 1층 정문 앞"
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  등록 후 발급되는 <strong>기기코드</strong>를 키오스크 앱에 입력하면 연결됩니다.
                </p>
              </div>
            </div>
            
            <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddKioskModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm w-full sm:w-auto"
              >
                취소
              </button>
              <button
                onClick={handleAddKiosk}
                disabled={isAddingKiosk || !newKioskName.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm w-full sm:w-auto"
              >
                {isAddingKiosk ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
