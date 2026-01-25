const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { CommuteAPIClient } = require('../unified-api/shared/commute-client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

let db;
let unifiedAPI;

// MongoDB 연결 설정
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'commuteApp';

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS 설정 (모바일 앱 지원)
app.use((req, res, next) => {
    // ngrok 도메인과 로컬 접근 모두 허용
    const allowedOrigins = [
        'https://contemporaneous-karmen-ravingly.ngrok-free.dev',
        'http://localhost:3002',
        'http://192.168.219.189:3002',
        'capacitor://localhost',
        'http://localhost'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // preflight 요청 처리
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'admin-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // HTTPS에서는 true로 설정
        maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
}));

// MongoDB 연결
async function connectDB() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('MongoDB 연결 성공');
        
        // 통합 API 클라이언트 초기화
        unifiedAPI = new CommuteAPIClient('http://localhost:4000');
        
        return true;
    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        return false;
    }
}

// 인증 미들웨어
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: '로그인이 필요합니다.' });
    }
}

// 라우터 설정

// 메인 페이지 - 새로운 모바일 최적화 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mobile-index.html'));
});

// 기존 페이지 호환성
app.get('/legacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ 통합 API 프록시 라우터 ============

// API 상태 확인
app.get('/api/health', async (req, res) => {
    try {
        const health = await unifiedAPI.getHealth();
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: '통합 API 서버에 연결할 수 없습니다.' });
    }
});

// API 정보
app.get('/api/info', async (req, res) => {
    try {
        const info = await unifiedAPI.getApiInfo();
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: 'API 정보 조회 실패' });
    }
});

// 로그인 API - 통합 API 사용
app.post('/api/login', async (req, res) => {
    try {
        const { password } = req.body;
        
        // 통합 API를 통한 로그인
        const result = await unifiedAPI.login(password);
        
        if (result.success) {
            req.session.isAdmin = true;
            res.json({ success: true, message: '로그인 성공' });
        } else {
            res.status(401).json({ error: result.message || '로그인 실패' });
        }
    } catch (error) {
        // 통합 API가 실패하면 기존 로직으로 폴백
        try {
            const settings = await db.collection('settings').findOne({ _id: 'adminSettings' });
            if (!settings) {
                return res.status(400).json({ error: '관리자 설정을 찾을 수 없습니다.' });
            }

            const isValid = await bcrypt.compare(req.body.password, settings.passwordHash);
            
            if (isValid) {
                req.session.isAdmin = true;
                res.json({ success: true, message: '로그인 성공 (로컬 인증)' });
            } else {
                res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
            }
        } catch (fallbackError) {
            res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
        }
    }
});

// 로그아웃 API - 통합 API 사용
app.post('/api/logout', async (req, res) => {
    try {
        await unifiedAPI.logout();
    } catch (error) {
        // 통합 API 실패해도 로컬 세션은 정리
    }
    
    req.session.destroy();
    res.json({ success: true, message: '로그아웃 성공' });
});

// 인증 확인 API
app.post('/api/auth/verify', async (req, res) => {
    try {
        // 통합 API로 인증 상태 확인
        const result = await unifiedAPI.verifyAuth();
        res.json(result);
    } catch (error) {
        // 폴백: 로컬 세션 확인
        res.json({ isAuthenticated: !!(req.session && req.session.isAdmin) });
    }
});

// 직원 목록 조회 - 통합 API 사용
app.get('/api/employees', requireAuth, async (req, res) => {
    try {
        const employees = await unifiedAPI.getEmployees();
        res.json(employees);
    } catch (error) {
        // 폴백: 직접 DB 조회
        try {
            const employees = await db.collection('faces').find({}).toArray();
            const sanitizedEmployees = employees.map(emp => ({
                name: emp.name,
                registeredAt: emp.registeredAt,
                hourlyRate: emp.hourlyRate || 10000,
                schedule: emp.schedule || [],
                contract: emp.contract || null,
                registeredDevices: emp.registeredDevices?.length || 0
            }));
            res.json(sanitizedEmployees);
        } catch (fallbackError) {
            res.status(500).json({ error: '직원 목록 조회 실패' });
        }
    }
});

