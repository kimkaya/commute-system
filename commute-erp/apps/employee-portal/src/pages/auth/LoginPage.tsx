// =====================================================
// Employee Login Page (Supabase 연동)
// =====================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { employeeLogin } from '../../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  const [employeeNumber, setEmployeeNumber] = useState('');
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

    if (!employeeNumber.trim()) {
      toast.error('사원번호를 입력해주세요');
      return;
    }

    if (!password) {
      toast.error('비밀번호를 입력해주세요');
      return;
    }

    setIsLoading(true);

    try {
      const result = await employeeLogin(employeeNumber, password);

      if (result.success && result.employee) {
        login({
          id: result.employee.id,
          employee_number: result.employee.employee_number,
          name: result.employee.name,
          department: result.employee.department,
          position: result.employee.position,
          email: result.employee.email,
          phone: result.employee.phone,
          hourly_rate: result.employee.hourly_rate,
          salary_type: result.employee.salary_type,
          hire_date: result.employee.hire_date,
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
            {/* 사원번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사원번호
              </label>
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="EMP001"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                disabled={isLoading}
                autoFocus
              />
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

          {/* 안내 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 text-center">
              사원번호와 비밀번호를 입력하여 로그인하세요.
              <br />
              비밀번호를 잊으셨다면 관리자에게 문의하세요.
            </p>
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
