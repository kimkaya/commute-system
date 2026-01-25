const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

class UnifiedCommuteAPI {
    constructor() {
        this.app = express();
        this.PORT = process.env.PORT || 3000; // Railway는 PORT 환경변수를 사용
        this.db = null;
        this.MONGO_URI = process.env.MONGO_URI;
        this.DB_NAME = process.env.DB_NAME || 'commuteApp';
        
        // 보안 설정
        this.SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;
        this.MAX_FAIL_COUNT = 5;
        this.LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30분
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupPayrollEngine();
        this.setupComplianceChecker();
        this.setupBackupManager();
    }

    setupMiddleware() {
        // 보안 헤더
        this.app.use(helmet());
        
        // 로깅 (프로덕션에서만)
        if (process.env.NODE_ENV === 'production') {
            this.app.use(morgan('combined'));
        }

        // CORS 설정
        const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
            process.env.ALLOWED_ORIGINS.split(',') : [
                'http://localhost:3000',
                'http://localhost:3002', 
                'capacitor://localhost',
                'http://localhost'
            ];

        this.app.use(cors({
            origin: allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        
        // 세션 설정
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'unified-commute-secret',
            resave: false,
            saveUninitialized: false,
            cookie: { 
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24시간
            }
        }));
    }

    async connectMongoDB() {
        try {
            if (!this.MONGO_URI) {
                throw new Error('MONGO_URI environment variable is not set');
            }
            
            console.log('Connecting to MongoDB...');
            this.client = new MongoClient(this.MONGO_URI);
            await this.client.connect();
            this.db = this.client.db(this.DB_NAME);
            console.log('MongoDB connected successfully');
            
            // 데이터베이스 초기화
            await this.initializeDatabase();
        } catch (error) {
            console.error('MongoDB connection failed:', error);
            throw error;
        }
    }

