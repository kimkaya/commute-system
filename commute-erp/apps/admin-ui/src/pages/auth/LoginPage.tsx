// =====================================================
// 로그인 페이지
// =====================================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuthStore();

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

    if (!password) {
      toast.error('비밀번호를 입력하세요');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: 실제 Supabase Edge Function 호출로 대체
      // 현재는 데모용으로 admin1234 하드코딩
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (password === 'admin1234') {
        login('00000000-0000-0000-0000-000000000001', '관리자', 30);
        toast.success('로그인 성공');
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        const newFailCount = failCount + 1;
        setFailCount(newFailCount);

        if (newFailCount >= 5) {
          toast.error('5회 실패! 30분간 계정이 잠깁니다.');
        } else {
          toast.error(`비밀번호가 틀렸습니다. (${newFailCount}/5)`);
        }
      }
    } catch (error) {
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="label">
                관리자 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="비밀번호를 입력하세요"
                  disabled={isLoading || failCount >= 5}
                  autoFocus
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
              disabled={isLoading || failCount >= 5}
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

            {failCount >= 5 && (
              <p className="text-sm text-danger-500 text-center">
                계정이 잠겼습니다. 30분 후에 다시 시도하세요.
              </p>
            )}
          </form>

          {/* 안내 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              기본 비밀번호: admin1234
              <br />
              (데모 버전)
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          &copy; 2025 출퇴근 ERP 시스템
        </p>
      </div>
    </div>
  );
}
