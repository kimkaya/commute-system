// =====================================================
// Employee Login Page
// =====================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      // TODO: 실제 API 연동
      // const response = await fetch('/functions/v1/employee-login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ employeeNumber, password }),
      // });

      // 데모: 하드코딩된 계정
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (employeeNumber === 'EMP001' && password === '1234') {
        const mockEmployee = {
          id: '1',
          employeeNumber: 'EMP001',
          name: '홍길동',
          department: '개발팀',
          position: '선임',
          email: 'hong@example.com',
          phone: '010-1234-5678',
        };

        login(mockEmployee, 'demo-token');
        toast.success(`${mockEmployee.name}님, 환영합니다!`);
        navigate('/');
      } else if (employeeNumber === 'EMP002' && password === '1234') {
        const mockEmployee = {
          id: '2',
          employeeNumber: 'EMP002',
          name: '김영희',
          department: '영업팀',
          position: '대리',
          email: 'kim@example.com',
          phone: '010-2345-6789',
        };

        login(mockEmployee, 'demo-token');
        toast.success(`${mockEmployee.name}님, 환영합니다!`);
        navigate('/');
      } else {
        toast.error('사원번호 또는 비밀번호가 올바르지 않습니다');
      }
    } catch {
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

          {/* 데모 안내 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 text-center mb-2">데모 계정</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                <span className="font-medium">사원번호:</span> EMP001 또는 EMP002
              </p>
              <p>
                <span className="font-medium">비밀번호:</span> 1234
              </p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-400 mt-6">
          &copy; 2024 출퇴근 ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
