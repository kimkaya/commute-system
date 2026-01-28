// =====================================================
// 직원 목록 페이지
// =====================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Camera,
  Key,
  UserCheck,
  UserX,
} from 'lucide-react';

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  hireDate: string;
  hourlyRate: number;
  isActive: boolean;
  hasFace: boolean;
  hasPassword: boolean;
}

// 데모 데이터
const demoEmployees: Employee[] = [
  {
    id: '1',
    employeeNumber: 'EMP001',
    name: '김철수',
    department: '개발팀',
    position: '선임',
    hireDate: '2023-03-15',
    hourlyRate: 15000,
    isActive: true,
    hasFace: true,
    hasPassword: true,
  },
  {
    id: '2',
    employeeNumber: 'EMP002',
    name: '이영희',
    department: '디자인팀',
    position: '주임',
    hireDate: '2023-06-01',
    hourlyRate: 12000,
    isActive: true,
    hasFace: true,
    hasPassword: false,
  },
  {
    id: '3',
    employeeNumber: 'EMP003',
    name: '박지성',
    department: '영업팀',
    position: '대리',
    hireDate: '2022-11-20',
    hourlyRate: 14000,
    isActive: true,
    hasFace: false,
    hasPassword: true,
  },
  {
    id: '4',
    employeeNumber: 'EMP004',
    name: '최민수',
    department: '개발팀',
    position: '사원',
    hireDate: '2024-01-08',
    hourlyRate: 10000,
    isActive: true,
    hasFace: true,
    hasPassword: true,
  },
  {
    id: '5',
    employeeNumber: 'EMP005',
    name: '정유진',
    department: '인사팀',
    position: '과장',
    hireDate: '2021-05-10',
    hourlyRate: 18000,
    isActive: true,
    hasFace: true,
    hasPassword: true,
  },
  {
    id: '6',
    employeeNumber: 'EMP006',
    name: '홍길동',
    department: '영업팀',
    position: '사원',
    hireDate: '2024-06-15',
    hourlyRate: 10000,
    isActive: false,
    hasFace: false,
    hasPassword: false,
  },
];

export function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>(demoEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // 부서 목록
  const departments = useMemo(() => {
    const depts = new Set(employees.map((e) => e.department));
    return Array.from(depts);
  }, [employees]);

  // 필터링된 직원 목록
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.includes(searchTerm) ||
        employee.employeeNumber.includes(searchTerm) ||
        employee.department.includes(searchTerm);

      const matchesDepartment =
        departmentFilter === 'all' || employee.department === departmentFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && employee.isActive) ||
        (statusFilter === 'inactive' && !employee.isActive);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <div>
      <Header title="직원 관리" subtitle={`총 ${employees.length}명`} />

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
                    인증
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
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.employeeNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{employee.department}</p>
                      <p className="text-xs text-gray-500">{employee.position}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{employee.hireDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(employee.hourlyRate)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            employee.hasFace
                              ? 'bg-success-50 text-success-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                          title={employee.hasFace ? '얼굴 등록됨' : '얼굴 미등록'}
                        >
                          <Camera size={14} />
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            employee.hasPassword
                              ? 'bg-success-50 text-success-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                          title={employee.hasPassword ? '비밀번호 등록됨' : '비밀번호 미등록'}
                        >
                          <Key size={14} />
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {employee.isActive ? (
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
                          to={`/employees/${employee.id}`}
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
                                비밀번호 재설정
                              </button>
                              <hr className="my-1" />
                              <button className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2">
                                <Trash2 size={16} />
                                삭제
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
              <p className="text-gray-500">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
