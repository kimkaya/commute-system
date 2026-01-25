// 앱 상태 관리
let currentTab = 'dashboard';
let employees = [];
let isLoggedIn = false;

// 서버 URL 설정 - 모바일 앱과 웹 앱 모두 대응
function getServerUrl() {
    // Capacitor 앱인지 확인
    if (window.location.protocol === 'file:' || 
        window.location.protocol === 'capacitor:' || 
        (window.location.hostname === 'localhost' && window.Capacitor) ||
        window.Capacitor) {
        
        // 여러 서버 옵션 시도
        const serverOptions = [
            'https://contemporaneous-karmen-ravingly.ngrok-free.dev',  // ngrok 터널
            'http://192.168.219.189:3000',  // 로컬 네트워크
            'http://localhost:3000',        // 로컬호스트
            'http://10.0.2.2:3000'         // Android 에뮬레이터
        ];
        
        // 첫 번째 서버 옵션 반환 (나중에 자동 감지 로직 추가 가능)
        return serverOptions[0];
    } else {
        // 웹 브라우저에서는 상대 경로 사용
        return '';
    }
}

const SERVER_URL = getServerUrl();

// API 요청 헬퍼 함수 (자동 재시도 포함)
async function apiRequest(endpoint, options = {}) {
    const baseUrl = SERVER_URL;
    
    // 모바일 앱에서 여러 서버 시도
    if (window.Capacitor) {
        const serverUrls = [
            'https://contemporaneous-karmen-ravingly.ngrok-free.dev',  // ngrok 터널 (가장 확실)
            'http://192.168.219.189:3000',
            'http://localhost:3000',
            'http://10.0.2.2:3000'
        ];
        
        for (const serverUrl of serverUrls) {
            try {
                console.log('Trying server:', serverUrl + endpoint);
                
                const response = await fetch(serverUrl + endpoint, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    timeout: 5000 // 5초 타임아웃
                });
                
                if (response.ok) {
                    console.log('Successfully connected to:', serverUrl);
                    return response;
                }
            } catch (error) {
                console.log('Failed to connect to:', serverUrl, error.message);
                continue; // 다음 서버 시도
            }
        }
        
        throw new Error('모든 서버에 연결할 수 없습니다. WiFi 연결을 확인해주세요.');
    } else {
        // 웹 브라우저 환경
        const url = baseUrl + endpoint;
        console.log('API Request to:', url);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        if (baseUrl === '') {
            defaultOptions.credentials = 'include';
        }
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            return response;
        } catch (error) {
            console.error('Network error:', error);
            throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
        }
    }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 현재 날짜를 기본값으로 설정
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    document.getElementById('startDate').value = firstDayOfMonth;
    document.getElementById('endDate').value = today;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('payrollMonth').value = currentMonth;
    
    // 로그인 폼 이벤트 리스너
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // 세션 확인
    checkSession();
});

