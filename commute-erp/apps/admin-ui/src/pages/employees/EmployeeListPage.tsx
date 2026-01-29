// =====================================================
// 직원 목록 페이지 (Supabase 연동)
// =====================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/layout/Header';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Camera,
  Key,
  UserCheck,
  UserX,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getEmployees, deleteEmployee } from '../../lib/api';
import type { Employee } from '../../lib/api';
import toast from 'react-hot-toast';

export function EmployeeListPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

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
      setSelectedEmployeeId(null);
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

  const handleDelete = (id: string, name: string) => {
    if (confirm(`${name} 직원을 퇴사 처리하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="직원 관리" subtitle="로딩 중..." />
        <div className="mt-16 flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="직원 관리" subtitle="오류" />
        <div className="mt-16 flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
            <p className="text-gray-600">직원 목록을 불러오는 중 오류가 발생했습니다.</p>
            <p className="text-sm text-gray-400 mt-2">Supabase 연결을 확인해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="직원 관리" subtitle={`총 ${employees?.length || 0}명`} />

      <div className="mt-16">
        {/* 액션 바 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* 검색 및 필터 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 검색 */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="이름, 사번, 부서 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>

            {/* 부서 필터 */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input w-full sm:w-40"
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
              className="input w-full sm:w-32"
            >
              <option value="all">모든 상태</option>
              <option value="active">재직중</option>
              <option value="inactive">퇴사</option>
            </select>
          </div>

          {/* 직원 추가 버튼 */}
          <Link to="/employees/new" className="btn btn-primary">
            <Plus size={18} />
            직원 추가
          </Link>
        </div>

        {/* 직원 테이블 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    직원
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    부서/직급
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    입사일
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    시급
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    급여유형
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    상태
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((employee: Employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <Link 
                            to={`/employees/${employee.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-600"
                          >
                            {employee.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {employee.employee_number || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{employee.department || '-'}</p>
                      <p className="text-xs text-gray-500">{employee.position || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{employee.hire_date || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(employee.hourly_rate)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${employee.salary_type === 'monthly' ? 'badge-primary' : 'badge-gray'}`}>
                        {employee.salary_type === 'monthly' ? '월급' : '시급'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {employee.is_active ? (
                        <span className="badge badge-success">
                          <UserCheck size={12} className="mr-1" />
                          재직중
                        </span>
                      ) : (
                        <span className="badge badge-gray">
                          <UserX size={12} className="mr-1" />
                          퇴사
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/employees/${employee.id}/edit`}
                          className="btn btn-ghost btn-sm"
                        >
                          <Edit size={16} />
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setSelectedEmployeeId(
                                selectedEmployeeId === employee.id ? null : employee.id
                              )
                            }
                            className="btn btn-ghost btn-sm"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {selectedEmployeeId === employee.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <Camera size={16} />
                                얼굴 등록
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <Key size={16} />
                                비밀번호 설정
                              </button>
                              <hr className="my-1" />
                              <button 
                                onClick={() => handleDelete(employee.id, employee.name)}
                                className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2"
                              >
                                <Trash2 size={16} />
                                퇴사 처리
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 빈 상태 */}
          {filteredEmployees.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">
                {employees?.length === 0 ? '등록된 직원이 없습니다.' : '검색 결과가 없습니다.'}
              </p>
              {employees?.length === 0 && (
                <Link to="/employees/new" className="btn btn-primary mt-4">
                  <Plus size={18} />
                  첫 직원 등록하기
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
