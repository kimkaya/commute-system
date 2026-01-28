// =====================================================
// 키오스크 메인 애플리케이션
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
} from 'lucide-react';

// 데모용 직원 데이터
const demoEmployees = [
  { id: '1', name: '김철수', department: '개발팀', password: '1234' },
  { id: '2', name: '이영희', department: '디자인팀', password: '5678' },
  { id: '3', name: '박지성', department: '영업팀', password: '0000' },
];

function App() {
  const {
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
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // 자동 리셋 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (screen === 'success' || screen === 'error') {
      timer = setTimeout(() => {
        reset();
      }, 3000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [screen, reset]);

  // 비밀번호 입력 완료 시 자동 검증
  useEffect(() => {
    if (password.length === 4 && selectedEmployee) {
      handlePasswordSubmit();
    }
  }, [password, selectedEmployee]);

  // 얼굴 인식 결과 처리
  const handleFaceDetected = useCallback(
    (descriptor: Float32Array | null) => {
      if (!descriptor || isProcessing || screen !== 'detecting') return;

      // TODO: 실제로는 Supabase Edge Function 호출
      // 데모에서는 랜덤하게 직원 매칭
      setProcessing(true);

      setTimeout(() => {
        const randomEmployee = demoEmployees[Math.floor(Math.random() * demoEmployees.length)];
        setRecognizedEmployee({
          id: randomEmployee.id,
          name: randomEmployee.name,
          department: randomEmployee.department,
          todayCheckIn: '09:05',
        });
        setScreen('select');
        setProcessing(false);
      }, 1500);
    },
    [isProcessing, screen, setProcessing, setRecognizedEmployee, setScreen]
  );

  // 출퇴근 처리
  const handleCheckInOut = async (type: 'in' | 'out') => {
    if (!recognizedEmployee) return;

    setProcessing(true);

    // TODO: 실제로는 Supabase 호출
    setTimeout(() => {
      setScreen('success');
      setProcessing(false);
    }, 1000);
  };

  // 비밀번호 인증
  const handlePasswordSubmit = async () => {
    if (!selectedEmployee || password.length !== 4) return;

    setProcessing(true);

    const employee = demoEmployees.find((e) => e.id === selectedEmployee);
    
    setTimeout(() => {
      if (employee && employee.password === password) {
        setRecognizedEmployee({
          id: employee.id,
          name: employee.name,
          department: employee.department,
        });
        setScreen('select');
      } else {
        setErrorMessage('비밀번호가 틀렸습니다');
        setScreen('error');
      }
      setProcessing(false);
      setPassword('');
    }, 500);
  };

  // 대기 화면
  if (screen === 'standby') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8">
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
          출퇴근 관리 시스템 v1.0
        </div>
      </div>
    );
  }

  // 얼굴 인식 화면
  if (screen === 'detecting') {
    return (
      <div className="h-screen flex flex-col p-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={reset} className="kiosk-btn kiosk-btn-secondary py-3 px-6">
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
                reset();
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
          <div className="kiosk-card max-w-md w-full animate-fadeIn">
            {!selectedEmployee ? (
              // 직원 선택
              <div>
                <h2 className="text-3xl font-bold text-center mb-8">직원 선택</h2>
                <div className="space-y-4">
                  {demoEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp.id)}
                      className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <User size={28} />
                      </div>
                      <div className="text-left">
                        <p className="text-xl font-semibold">{emp.name}</p>
                        <p className="text-white/60">{emp.department}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // 비밀번호 입력
              <div>
                <h2 className="text-3xl font-bold text-center mb-2">비밀번호 입력</h2>
                <p className="text-white/60 text-center mb-8">
                  {demoEmployees.find((e) => e.id === selectedEmployee)?.name}
                </p>
                <NumPad value={password} onChange={setPassword} maxLength={4} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 출퇴근 선택 화면
  if (screen === 'select' && recognizedEmployee) {
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
            {recognizedEmployee.todayCheckIn && (
              <p className="text-lg text-white/40 mt-4">
                오늘 출근: {recognizedEmployee.todayCheckIn}
              </p>
            )}
          </div>

          <div className="flex gap-6">
            <button
              onClick={() => handleCheckInOut('in')}
              disabled={isProcessing}
              className="flex-1 kiosk-btn kiosk-btn-success flex flex-col items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <LogIn size={32} />
              )}
              출근
            </button>
            <button
              onClick={() => handleCheckInOut('out')}
              disabled={isProcessing}
              className="flex-1 kiosk-btn kiosk-btn-danger flex flex-col items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <LogOut size={32} />
              )}
              퇴근
            </button>
          </div>

          <button
            onClick={reset}
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
          <p className="text-3xl text-white/80 mt-4">출퇴근이 기록되었습니다</p>
          <Clock size="md" showDate={false} />
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
          <button onClick={reset} className="mt-8 kiosk-btn kiosk-btn-secondary">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
