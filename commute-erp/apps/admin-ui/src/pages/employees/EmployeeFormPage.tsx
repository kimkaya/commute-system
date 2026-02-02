// =====================================================
// 직원 등록/수정 폼 페이지 (Supabase 연동) - 모바일 반응형
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  Calculator,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getEmployee, createEmployee, updateEmployee, createEmployeeCredentials } from '../../lib/api';

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

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  employee_number: string;
  department: string;
  position: string;
  hire_date: string;
  hourly_rate: number;
  monthly_salary: number;
  salary_type: 'hourly' | 'monthly';
  password: string;
  passwordConfirm: string;
  // 세금 설정
  dependents_count: number;
  children_under_20: number;
  income_tax_override: string;
  tax_free_meals: number;
  tax_free_car_allowance: number;
  tax_free_other: number;
  national_pension_exempt: boolean;
  health_insurance_exempt: boolean;
  employment_insurance_exempt: boolean;
}

const initialFormData: EmployeeFormData = {
  name: '',
  email: '',
  phone: '',
  birth_date: '',
  employee_number: '',
  department: '',
  position: '',
  hire_date: '',
  hourly_rate: 10000,
  monthly_salary: 0,
  salary_type: 'hourly',
  password: '',
  passwordConfirm: '',
  // 세금 설정 기본값
  dependents_count: 1,
  children_under_20: 0,
  income_tax_override: '',
  tax_free_meals: 200000,
  tax_free_car_allowance: 0,
  tax_free_other: 0,
  national_pension_exempt: false,
  health_insurance_exempt: false,
  employment_insurance_exempt: false,
};

