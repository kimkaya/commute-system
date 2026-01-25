const { CommuteAPIClient, CommuteUtils } = require('./shared/commute-client');
const DatabaseMigration = require('./migrate-database');

class IntegrationTest {
    constructor() {
        this.apiClient = new CommuteAPIClient('http://localhost:4000');
        this.testResults = [];
        this.failed = false;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} [${timestamp}] ${message}`);
    }

    async test(name, testFunction) {
        try {
            this.log(`Testing: ${name}`);
            const startTime = Date.now();
            await testFunction();
            const duration = Date.now() - startTime;
            this.log(`${name} passed (${duration}ms)`, 'success');
            this.testResults.push({ name, status: 'passed', duration });
        } catch (error) {
            this.log(`${name} failed: ${error.message}`, 'error');
            this.testResults.push({ name, status: 'failed', error: error.message });
            this.failed = true;
        }
    }

    async runTests() {
        this.log('🚀 통합 테스트 시작', 'info');
        this.log('=' .repeat(60));

        // 1. API 서버 연결 테스트
        await this.test('API 서버 연결', async () => {
            const health = await this.apiClient.getHealth();
            if (!health.status === 'ok') throw new Error('API 서버 상태 불량');
        });

        // 2. API 정보 조회 테스트
        await this.test('API 정보 조회', async () => {
            const info = await this.apiClient.getApiInfo();
            if (!info.name || !info.version) throw new Error('API 정보 불완전');
        });

        // 3. 인증 테스트
        await this.test('관리자 로그인', async () => {
            const result = await this.apiClient.login('admin1234');
            if (!result.success) throw new Error('로그인 실패');
        });

        // 4. 직원 관리 테스트
        await this.test('직원 목록 조회', async () => {
            const employees = await this.apiClient.getEmployees();
            if (!Array.isArray(employees)) throw new Error('직원 목록이 배열이 아님');
        });

        // 5. 테스트 직원 생성
        const testEmployee = {
            name: 'test_employee_' + Date.now(),
            hourlyRate: 12000,
            schedule: [{
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '18:00',
                isWorkDay: true,
                breakDuration: 60
            }]
        };

        await this.test('직원 생성', async () => {
            const result = await this.apiClient.createEmployee(testEmployee);
            if (!result.success) throw new Error('직원 생성 실패');
        });

        // 6. 출퇴근 기록 테스트
        const testRecord = {
            date: new Date().toISOString().split('T')[0],
            userName: testEmployee.name,
            checkIn: '09:00',
            checkOut: '18:00',
            totalBreakMinutes: 60
        };

        await this.test('출퇴근 기록 생성', async () => {
            const result = await this.apiClient.createRecord(testRecord);
            if (!result.success) throw new Error('기록 생성 실패');
        });

        // 7. 출퇴근 기록 조회
        await this.test('출퇴근 기록 조회', async () => {
            const records = await this.apiClient.getRecords({
                employee: testEmployee.name
            });
            if (!Array.isArray(records) || records.length === 0) {
                throw new Error('기록 조회 실패');
            }
        });

        // 8. 급여 계산 테스트
        await this.test('급여 계산', async () => {
            const month = new Date().toISOString().slice(0, 7);
            const result = await this.apiClient.calculatePayroll(testEmployee.name, month);
            if (!result.success || !result.data.netPay) throw new Error('급여 계산 실패');
        });

        // 9. 스케줄 관리 테스트
        await this.test('직원 스케줄 조회', async () => {
            const schedule = await this.apiClient.getEmployeeSchedule(testEmployee.name);
            if (!schedule) throw new Error('스케줄 조회 실패');
        });

        // 10. 백업 생성 테스트
        await this.test('백업 생성', async () => {
            const result = await this.apiClient.createBackup();
            if (!result.success) throw new Error('백업 생성 실패');
        });

        // 11. 컴플라이언스 체크 테스트
        await this.test('컴플라이언스 체크', async () => {
            const weekStart = new Date().toISOString().split('T')[0];
            const result = await this.apiClient.checkCompliance(weekStart);
            if (!result.success) throw new Error('컴플라이언스 체크 실패');
        });

        // 12. 유틸리티 함수 테스트
        await this.test('유틸리티 함수', async () => {
            const workMinutes = CommuteUtils.calculateWorkMinutes({
                checkIn: '09:00',
                checkOut: '18:00',
                totalBreakMinutes: 60
            });
            if (workMinutes !== 480) throw new Error('근무시간 계산 오류');

            const isValid = CommuteUtils.isValidDate('2025-01-25');
            if (!isValid) throw new Error('날짜 검증 오류');

            const formatted = CommuteUtils.formatCurrency(10000);
            if (!formatted.includes('10,000')) throw new Error('통화 포맷 오류');
        });

        // 정리 작업
        await this.test('테스트 데이터 정리', async () => {
            // 테스트로 생성한 직원 삭제
            await this.apiClient.deleteEmployee(testEmployee.name);
        });

        await this.test('로그아웃', async () => {
            const result = await this.apiClient.logout();
            if (!result.success) throw new Error('로그아웃 실패');
        });

        this.printResults();
    }

    printResults() {
        this.log('\n📊 테스트 결과 요약', 'info');
        this.log('=' .repeat(60));

        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        const total = this.testResults.length;

        console.log(`총 테스트: ${total}`);
        console.log(`성공: ${passed}`);
        console.log(`실패: ${failed}`);
        console.log(`성공률: ${Math.round((passed / total) * 100)}%`);

        if (failed > 0) {
            this.log('\n❌ 실패한 테스트:', 'error');
            this.testResults
                .filter(r => r.status === 'failed')
                .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
        }

        const avgDuration = this.testResults
            .filter(r => r.duration)
            .reduce((sum, r) => sum + r.duration, 0) / passed;

        if (avgDuration) {
            console.log(`\n평균 실행 시간: ${Math.round(avgDuration)}ms`);
        }

        if (this.failed) {
            this.log('\n💥 일부 테스트가 실패했습니다. 문제를 해결한 후 다시 실행해주세요.', 'error');
            process.exit(1);
        } else {
            this.log('\n🎉 모든 테스트가 성공했습니다!', 'success');
            process.exit(0);
        }
    }
}

// 플랫폼별 호환성 테스트
class PlatformCompatibilityTest {
    constructor() {
        this.platforms = [
            {
                name: 'Windows Admin App (Electron)',
                endpoint: 'http://localhost:4000',
                features: ['all']
            },
            {
                name: 'Mobile Web App (Capacitor)',
                endpoint: 'http://localhost:3000',
                features: ['essential', 'mobile_optimized']
            },
            {
                name: 'Web Admin App',
                endpoint: 'http://localhost:3002',
                features: ['essential', 'web_optimized']
            }
        ];
    }

    async testPlatformCompatibility() {
        console.log('\n🔄 플랫폼 호환성 테스트 시작');
        console.log('=' .repeat(60));

        for (const platform of this.platforms) {
            console.log(`\n🧪 ${platform.name} 테스트`);
            
            try {
                const response = await fetch(`${platform.endpoint}/api/health`);
                if (response.ok) {
                    console.log(`✅ ${platform.name}: 온라인`);
                } else {
                    console.log(`⚠️ ${platform.name}: 응답 오류 (${response.status})`);
                }
            } catch (error) {
                console.log(`❌ ${platform.name}: 연결 실패 (${error.message})`);
            }
        }
    }
}

// 메인 실행 함수
async function main() {
    console.log('🚀 출퇴근 관리 시스템 통합 테스트');
    console.log('=' .repeat(60));

    // 1. 데이터베이스 마이그레이션 테스트
    console.log('\n1️⃣ 데이터베이스 마이그레이션 테스트');
    try {
        const migration = new DatabaseMigration();
        if (await migration.connect()) {
            await migration.validateMigration();
            await migration.disconnect();
            console.log('✅ 데이터베이스 구조 검증 완료');
        }
    } catch (error) {
        console.log('❌ 데이터베이스 검증 실패:', error.message);
    }

    // 2. API 통합 테스트
    console.log('\n2️⃣ API 통합 테스트');
    const apiTest = new IntegrationTest();
    await apiTest.runTests();

    // 3. 플랫폼 호환성 테스트
    console.log('\n3️⃣ 플랫폼 호환성 테스트');
    const platformTest = new PlatformCompatibilityTest();
    await platformTest.testPlatformCompatibility();

    console.log('\n🎉 전체 통합 테스트 완료!');
}

// 스크립트 실행
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 통합 테스트 실행 중 오류:', error);
        process.exit(1);
    });
}

module.exports = { IntegrationTest, PlatformCompatibilityTest };