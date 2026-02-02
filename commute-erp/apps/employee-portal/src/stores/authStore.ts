// =====================================================
// Employee Auth Store (멀티사업장 지원)
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Employee {
  id: string;
  business_id: string;
  employee_number: string | null;
  username: string | null;
  name: string;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  hourly_rate: number;
  salary_type: 'hourly' | 'monthly';
  hire_date: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  employee: Employee | null;
  businessId: string | null;
  businessName: string | null;
  companyCode: string | null;
  sessionExpiry: number | null;
  
  // Actions
  login: (params: {
    employee: Employee;
    businessId: string;
    businessName?: string;
    companyCode?: string;
    sessionMinutes?: number;
  }) => void;
  logout: () => void;
  updateEmployee: (updates: Partial<Employee>) => void;
  checkSession: () => boolean;
  extendSession: (minutes?: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      employee: null,
      businessId: null,
      businessName: null,
      companyCode: null,
      sessionExpiry: null,

      login: (params) => {
        const sessionMinutes = params.sessionMinutes || 60;
        const expiry = Date.now() + sessionMinutes * 60 * 1000;
        set({
          isAuthenticated: true,
          employee: params.employee,
          businessId: params.businessId,
          businessName: params.businessName || null,
          companyCode: params.companyCode || null,
          sessionExpiry: expiry,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          employee: null,
          businessId: null,
          businessName: null,
          companyCode: null,
          sessionExpiry: null,
        });
      },

      updateEmployee: (updates) => {
        set((state) => ({
          employee: state.employee ? { ...state.employee, ...updates } : null,
        }));
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

      extendSession: (minutes = 60) => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;
        
        set({
          sessionExpiry: Date.now() + minutes * 60 * 1000,
        });
      },
    }),
    {
      name: 'employee-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        employee: state.employee,
        businessId: state.businessId,
        businessName: state.businessName,
        companyCode: state.companyCode,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);

// 헬퍼 함수
export function getBusinessId(): string {
  const { businessId, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !businessId) {
    throw new Error('Not authenticated');
  }
  return businessId;
}

export function getEmployeeId(): string {
  const { employee, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !employee) {
    throw new Error('Not authenticated');
  }
  return employee.id;
}
