// =====================================================
// 인증 상태 관리 (멀티사업장 지원)
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  businessId: string | null;
  businessName: string | null;
  companyCode: string | null;
  adminId: string | null;
  adminName: string | null;
  adminRole: string | null;
  sessionExpiry: number | null;
  
  // Actions
  login: (params: {
    businessId: string;
    businessName?: string;
    companyCode?: string;
    adminId?: string;
    adminName: string;
    adminRole?: string;
    sessionMinutes?: number;
  }) => void;
  logout: () => void;
  checkSession: () => boolean;
  extendSession: (minutes?: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      businessId: null,
      businessName: null,
      companyCode: null,
      adminId: null,
      adminName: null,
      adminRole: null,
      sessionExpiry: null,

      login: (params) => {
        const sessionMinutes = params.sessionMinutes || 30;
        const expiry = Date.now() + sessionMinutes * 60 * 1000;
        set({
          isAuthenticated: true,
          businessId: params.businessId,
          businessName: params.businessName || null,
          companyCode: params.companyCode || null,
          adminId: params.adminId || null,
          adminName: params.adminName,
          adminRole: params.adminRole || 'admin',
          sessionExpiry: expiry,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          businessId: null,
          businessName: null,
          companyCode: null,
          adminId: null,
          adminName: null,
          adminRole: null,
          sessionExpiry: null,
        });
      },

      checkSession: () => {
        const { sessionExpiry, isAuthenticated } = get();
        if (!isAuthenticated || !sessionExpiry) return false;
        
        if (Date.now() > sessionExpiry) {
          get().logout();
          return false;
        }
        
        return true;
      },

      extendSession: (minutes = 30) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;
        
        set({
          sessionExpiry: Date.now() + minutes * 60 * 1000,
        });
      },
    }),
    {
      name: 'commute-erp-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        businessId: state.businessId,
        businessName: state.businessName,
        companyCode: state.companyCode,
        adminId: state.adminId,
        adminName: state.adminName,
        adminRole: state.adminRole,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);

// 하위 호환성을 위한 헬퍼 함수
export function getBusinessId(): string {
  const { businessId, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !businessId) {
    throw new Error('Not authenticated');
  }
  return businessId;
}
