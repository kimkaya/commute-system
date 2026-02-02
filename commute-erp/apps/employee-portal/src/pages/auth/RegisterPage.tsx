// =====================================================
// Employee Register Page (초대코드로 회원가입)
// =====================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, Eye, EyeOff, Loader2, Check, ArrowLeft, UserPlus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateInviteCode, employeeRegister } from '../../lib/api';

type Step = 'invite' | 'form' | 'complete';

export function RegisterPage() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState<Step>('invite');
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: 초대코드
  const [inviteCode, setInviteCode] = useState('');
  const [businessInfo, setBusinessInfo] = useState<{
    business_id: string;
    business_name: string;
    company_code: string;
  } | null>(null);
  
  // Step 2: 회원정보
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Step 3: 완료 정보
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Step 1: 초대코드 검증
  const handleVerifyInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      toast.error('초대코드를 입력해주세요');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await validateInviteCode(inviteCode.trim().toUpperCase());
      
      if (result.valid && result.business_id) {
        setBusinessInfo({
          business_id: result.business_id,
          business_name: result.business_name || '',
          company_code: result.company_code || '',
        });
        setStep('form');
        toast.success('초대코드가 확인되었습니다');
      } else {
        toast.error(result.error || '유효하지 않은 초대코드입니다');
      }
    } catch (err) {
      console.error('Verify invite code error:', err);
      toast.error('초대코드 확인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 아이디 유효성 검사 (영문+숫자, 3~20자)
  const isUsernameValid = /^[a-zA-Z0-9]{3,20}$/.test(username);
  
  // 비밀번호 유효성 (6자 이상)
  const isPasswordValid = password.length >= 6;
  const isPasswordMatch = password === passwordConfirm;

  // Step 2: 회원가입 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('아이디를 입력해주세요');
      return;
    }
    
    if (!isUsernameValid) {
      toast.error('아이디는 영문+숫자 3~20자로 입력해주세요');
      return;
    }
    
    if (!password) {
      toast.error('비밀번호를 입력해주세요');
      return;
    }
    
    if (!isPasswordValid) {
      toast.error('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    
    if (!isPasswordMatch) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }
    
    if (!name.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await employeeRegister({
        invite_code: inviteCode.trim().toUpperCase(),
        username: username.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      
      if (result.success) {
        setRegisteredEmail(result.email_format || `${username}@${businessInfo?.company_code}.com`);
        setStep('complete');
        toast.success('회원가입이 완료되었습니다!');
      } else {
        toast.error(result.error || '회원가입에 실패했습니다');
      }
    } catch (err) {
      console.error('Register error:', err);
      toast.error('회원가입 중 오류가 발생했습니다');
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
          <h1 className="text-2xl font-bold text-gray-900">직원 회원가입</h1>
          <p className="text-gray-500 mt-1">초대코드로 가입하세요</p>
        </div>

        {/* Step 1: 초대코드 입력 */}
        {step === 'invite' && (
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
            <form onSubmit={handleVerifyInviteCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  초대코드
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  placeholder="INV-XXXXXXXX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-center text-lg tracking-widest font-mono"
                  disabled={isLoading}
                  maxLength={12}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  관리자에게 받은 초대코드를 입력하세요 (예: INV-XXXXXXXX)
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || inviteCode.length < 8}
                className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>확인 중...</span>
                  </>
                ) : (
                  '다음'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-gray-600 hover:text-primary-600">
                이미 계정이 있으신가요? <span className="font-medium">로그인</span>
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: 회원정보 입력 */}
        {step === 'form' && businessInfo && (
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
            {/* 회사 정보 */}
            <div className="mb-6 p-4 bg-primary-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="text-primary-600" size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{businessInfo.business_name}</p>
                  <p className="text-sm text-gray-500">@{businessInfo.company_code}.com</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 아이디 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아이디 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  placeholder="영문+숫자 3~20자"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                  maxLength={20}
                />
                {username && (
                  <p className={`text-xs mt-1 ${isUsernameValid ? 'text-green-600' : 'text-red-500'}`}>
                    {isUsernameValid 
                      ? `✓ 로그인 이메일: ${username}@${businessInfo.company_code}.com`
                      : '영문+숫자 3~20자로 입력해주세요'
                    }
                  </p>
                )}
              </div>

              {/* 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상"
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
                {password && (
                  <p className={`text-xs mt-1 ${isPasswordValid ? 'text-green-600' : 'text-red-500'}`}>
                    {isPasswordValid ? '✓ 사용 가능한 비밀번호입니다' : '6자 이상 입력해주세요'}
                  </p>
                )}
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 다시 입력"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
                {passwordConfirm && (
                  <p className={`text-xs mt-1 ${isPasswordMatch ? 'text-green-600' : 'text-red-500'}`}>
                    {isPasswordMatch ? '✓ 비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
                  </p>
                )}
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="실명을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연락처 <span className="text-gray-400">(선택)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('invite')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  이전
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !isUsernameValid || !isPasswordValid || !isPasswordMatch || !name.trim()}
                  className="flex-[2] py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>가입 중...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      회원가입
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: 완료 */}
        {step === 'complete' && (
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">가입 완료!</h2>
            <p className="text-gray-600 mb-6">회원가입이 성공적으로 완료되었습니다.</p>
            
            <div className="p-4 bg-gray-50 rounded-xl mb-6">
              <p className="text-sm text-gray-600 mb-2">로그인 이메일</p>
              <p className="text-lg font-mono font-medium text-primary-600">
                {registeredEmail}
              </p>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-all"
            >
              로그인하기
            </button>
          </div>
        )}

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-400 mt-6">
          &copy; 2025 출퇴근 ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
