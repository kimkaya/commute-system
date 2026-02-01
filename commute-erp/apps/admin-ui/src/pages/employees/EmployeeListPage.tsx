// =====================================================
// 직원 목록 페이지 (Supabase 연동) - 반응형
// =====================================================

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponsiveTable } from '../../components/common/ResponsiveTable';
import type { Column } from '../../components/common/ResponsiveTable';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Camera,
  Key,
  UserCheck,
  UserX,
  Loader2,
  AlertTriangle,
  Filter,
  ChevronDown,
  X,
} from 'lucide-react';
import { getEmployees, deleteEmployee } from '../../lib/api';
import type { Employee } from '../../lib/api';
import toast from 'react-hot-toast';

export function EmployeeListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // 직원 목록 조회
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees(),
  });

  // 직원 삭제(비활성화)
  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('직원이 퇴사 처리되었습니다.');
    },
    onError: () => {
      toast.error('직원 삭제 중 오류가 발생했습니다.');
    },
  });

  // 부서 목록
  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [employees]);

  // 필터링된 직원 목록
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.employee_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.department || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment =
        departmentFilter === 'all' || employee.department === departmentFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && employee.is_active) ||
        (statusFilter === 'inactive' && !employee.is_active);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`${name} 직원을 퇴사 처리하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  const activeFilterCount = [
    departmentFilter !== 'all',
    statusFilter !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setDepartmentFilter('all');
    setStatusFilter('all');
  };

  // 테이블 컬럼 정의
  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: '직원',
      mobileHighlight: 'title',
      render: (employee) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary-700">
              {employee.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {employee.name}
            </p>
            <p className="text-xs text-gray-500">
              {employee.employee_number || '-'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: '부서/직급',
      mobileHighlight: 'subtitle',
      render: (employee) => (
        <span className="text-sm text-gray-600">
          {employee.department || '-'} / {employee.position || '-'}
        </span>
      ),
    },
    {
      key: 'hire_date',
      header: '입사일',
      showInMobile: false,
      render: (employee) => (
        <p className="text-sm text-gray-600">{employee.hire_date || '-'}</p>
      ),
    },
    {
      key: 'hourly_rate',
      header: '시급',
      mobileLabel: '시급',
      render: (employee) => (
        <p className="text-sm font-medium text-gray-900">
          {formatCurrency(employee.hourly_rate)}
        </p>
      ),
    },
    {
      key: 'salary_type',
      header: '급여유형',
      showInMobile: false,
      render: (employee) => (
        <span className={`badge ${employee.salary_type === 'monthly' ? 'badge-primary' : 'badge-gray'}`}>
          {employee.salary_type === 'monthly' ? '월급' : '시급'}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      mobileHighlight: 'badge',
      render: (employee) => (
        employee.is_active ? (
          <span className="badge badge-success text-xs">
            <UserCheck size={12} className="mr-1" />
            재직중
          </span>
        ) : (
          <span className="badge badge-gray text-xs">
            <UserX size={12} className="mr-1" />
            퇴사
          </span>
        )
      ),
    },
    {
      key: 'actions',
      header: '',
      mobileHighlight: 'action',
      className: 'text-right',
      render: (employee) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            to={`/employees/${employee.id}/edit`}
            className="btn btn-ghost btn-sm"
            title="수정"
          >
            <Edit size={16} />
          </Link>
          <button
            onClick={(e) => handleDelete(e, employee.id, employee.name)}
            className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50"
            title="퇴사 처리"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <p className="text-gray-600">직원 목록을 불러오는 중 오류가 발생했습니다.</p>
          <p className="text-sm text-gray-400 mt-2">Supabase 연결을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 액션 바 - 모바일 최적화 */}
      <div className="flex flex-col gap-3 mb-4 lg:mb-6">
          {/* 상단: 검색 + 추가 버튼 */}
          <div className="flex items-center gap-2">
            {/* 검색 */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="이름, 사번 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full text-sm"
              />
            </div>

            {/* 필터 토글 (모바일) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-ghost md:hidden relative ${showFilters ? 'bg-primary-50 text-primary-600' : ''}`}
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* 직원 추가 버튼 */}
            <Link to="/employees/new" className="btn btn-primary whitespace-nowrap">
              <Plus size={18} />
              <span className="hidden sm:inline">직원 추가</span>
            </Link>
          </div>

          {/* 필터 (데스크톱: 항상 표시, 모바일: 토글) */}
          <div className={`flex flex-col sm:flex-row gap-2 ${showFilters ? 'block' : 'hidden md:flex'}`}>
            {/* 부서 필터 */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input text-sm w-full sm:w-40"
            >
              <option value="all">모든 부서</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm w-full sm:w-32"
            >
              <option value="all">모든 상태</option>
              <option value="active">재직중</option>
              <option value="inactive">퇴사</option>
            </select>

            {/* 필터 초기화 */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="btn btn-ghost text-sm text-gray-500"
              >
                <X size={16} />
                필터 초기화
              </button>
            )}
          </div>
        </div>

        {/* 직원 목록 - ResponsiveTable 사용 */}
        <div className="card overflow-hidden">
          <ResponsiveTable
            data={filteredEmployees}
            columns={columns}
            keyExtractor={(employee) => employee.id}
            onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
            isLoading={isLoading}
            emptyMessage={employees?.length === 0 ? '등록된 직원이 없습니다.' : '검색 결과가 없습니다.'}
            emptyIcon={<UserX size={48} />}
            tableClassName="w-full"
            cardClassName="mx-4 my-2 first:mt-4 last:mb-4"
          />

          {/* 빈 상태에서 추가 버튼 */}
          {filteredEmployees.length === 0 && employees?.length === 0 && (
            <div className="pb-6 text-center">
              <Link to="/employees/new" className="btn btn-primary">
                <Plus size={18} />
                첫 직원 등록하기
              </Link>
            </div>
          )}
        </div>
      </div>
  );
}
