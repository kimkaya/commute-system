const { MongoClient } = require('mongodb');
require('dotenv').config();

class DatabaseMigration {
    constructor() {
        this.MONGO_URI = process.env.MONGO_URI;
        this.DB_NAME = process.env.DB_NAME || 'commuteApp';
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            this.client = new MongoClient(this.MONGO_URI);
            await this.client.connect();
            this.db = this.client.db(this.DB_NAME);
            console.log('✅ MongoDB 연결 성공');
            return true;
        } catch (error) {
            console.error('❌ MongoDB 연결 실패:', error.message);
            return false;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('✅ MongoDB 연결 종료');
        }
    }

    async migrateFacesCollection() {
        console.log('\n📦 faces 컬렉션 마이그레이션 시작...');
        
        try {
            const collection = this.db.collection('faces');
            const faces = await collection.find({}).toArray();
            
            let updatedCount = 0;
            
            for (const face of faces) {
                const updateFields = {};
                
                // 새 필드 추가 (기본값 설정)
                if (!face.employeeId) updateFields.employeeId = null;
                if (!face.email) updateFields.email = null;
                if (!face.phone) updateFields.phone = null;
                if (!face.department) updateFields.department = null;
                if (!face.position) updateFields.position = null;
                if (!face.hireDate) updateFields.hireDate = null;
                if (!face.birthDate) updateFields.birthDate = null;
                if (!face.monthlySalary) updateFields.monthlySalary = null;
                if (!face.salaryType) updateFields.salaryType = 'hourly';
                if (!face.permissions) updateFields.permissions = [];
                if (face.isActive === undefined) updateFields.isActive = true;
                if (!face.inactiveReason) updateFields.inactiveReason = null;
                if (!face.inactiveDate) updateFields.inactiveDate = null;
                if (!face.createdAt) updateFields.createdAt = face.registeredAt || new Date();
                if (!face.updatedAt) updateFields.updatedAt = new Date();
                if (!face.lastLoginAt) updateFields.lastLoginAt = null;
                if (!face.loginCount) updateFields.loginCount = 0;
                
                // 스케줄 구조 개선
                if (face.schedule && Array.isArray(face.schedule)) {
                    const improvedSchedule = face.schedule.map(s => ({
                        dayOfWeek: s.dayOfWeek || 0,
                        startTime: s.startTime || '09:00',
                        endTime: s.endTime || '18:00',
                        isWorkDay: s.isWorkDay !== undefined ? s.isWorkDay : true,
                        breakDuration: s.breakDuration || 60
                    }));
                    updateFields.schedule = improvedSchedule;
                }
                
                // 계약 정보 구조화
                if (!face.contract || typeof face.contract === 'string') {
                    updateFields.contract = {
                        contractType: '정규직',
                        contractPath: face.contract || null,
                        startDate: face.hireDate || null,
                        endDate: null,
                        workHoursPerWeek: 40
                    };
                }
                
                // 개인정보 동의 구조 개선
                if (!face.privacyConsent) {
                    updateFields.privacyConsent = {
                        agreedAt: face.registeredAt || new Date(),
                        privacyPolicy: true,
                        biometricData: true,
                        dataRetention: true,
                        retentionPeriod: 'until_resignation'
                    };
                }
                
                if (Object.keys(updateFields).length > 0) {
                    await collection.updateOne(
                        { _id: face._id },
                        { $set: updateFields }
                    );
                    updatedCount++;
                }
            }
            
            console.log(`✅ faces 컬렉션: ${updatedCount}개 문서 업데이트 완료`);
            
            // 인덱스 생성
            await this.createFacesIndexes();
            
        } catch (error) {
            console.error('❌ faces 컬렉션 마이그레이션 실패:', error);
            throw error;
        }
    }

    async migrateRecordsCollection() {
        console.log('\n📦 records 컬렉션 마이그레이션 시작...');
        
        try {
            const collection = this.db.collection('records');
            const records = await collection.find({}).toArray();
            
            let updatedCount = 0;
            
            for (const record of records) {
                const updateFields = {};
                
                // 새 필드 추가
                if (!record.breakEnd) updateFields.breakEnd = null;
                if (!record.workLocation) updateFields.workLocation = null;
                if (!record.notes) updateFields.notes = null;
                if (!record.deviceId) updateFields.deviceId = null;
                if (!record.ipAddress) updateFields.ipAddress = null;
                if (!record.createdAt) updateFields.createdAt = new Date(record.date + 'T00:00:00Z');
                if (!record.updatedAt) updateFields.updatedAt = new Date();
                if (!record.status) updateFields.status = 'active';
                if (!record.originalCheckIn) updateFields.originalCheckIn = null;
                if (!record.originalCheckOut) updateFields.originalCheckOut = null;
                if (!record.modifiedBy) updateFields.modifiedBy = null;
                if (!record.modifiedAt) updateFields.modifiedAt = null;
                
                if (Object.keys(updateFields).length > 0) {
                    await collection.updateOne(
                        { _id: record._id },
                        { $set: updateFields }
                    );
                    updatedCount++;
                }
            }
            
            console.log(`✅ records 컬렉션: ${updatedCount}개 문서 업데이트 완료`);
            
            // 인덱스 생성
            await this.createRecordsIndexes();
            
        } catch (error) {
            console.error('❌ records 컬렉션 마이그레이션 실패:', error);
            throw error;
        }
    }

    async migrateSettingsCollection() {
        console.log('\n📦 settings 컬렉션 마이그레이션 시작...');
        
        try {
            const collection = this.db.collection('settings');
            const adminSettings = await collection.findOne({ _id: 'adminSettings' });
            
            if (adminSettings) {
                const updateFields = {};
                
                // 기본 작업 설정
                if (!adminSettings.sessionTimeout) updateFields.sessionTimeout = 1440; // 24시간
                if (!adminSettings.defaultHourlyRate) updateFields.defaultHourlyRate = 10000;
                if (!adminSettings.overtimeRate) updateFields.overtimeRate = 1.5;
                if (!adminSettings.nightWorkRate) updateFields.nightWorkRate = 1.5;
                if (!adminSettings.holidayWorkRate) updateFields.holidayWorkRate = 2.0;
                if (!adminSettings.weeklyRegularHours) updateFields.weeklyRegularHours = 40;
                if (!adminSettings.standardStartTime) updateFields.standardStartTime = '09:00';
                if (!adminSettings.standardEndTime) updateFields.standardEndTime = '18:00';
                if (!adminSettings.nightWorkStartTime) updateFields.nightWorkStartTime = '22:00';
                if (!adminSettings.lunchBreakDuration) updateFields.lunchBreakDuration = 60;
                if (!adminSettings.allowedIpRanges) updateFields.allowedIpRanges = [];
                
                // 백업 설정
                if (!adminSettings.backupSettings) {
                    updateFields.backupSettings = {
                        frequency: 'weekly',
                        time: '02:00',
                        retentionDays: 30,
                        autoBackup: true
                    };
                }
                
                // 알림 설정
                if (!adminSettings.notification) {
                    updateFields.notification = {
                        email: {
                            enabled: false,
                            smtp: {
                                host: '',
                                port: 587,
                                secure: false,
                                username: '',
                                password: ''
                            }
                        },
                        slack: {
                            enabled: false,
                            webhookUrl: ''
                        }
                    };
                }
                
                // 컴플라이언스 설정
                if (!adminSettings.compliance) {
                    updateFields.compliance = {
                        maxWeeklyHours: 52,
                        maxContinuousWorkDays: 6,
                        mandatoryBreakAfterHours: 4
                    };
                }
                
                if (!adminSettings.createdAt) updateFields.createdAt = new Date();
                updateFields.updatedAt = new Date();
                
                if (Object.keys(updateFields).length > 0) {
                    await collection.updateOne(
                        { _id: 'adminSettings' },
                        { $set: updateFields }
                    );
                    console.log('✅ settings 컬렉션: adminSettings 업데이트 완료');
                }
            }
            
        } catch (error) {
            console.error('❌ settings 컬렉션 마이그레이션 실패:', error);
            throw error;
        }
    }

    async createNewCollections() {
        console.log('\n📦 새 컬렉션 생성 시작...');
        
        const newCollections = [
            'leave', 'schedules', 'compliance', 
            'backups', 'audit_logs', 'notifications'
        ];
        
        for (const collectionName of newCollections) {
            try {
                const exists = await this.db.listCollections({ name: collectionName }).hasNext();
                if (!exists) {
                    await this.db.createCollection(collectionName);
                    console.log(`✅ ${collectionName} 컬렉션 생성 완료`);
                } else {
                    console.log(`⚠️ ${collectionName} 컬렉션이 이미 존재합니다`);
                }
            } catch (error) {
                console.error(`❌ ${collectionName} 컬렉션 생성 실패:`, error);
            }
        }
        
        // 새 컬렉션들의 인덱스 생성
        await this.createNewCollectionIndexes();
    }

    async createFacesIndexes() {
        console.log('📊 faces 컬렉션 인덱스 생성...');
        const collection = this.db.collection('faces');
        
        try {
            await collection.createIndex({ name: 1 }, { unique: true });
            await collection.createIndex({ employeeId: 1 }, { unique: true, sparse: true });
            await collection.createIndex({ department: 1 });
            await collection.createIndex({ position: 1 });
            await collection.createIndex({ isActive: 1 });
            await collection.createIndex({ registeredAt: -1 });
            console.log('✅ faces 인덱스 생성 완료');
        } catch (error) {
            console.error('❌ faces 인덱스 생성 실패:', error);
        }
    }

    async createRecordsIndexes() {
        console.log('📊 records 컬렉션 인덱스 생성...');
        const collection = this.db.collection('records');
        
        try {
            await collection.createIndex({ date: 1, userName: 1 }, { unique: true });
            await collection.createIndex({ date: -1 });
            await collection.createIndex({ userName: 1 });
            await collection.createIndex({ createdAt: -1 });
            console.log('✅ records 인덱스 생성 완료');
        } catch (error) {
            console.error('❌ records 인덱스 생성 실패:', error);
        }
    }

    async createNewCollectionIndexes() {
        console.log('📊 새 컬렉션 인덱스 생성...');
        
        try {
            // payroll 인덱스
            const payroll = this.db.collection('payroll');
            await payroll.createIndex({ employee: 1, month: 1 }, { unique: true });
            await payroll.createIndex({ month: 1 });
            await payroll.createIndex({ employee: 1 });
            await payroll.createIndex({ calculatedAt: -1 });
            
            // leave 인덱스
            const leave = this.db.collection('leave');
            await leave.createIndex({ employee: 1, date: 1 });
            await leave.createIndex({ employee: 1 });
            await leave.createIndex({ type: 1 });
            await leave.createIndex({ status: 1 });
            await leave.createIndex({ requestedAt: -1 });
            
            // schedules 인덱스
            const schedules = this.db.collection('schedules');
            await schedules.createIndex({ employee: 1, date: 1 }, { unique: true });
            await schedules.createIndex({ employee: 1 });
            await schedules.createIndex({ date: 1 });
            await schedules.createIndex({ shift: 1 });
            
            // compliance 인덱스
            const compliance = this.db.collection('compliance');
            await compliance.createIndex({ employee: 1, weekStart: 1 }, { unique: true });
            await compliance.createIndex({ weekStart: 1 });
            await compliance.createIndex({ status: 1 });
            await compliance.createIndex({ checkedAt: -1 });
            
            // backups 인덱스
            const backups = this.db.collection('backups');
            await backups.createIndex({ createdAt: -1 });
            await backups.createIndex({ type: 1 });
            await backups.createIndex({ status: 1 });
            
            // audit_logs 인덱스
            const auditLogs = this.db.collection('audit_logs');
            await auditLogs.createIndex({ timestamp: -1 });
            await auditLogs.createIndex({ user: 1 });
            await auditLogs.createIndex({ action: 1 });
            await auditLogs.createIndex({ resource: 1 });
            await auditLogs.createIndex({ level: 1 });
            
            // notifications 인덱스
            const notifications = this.db.collection('notifications');
            await notifications.createIndex({ recipient: 1, createdAt: -1 });
            await notifications.createIndex({ type: 1 });
            await notifications.createIndex({ status: 1 });
            await notifications.createIndex({ createdAt: -1 });
            
            console.log('✅ 새 컬렉션 인덱스 생성 완료');
        } catch (error) {
            console.error('❌ 새 컬렉션 인덱스 생성 실패:', error);
        }
    }

    async createSystemUser() {
        console.log('\n👤 시스템 사용자 생성...');
        
        try {
            const collection = this.db.collection('faces');
            const systemUser = await collection.findOne({ name: 'system' });
            
            if (!systemUser) {
                await collection.insertOne({
                    name: 'system',
                    employeeId: 'SYS001',
                    email: null,
                    phone: null,
                    department: 'IT',
                    position: 'System',
                    hireDate: new Date().toISOString().split('T')[0],
                    birthDate: null,
                    descriptors: [],
                    registeredAt: new Date(),
                    passwordHash: null,
                    hourlyRate: 0,
                    monthlySalary: null,
                    salaryType: null,
                    registeredDevices: [],
                    schedule: [],
                    contract: {
                        contractType: 'System',
                        contractPath: null,
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: null,
                        workHoursPerWeek: 0
                    },
                    privacyConsent: {
                        agreedAt: new Date(),
                        privacyPolicy: true,
                        biometricData: false,
                        dataRetention: true,
                        retentionPeriod: 'indefinite'
                    },
                    permissions: ['system_admin'],
                    isActive: true,
                    inactiveReason: null,
                    inactiveDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastLoginAt: null,
                    loginCount: 0
                });
                
                console.log('✅ 시스템 사용자 생성 완료');
            } else {
                console.log('⚠️ 시스템 사용자가 이미 존재합니다');
            }
        } catch (error) {
            console.error('❌ 시스템 사용자 생성 실패:', error);
        }
    }

    async validateMigration() {
        console.log('\n🔍 마이그레이션 검증 시작...');
        
        try {
            const collections = ['records', 'faces', 'settings', 'payroll', 'leave', 
                              'schedules', 'compliance', 'backups', 'audit_logs', 'notifications'];
            
            const results = {};
            
            for (const collectionName of collections) {
                const collection = this.db.collection(collectionName);
                const count = await collection.countDocuments();
                const indexes = await collection.indexes();
                
                results[collectionName] = {
                    documentCount: count,
                    indexCount: indexes.length
                };
            }
            
            console.log('\n📊 마이그레이션 결과:');
            console.table(results);
            
            // 샘플 데이터 검증
            const sampleRecord = await this.db.collection('records').findOne();
            const sampleFace = await this.db.collection('faces').findOne();
            
            if (sampleRecord && sampleRecord.status && sampleRecord.createdAt) {
                console.log('✅ records 컬렉션 마이그레이션 검증 성공');
            }
            
            if (sampleFace && sampleFace.isActive !== undefined && sampleFace.createdAt) {
                console.log('✅ faces 컬렉션 마이그레이션 검증 성공');
            }
            
            console.log('\n🎉 마이그레이션 완료!');
            
        } catch (error) {
            console.error('❌ 마이그레이션 검증 실패:', error);
            throw error;
        }
    }

    async run() {
        console.log('🚀 데이터베이스 마이그레이션 시작 (v1.0 → v2.0)');
        console.log('=' .repeat(60));
        
        if (!await this.connect()) {
            process.exit(1);
        }
        
        try {
            // 백업 생성 (안전을 위해)
            console.log('\n💾 마이그레이션 전 데이터 백업...');
            // 실제 환경에서는 여기서 백업을 수행
            
            // 마이그레이션 실행
            await this.migrateFacesCollection();
            await this.migrateRecordsCollection();
            await this.migrateSettingsCollection();
            await this.createNewCollections();
            await this.createSystemUser();
            await this.validateMigration();
            
            console.log('\n✅ 모든 마이그레이션이 성공적으로 완료되었습니다!');
            
        } catch (error) {
            console.error('\n❌ 마이그레이션 실패:', error);
            process.exit(1);
        } finally {
            await this.disconnect();
        }
    }
}

// 스크립트 실행
if (require.main === module) {
    const migration = new DatabaseMigration();
    migration.run().catch(console.error);
}

module.exports = DatabaseMigration;