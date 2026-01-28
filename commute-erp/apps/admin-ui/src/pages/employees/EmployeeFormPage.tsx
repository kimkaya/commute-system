// =====================================================
// 직원 등록/수정 폼 페이지
// =====================================================

import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  Camera,
  Upload,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

// 부서 목록
const departments = [
  '개발팀',
  '영업팀',
  '인사팀',
  '마케팅팀',
  '재무팀',
  '경영지원팀',
  '고객지원팀',
];

// 직급 목록
const positions = ['사원', '주임', '대리', '과장', '차장', '부장', '이사', '상무', '전무', '대표'];

// 고용 형태
const employmentTypes = [
  { id: 'full_time', label: '정규직' },
  { id: 'contract', label: '계약직' },
  { id: 'part_time', label: '파트타임' },
  { id: 'intern', label: '인턴' },
];

// 은행 목록
const banks = [
  '국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  '농협은행',
  'IBK기업은행',
  'SC제일은행',
  '케이뱅크',
  '카카오뱅크',
  '토스뱅크',
];

interface EmployeeFormData {
  // 기본 정보
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female' | '';
  address: string;
  profileImage: string | null;

  // 직무 정보
  employeeNumber: string;
  department: string;
  position: string;
  employmentType: string;
  hireDate: string;
  resignDate: string;

  // 급여 정보
  baseSalary: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;

  // 인증 정보
  password: string;
  passwordConfirm: string;
}

const initialFormData: EmployeeFormData = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  address: '',
  profileImage: null,
  employeeNumber: '',
  department: '',
  position: '',
  employmentType: 'full_time',
  hireDate: '',
  resignDate: '',
  baseSalary: 0,
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  password: '',
  passwordConfirm: '',
};

export function EmployeeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'job' | 'salary' | 'auth'>('basic');

  // 폼 필드 변경
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'baseSalary' ? Number(value) : value,
    }));
  };

  // 프로필 이미지 업로드
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          profileImage: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 프로필 이미지 삭제
  const handleImageRemove = () => {
    setFormData((prev) => ({
      ...prev,
      profileImage: null,
    }));
  };

  // 사원번호 자동 생성
  const generateEmployeeNumber = () => {
    const prefix = 'EMP';
    const number = String(Math.floor(Math.random() * 900) + 100);
    setFormData((prev) => ({
      ...prev,
      employeeNumber: `${prefix}${number}`,
    }));
  };

  // 유효성 검사
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요');
      setActiveTab('basic');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('이메일을 입력해주세요');
      setActiveTab('basic');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('올바른 이메일 형식을 입력해주세요');
      setActiveTab('basic');
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error('연락처를 입력해주세요');
      setActiveTab('basic');
      return false;
    }
    if (!formData.employeeNumber.trim()) {
      toast.error('사원번호를 입력해주세요');
      setActiveTab('job');
      return false;
    }
    if (!formData.department) {
      toast.error('부서를 선택해주세요');
      setActiveTab('job');
      return false;
    }
    if (!formData.position) {
      toast.error('직급을 선택해주세요');
      setActiveTab('job');
      return false;
    }
    if (!formData.hireDate) {
      toast.error('입사일을 입력해주세요');
      setActiveTab('job');
      return false;
    }
    if (!isEdit) {
      if (!formData.password) {
        toast.error('비밀번호를 입력해주세요');
        setActiveTab('auth');
        return false;
      }
      if (formData.password.length < 4) {
        toast.error('비밀번호는 4자리 이상이어야 합니다');
        setActiveTab('auth');
        return false;
      }
      if (formData.password !== formData.passwordConfirm) {
        toast.error('비밀번호가 일치하지 않습니다');
        setActiveTab('auth');
        return false;
      }
    }
    return true;
  };

  // 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      // TODO: API 연동
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(isEdit ? '직원 정보가 수정되었습니다' : '직원이 등록되었습니다');
      navigate('/employees');
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: User },
    { id: 'job', label: '직무 정보', icon: Briefcase },
    { id: 'salary', label: '급여 정보', icon: CreditCard },
    { id: 'auth', label: '인증 정보', icon: Eye },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? '직원 정보 수정' : '직원 등록'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? '직원 정보를 수정합니다' : '새로운 직원을 등록합니다'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-6">
          {/* 탭 네비게이션 */}
          <div className="w-48 shrink-0">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 폼 내용 */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
            {/* 기본 정보 */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>

                {/* 프로필 이미지 */}
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                      {formData.profileImage ? (
                        <img
                          src={formData.profileImage}
                          alt="프로필"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={32} className="text-gray-400" />
                      )}
                    </div>
                    {formData.profileImage && (
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      <Upload size={16} />
                      이미지 업로드
                    </button>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG (최대 5MB)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="홍길동"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="hong@example.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">생년월일</label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={formData.gender === 'male'}
                          onChange={handleChange}
                          className="text-primary-600"
                        />
                        <span className="text-sm">남성</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={formData.gender === 'female'}
                          onChange={handleChange}
                          className="text-primary-600"
                        />
                        <span className="text-sm">여성</span>
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="서울시 강남구..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 직무 정보 */}
            {activeTab === 'job' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">직무 정보</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사원번호 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="employeeNumber"
                        value={formData.employeeNumber}
                        onChange={handleChange}
                        placeholder="EMP001"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={generateEmployeeNumber}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        자동생성
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      고용형태 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {employmentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      부서 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">선택하세요</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      직급 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">선택하세요</option>
                      {positions.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      입사일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">퇴사일</label>
                    <input
                      type="date"
                      name="resignDate"
                      value={formData.resignDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 급여 정보 */}
            {activeTab === 'salary' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">급여 정보</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">기본급</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="baseSalary"
                        value={formData.baseSalary || ''}
                        onChange={handleChange}
                        placeholder="3000000"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        원
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">은행</label>
                    <select
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">선택하세요</option>
                      {banks.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      계좌번호
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      placeholder="123-456-789012"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">예금주</label>
                    <input
                      type="text"
                      name="accountHolder"
                      value={formData.accountHolder}
                      onChange={handleChange}
                      placeholder="홍길동"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 인증 정보 */}
            {activeTab === 'auth' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">인증 정보</h2>
                <p className="text-sm text-gray-500">
                  직원이 키오스크 및 직원 포털에서 로그인할 때 사용하는 비밀번호입니다.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 {!isEdit && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={isEdit ? '변경 시에만 입력' : '4자리 이상'}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 확인 {!isEdit && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      name="passwordConfirm"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      placeholder="비밀번호 재입력"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>안내:</strong> 비밀번호는 최소 4자리 이상이어야 합니다. 직원은 직원
                    포털에서 비밀번호를 변경할 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-6 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
