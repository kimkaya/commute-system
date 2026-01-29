// =====================================================
// Admin UI 메인 애플리케이션
// =====================================================

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeeListPage } from './pages/employees/EmployeeListPage';
import { EmployeeFormPage } from './pages/employees/EmployeeFormPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { AttendanceListPage } from './pages/attendance/AttendanceListPage';
import { PayrollListPage } from './pages/payroll/PayrollListPage';
import { PayslipPage } from './pages/payroll/PayslipPage';
import { CompliancePage } from './pages/compliance/CompliancePage';
import { SchedulePage } from './pages/schedules/SchedulePage';
import { LeaveManagementPage } from './pages/leaves/LeaveManagementPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Placeholder pages
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500">이 페이지는 준비 중입니다.</p>
      </div>
    </div>
  );
}

// React Query 클라이언트
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        {/* Toast 알림 - Router 내부에 배치 */}
        <Toaster
          position="top-right"
          containerStyle={{
            top: 80,
          }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* 로그인 페이지 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 메인 레이아웃 */}
          <Route element={<AppLayout />}>
            {/* 대시보드 */}
            <Route path="/" element={<DashboardPage />} />

            {/* 직원 관리 */}
            <Route path="/employees" element={<EmployeeListPage />} />
            <Route path="/employees/new" element={<EmployeeFormPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />

            {/* 출퇴근 관리 */}
            <Route path="/attendance" element={<AttendanceListPage />} />

            {/* 스케줄 관리 */}
            <Route path="/schedules" element={<SchedulePage />} />

            {/* 휴가 관리 */}
            <Route path="/leaves" element={<LeaveManagementPage />} />

            {/* 급여 관리 */}
            <Route path="/payroll" element={<PayrollListPage />} />
            <Route path="/payroll/:periodId/payslip/:employeeId" element={<PayslipPage />} />

            {/* 컴플라이언스 */}
            <Route path="/compliance" element={<CompliancePage />} />

            {/* 보고서 */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* 설정 */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;
