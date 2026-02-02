// =====================================================
// 관리자 회원가입 페이지
// =====================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Clock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Building2, 
  User, 
  Lock,
  CheckCircle,
  Copy,
  ArrowLeft,
} from 'lucide-react';
import { invokeFunction } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface RegisterResponse {
  success: boolean;
  businessId: string;
  businessName: string;
  companyCode: string;
  inviteCode: string;
  adminEmail: string;
  message?: string;
  error?: string;
}

type Step = 'form' | 'success';

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  
  // 결과 데이터
  const [result, setResult] = useState<RegisterResponse | null>(null);

  // 사업자등록번호 포맷팅
  const formatBusinessNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value);
    setBusinessNumber(formatted);
  };

  // 회사코드 유효성 검사
  const validateCompanyCode = (code: string) => {
    if (!code) return '회사코드를 입력해주세요.';
    if (code.length < 3) return '회사코드는 3자 이상이어야 합니다.';
    if (code.length > 10) return '회사코드는 10자 이하여야 합니다.';
    if (!/^[a-zA-Z0-9]+$/.test(code)) return '회사코드는 영문과 숫자만 사용할 수 있습니다.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!businessNumber || businessNumber.replace(/[^0-9]/g, '').length !== 10) {
      toast.error('올바른 사업자등록번호를 입력하세요 (10자리)');
      return;
    }

    if (!businessName) {
      toast.error('회사명을 입력하세요');
      return;
    }

    const codeError = validateCompanyCode(companyCode);
    if (codeError) {
      toast.error(codeError);
      return;
    }

    if (!adminUsername || adminUsername.length < 3) {
      toast.error('관리자 아이디는 3자 이상이어야 합니다');
      return;
    }

    if (!adminPassword || adminPassword.length < 4) {
      toast.error('비밀번호는 4자 이상이어야 합니다');
      return;
    }

    if (adminPassword !== adminPasswordConfirm) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await invokeFunction<RegisterResponse>('admin-register', {
        businessNumber: businessNumber.replace(/[^0-9]/g, ''),
        businessName,
        companyCode: companyCode.toLowerCase(),
        representativeName,
        adminUsername: adminUsername.toLowerCase(),
        adminPassword,
      });

      if (error) {
        toast.error('서버 오류가 발생했습니다');
        return;
      }

      if (data?.success) {
        setResult(data);
        setStep('success');
        toast.success('회원가입이 완료되었습니다!');
      } else {
        toast.error(data?.error || '회원가입에 실패했습니다');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('회원가입 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}이(가) 복사되었습니다`);
  };

  // 성공 화면
  if (step === 'success' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success-50 to-primary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="card p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-success-100 rounded-full mb-6">
              <CheckCircle className="text-success-600" size={40} />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입 완료!</h1>
            <p className="text-gray-600 mb-8">
              {result.businessName}이(가) 성공적으로 등록되었습니다.
            </p>

            {/* 로그인 정보 */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">관리자 로그인 정보</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">이메일</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{result.adminEmail}</span>
                    <button
                      onClick={() => copyToClipboard(result.adminEmail, '이메일')}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Copy size={14} className="text-gray-500" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">회사코드</span>
                  <span className="font-medium text-gray-900">{result.companyCode}</span>
                </div>
              </div>
            </div>

            {/* 초대코드 */}
            <div className="bg-primary-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-primary-900 mb-2">직원 초대코드</h3>
              <p className="text-sm text-primary-700 mb-4">
                직원 가입 시 이 코드를 전달하세요
              </p>
              
              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3">
                <span className="font-mono text-lg font-bold text-primary-600">
                  {result.inviteCode}
                </span>
                <button
                  onClick={() => copyToClipboard(result.inviteCode, '초대코드')}
                  className="btn btn-ghost btn-sm"
                >
                  <Copy size={16} />
                  복사
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary w-full py-3"
            >
              로그인하러 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 회원가입 폼
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* 뒤로가기 */}
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={18} />
          로그인으로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Clock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">관리자 회원가입</h1>
          <p className="text-gray-600 mt-2">새로운 사업장을 등록하세요</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 회사 정보 섹션 */}
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Building2 size={16} />
                회사 정보
              </h3>
              
              <div className="space-y-4">
                {/* 사업자등록번호 */}
                <div>
                  <label htmlFor="businessNumber" className="label">
                    사업자등록번호 <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="businessNumber"
                    value={businessNumber}
                    onChange={handleBusinessNumberChange}
                    className="input"
                    placeholder="000-00-00000"
                    maxLength={12}
                    disabled={isLoading}
                  />
                </div>

                {/* 회사명 */}
                <div>
                  <label htmlFor="businessName" className="label">
                    회사명 <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="input"
                    placeholder="주식회사 OOO"
                    disabled={isLoading}
                  />
                </div>

                {/* 회사코드 */}
                <div>
                  <label htmlFor="companyCode" className="label">
                    회사코드 <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="companyCode"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    className="input"
                    placeholder="mycompany"
                    maxLength={10}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    영문/숫자 3~10자. 로그인 이메일에 사용됩니다. (예: admin@{companyCode || 'mycompany'}.com)
                  </p>
                </div>

                {/* 대표자명 */}
                <div>
                  <label htmlFor="representativeName" className="label">
                    대표자명
                  </label>
                  <input
                    type="text"
                    id="representativeName"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    className="input"
                    placeholder="홍길동"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* 관리자 계정 섹션 */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User size={16} />
                관리자 계정
              </h3>
              
              <div className="space-y-4">
                {/* 관리자 아이디 */}
                <div>
                  <label htmlFor="adminUsername" className="label">
                    아이디 <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="adminUsername"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className="input"
                    placeholder="admin"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    영문/숫자/밑줄 3자 이상
                  </p>
                </div>

                {/* 비밀번호 */}
                <div>
                  <label htmlFor="adminPassword" className="label">
                    비밀번호 <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="adminPassword"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="input pl-10 pr-10"
                      placeholder="비밀번호 (4자 이상)"
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

                {/* 비밀번호 확인 */}
                <div>
                  <label htmlFor="adminPasswordConfirm" className="label">
                    비밀번호 확인 <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="adminPasswordConfirm"
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      className="input pl-10"
                      placeholder="비밀번호 확인"
                      disabled={isLoading}
                    />
                  </div>
                  {adminPasswordConfirm && adminPassword !== adminPasswordConfirm && (
                    <p className="text-xs text-danger-500 mt-1">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
              </div>
            </div>

            {/* 가입 버튼 */}
            <button
              type="submit"
              className="btn btn-primary w-full py-3 mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  가입 처리 중...
                </>
              ) : (
                '회원가입'
              )}
            </button>
          </form>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-500 mt-6">
          &copy; 2025 출퇴근 ERP 시스템
        </p>
      </div>
    </div>
  );
}