// 직원 생성 - 통합 API 사용
app.post('/api/employees', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.createEmployee(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '직원 등록 실패' });
    }
});

// 직원 수정 - 통합 API 사용
app.put('/api/employees/:id', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.updateEmployee(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '직원 정보 수정 실패' });
    }
});

// 직원 삭제 - 통합 API 사용
app.delete('/api/employees/:id', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.deleteEmployee(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '직원 삭제 실패' });
    }
});

// 직원 비밀번호 재설정 - 통합 API 사용
app.post('/api/employees/:id/reset-password', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.resetEmployeePassword(req.params.id, req.body.newPassword);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '비밀번호 재설정 실패' });
    }
});

// 직원 기기 초기화 - 통합 API 사용
app.post('/api/employees/:id/reset-devices', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.resetEmployeeDevices(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '기기 초기화 실패' });
    }
});

// 출퇴근 기록 조회 - 통합 API 사용
app.get('/api/records', requireAuth, async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            employee: req.query.employee
        };
        
        const records = await unifiedAPI.getRecords(filters);
        res.json(records);
    } catch (error) {
        // 폴백: 직접 DB 조회
        try {
            const { startDate, endDate, employee } = req.query;
            let query = {};
            
            if (startDate && endDate) {
                query.date = { $gte: startDate, $lte: endDate };
            }
            
            if (employee) {
                query.userName = employee;
            }
            
            const records = await db.collection('records').find(query).sort({ date: -1 }).toArray();
            res.json(records);
        } catch (fallbackError) {
            res.status(500).json({ error: '기록 조회 실패' });
        }
    }
});

// 출퇴근 기록 생성 - 통합 API 사용
app.post('/api/records', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.createRecord(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '기록 생성 실패' });
    }
});

// 출퇴근 기록 수정 - 통합 API 사용
app.put('/api/records/:id', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.updateRecord(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '기록 수정 실패' });
    }
});

// 출퇴근 기록 삭제 - 통합 API 사용
app.delete('/api/records/:id', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.deleteRecord(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '기록 삭제 실패' });
    }
});

// ============ 급여 계산 라우터 ============

// 급여 계산 - 통합 API 사용
app.post('/api/payroll/calculate', requireAuth, async (req, res) => {
    try {
        const { employeeName, month, allowances, customDeductions } = req.body;
        const result = await unifiedAPI.calculatePayroll(employeeName, month, { allowances, customDeductions });
        res.json(result);
    } catch (error) {
        // 폴백: 로컬 급여 계산
        try {
            const { employeeName, month } = req.body;
            
            // 해당 월의 근무 기록 조회
            const startOfMonth = `${month}-01`;
            const endOfMonth = new Date(month + '-01');
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
            endOfMonth.setDate(0);
            const endDate = endOfMonth.toISOString().split('T')[0];
            
            const records = await db.collection('records').find({
                userName: employeeName,
                date: { $gte: startOfMonth, $lte: endDate }
            }).toArray();
            
            const employee = await db.collection('faces').findOne({ name: employeeName });
            if (!employee) {
                return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
            }
            
            // 급여 계산 로직
            let totalHours = 0;
            let overtimeHours = 0;
            
            records.forEach(record => {
                if (record.checkIn && record.checkOut) {
                    const workMinutes = calculateWorkMinutes(record);
                    const dailyHours = workMinutes / 60;
                    
                    if (dailyHours <= 8) {
                        totalHours += dailyHours;
                    } else {
                        totalHours += 8;
                        overtimeHours += (dailyHours - 8);
                    }
                }
            });
            
            const hourlyRate = employee.hourlyRate || 10000;
            const basePay = totalHours * hourlyRate;
            const overtimePay = overtimeHours * hourlyRate * 1.5;
            const grossPay = basePay + overtimePay;
            
            // 간단한 세금 계산 (실제로는 더 복잡)
            const tax = grossPay * 0.1;
            const netPay = grossPay - tax;
            
            const payrollData = {
                employee: employeeName,
                month,
                totalHours,
                overtimeHours,
                hourlyRate,
                basePay,
                overtimePay,
                grossPay,
                tax,
                netPay,
                calculatedAt: new Date()
            };
            
            res.json(payrollData);
        } catch (fallbackError) {
            res.status(500).json({ error: '급여 계산 실패' });
        }
    }
});

