// =====================================================
// 키오스크 상태 관리
// =====================================================

import { create } from 'zustand';

type KioskScreen = 
  | 'standby'      // 대기 화면
  | 'detecting'    // 얼굴 인식 중
  | 'select'       // 출퇴근 선택
  | 'password'     // 비밀번호 인증
  | 'success'      // 성공
  | 'error';       // 오류

interface RecognizedEmployee {
  id: string;
  name: string;
  department?: string;
  todayCheckIn?: string;
  todayCheckOut?: string;
}

interface KioskState {
  screen: KioskScreen;
  recognizedEmployee: RecognizedEmployee | null;
  errorMessage: string | null;
  isProcessing: boolean;

  // Actions
  setScreen: (screen: KioskScreen) => void;
  setRecognizedEmployee: (employee: RecognizedEmployee | null) => void;
  setErrorMessage: (message: string | null) => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
}

export const useKioskStore = create<KioskState>((set) => ({
  screen: 'standby',
  recognizedEmployee: null,
  errorMessage: null,
  isProcessing: false,

  setScreen: (screen) => set({ screen }),
  setRecognizedEmployee: (employee) => set({ recognizedEmployee: employee }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  
  reset: () => set({
    screen: 'standby',
    recognizedEmployee: null,
    errorMessage: null,
    isProcessing: false,
  }),
}));
