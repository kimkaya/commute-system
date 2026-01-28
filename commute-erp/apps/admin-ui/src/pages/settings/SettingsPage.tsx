// =====================================================
// 설정 페이지
// =====================================================

import { useState } from 'react';
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
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// 설정 섹션
type SettingSection = 'company' | 'work' | 'notification' | 'security' | 'backup' | 'admin';

// 기본 설정 데이터
const defaultSettings = {
  company: {
    name: '(주)테스트회사',
    businessNumber: '123-45-67890',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
    email: 'info@testcompany.com',
    ceo: '홍길동',
  },
  work: {
    startTime: '09:00',
    endTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    lateGracePeriod: 10, // 분
    overtimeUnit: 30, // 분
    minOvertimeHours: 0.5,
    maxOvertimeHours: 4,
  },
  notification: {
    emailEnabled: true,
    pushEnabled: true,
    lateAlert: true,
    leaveApproval: true,
    payrollNotice: true,
    weeklyReport: false,
  },
  security: {
    passwordMinLength: 4,
    passwordExpireDays: 90,
    maxLoginAttempts: 5,
    sessionTimeout: 30, // 분
    twoFactorAuth: false,
  },
};

// 관리자 목록
const adminUsers = [
  { id: '1', name: '관리자', email: 'admin@example.com', role: 'super', lastLogin: '2024-02-10 14:30' },
  { id: '2', name: '인사담당', email: 'hr@example.com', role: 'hr', lastLogin: '2024-02-09 09:15' },
  { id: '3', name: '급여담당', email: 'payroll@example.com', role: 'payroll', lastLogin: '2024-02-08 17:45' },
];