// 세션 확인
async function checkSession() {
    try {
        const response = await apiRequest('/api/employees');
        if (response.ok) {
            isLoggedIn = true;
            showMainScreen();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        showLoginScreen();
    }
}

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('loginMessage');
    
    // 로딩 표시
    messageDiv.innerHTML = '<div class="spinner"></div>';
    
    try {
        console.log('Attempting login with server:', SERVER_URL); // 디버깅용
        
        const response = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
        
        if (!response.ok) {
            const result = await response.json();
            messageDiv.innerHTML = `<div class="alert alert-error">${result.error || '로그인에 실패했습니다.'}</div>`;
            return;
        }
        
        const result = await response.json();
        
        messageDiv.innerHTML = '<div class="alert alert-success">로그인 성공!</div>';
        setTimeout(() => {
            isLoggedIn = true;
            showMainScreen();
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
    }
}

// 로그아웃
async function logout() {
    try {
        await apiRequest('/api/logout', { method: 'POST' });
        isLoggedIn = false;
        showLoginScreen();
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
}

// 화면 전환
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('password').value = '';
    document.getElementById('loginMessage').innerHTML = '';
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    loadDashboard();
    loadEmployees();
}

// 탭 전환
function showTab(tabName) {
    // 모든 탭 버튼과 내용 숨기기
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
    currentTab = tabName;
    
    // 탭별 데이터 로드
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'records':
            loadEmployeeFilter();
            break;
        case 'payroll':
            loadPayrollEmployees();
            break;
    }
}

// 대시보드 데이터 로드
async function loadDashboard() {
    try {
        // 직원 수 로드
        const employeesResponse = await apiRequest('/api/employees');
        const employeesData = await employeesResponse.json();
        document.getElementById('totalEmployees').textContent = employeesData.length;
        
        // 오늘 출퇴근 기록 로드
        const today = new Date().toISOString().split('T')[0];
        const recordsResponse = await apiRequest(`/api/records?startDate=${today}&endDate=${today}`);
        const recordsData = await recordsResponse.json();
        
        const todayAttendance = new Set(recordsData.filter(r => r.checkIn).map(r => r.userName)).size;
        document.getElementById('todayAttendance').textContent = todayAttendance;
        
        // 이번 달 총 근무시간 계산
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const monthRecordsResponse = await apiRequest(`/api/records?startDate=${firstDay}&endDate=${today}`);
        const monthRecordsData = await monthRecordsResponse.json();
        
        let totalHours = 0;
        monthRecordsData.forEach(record => {
            if (record.checkIn && record.checkOut) {
                const workMinutes = calculateWorkMinutes(record);
                totalHours += workMinutes / 60;
            }
        });
        
        document.getElementById('monthlyHours').textContent = Math.round(totalHours);
        
        // 최근 활동 표시
        const recentRecords = recordsData.slice(0, 5);
        let recentHtml = '';
        
        if (recentRecords.length > 0) {
            recentHtml = '<div class="table-container"><table class="table"><thead><tr><th>시간</th><th>직원</th><th>상태</th></tr></thead><tbody>';
            recentRecords.forEach(record => {
                const status = record.checkIn && record.checkOut ? '퇴근 완료' : 
                              record.checkIn ? '출근 중' : '미출근';
                const time = record.checkOut || record.checkIn || '-';
                recentHtml += `<tr><td>${time}</td><td>${record.userName}</td><td>${status}</td></tr>`;
            });
            recentHtml += '</tbody></table></div>';
        } else {
            recentHtml = '<p>오늘 출퇴근 기록이 없습니다.</p>';
        }
        
        document.getElementById('recentActivity').innerHTML = recentHtml;
        
    } catch (error) {
        console.error('대시보드 로드 오류:', error);
    }
}

// 직원 목록 로드
async function loadEmployees() {
    try {
        const response = await apiRequest('/api/employees');
        employees = await response.json();
        
        let html = '';
        employees.forEach(employee => {
            html += `
                <tr>
                    <td>${employee.name}</td>
                    <td>${(employee.hourlyRate || 10000).toLocaleString()}원</td>
                    <td>
                        <button class="btn btn-primary" onclick="editEmployee('${employee.name}')">편집</button>
                    </td>
                </tr>
            `;
        });
        
        document.getElementById('employeesTable').innerHTML = html;
    } catch (error) {
        console.error('직원 로드 오류:', error);
        document.getElementById('employeesTable').innerHTML = '<tr><td colspan="3">직원 데이터를 불러올 수 없습니다.</td></tr>';
    }
}

// 직원 편집 (간단한 시급 수정)
async function editEmployee(name) {
    const employee = employees.find(e => e.name === name);
    const newHourlyRate = prompt(`${name}의 시급을 입력하세요:`, employee.hourlyRate || 10000);
    
    if (newHourlyRate !== null && !isNaN(newHourlyRate)) {
        try {
            const response = await apiRequest(`/api/employees/${name}/schedule`, {
                method: 'POST',
                body: JSON.stringify({
                    hourlyRate: parseInt(newHourlyRate),
                    schedule: employee.schedule || [],
                    contract: employee.contract
                }),
            });
            
            if (response.ok) {
                alert('시급이 업데이트되었습니다.');
                loadEmployees();
            } else {
                alert('업데이트에 실패했습니다.');
            }
        } catch (error) {
            alert('오류가 발생했습니다.');
        }
    }
}

// 출퇴근 기록 필터용 직원 목록 로드
async function loadEmployeeFilter() {
    if (employees.length === 0) {
        await loadEmployees();
    }
    
    const select = document.getElementById('employeeFilter');
    select.innerHTML = '<option value="">전체</option>';
    
    employees.forEach(employee => {
        select.innerHTML += `<option value="${employee.name}">${employee.name}</option>`;
    });
}

// 출퇴근 기록 로드
async function loadRecords() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const employee = document.getElementById('employeeFilter').value;
    
    let url = `/api/records?startDate=${startDate}&endDate=${endDate}`;
    if (employee) {
        url += `&employee=${employee}`;
    }
    
    try {
        const response = await apiRequest(url);
        const records = await response.json();
        
        let html = '';
        records.forEach(record => {
            const workMinutes = calculateWorkMinutes(record);
            const workHours = (workMinutes / 60).toFixed(1);
            
            html += `
                <tr>
                    <td>${record.date}</td>
                    <td>${record.userName}</td>
                    <td>${record.checkIn || '-'}</td>
                    <td>${record.checkOut || '-'}</td>
                    <td>${workHours}시간</td>
                </tr>
            `;
        });
        
        if (html === '') {
            html = '<tr><td colspan="5">해당 기간에 기록이 없습니다.</td></tr>';
        }
        
        document.getElementById('recordsTable').innerHTML = html;
    } catch (error) {
        console.error('기록 로드 오류:', error);
        document.getElementById('recordsTable').innerHTML = '<tr><td colspan="5">데이터를 불러올 수 없습니다.</td></tr>';
    }
}

