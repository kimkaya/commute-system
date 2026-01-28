// =====================================================
// 인증 상태 관리
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  businessId: string | null;
  adminName: string | null;
  sessionExpiry: number | null;
  
  // Actions
  login: (businessId: string, adminName: string, sessionMinutes?: number) => void;
  logout: () => void;
  checkSession: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      businessId: null,
      adminName: null,
      sessionExpiry: null,

      login: (businessId: string, adminName: string, sessionMinutes: number = 30) => {
        const expiry = Date.now() + sessionMinutes * 60 * 1000;
        set({
          isAuthenticated: true,
          businessId,
          adminName,
          sessionExpiry: expiry,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          businessId: null,
          adminName: null,
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
    }),
    {
      name: 'commute-erp-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        businessId: state.businessId,
        adminName: state.adminName,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);