const roleLabels: Record<string, string> = {
  super: '최고관리자',
  hr: '인사관리자',
  payroll: '급여관리자',
  viewer: '조회전용',
};

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingSection>('company');
  const [settings, setSettings] = useState(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('설정이 저장되었습니다');
    setIsSaving(false);
  };

  const handleBackup = async () => {
    toast.success('백업이 시작되었습니다. 완료 시 알림을 보내드립니다.');
  };

  const sections = [
    { id: 'company', label: '회사 정보', icon: Building2 },
    { id: 'work', label: '근무 설정', icon: Clock },
    { id: 'notification', label: '알림 설정', icon: Bell },
    { id: 'security', label: '보안 설정', icon: Shield },
    { id: 'backup', label: '백업 관리', icon: Database },
    { id: 'admin', label: '관리자 계정', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-500 mt-1">시스템 설정을 관리합니다</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Save size={18} />
          {isSaving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* 사이드 메뉴 */}
        <div className="w-64 shrink-0">
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
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {/* 회사 정보 */}
          {activeSection === 'company' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">회사 정보</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">회사명</label>
                  <input
                    type="text"
                    value={settings.company.name}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company: { ...settings.company, name: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사업자등록번호
                  </label>
                  <input
                    type="text"
                    value={settings.company.businessNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company: { ...settings.company, businessNumber: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                  <input
                    type="text"
                    value={settings.company.address}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company: { ...settings.company, address: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">대표자명</label>
                  <input
                    type="text"
                    value={settings.company.ceo}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company: { ...settings.company, ceo: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">대표전화</label>
                  <input
                    type="text"
                    value={settings.company.phone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company: { ...settings.company, phone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대표 이메일
                  </label>
                  <input
                    type="email"
                    value={settings.company.email}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        company: { ...settings.company, email: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 근무 설정 */}
          {activeSection === 'work' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">근무 설정</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출근 시간
                  </label>
                  <input
                    type="time"
                    value={settings.work.startTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work: { ...settings.work, startTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    퇴근 시간
                  </label>
                  <input
                    type="time"
                    value={settings.work.endTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work: { ...settings.work, endTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    점심시간 시작
                  </label>
                  <input
                    type="time"
                    value={settings.work.lunchStart}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work: { ...settings.work, lunchStart: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    점심시간 종료
                  </label>
                  <input
                    type="time"
                    value={settings.work.lunchEnd}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work: { ...settings.work, lunchEnd: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    지각 유예시간 (분)
                  </label>
                  <input
                    type="number"
                    value={settings.work.lateGracePeriod}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work: { ...settings.work, lateGracePeriod: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    출근 시간 이후 이 시간까지는 지각으로 처리하지 않습니다
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    연장근무 단위 (분)
                  </label>
                  <input
                    type="number"
                    value={settings.work.overtimeUnit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        work: { ...settings.work, overtimeUnit: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 알림 설정 */}
          {activeSection === 'notification' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">알림 설정</h2>
              <div className="space-y-4">
                {[
                  { key: 'emailEnabled', label: '이메일 알림', desc: '이메일로 알림을 받습니다' },
                  { key: 'pushEnabled', label: '푸시 알림', desc: '브라우저 푸시 알림을 받습니다' },
                  { key: 'lateAlert', label: '지각 알림', desc: '직원 지각 시 관리자에게 알림' },
                  { key: 'leaveApproval', label: '휴가 승인 알림', desc: '휴가 신청/승인 시 알림' },
                  { key: 'payrollNotice', label: '급여 알림', desc: '급여 지급 관련 알림' },
                  { key: 'weeklyReport', label: '주간 리포트', desc: '매주 월요일 주간 현황 리포트' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          notification: {
                            ...settings.notification,
                            [item.key]:
                              !settings.notification[item.key as keyof typeof settings.notification],
                          },
                        })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.notification[item.key as keyof typeof settings.notification]
                          ? 'bg-primary-600'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.notification[item.key as keyof typeof settings.notification]
                            ? 'translate-x-6'
                            : ''
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 보안 설정 */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">보안 설정</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호 최소 길이
                  </label>
                  <input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordMinLength: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호 만료 (일)
                  </label>
                  <input
                    type="number"
                    value={settings.security.passwordExpireDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordExpireDays: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    로그인 시도 제한 (회)
                  </label>
                  <input
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          maxLoginAttempts: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    세션 타임아웃 (분)
                  </label>
                  <input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          sessionTimeout: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">2단계 인증</p>
                  <p className="text-sm text-gray-500">관리자 로그인 시 2단계 인증 필요</p>
                </div>
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        twoFactorAuth: !settings.security.twoFactorAuth,
                      },
                    })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.security.twoFactorAuth ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.security.twoFactorAuth ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* 백업 관리 */}
          {activeSection === 'backup' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">백업 관리</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  데이터는 매일 자동으로 백업됩니다. 수동 백업을 원하시면 아래 버튼을 클릭하세요.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleBackup}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <Database className="mx-auto mb-2 text-gray-400" size={32} />
                  <p className="font-medium text-gray-900">수동 백업</p>
                  <p className="text-sm text-gray-500">지금 백업 시작</p>
                </button>
                <button
                  onClick={() => toast.success('최근 백업 파일 다운로드')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <Database className="mx-auto mb-2 text-gray-400" size={32} />
                  <p className="font-medium text-gray-900">백업 다운로드</p>
                  <p className="text-sm text-gray-500">최근 백업 파일</p>
                </button>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-3">백업 이력</h3>
                <div className="space-y-2">
                  {[
                    { date: '2024-02-10 03:00', size: '45.2 MB', status: 'success' },
                    { date: '2024-02-09 03:00', size: '44.8 MB', status: 'success' },
                    { date: '2024-02-08 03:00', size: '44.5 MB', status: 'success' },
                  ].map((backup, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{backup.date}</p>
                        <p className="text-xs text-gray-500">{backup.size}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        성공
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 관리자 계정 */}
          {activeSection === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">관리자 계정</h2>
                <button
                  onClick={() => toast.success('관리자 추가 모달')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                >
                  <Plus size={16} />
                  관리자 추가
                </button>
              </div>
              <div className="space-y-3">
                {adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {admin.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{admin.name}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          admin.role === 'super'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {roleLabels[admin.role]}
                      </span>
                      <span className="text-xs text-gray-500">
                        최근 로그인: {admin.lastLogin}
                      </span>
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
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
