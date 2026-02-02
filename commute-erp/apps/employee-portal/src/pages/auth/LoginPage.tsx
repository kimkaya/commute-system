// =====================================================
// Employee Login Page (멀티사업장 지원)
// =====================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, Eye, EyeOff, Loader2, AtSign, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { employeeLoginV2 } from '../../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 이미 로그인된 경우
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('이메일을 입력해주세요');
      return;
    }

    // 이메일 형식 검증
    if (!email.includes('@') || !email.includes('.com')) {
      toast.error('이메일 형식이 올바르지 않습니다 (예: 사용자ID@회사코드.com)');
      return;
    }

    if (!password) {
      toast.error('비밀번호를 입력해주세요');
      return;
    }

    setIsLoading(true);

    try {
      const result = await employeeLoginV2(email.toLowerCase(), password);

      if (result.success && result.employee) {
        login({
          employee: {
            id: result.employee.id,
            business_id: result.business_id!,
            employee_number: result.employee.employee_number,
            username: result.employee.username || null,
            name: result.employee.name,
            department: result.employee.department,
            position: result.employee.position,
            email: result.employee.email,
            phone: result.employee.phone,
            hourly_rate: result.employee.hourly_rate,
            salary_type: result.employee.salary_type,
            hire_date: result.employee.hire_date,
          },
          businessId: result.business_id!,
          businessName: result.business_name,
          companyCode: result.company_code,
        });
        toast.success(`${result.employee.name}님, 환영합니다!`);
        navigate('/');
      } else {
        toast.error(result.error || '로그인에 실패했습니다');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('로그인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-200 mb-4">
            <Clock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">직원 포털</h1>
          <p className="text-gray-500 mt-1">출퇴근 ERP 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이메일 (아이디@회사코드.com) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="사용자ID@회사코드.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-12"
                  disabled={isLoading}
                  autoFocus
                />
                <AtSign className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                예: hong@mycompany.com
              </p>
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>로그인 중...</span>
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              아직 계정이 없으신가요?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                회원가입
              </Link>
            </p>
          </div>

          {/* 안내 */}
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <div className="flex gap-3">
              <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">로그인 안내</p>
                <ul className="space-y-1">
                  <li>• 이메일 형식: <strong>사용자ID@회사코드.com</strong></li>
                  <li>• 회사코드는 관리자에게 문의하세요</li>
                  <li>• 비밀번호를 잊으셨다면 관리자에게 문의하세요</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-400 mt-6">
          &copy; 2025 출퇴근 ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
