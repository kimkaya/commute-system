// =====================================================
// 내 정보 페이지
// =====================================================

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Lock,
  ChevronRight,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

export function ProfilePage() {
  const navigate = useNavigate();
  const { employee, logout } = useAuthStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login');
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('현재 비밀번호를 입력해주세요');
      return;
    }
    if (!newPassword) {
      toast.error('새 비밀번호를 입력해주세요');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('비밀번호는 4자리 이상이어야 합니다');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다');
      return;
    }

    // TODO: API 연동
    toast.success('비밀번호가 변경되었습니다');
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="py-4 space-y-4">
      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {employee?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{employee?.name}</h2>
            <p className="text-sm text-gray-500">
              {employee?.department} · {employee?.position}
            </p>
            <p className="text-xs text-gray-400 mt-1">사원번호: {employee?.employeeNumber}</p>
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">기본 정보</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail size={18} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">이메일</p>
              <p className="text-sm font-medium text-gray-900">{employee?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Phone size={18} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">연락처</p>
              <p className="text-sm font-medium text-gray-900">{employee?.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">부서</p>
              <p className="text-sm font-medium text-gray-900">{employee?.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Briefcase size={18} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">직급</p>
              <p className="text-sm font-medium text-gray-900">{employee?.position}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar size={18} className="text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">입사일</p>
              <p className="text-sm font-medium text-gray-900">2022년 3월 1일</p>
            </div>
          </div>
        </div>
      </div>

      {/* 설정 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">설정</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Lock size={18} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">비밀번호 변경</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Bell size={18} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">알림 설정</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* 기타 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Shield size={18} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">개인정보 처리방침</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">이용약관</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <HelpCircle size={18} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">고객센터</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-medium"
      >
        <LogOut size={18} />
        로그아웃
      </button>

      {/* 앱 버전 */}
      <p className="text-center text-xs text-gray-400">버전 1.0.0</p>

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">비밀번호 변경</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-500">X</span>
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handlePasswordChange} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 비밀번호
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">4자리 이상 입력해주세요</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  변경하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
