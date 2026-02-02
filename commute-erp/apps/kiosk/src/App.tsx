// =====================================================
// 키오스크 메인 애플리케이션 (멀티사업장 지원)
// =====================================================

import { useEffect, useCallback, useState } from 'react';
import { Clock } from './components/Clock';
import { Camera } from './components/Camera';
import { NumPad } from './components/NumPad';
import { useKioskStore } from './stores/kioskStore';
import {
  Scan,
  KeyRound,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  ArrowLeft,
  User,
  Loader2,
  RefreshCw,
  Monitor,
  Building2,
  Settings,
} from 'lucide-react';
import {
  type Employee,
  verifyPassword,
  checkIn,
  checkOut,
  getTodayStatus,
  findMatchingEmployee,
  validateAndLogIP,
  getCurrentIP,
  authenticateKiosk,
} from './lib/api';
import { supabase } from './lib/supabase';

function App() {
  const {
    // 기기 상태
    isDeviceRegistered,
    deviceName,
    businessId,
    businessName,
    registerDevice,
    unregisterDevice,
    // 화면 상태
    screen,
    recognizedEmployee,
    errorMessage,
    isProcessing,
    setScreen,
    setRecognizedEmployee,
    setErrorMessage,
    setProcessing,
    reset,
  } = useKioskStore();

  const [password, setPassword] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [authMethod, setAuthMethod] = useState<'face' | 'password'>('password');
  const [resultMessage, setResultMessage] = useState<string>('');

  // 기기 등록 관련 상태
  const [deviceCode, setDeviceCode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 직원 목록 로드 (businessId 사용)
  const loadEmployees = useCallback(async () => {
    if (!businessId) return;
    
    setLoadingEmployees(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, name, department, position')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [businessId]);

  // 초기 직원 목록 로드 (기기 등록 후)
  useEffect(() => {
    if (isDeviceRegistered && businessId) {
      loadEmployees();
    }
  }, [isDeviceRegistered, businessId, loadEmployees]);

  // 자동 리셋 타이머 (성공: 1.5초, 에러: 2초)
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (screen === 'success') {
      timer = setTimeout(() => {
        handleReset();
        // 바로 얼굴 인식 모드로 전환
        setScreen('detecting');
      }, 1500);
    } else if (screen === 'error') {
      timer = setTimeout(() => {
        handleReset();
      }, 2000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [screen]);

  // 전체 리셋
  const handleReset = useCallback(() => {
    reset();
    setPassword('');
    setSelectedEmployee(null);
    setResultMessage('');
  }, [reset]);

  // 비밀번호 입력 완료 시 자동 검증
  useEffect(() => {
    if (password.length === 4 && selectedEmployee) {
      verifyAndProceed();
    }
  }, [password]);

  const verifyAndProceed = async () => {
    if (!selectedEmployee || password.length !== 4) return;
    await handlePasswordSubmit();
  };

  // 기기코드 인증
  const handleDeviceAuth = async () => {
    if (!deviceCode.trim() || deviceCode.length !== 8) {
      setAuthError('8자리 기기코드를 입력해주세요');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result = await authenticateKiosk(deviceCode.trim().toUpperCase());

      if (result.success && result.device_id) {
        registerDevice({
          deviceId: result.device_id,
          deviceCode: result.device_code!,
          deviceName: result.device_name!,
          businessId: result.business_id!,
          businessName: result.business_name,
        });
        setDeviceCode('');
      } else {
        setAuthError(result.error || '기기 인증에 실패했습니다');
      }
    } catch (err) {
      console.error('Device auth error:', err);
      setAuthError('기기 인증 중 오류가 발생했습니다');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 기기 연결 해제
  const handleDisconnectDevice = () => {
    if (confirm('기기 연결을 해제하시겠습니까?')) {
      unregisterDevice();
      setShowSettings(false);
    }
  };

  // 얼굴 인식 결과 처리
  const handleFaceDetected = useCallback(
    async (descriptor: Float32Array | null) => {
      if (!descriptor || isProcessing || screen !== 'detecting' || !businessId) return;

      setProcessing(true);
      setAuthMethod('face');

      try {
        // Float32Array를 일반 배열로 변환
        const embeddingArray = Array.from(descriptor);
        
        // 얼굴 매칭 시도
        const matchedEmployee = await findMatchingEmployee(embeddingArray, 0.6, businessId);

        if (matchedEmployee) {
          // 오늘 출퇴근 상태 확인
          const todayStatus = await getTodayStatus(matchedEmployee.id);
          
          setRecognizedEmployee({
            id: matchedEmployee.id,
            name: matchedEmployee.name,
            department: matchedEmployee.department || undefined,
            todayCheckIn: todayStatus.checkInTime,
            todayCheckOut: todayStatus.checkOutTime,
          });
          setScreen('select');
        } else {
          setErrorMessage('등록된 얼굴을 찾을 수 없습니다.\n비밀번호로 인증해주세요.');
          setScreen('error');
        }
      } catch (error) {
        console.error('Face recognition error:', error);
        setErrorMessage('얼굴 인식 중 오류가 발생했습니다.');
        setScreen('error');
      } finally {
        setProcessing(false);
      }
    },
    [isProcessing, screen, businessId, setProcessing, setRecognizedEmployee, setScreen, setErrorMessage]
  );

  // 출퇴근 처리 (Optimistic UI)
  const handleCheckInOut = async (type: 'in' | 'out') => {
    if (!recognizedEmployee || !businessId) return;

    // IP 검증 및 로그 기록 (백그라운드)
    validateAndLogIP(
      recognizedEmployee.id,
      recognizedEmployee.name,
      type === 'in' ? 'check_in' : 'check_out',
      businessId
    ).then((ipResult) => {
      if (ipResult.isSuspicious) {
        console.warn(`[보안 경고] 미승인 IP에서 출퇴근 시도: ${ipResult.currentIP}`);
      }
    }).catch((err) => {
      console.error('IP validation error:', err);
    });

    // 즉시 완료 화면 표시 (Optimistic UI)
    const now = new Date();
    const time = now.toTimeString().split(' ')[0].substring(0, 5);
    setResultMessage(`${time}에 ${type === 'in' ? '출근' : '퇴근'} 처리되었습니다.`);
    setScreen('success');

    // 백그라운드에서 DB 저장
    try {
      const result = type === 'in' 
        ? await checkIn(recognizedEmployee.id, authMethod, businessId)
        : await checkOut(recognizedEmployee.id, authMethod, businessId);

      if (!result.success) {
        // 실패 시 에러 화면으로 전환
        setErrorMessage(result.message);
        setScreen('error');
      }
    } catch (error) {
      console.error('Check in/out error:', error);
      setErrorMessage('처리 중 오류가 발생했습니다.');
      setScreen('error');
    }
  };

  // 비밀번호 인증
  const handlePasswordSubmit = async () => {
    if (!selectedEmployee || password.length !== 4) return;

    setProcessing(true);
    setAuthMethod('password');

    try {
      const isValid = await verifyPassword(selectedEmployee.id, password);

      if (isValid) {
        // 오늘 출퇴근 상태 확인
        const todayStatus = await getTodayStatus(selectedEmployee.id);
        
        setRecognizedEmployee({
          id: selectedEmployee.id,
          name: selectedEmployee.name,
          department: selectedEmployee.department || undefined,
          todayCheckIn: todayStatus.checkInTime,
          todayCheckOut: todayStatus.checkOutTime,
        });
        setScreen('select');
      } else {
        setErrorMessage('비밀번호가 틀렸습니다');
        setScreen('error');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      setErrorMessage('인증 중 오류가 발생했습니다');
      setScreen('error');
    } finally {
      setProcessing(false);
      setPassword('');
    }
  };

  // ==========================================
  // 기기 미등록 시: 기기코드 입력 화면
  // ==========================================
  if (!isDeviceRegistered) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="w-full max-w-md">
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl shadow-lg mb-4">
              <Monitor className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-white">키오스크 설정</h1>
            <p className="text-white/60 mt-2">기기코드를 입력하여 연결하세요</p>
          </div>

          {/* 기기코드 입력 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <div className="mb-6">
              <label className="block text-white/80 text-sm mb-2">기기코드</label>
              <input
                type="text"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="8자리 코드 입력"
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl tracking-widest font-mono placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                maxLength={8}
                disabled={isAuthenticating}
              />
              <p className="text-white/40 text-xs text-center mt-2">
                관리자 페이지에서 발급받은 코드를 입력하세요
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm text-center">{authError}</p>
              </div>
            )}

            <button
              onClick={handleDeviceAuth}
              disabled={isAuthenticating || deviceCode.length !== 8}
              className="w-full py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>연결 중...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={24} />
                  <span>연결하기</span>
                </>
              )}
            </button>
          </div>

          {/* 안내 */}
          <div className="mt-6 text-center">
            <p className="text-white/40 text-sm">
              기기코드는 관리자 페이지 → 설정 → 키오스크 관리에서 발급받을 수 있습니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 기기 등록됨: 기존 키오스크 화면
  // ==========================================

  // 설정 모달
  if (showSettings) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8">
        <div className="kiosk-card max-w-md w-full animate-fadeIn">
          <h2 className="text-2xl font-bold text-center mb-6">기기 설정</h2>
          
          <div className="space-y-4 mb-8">
            <div className="p-4 bg-white/10 rounded-xl">
              <p className="text-white/60 text-sm">기기명</p>
              <p className="text-xl font-semibold">{deviceName}</p>
            </div>
            <div className="p-4 bg-white/10 rounded-xl">
              <p className="text-white/60 text-sm">사업장</p>
              <p className="text-xl font-semibold">{businessName || '-'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowSettings(false)}
              className="w-full kiosk-btn kiosk-btn-primary"
            >
              닫기
            </button>
            <button
              onClick={handleDisconnectDevice}
              className="w-full kiosk-btn bg-red-600 hover:bg-red-700"
            >
              기기 연결 해제
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 대기 화면
  if (screen === 'standby') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8">
        {/* 설정 버튼 */}
        <button
          onClick={() => setShowSettings(true)}
          className="absolute top-4 right-4 p-3 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Settings size={24} />
        </button>

        {/* 사업장 정보 */}
        {businessName && (
          <div className="absolute top-4 left-4 flex items-center gap-2 text-white/60">
            <Building2 size={20} />
            <span>{businessName}</span>
          </div>
        )}

        <Clock />

        <div className="mt-16 space-y-6 animate-slideUp">
          <p className="text-2xl text-white/80 text-center">
            출퇴근 인증을 시작하려면 아래 버튼을 터치하세요
          </p>

          <div className="flex gap-6 justify-center">
            <button
              onClick={() => setScreen('detecting')}
              className="kiosk-btn kiosk-btn-primary flex items-center gap-4"
            >
              <Scan size={32} />
              얼굴 인식
            </button>
            <button
              onClick={() => setScreen('password')}
              className="kiosk-btn kiosk-btn-secondary flex items-center gap-4"
            >
              <KeyRound size={32} />
              비밀번호
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 text-white/40 text-sm">
          {deviceName} · 출퇴근 관리 시스템 v1.0
        </div>
      </div>
    );
  }

  // 얼굴 인식 화면
  if (screen === 'detecting') {
    return (
      <div className="h-screen flex flex-col p-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={handleReset} className="kiosk-btn kiosk-btn-secondary py-3 px-6">
            <ArrowLeft size={24} className="mr-2" />
            뒤로
          </button>
          <Clock size="sm" showDate={false} />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-2xl aspect-[4/3]">
            <Camera onFaceDetected={handleFaceDetected} isActive={true} />
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-2xl text-white/80">
            {isProcessing ? '인식 중...' : '얼굴을 화면 중앙에 맞춰주세요'}
          </p>
        </div>
      </div>
    );
  }

  // 비밀번호 인증 화면
  if (screen === 'password') {
    return (
      <div className="h-screen flex flex-col p-8">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => {
              if (selectedEmployee) {
                setSelectedEmployee(null);
                setPassword('');
              } else {
                handleReset();
              }
            }} 
            className="kiosk-btn kiosk-btn-secondary py-3 px-6"
          >
            <ArrowLeft size={24} className="mr-2" />
            뒤로
          </button>
          <Clock size="sm" showDate={false} />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="kiosk-card max-w-lg w-full animate-fadeIn">
            {!selectedEmployee ? (
              // 직원 선택
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold">직원 선택</h2>
                  <button 
                    onClick={loadEmployees}
                    disabled={loadingEmployees}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <RefreshCw size={24} className={loadingEmployees ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={48} className="animate-spin text-white/60" />
                  </div>
                ) : employees.length === 0 ? (
                  <div className="text-center py-12 text-white/60">
                    <p>등록된 직원이 없습니다.</p>
                    <button 
                      onClick={loadEmployees}
                      className="mt-4 kiosk-btn kiosk-btn-secondary py-2 px-4"
                    >
                      다시 로드
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={28} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xl font-semibold truncate">{emp.name}</p>
                          <p className="text-white/60 truncate">
                            {emp.department || '부서 미지정'} 
                            {emp.employee_number && ` (${emp.employee_number})`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // 비밀번호 입력
              <div>
                <h2 className="text-3xl font-bold text-center mb-2">비밀번호 입력</h2>
                <p className="text-white/60 text-center mb-2">
                  {selectedEmployee.name}
                </p>
                <p className="text-white/40 text-center text-sm mb-8">
                  {selectedEmployee.department || '부서 미지정'}
                </p>
                <NumPad value={password} onChange={setPassword} maxLength={4} />
                {isProcessing && (
                  <div className="flex items-center justify-center mt-4">
                    <Loader2 size={24} className="animate-spin mr-2" />
                    <span>확인 중...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 출퇴근 선택 화면
  if (screen === 'select' && recognizedEmployee) {
    const hasCheckedIn = !!recognizedEmployee.todayCheckIn;
    const hasCheckedOut = !!recognizedEmployee.todayCheckOut;

    return (
      <div className="h-screen flex flex-col items-center justify-center p-8">
        <div className="kiosk-card max-w-lg w-full animate-fadeIn">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <User size={48} />
            </div>
            <h2 className="text-4xl font-bold">{recognizedEmployee.name}</h2>
            {recognizedEmployee.department && (
              <p className="text-xl text-white/60 mt-2">{recognizedEmployee.department}</p>
            )}
            
            {/* 오늘 출퇴근 상태 표시 */}
            <div className="mt-6 p-4 bg-white/10 rounded-xl">
              <p className="text-sm text-white/60 mb-2">오늘 출퇴근 현황</p>
              <div className="flex justify-center gap-8">
                <div>
                  <p className="text-white/40 text-sm">출근</p>
                  <p className={`text-lg font-semibold ${hasCheckedIn ? 'text-green-400' : 'text-white/60'}`}>
                    {recognizedEmployee.todayCheckIn || '--:--'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">퇴근</p>
                  <p className={`text-lg font-semibold ${hasCheckedOut ? 'text-red-400' : 'text-white/60'}`}>
                    {recognizedEmployee.todayCheckOut || '--:--'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <button
              onClick={() => handleCheckInOut('in')}
              disabled={isProcessing || hasCheckedIn}
              className={`flex-1 kiosk-btn flex flex-col items-center gap-2 ${
                hasCheckedIn 
                  ? 'bg-gray-500/50 cursor-not-allowed' 
                  : 'kiosk-btn-success'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <LogIn size={32} />
              )}
              출근
              {hasCheckedIn && <span className="text-sm">(완료)</span>}
            </button>
            <button
              onClick={() => handleCheckInOut('out')}
              disabled={isProcessing || !hasCheckedIn || hasCheckedOut}
              className={`flex-1 kiosk-btn flex flex-col items-center gap-2 ${
                !hasCheckedIn || hasCheckedOut
                  ? 'bg-gray-500/50 cursor-not-allowed' 
                  : 'kiosk-btn-danger'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <LogOut size={32} />
              )}
              퇴근
              {hasCheckedOut && <span className="text-sm">(완료)</span>}
            </button>
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-6 kiosk-btn kiosk-btn-secondary"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  // 성공 화면
  if (screen === 'success') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-fadeIn text-center">
          <CheckCircle className="mx-auto text-success-500" size={120} />
          <h1 className="text-5xl font-bold mt-8">
            {recognizedEmployee?.name}님
          </h1>
          <p className="text-3xl text-white/80 mt-4">
            {resultMessage || '출퇴근이 기록되었습니다'}
          </p>
          <div className="mt-6">
            <Clock size="md" showDate={false} />
          </div>
        </div>
      </div>
    );
  }

  // 오류 화면
  if (screen === 'error') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-fadeIn text-center">
          <XCircle className="mx-auto text-danger-500" size={120} />
          <h1 className="text-4xl font-bold mt-8">인증 실패</h1>
          <p className="text-2xl text-white/80 mt-4">
            {errorMessage || '다시 시도해주세요'}
          </p>
          <button onClick={handleReset} className="mt-8 kiosk-btn kiosk-btn-secondary">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