    async initializeDatabase() {
        try {
            // 필수 컬렉션들이 존재하는지 확인하고 없으면 생성
            const collections = await this.db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            
            const requiredCollections = [
                'employees', 'attendance', 'payroll', 'schedules',
                'leave', 'compliance', 'backups', 'audit_logs', 'notifications'
            ];
            
            for (const collName of requiredCollections) {
                if (!collectionNames.includes(collName)) {
                    await this.db.createCollection(collName);
                    console.log(`Created collection: ${collName}`);
                }
            }
            
            // 기본 관리자 계정 생성 (존재하지 않을 경우)
            const adminExists = await this.db.collection('employees').findOne({ 
                email: 'admin@company.com' 
            });
            
            if (!adminExists) {
                const hashedPassword = await bcrypt.hash('admin123', this.SALT_ROUNDS);
                await this.db.collection('employees').insertOne({
                    employeeId: 'ADMIN001',
                    name: 'System Administrator',
                    email: 'admin@company.com',
                    password: hashedPassword,
                    role: 'admin',
                    department: 'IT',
                    position: 'Administrator',
                    hireDate: new Date(),
                    isActive: true,
                    failCount: 0,
                    lockedUntil: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log('Default admin account created');
            }
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    setupRoutes() {
        // 헬스 체크 엔드포인트
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                dbConnected: !!this.db
            });
        });

        // 루트 엔드포인트
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Unified Commute Management API',
                version: '1.0.0',
                status: 'Running',
                endpoints: [
                    'GET /health - Health check',
                    'POST /auth/login - User login',
                    'POST /auth/logout - User logout',
                    'GET /employees - Get all employees',
                    'GET /attendance - Get attendance records',
                    'POST /attendance/checkin - Employee check-in',
                    'POST /attendance/checkout - Employee check-out'
                ]
            });
        });

        // 인증 라우트
        this.setupAuthRoutes();
        
        // 직원 관리 라우트
        this.setupEmployeeRoutes();
        
        // 출퇴근 관리 라우트
        this.setupAttendanceRoutes();
        
        // 급여 관리 라우트
        this.setupPayrollRoutes();
        
        // 일정 관리 라우트
        this.setupScheduleRoutes();
        
        // 휴가 관리 라우트
        this.setupLeaveRoutes();
        
        // 백업 관리 라우트
        this.setupBackupRoutes();
        
        // 알림 라우트
        this.setupNotificationRoutes();
        
        // 보고서 라우트
        this.setupReportRoutes();

        // 404 처리
        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });

        // 에러 처리
        this.app.use((err, req, res, next) => {
            console.error('Error:', err);
            res.status(500).json({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });
    }

    setupAuthRoutes() {
        // 로그인
        this.app.post('/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                
                if (!email || !password) {
                    return res.status(400).json({ error: 'Email and password are required' });
                }
                
                const employee = await this.db.collection('employees').findOne({ email });
                
                if (!employee) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                // 계정 잠금 확인
                if (employee.lockedUntil && employee.lockedUntil > new Date()) {
                    return res.status(423).json({ error: 'Account is locked' });
                }
                
                const isValidPassword = await bcrypt.compare(password, employee.password);
                
                if (!isValidPassword) {
                    // 실패 횟수 증가
                    const failCount = (employee.failCount || 0) + 1;
                    const updateData = { failCount };
                    
                    if (failCount >= this.MAX_FAIL_COUNT) {
                        updateData.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
                    }
                    
                    await this.db.collection('employees').updateOne(
                        { _id: employee._id },
                        { $set: updateData }
                    );
                    
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                // 로그인 성공 시 실패 횟수 리셋
                await this.db.collection('employees').updateOne(
                    { _id: employee._id },
                    { $set: { failCount: 0, lockedUntil: null, lastLogin: new Date() } }
                );
                
                // 세션 설정
                req.session.userId = employee._id.toString();
                req.session.employeeId = employee.employeeId;
                req.session.role = employee.role;
                
                // 비밀번호 제외하고 응답
                const { password: _, ...employeeData } = employee;
                res.json({ 
                    message: 'Login successful',
                    employee: employeeData
                });
                
            } catch (error) {
                console.error('Login error:', error);
                res.status(500).json({ error: 'Login failed' });
            }
        });

        // 로그아웃
        this.app.post('/auth/logout', (req, res) => {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({ error: 'Logout failed' });
                }
                res.json({ message: 'Logout successful' });
            });
        });

        // 세션 확인
        this.app.get('/auth/me', async (req, res) => {
            try {
                if (!req.session.userId) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
                
                const employee = await this.db.collection('employees').findOne(
                    { _id: new require('mongodb').ObjectId(req.session.userId) },
                    { projection: { password: 0 } }
                );
                
                if (!employee) {
                    return res.status(404).json({ error: 'Employee not found' });
                }
                
                res.json({ employee });
            } catch (error) {
                console.error('Session check error:', error);
                res.status(500).json({ error: 'Session check failed' });
            }
        });
    }

    setupEmployeeRoutes() {
        // 직원 목록 조회
        this.app.get('/employees', async (req, res) => {
            try {
                const employees = await this.db.collection('employees')
                    .find({}, { projection: { password: 0 } })
                    .toArray();
                res.json({ employees });
            } catch (error) {
                console.error('Fetch employees error:', error);
                res.status(500).json({ error: 'Failed to fetch employees' });
            }
        });
    }

    setupAttendanceRoutes() {
        // 출근
        this.app.post('/attendance/checkin', async (req, res) => {
            try {
                const { employeeId } = req.body;
                
                if (!employeeId) {
                    return res.status(400).json({ error: 'Employee ID is required' });
                }
                
                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                const endOfDay = new Date(today.setHours(23, 59, 59, 999));
                
                // 오늘 이미 출근했는지 확인
                const existingRecord = await this.db.collection('attendance').findOne({
                    employeeId,
                    checkIn: { $gte: startOfDay, $lte: endOfDay }
                });
                
                if (existingRecord) {
                    return res.status(400).json({ error: 'Already checked in today' });
                }
                
                const attendanceRecord = {
                    employeeId,
                    checkIn: new Date(),
                    checkOut: null,
                    date: new Date().toISOString().split('T')[0],
                    status: 'present',
                    createdAt: new Date()
                };
                
                const result = await this.db.collection('attendance').insertOne(attendanceRecord);
                res.json({ 
                    message: 'Check-in successful',
                    recordId: result.insertedId
                });
                
            } catch (error) {
                console.error('Check-in error:', error);
                res.status(500).json({ error: 'Check-in failed' });
            }
        });
        
        // 퇴근
        this.app.post('/attendance/checkout', async (req, res) => {
            try {
                const { employeeId } = req.body;
                
                if (!employeeId) {
                    return res.status(400).json({ error: 'Employee ID is required' });
                }
                
                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                const endOfDay = new Date(today.setHours(23, 59, 59, 999));
                
                // 오늘의 출근 기록 찾기
                const attendanceRecord = await this.db.collection('attendance').findOne({
                    employeeId,
                    checkIn: { $gte: startOfDay, $lte: endOfDay },
                    checkOut: null
                });
                
                if (!attendanceRecord) {
                    return res.status(400).json({ error: 'No check-in record found for today' });
                }
                
                const checkOutTime = new Date();
                const workHours = (checkOutTime - attendanceRecord.checkIn) / (1000 * 60 * 60);
                
                await this.db.collection('attendance').updateOne(
                    { _id: attendanceRecord._id },
                    { 
                        $set: { 
                            checkOut: checkOutTime,
                            workHours: Math.round(workHours * 100) / 100,
                            updatedAt: new Date()
                        }
                    }
                );
                
                res.json({ 
                    message: 'Check-out successful',
                    workHours: Math.round(workHours * 100) / 100
                });
                
            } catch (error) {
                console.error('Check-out error:', error);
                res.status(500).json({ error: 'Check-out failed' });
            }
        });

        // 출퇴근 기록 조회
        this.app.get('/attendance', async (req, res) => {
            try {
                const { employeeId, startDate, endDate } = req.query;
                
                let query = {};
                if (employeeId) query.employeeId = employeeId;
                if (startDate && endDate) {
                    query.checkIn = {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate + 'T23:59:59')
                    };
                }
                
                const records = await this.db.collection('attendance')
                    .find(query)
                    .sort({ checkIn: -1 })
                    .toArray();
                    
                res.json({ records });
            } catch (error) {
                console.error('Fetch attendance error:', error);
                res.status(500).json({ error: 'Failed to fetch attendance records' });
            }
        });
    }

    // 나머지 라우트 메서드들은 기존과 동일하게 유지
    setupPayrollRoutes() {
        // 기본 급여 조회 엔드포인트
        this.app.get('/payroll', async (req, res) => {
            res.json({ message: 'Payroll system ready' });
        });
    }

    setupScheduleRoutes() {
        this.app.get('/schedules', async (req, res) => {
            res.json({ message: 'Schedule system ready' });
        });
    }

    setupLeaveRoutes() {
        this.app.get('/leave', async (req, res) => {
            res.json({ message: 'Leave system ready' });
        });
    }

    setupBackupRoutes() {
        this.app.get('/backups', async (req, res) => {
            res.json({ message: 'Backup system ready' });
        });
    }

    setupNotificationRoutes() {
        this.app.get('/notifications', async (req, res) => {
            res.json({ message: 'Notification system ready' });
        });
    }

    setupReportRoutes() {
        this.app.get('/reports', async (req, res) => {
            res.json({ message: 'Report system ready' });
        });
    }

    setupPayrollEngine() {
        // 급여 계산 엔진 초기화
        console.log('Payroll engine initialized');
    }

    setupComplianceChecker() {
        // 컴플라이언스 체커 초기화
        console.log('Compliance checker initialized');
    }

    setupBackupManager() {
        // 백업 매니저 초기화
        console.log('Backup manager initialized');
    }

    async start() {
        try {
            await this.connectMongoDB();
            
            this.app.listen(this.PORT, '0.0.0.0', () => {
                console.log(`🚀 Unified Commute API Server running on port ${this.PORT}`);
                console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
                console.log(`🗄️ Database: ${this.DB_NAME}`);
                console.log(`⏰ Server started at: ${new Date().toISOString()}`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// 서버 시작
const api = new UnifiedCommuteAPI();
api.start().catch(error => {
    console.error('Server startup failed:', error);
    process.exit(1);
});