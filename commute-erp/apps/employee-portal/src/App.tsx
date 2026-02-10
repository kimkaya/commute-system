// =====================================================
// Employee Portal 메인 애플리케이션
// =====================================================

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { MyAttendancePage } from './pages/attendance/MyAttendancePage';
import { MyPayrollPage } from './pages/payroll/MyPayrollPage';
import { MyLeavePage } from './pages/leave/MyLeavePage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { MessengerPage } from './pages/messenger/MessengerPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage';
import { SupportPage } from './pages/legal/SupportPage';

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
        <Routes>
          {/* 인증 페이지 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 메인 레이아웃 */}
          <Route element={<AppLayout />}>
            {/* 출퇴근 */}
            <Route path="/" element={<MyAttendancePage />} />

            {/* 급여 */}
            <Route path="/payroll" element={<MyPayrollPage />} />

            {/* 휴가 */}
            <Route path="/leave" element={<MyLeavePage />} />

            {/* 메신저 */}
            <Route path="/messenger" element={<MessengerPage />} />

            {/* 문서 */}
            <Route path="/documents" element={<DocumentsPage />} />

            {/* 내정보 */}
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* 법적 페이지 (레이아웃 없이) */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/support" element={<SupportPage />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>

      {/* Toast 알림 */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
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
    </QueryClientProvider>
  );
}

export default App;