// 급여 계산용 직원 목록 로드
async function loadPayrollEmployees() {
    if (employees.length === 0) {
        await loadEmployees();
    }
    
    const select = document.getElementById('payrollEmployee');
    select.innerHTML = '<option value="">직원을 선택하세요</option>';
    
    employees.forEach(employee => {
        select.innerHTML += `<option value="${employee.name}">${employee.name}</option>`;
    });
}

// 급여 계산
async function calculatePayroll() {
    const employeeName = document.getElementById('payrollEmployee').value;
    const month = document.getElementById('payrollMonth').value;
    
    if (!employeeName || !month) {
        alert('직원과 월을 선택해주세요.');
        return;
    }
    
    try {
        document.getElementById('payrollResult').innerHTML = '<div class="spinner"></div>';
        
        const response = await apiRequest('/api/payroll/calculate', {
            method: 'POST',
            body: JSON.stringify({ employeeName, month }),
        });
        
        const payroll = await response.json();
        
        if (response.ok) {
            const html = `
                <div class="card">
                    <h3>💰 ${payroll.employee} - ${month} 급여 명세서</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div>
                            <strong>총 근무시간:</strong> ${payroll.totalHours.toFixed(1)}시간<br>
                            <strong>연장 근무시간:</strong> ${payroll.overtimeHours.toFixed(1)}시간<br>
                            <strong>시급:</strong> ${payroll.hourlyRate.toLocaleString()}원
                        </div>
                        <div>
                            <strong>기본급:</strong> ${payroll.basePay.toLocaleString()}원<br>
                            <strong>연장수당:</strong> ${payroll.overtimePay.toLocaleString()}원<br>
                            <strong>총 급여:</strong> ${payroll.grossPay.toLocaleString()}원
                        </div>
                        <div>
                            <strong>세금:</strong> ${payroll.tax.toLocaleString()}원<br>
                            <strong style="color: #4c63d2; font-size: 1.2rem;">실수령액:</strong> 
                            <strong style="color: #4c63d2; font-size: 1.2rem;">${payroll.netPay.toLocaleString()}원</strong>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('payrollResult').innerHTML = html;
        } else {
            document.getElementById('payrollResult').innerHTML = `<div class="alert alert-error">${payroll.error}</div>`;
        }
    } catch (error) {
        console.error('급여 계산 오류:', error);
        document.getElementById('payrollResult').innerHTML = '<div class="alert alert-error">급여 계산 중 오류가 발생했습니다.</div>';
    }
}

function calculateWorkMinutes(record) {
    if (!record.checkIn || !record.checkOut) return 0;
    
    const [inH, inM] = record.checkIn.split(':').map(Number);
    const [outH, outM] = record.checkOut.split(':').map(Number);
    
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    return Math.max(0, totalMinutes - (record.totalBreakMinutes || 0));
}