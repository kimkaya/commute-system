// 프로덕션 환경용 서버 설정
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

class ProductionCommuteAPI {
    constructor() {
        this.app = express();
        this.PORT = process.env.PORT || 3000;
        this.db = null;
        this.MONGO_URI = process.env.MONGO_URI;
        this.DB_NAME = process.env.DB_NAME || 'commuteApp';
        
        // 보안 설정
        this.SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 12;
        this.MAX_FAIL_COUNT = 5;
        this.LOCKOUT_DURATION_MS = 30 * 60 * 1000;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // 보안 헤더 설정
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));

        // 로깅
        if (process.env.NODE_ENV === 'production') {
            this.app.use(morgan('combined'));
        } else {
            this.app.use(morgan('dev'));
        }

        // CORS 설정 (프로덕션용)
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:3000', 'https://localhost:3000'];

        this.app.use(cors({
            origin: function (origin, callback) {
                // 서버 간 통신 허용
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('CORS 정책에 의해 차단됨'), false);
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
        }));

        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // 세션 설정 (프로덕션용)
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
            resave: false,
            saveUninitialized: false,
            cookie: { 
                secure: process.env.NODE_ENV === 'production', // HTTPS에서만 true
                maxAge: 24 * 60 * 60 * 1000, // 24시간
                httpOnly: true,
                sameSite: 'strict'
            },
            name: 'commute.sid' // 기본 세션 이름 변경
        }));

        // Rate limiting (간단한 버전)
        this.app.use(this.rateLimit.bind(this));
    }

    // 간단한 Rate Limiting
    rateLimit(req, res, next) {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `rate_limit:${ip}`;
        
        // 실제 환경에서는 Redis 사용 권장
        if (!this.rateLimitStore) {
            this.rateLimitStore = new Map();
        }

        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15분
        const max = 100; // 15분당 100회

        const record = this.rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + windowMs;
        }

        record.count++;
        this.rateLimitStore.set(key, record);

        if (record.count > max) {
            return res.status(429).json({ 
                error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }

        next();
    }

    setupRoutes() {
        // 건강 체크
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                database: this.db ? 'connected' : 'disconnected'
            });
        });

        // API 정보
        this.app.get('/api/info', (req, res) => {
            res.json({
                name: '통합 출퇴근 관리 API',
                version: '2.0.0',
                environment: process.env.NODE_ENV || 'development',
                features: [
                    '통일된 인증 시스템',
                    '플랫폼 간 호환 API',
                    '급여 계산 엔진',
                    '컴플라이언스 체크',
                    '자동 백업',
                    'Excel 내보내기'
                ],
                supportedPlatforms: [
                    'Windows Desktop (Electron)',
                    'Mobile (Android/iOS)',
                    'Web Browser'
                ],
                docs: '/api/docs'
            });
        });

        // 정적 파일 서빙 (프론트엔드)
        this.app.use(express.static(path.join(__dirname, 'public')));

        // API 라우터 설정
        this.setupAPIRoutes();

        // 모든 나머지 요청을 index.html로 리다이렉트 (SPA 지원)
        this.app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) {
                res.status(404).json({ error: 'API 엔드포인트를 찾을 수 없습니다.' });
            } else {
                res.sendFile(path.join(__dirname, 'public', 'index.html'));
            }
        });
    }

    setupAPIRoutes() {
        // 인증 라우터
        this.app.post('/api/auth/login', this.login.bind(this));
        this.app.post('/api/auth/logout', this.logout.bind(this));
        this.app.post('/api/auth/verify', this.verifyAuth.bind(this));
        this.app.post('/api/auth/change-password', this.requireAuth.bind(this), this.changePassword.bind(this));
        
        // 직원 관리
        this.app.get('/api/employees', this.requireAuth.bind(this), this.getEmployees.bind(this));
        this.app.post('/api/employees', this.requireAuth.bind(this), this.createEmployee.bind(this));
        this.app.put('/api/employees/:id', this.requireAuth.bind(this), this.updateEmployee.bind(this));
        this.app.delete('/api/employees/:id', this.requireAuth.bind(this), this.deleteEmployee.bind(this));
        
        // 출퇴근 기록
        this.app.get('/api/records', this.requireAuth.bind(this), this.getRecords.bind(this));
        this.app.post('/api/records', this.requireAuth.bind(this), this.createRecord.bind(this));
        this.app.put('/api/records/:id', this.requireAuth.bind(this), this.updateRecord.bind(this));
        this.app.delete('/api/records/:id', this.requireAuth.bind(this), this.deleteRecord.bind(this));
        
        // 급여 계산
        this.app.post('/api/payroll/calculate', this.requireAuth.bind(this), this.calculatePayroll.bind(this));
        this.app.get('/api/payroll/:month', this.requireAuth.bind(this), this.getPayrollData.bind(this));
        
        // 백업
        this.app.post('/api/backup/create', this.requireAuth.bind(this), this.createBackup.bind(this));
        this.app.get('/api/backup/list', this.requireAuth.bind(this), this.getBackupList.bind(this));
    }

    setupErrorHandling() {
        // 404 핸들러
        this.app.use((req, res, next) => {
            res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다.' });
        });

        // 에러 핸들러
        this.app.use((error, req, res, next) => {
            console.error('서버 오류:', error);
            
            if (process.env.NODE_ENV === 'production') {
                res.status(500).json({ error: '내부 서버 오류가 발생했습니다.' });
            } else {
                res.status(500).json({ 
                    error: '내부 서버 오류',
                    message: error.message,
                    stack: error.stack
                });
            }
        });
    }

    // 미들웨어
    requireAuth(req, res, next) {
        if (req.session && req.session.isAdmin) {
            next();
        } else {
            res.status(401).json({ error: '로그인이 필요합니다.' });
        }
    }

    // 핸들러 메서드들 (기존 코드와 동일하지만 에러 처리 강화)
    async login(req, res) {
        try {
            const { password } = req.body;
            
            if (!password) {
                return res.status(400).json({ error: '비밀번호가 필요합니다.' });
            }

            const settings = await this.db.collection('settings').findOne({ _id: 'adminSettings' });
            if (!settings) {
                return res.status(400).json({ error: '관리자 설정을 찾을 수 없습니다.' });
            }

            const result = await this.verifyPassword(password, settings);
            
            if (result.success) {
                req.session.isAdmin = true;
                req.session.loginTime = new Date();
                res.json({ success: true, message: '로그인 성공' });
            } else {
                res.status(401).json({ error: result.message, locked: result.locked });
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
        }
    }

    async logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: '로그아웃 실패' });
            }
            res.json({ success: true, message: '로그아웃 성공' });
        });
    }

    async verifyAuth(req, res) {
        res.json({ 
            isAuthenticated: !!(req.session && req.session.isAdmin),
            loginTime: req.session?.loginTime
        });
    }

    // 나머지 메서드들...
    async getEmployees(req, res) {
        try {
            const employees = await this.db.collection('faces').find({ isActive: true }).toArray();
            const sanitized = employees.map(emp => ({
                name: emp.name,
                employeeId: emp.employeeId,
                department: emp.department,
                position: emp.position,
                hourlyRate: emp.hourlyRate || 10000,
                registeredAt: emp.registeredAt
            }));
            res.json(sanitized);
        } catch (error) {
            console.error('직원 목록 조회 오류:', error);
            res.status(500).json({ error: '직원 목록 조회에 실패했습니다.' });
        }
    }

    // 데이터베이스 연결
    async connectDB() {
        try {
            if (!this.MONGO_URI) {
                throw new Error('MONGO_URI 환경변수가 설정되지 않았습니다.');
            }

            const client = new MongoClient(this.MONGO_URI);
            await client.connect();
            this.db = client.db(this.DB_NAME);
            console.log('✅ MongoDB 연결 성공');
            return true;
        } catch (error) {
            console.error('❌ MongoDB 연결 실패:', error.message);
            return false;
        }
    }

    // 서버 시작
    async start() {
        if (!(await this.connectDB())) {
            process.exit(1);
        }

        this.app.listen(this.PORT, '0.0.0.0', () => {
            console.log(`🚀 출퇴근 관리 API 서버가 포트 ${this.PORT}에서 실행 중입니다.`);
            console.log(`🌐 환경: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Health Check: http://localhost:${this.PORT}/health`);
        });

        // Graceful shutdown
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }

    async shutdown() {
        console.log('🛑 서버 종료 중...');
        if (this.db) {
            await this.db.client.close();
        }
        process.exit(0);
    }

    // 비밀번호 검증 (기존과 동일)
    async verifyPassword(inputPassword, settings) {
        // ... 기존 코드와 동일
        try {
            const isValid = await bcrypt.compare(inputPassword, settings.passwordHash);
            if (isValid) {
                await this.db.collection('settings').updateOne(
                    { _id: 'adminSettings' },
                    { $set: { failCount: 0, lockedUntil: null } }
                );
                return { success: true };
            }
            return { success: false, message: '비밀번호가 틀렸습니다.' };
        } catch (error) {
            console.error('비밀번호 검증 오류:', error);
            return { success: false, message: '검증 중 오류가 발생했습니다.' };
        }
    }
}

// 서버 실행
const server = new ProductionCommuteAPI();
server.start().catch(console.error);

module.exports = ProductionCommuteAPI;