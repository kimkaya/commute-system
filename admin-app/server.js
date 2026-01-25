const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

let db;

// MongoDB 연결 설정
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'commuteApp';

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    try {
        const { password } = req.body;
        
        const settings = await db.collection('settings').findOne({ _id: 'adminSettings' });
        if (!settings) {
            return res.status(400).json({ error: '관리자 설정을 찾을 수 없습니다.' });
        }

        const isValid = await bcrypt.compare(password, settings.passwordHash);
        
        if (isValid) {
            req.session.isAdmin = true;
            res.json({ success: true, message: '로그인 성공' });
        } else {
            res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
        }
    } catch (error) {
        res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

// 로그아웃 API
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: '로그아웃 성공' });
});

// 직원 목록 조회
app.get('/api/employees', requireAuth, async (req, res) => {
    try {
        const employees = await db.collection('faces').find({}).toArray();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: '직원 목록 조회 실패' });
    }
});

// 출퇴근 기록 조회
app.get('/api/records', requireAuth, async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ error: '기록 조회 실패' });
    }
});

// 직원별 스케줄 조회
app.get('/api/employees/:name/schedule', requireAuth, async (req, res) => {
    try {
        const { name } = req.params;
        const employee = await db.collection('faces').findOne({ name });
        
        if (!employee) {
            return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
        }
        
        res.json({
            name: employee.name,
            hourlyRate: employee.hourlyRate || 10000,
            schedule: employee.schedule || [],
            contract: employee.contract || null
        });
    } catch (error) {
        res.status(500).json({ error: '스케줄 조회 실패' });
    }
});

// 직원별 스케줄 저장
app.post('/api/employees/:name/schedule', requireAuth, async (req, res) => {
    try {
        const { name } = req.params;
        const { schedule, hourlyRate, contract } = req.body;
        
        const result = await db.collection('faces').updateOne(
            { name },
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
    } catch (error) {
        res.status(500).json({ error: '스케줄 저장 실패' });
    }
});

// 급여 계산
app.post('/api/payroll/calculate', requireAuth, async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ error: '급여 계산 실패' });
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
    app.listen(PORT, () => {
        console.log(`관리자 웹 앱이 http://localhost:${PORT}에서 실행 중입니다.`);
        console.log('핸드폰에서 접근하려면 같은 네트워크의 컴퓨터 IP 주소를 사용하세요.');
    });
});