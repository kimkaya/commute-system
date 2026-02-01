// =====================================================
// UI 상태 관리
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  theme: 'light' | 'dark';
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  closeMobileMenu: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      theme: 'light',

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleMobileMenu: () => {
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
      },

      setMobileMenuOpen: (open: boolean) => {
        set({ mobileMenuOpen: open });
      },

      closeMobileMenu: () => {
        set({ mobileMenuOpen: false });
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
      },
    }),
    {
      name: 'commute-erp-ui',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed, 
        theme: state.theme 
      }), // mobileMenuOpen은 persist하지 않음
    }
  )
);
