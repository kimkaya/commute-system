// =====================================================
// Employee Auth Store
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  profileImage?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  employee: Employee | null;
  accessToken: string | null;
  
  // Actions
  login: (employee: Employee, token: string) => void;
  logout: () => void;
  updateEmployee: (updates: Partial<Employee>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      employee: null,
      accessToken: null,

      login: (employee, token) => {
        set({
          isAuthenticated: true,
          employee,
          accessToken: token,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          employee: null,
          accessToken: null,
        });
      },

      updateEmployee: (updates) => {
        set((state) => ({
          employee: state.employee ? { ...state.employee, ...updates } : null,
        }));
      },
    }),
    {
      name: 'employee-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        employee: state.employee,
        accessToken: state.accessToken,
      }),
    }
  )
);
