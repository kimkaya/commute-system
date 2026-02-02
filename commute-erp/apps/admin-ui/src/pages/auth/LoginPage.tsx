// =====================================================
// 관리자 로그인 페이지 (이메일 형식)
// =====================================================

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Clock, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { invokeFunction } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface LoginResponse {
  success: boolean;
  businessId: string;
  businessName: string;
  companyCode: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  sessionTimeout: number;
  error?: string;
  message?: string;
  locked?: boolean;
  failCount?: number;
  maxFailCount?: number;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);

  // 이미 로그인된 경우 대시보드로
  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('이메일을 입력하세요');
      return;
    }

    if (!password) {
      toast.error('비밀번호를 입력하세요');
      return;
    }

    // 이메일 형식 검증
    if (!email.includes('@') || !email.endsWith('.com')) {
      toast.error('올바른 이메일 형식으로 입력하세요 (예: admin@company.com)');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await invokeFunction<LoginResponse>('admin-login-v2', {
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        toast.error('서버 오류가 발생했습니다');
        return;
      }

      if (data?.success) {
        login({
          businessId: data.businessId,
          businessName: data.businessName,
          companyCode: data.companyCode,
          adminId: data.adminId,
          adminName: data.adminName,
          adminRole: data.adminRole,
          sessionMinutes: data.sessionTimeout,
        });
        toast.success(`${data.businessName}에 로그인되었습니다`);
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        const newFailCount = data?.failCount || failCount + 1;
        setFailCount(newFailCount);

        if (data?.locked) {
          toast.error(data.message || '계정이 잠겼습니다');
        } else {
          toast.error(data?.message || data?.error || '로그인에 실패했습니다');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('로그인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Clock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">출퇴근 관리 시스템</h1>
          <p className="text-gray-600 mt-2">관리자 로그인</p>
        </div>

        {/* 로그인 폼 */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="label">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="admin@회사코드.com"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                예: admin@demo.com
              </p>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="label">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              className="btn btn-primary w-full py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>

            {/* 실패 카운트 표시 */}
            {failCount > 0 && failCount < 5 && (
              <p className="text-sm text-danger-500 text-center">
                로그인 실패 {failCount}회 / 5회
              </p>
            )}
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">
                회원가입
              </Link>
            </p>
          </div>
        </div>

        {/* 데모 안내 */}
        <div className="mt-6 p-4 bg-white/80 rounded-xl text-center">
          <p className="text-sm text-gray-600 font-medium mb-2">데모 계정</p>
          <p className="text-xs text-gray-500">
            이메일: admin@demo.com<br />
            비밀번호: admin1234
          </p>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          &copy; 2025 출퇴근 ERP 시스템
        </p>
      </div>
    </div>
  );
}