// 급여 데이터 조회 - 통합 API 사용
app.get('/api/payroll/:month', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.getPayrollData(req.params.month);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '급여 데이터 조회 실패' });
    }
});

// 직원별 급여 조회 - 통합 API 사용
app.get('/api/payroll/:month/:employee', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.getEmployeePayroll(req.params.month, req.params.employee);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '직원 급여 조회 실패' });
    }
});

// ============ 컴플라이언스 라우터 ============

// 컴플라이언스 체크 - 통합 API 사용
app.post('/api/compliance/check', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.checkCompliance(req.body.weekStart);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '컴플라이언스 체크 실패' });
    }
});

// ============ 백업 라우터 ============

// 백업 생성 - 통합 API 사용
app.post('/api/backup/create', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.createBackup();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '백업 생성 실패' });
    }
});

// 백업 목록 - 통합 API 사용
app.get('/api/backup/list', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.getBackupList();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: '백업 목록 조회 실패' });
    }
});

// ============ 스케줄 관리 라우터 ============

// 직원 스케줄 조회 - 통합 API 사용
app.get('/api/schedules/:employeeName', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.getEmployeeSchedule(req.params.employeeName);
        res.json(result);
    } catch (error) {
        // 폴백: 직접 DB 조회
        try {
            const { employeeName } = req.params;
            const employee = await db.collection('faces').findOne({ name: employeeName });
            
            if (!employee) {
                return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
            }
            
            res.json({
                name: employee.name,
                hourlyRate: employee.hourlyRate || 10000,
                schedule: employee.schedule || [],
                contract: employee.contract || null
            });
        } catch (fallbackError) {
            res.status(500).json({ error: '스케줄 조회 실패' });
        }
    }
});

// 직원 스케줄 저장 - 통합 API 사용
app.post('/api/schedules/:employeeName', requireAuth, async (req, res) => {
    try {
        const result = await unifiedAPI.saveEmployeeSchedule(req.params.employeeName, req.body);
        res.json(result);
    } catch (error) {
        // 폴백: 직접 DB 저장
        try {
            const { employeeName } = req.params;
            const { schedule, hourlyRate, contract } = req.body;
            
            const result = await db.collection('faces').updateOne(
                { name: employeeName },
                { 
                    $set: { 
                        schedule: schedule || [],
                        hourlyRate: hourlyRate || 10000,
                        contract: contract || null
                    }
                }
            );
            
            if (result.modifiedCount > 0) {
                res.json({ success: true, message: '스케줄이 저장되었습니다.' });
            } else {
                res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
            }
        } catch (fallbackError) {
            res.status(500).json({ error: '스케줄 저장 실패' });
        }
    }
});

// 유틸리티 함수
function calculateWorkMinutes(record) {
    if (!record.checkIn || !record.checkOut) return 0;
    
    const [inH, inM] = record.checkIn.split(':').map(Number);
    const [outH, outM] = record.checkOut.split(':').map(Number);
    
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    return Math.max(0, totalMinutes - (record.totalBreakMinutes || 0));
}

// 서버 시작
connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`관리자 웹 앱이 http://localhost:${PORT}에서 실행 중입니다.`);
        console.log(`외부 접근: http://192.168.219.189:${PORT}`);
        console.log(`테스트 포트: http://192.168.219.189:${PORT}`);
        console.log('핸드폰에서 접근하려면 같은 네트워크의 컴퓨터 IP 주소를 사용하세요.');
    });
});