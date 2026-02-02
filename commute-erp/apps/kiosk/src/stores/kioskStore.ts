// =====================================================
// 키오스크 상태 관리 (멀티사업장 지원)
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  // 기기 인증 상태
  isDeviceRegistered: boolean;
  deviceId: string | null;
  deviceCode: string | null;
  deviceName: string | null;
  businessId: string | null;
  businessName: string | null;

  // 화면 상태
  screen: KioskScreen;
  recognizedEmployee: RecognizedEmployee | null;
  errorMessage: string | null;
  isProcessing: boolean;

  // Device Actions
  registerDevice: (params: {
    deviceId: string;
    deviceCode: string;
    deviceName: string;
    businessId: string;
    businessName?: string;
  }) => void;
  unregisterDevice: () => void;

  // Screen Actions
  setScreen: (screen: KioskScreen) => void;
  setRecognizedEmployee: (employee: RecognizedEmployee | null) => void;
  setErrorMessage: (message: string | null) => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
}

export const useKioskStore = create<KioskState>()(
  persist(
    (set) => ({
      // 기기 인증 상태
      isDeviceRegistered: false,
      deviceId: null,
      deviceCode: null,
      deviceName: null,
      businessId: null,
      businessName: null,

      // 화면 상태
      screen: 'standby',
      recognizedEmployee: null,
      errorMessage: null,
      isProcessing: false,

      // Device Actions
      registerDevice: (params) => set({
        isDeviceRegistered: true,
        deviceId: params.deviceId,
        deviceCode: params.deviceCode,
        deviceName: params.deviceName,
        businessId: params.businessId,
        businessName: params.businessName || null,
      }),

      unregisterDevice: () => set({
        isDeviceRegistered: false,
        deviceId: null,
        deviceCode: null,
        deviceName: null,
        businessId: null,
        businessName: null,
        screen: 'standby',
        recognizedEmployee: null,
        errorMessage: null,
        isProcessing: false,
      }),

      // Screen Actions
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
    }),
    {
      name: 'kiosk-device',
      partialize: (state) => ({
        isDeviceRegistered: state.isDeviceRegistered,
        deviceId: state.deviceId,
        deviceCode: state.deviceCode,
        deviceName: state.deviceName,
        businessId: state.businessId,
        businessName: state.businessName,
      }),
    }
  )
);
