const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('SESSION_SECRET exists:', !!process.env.SESSION_SECRET);

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 기본 라우트
app.get('/', (req, res) => {
    res.json({
        message: 'Unified Commute API - Simple Version',
        status: 'Running',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
        port: PORT
    });
});

// 헬스 체크
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: PORT,
            HAS_MONGO_URI: !!process.env.MONGO_URI
        }
    });
});

// 환경 변수 디버그 (개발용)
app.get('/debug/env', (req, res) => {
    const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        HAS_MONGO_URI: !!process.env.MONGO_URI,
        HAS_SESSION_SECRET: !!process.env.SESSION_SECRET,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    };
    res.json(envVars);
});

// MongoDB 연결 테스트
app.get('/test/db', async (req, res) => {
    try {
        if (!process.env.MONGO_URI) {
            return res.status(500).json({ 
                error: 'MONGO_URI environment variable not set' 
            });
        }

        const { MongoClient } = require('mongodb');
        const client = new MongoClient(process.env.MONGO_URI);
        
        await client.connect();
        await client.db().admin().ping();
        await client.close();
        
        res.json({ 
            message: 'MongoDB connection successful',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('MongoDB connection error:', error);
        res.status(500).json({ 
            error: 'MongoDB connection failed',
            message: error.message
        });
    }
});

// 404 처리
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl 
    });
});

// 에러 처리
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Simple API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Server started at: ${new Date().toISOString()}`);
    
    // 환경 변수 로깅
    console.log('\n=== Environment Variables ===');
    console.log('PORT:', PORT);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 'Not set');
    console.log('SESSION_SECRET length:', process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : 'Not set');
});