export function EmployeeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'job' | 'salary' | 'tax' | 'auth'>('basic');
  const [showMobileTabMenu, setShowMobileTabMenu] = useState(false);

  // 기존 직원 데이터 로드 (수정 모드)
  const { data: existingEmployee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id!),
    enabled: isEdit,
  });

  // 기존 데이터로 폼 채우기
  useEffect(() => {
    if (existingEmployee) {
      setFormData({
        name: existingEmployee.name || '',
        email: existingEmployee.email || '',
        phone: existingEmployee.phone || '',
        birth_date: existingEmployee.birth_date || '',
        employee_number: existingEmployee.employee_number || '',
        department: existingEmployee.department || '',
        position: existingEmployee.position || '',
        hire_date: existingEmployee.hire_date || '',
        hourly_rate: existingEmployee.hourly_rate || 10000,
        monthly_salary: existingEmployee.monthly_salary || 0,
        salary_type: existingEmployee.salary_type || 'hourly',
        password: '',
        passwordConfirm: '',
        // 세금 설정
        dependents_count: existingEmployee.dependents_count || 1,
        children_under_20: existingEmployee.children_under_20 || 0,
        income_tax_override: existingEmployee.income_tax_override?.toString() || '',
        tax_free_meals: existingEmployee.tax_free_meals || 200000,
        tax_free_car_allowance: existingEmployee.tax_free_car_allowance || 0,
        tax_free_other: existingEmployee.tax_free_other || 0,
        national_pension_exempt: existingEmployee.national_pension_exempt || false,
        health_insurance_exempt: existingEmployee.health_insurance_exempt || false,
        employment_insurance_exempt: existingEmployee.employment_insurance_exempt || false,
      });
    }
  }, [existingEmployee]);

  // 직원 생성
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const employee = await createEmployee({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        birth_date: data.birth_date || null,
        employee_number: data.employee_number || null,
        department: data.department || null,
        position: data.position || null,
        hire_date: data.hire_date || null,
        hourly_rate: data.hourly_rate,
        monthly_salary: data.monthly_salary || null,
        salary_type: data.salary_type,
        is_active: true,
        // 세금 설정
        dependents_count: data.dependents_count,
        children_under_20: data.children_under_20,
        income_tax_override: data.income_tax_override ? parseFloat(data.income_tax_override) : null,
        tax_free_meals: data.tax_free_meals,
        tax_free_car_allowance: data.tax_free_car_allowance,
        tax_free_other: data.tax_free_other,
        national_pension_exempt: data.national_pension_exempt,
        health_insurance_exempt: data.health_insurance_exempt,
        employment_insurance_exempt: data.employment_insurance_exempt,
      });
      
      // 비밀번호 설정
      if (data.password) {
        await createEmployeeCredentials(employee.id, data.password);
      }
      
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('직원이 등록되었습니다');
      navigate('/employees');
    },
    onError: (error: Error) => {
      console.error('Create error:', error);
      toast.error('직원 등록 중 오류가 발생했습니다');
    },
  });

  // 직원 수정
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const employee = await updateEmployee(id!, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        birth_date: data.birth_date || null,
        employee_number: data.employee_number || null,
        department: data.department || null,
        position: data.position || null,
        hire_date: data.hire_date || null,
        hourly_rate: data.hourly_rate,
        monthly_salary: data.monthly_salary || null,
        salary_type: data.salary_type,
        // 세금 설정
        dependents_count: data.dependents_count,
        children_under_20: data.children_under_20,
        income_tax_override: data.income_tax_override ? parseFloat(data.income_tax_override) : null,
        tax_free_meals: data.tax_free_meals,
        tax_free_car_allowance: data.tax_free_car_allowance,
        tax_free_other: data.tax_free_other,
        national_pension_exempt: data.national_pension_exempt,
        health_insurance_exempt: data.health_insurance_exempt,
        employment_insurance_exempt: data.employment_insurance_exempt,
      });
      
      // 비밀번호 변경
      if (data.password) {
        await createEmployeeCredentials(employee.id, data.password);
      }
      
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('직원 정보가 수정되었습니다');
      navigate('/employees');
    },
    onError: (error: Error) => {
      console.error('Update error:', error);
      toast.error('직원 수정 중 오류가 발생했습니다');
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // 폼 필드 변경
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'hourly_rate' || name === 'monthly_salary' ? Number(value) : value,
    }));
  };

  // 사원번호 자동 생성
  const generateEmployeeNumber = () => {
    const prefix = 'EMP';
    const number = String(Math.floor(Math.random() * 900) + 100);
    setFormData((prev) => ({
      ...prev,
      employee_number: `${prefix}${number}`,
    }));
  };

  // 유효성 검사
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요');
      setActiveTab('basic');
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

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: User },
    { id: 'job', label: '직무 정보', icon: Briefcase },
    { id: 'salary', label: '급여 정보', icon: CreditCard },
    { id: 'tax', label: '세금 설정', icon: Calculator },
    { id: 'auth', label: '인증 정보', icon: Eye },
  ];

  if (isEdit && loadingEmployee) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            {isEdit ? '직원 정보 수정' : '직원 등록'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">
            {isEdit ? '직원 정보를 수정합니다' : '새로운 직원을 등록합니다'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 모바일: 드롭다운 탭 선택 */}
          <div className="lg:hidden relative">
            <button
              type="button"
              onClick={() => setShowMobileTabMenu(!showMobileTabMenu)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const currentTab = tabs.find(t => t.id === activeTab);
                  const Icon = currentTab?.icon || User;
                  return (
                    <>
                      <Icon size={18} className="text-primary-600" />
                      <span className="font-medium">{currentTab?.label}</span>
                    </>
                  );
                })()}
              </div>
              <ChevronDown size={20} className={`text-gray-400 transition-transform ${showMobileTabMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showMobileTabMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as typeof activeTab);
                        setShowMobileTabMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* 데스크톱: 탭 네비게이션 */}
          <div className="hidden lg:block w-48 shrink-0">
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
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            {/* 기본 정보 */}
            {activeTab === 'basic' && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="hong@example.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">생년월일</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 직무 정보 */}
            {activeTab === 'job' && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">직무 정보</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사원번호
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="employee_number"
                        value={formData.employee_number}
                        onChange={handleChange}
                        placeholder="EMP001"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                      />
                      <button
                        type="button"
                        onClick={generateEmployeeNumber}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm whitespace-nowrap"
                      >
                        자동생성
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      부서
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
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
                      직급
                    </label>
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
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
                      입사일
                    </label>
                    <input
                      type="date"
                      name="hire_date"
                      value={formData.hire_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 급여 정보 */}
            {activeTab === 'salary' && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">급여 정보</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">급여 유형</label>
                    <select
                      name="salary_type"
                      value={formData.salary_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    >
                      <option value="hourly">시급</option>
                      <option value="monthly">월급</option>
                    </select>
                  </div>
                  
                  {formData.salary_type === 'hourly' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">시급</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="hourly_rate"
                          value={formData.hourly_rate || ''}
                          onChange={handleChange}
                          placeholder="10000"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12 text-sm sm:text-base"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          원
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">월급</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="monthly_salary"
                          value={formData.monthly_salary || ''}
                          onChange={handleChange}
                          placeholder="3000000"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12 text-sm sm:text-base"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          원
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-700">
                    <strong>안내:</strong> 시급제 직원은 출퇴근 기록을 기반으로 급여가 자동 계산됩니다.
                    월급제 직원은 고정 월급이 지급됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* 세금 설정 */}
            {activeTab === 'tax' && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">세금 설정</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  개인별 소득세 계산에 필요한 정보입니다. 간이세액표 기준으로 자동 계산됩니다.
                </p>
                
                {/* 부양가족 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">부양가족 정보</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        부양가족 수 (본인 포함)
                      </label>
                      <select
                        name="dependents_count"
                        value={formData.dependents_count}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,11].map(n => (
                          <option key={n} value={n}>{n}명{n >= 11 ? ' 이상' : ''}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        본인 + 배우자 + 부양가족 (부모, 자녀 등)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        20세 이하 자녀 수
                      </label>
                      <select
                        name="children_under_20"
                        value={formData.children_under_20}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                      >
                        {[0,1,2,3,4,5].map(n => (
                          <option key={n} value={n}>{n}명</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 비과세 항목 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">비과세 항목 (월)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        식대
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="tax_free_meals"
                          value={formData.tax_free_meals}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12 text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">원</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">최대 20만원 비과세</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        자가운전보조금
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="tax_free_car_allowance"
                          value={formData.tax_free_car_allowance}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12 text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">원</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">최대 20만원 비과세</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        기타 비과세
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="tax_free_other"
                          value={formData.tax_free_other}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12 text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">원</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 세율 오버라이드 */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-800 mb-3">세율 수동 설정 (선택)</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      소득세율 직접 입력
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="income_tax_override"
                        value={formData.income_tax_override}
                        onChange={handleChange}
                        placeholder="비워두면 자동계산"
                        step="0.001"
                        min="0"
                        max="0.5"
                        className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <span className="text-sm text-gray-600">
                        (예: 0.04 = 4%)
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">
                      ⚠️ 세무사 확인 후 입력하세요. 비워두면 간이세액표 기준으로 자동 계산됩니다.
                    </p>
                  </div>
                </div>

                {/* 4대보험 면제 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">4대보험 가입 제외</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="national_pension_exempt"
                        checked={formData.national_pension_exempt}
                        onChange={(e) => setFormData(prev => ({ ...prev, national_pension_exempt: e.target.checked }))}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">국민연금 제외 (60세 이상, 외국인 등)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="health_insurance_exempt"
                        checked={formData.health_insurance_exempt}
                        onChange={(e) => setFormData(prev => ({ ...prev, health_insurance_exempt: e.target.checked }))}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">건강보험 제외 (피부양자, 외국인 등)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="employment_insurance_exempt"
                        checked={formData.employment_insurance_exempt}
                        onChange={(e) => setFormData(prev => ({ ...prev, employment_insurance_exempt: e.target.checked }))}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">고용보험 제외 (65세 이상 등)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 인증 정보 */}
            {activeTab === 'auth' && (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">인증 정보</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  직원이 키오스크 및 직원 포털에서 로그인할 때 사용하는 비밀번호입니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10 text-sm sm:text-base"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-700">
                    <strong>안내:</strong> 비밀번호는 최소 4자리 이상이어야 합니다. 직원은 직원
                    포털에서 비밀번호를 변경할 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base"
          >
            {isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {isSaving ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
