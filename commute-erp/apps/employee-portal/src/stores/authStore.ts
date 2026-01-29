// =====================================================
// Employee Auth Store (Supabase 연동)
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Employee {
  id: string;
  employee_number: string | null;
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
  
  // Actions
  login: (employee: Employee) => void;
  logout: () => void;
  updateEmployee: (updates: Partial<Employee>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      employee: null,

      login: (employee) => {
        set({
          isAuthenticated: true,
          employee,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          employee: null,
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
      }),
    }
  )
);
