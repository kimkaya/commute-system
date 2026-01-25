// CommuteAdmin용 통합 API 클라이언트
const { CommuteAPIClient, CommuteUtils } = require('../unified-api/shared/commute-client');

class CommuteAdminAPI {
    constructor() {
        this.apiClient = new CommuteAPIClient('http://localhost:4000');
        this.isOnline = false;
        this.offlineData = {
            employees: [],
            records: [],
            settings: {}
        };
    }

    // ============ 온라인/오프라인 모드 관리 ============
    async checkConnection() {
        try {
            await this.apiClient.getHealth();
            this.isOnline = true;
            return true;
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }

    async syncData() {
        if (!this.isOnline) return false;
        
        try {
            // 서버에서 최신 데이터 가져오기
            const [employees, records, settings] = await Promise.all([
                this.apiClient.getEmployees(),
                this.apiClient.getRecords(),
                this.apiClient.getSettings()
            ]);

            this.offlineData = { employees, records, settings };
            return true;
        } catch (error) {
            console.error('데이터 동기화 실패:', error);
            return false;
        }
    }

    // ============ 인증 메서드 ============
    async login(password) {
        if (this.isOnline) {
            return await this.apiClient.login(password);
        } else {
            // 오프라인 모드: 로컬 검증 (기본 구현)
            return { success: password === 'offline', message: '오프라인 모드' };
        }
    }

    async logout() {
        if (this.isOnline) {
            return await this.apiClient.logout();
        }
        return { success: true };
    }

    async changePassword(currentPassword, newPassword) {
        if (!this.isOnline) {
            throw new Error('비밀번호 변경은 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.changePassword(currentPassword, newPassword);
    }

    // ============ 직원 관리 메서드 ============
    async getEmployees() {
        if (this.isOnline) {
            const employees = await this.apiClient.getEmployees();
            this.offlineData.employees = employees;
            return employees;
        }
        return this.offlineData.employees;
    }

    async createEmployee(employeeData) {
        if (!this.isOnline) {
            throw new Error('직원 등록은 온라인 모드에서만 가능합니다.');
        }
        
        const result = await this.apiClient.createEmployee(employeeData);
        if (result.success) {
            await this.syncData(); // 데이터 동기화
        }
        return result;
    }

    async updateEmployee(id, employeeData) {
        if (!this.isOnline) {
            throw new Error('직원 정보 수정은 온라인 모드에서만 가능합니다.');
        }
        
        const result = await this.apiClient.updateEmployee(id, employeeData);
        if (result.success) {
            await this.syncData();
        }
        return result;
    }

    async deleteEmployee(id) {
        if (!this.isOnline) {
            throw new Error('직원 삭제는 온라인 모드에서만 가능합니다.');
        }
        
        const result = await this.apiClient.deleteEmployee(id);
        if (result.success) {
            await this.syncData();
        }
        return result;
    }

    async resetEmployeePassword(id, newPassword) {
        if (!this.isOnline) {
            throw new Error('비밀번호 재설정은 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.resetEmployeePassword(id, newPassword);
    }

    async resetEmployeeDevices(id) {
        if (!this.isOnline) {
            throw new Error('기기 초기화는 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.resetEmployeeDevices(id);
    }

    // ============ 출퇴근 기록 메서드 ============
    async getRecords(filters = {}) {
        if (this.isOnline) {
            const records = await this.apiClient.getRecords(filters);
            this.offlineData.records = records;
            return records;
        }

        // 오프라인: 로컬 필터링
        let filteredRecords = this.offlineData.records;
        
        if (filters.startDate) {
            filteredRecords = filteredRecords.filter(r => r.date >= filters.startDate);
        }
        if (filters.endDate) {
            filteredRecords = filteredRecords.filter(r => r.date <= filters.endDate);
        }
        if (filters.employee) {
            filteredRecords = filteredRecords.filter(r => r.userName === filters.employee);
        }

        return filteredRecords;
    }

    async createRecord(recordData) {
        if (!this.isOnline) {
            throw new Error('출퇴근 기록 생성은 온라인 모드에서만 가능합니다.');
        }
        
        const result = await this.apiClient.createRecord(recordData);
        if (result.success) {
            await this.syncData();
        }
        return result;
    }

    async updateRecord(id, recordData) {
        if (!this.isOnline) {
            throw new Error('출퇴근 기록 수정은 온라인 모드에서만 가능합니다.');
        }
        
        const result = await this.apiClient.updateRecord(id, recordData);
        if (result.success) {
            await this.syncData();
        }
        return result;
    }

    async deleteRecord(id) {
        if (!this.isOnline) {
            throw new Error('출퇴근 기록 삭제는 온라인 모드에서만 가능합니다.');
        }
        
        const result = await this.apiClient.deleteRecord(id);
        if (result.success) {
            await this.syncData();
        }
        return result;
    }

    // ============ 급여 계산 메서드 ============
    async calculatePayroll(employeeName, month, options = {}) {
        if (!this.isOnline) {
            // 오프라인 급여 계산 (간소화)
            return this.calculatePayrollOffline(employeeName, month);
        }
        return await this.apiClient.calculatePayroll(employeeName, month, options);
    }

    async getPayrollData(month) {
        if (!this.isOnline) {
            throw new Error('급여 데이터 조회는 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.getPayrollData(month);
    }

    calculatePayrollOffline(employeeName, month) {
        // 간소화된 오프라인 급여 계산
        const employee = this.offlineData.employees.find(e => e.name === employeeName);
        if (!employee) {
            throw new Error('직원을 찾을 수 없습니다.');
        }

        const records = this.offlineData.records.filter(r => 
            r.userName === employeeName && r.date.startsWith(month)
        );

        let totalHours = 0;
        let overtimeHours = 0;

        records.forEach(record => {
            if (record.checkIn && record.checkOut) {
                const workMinutes = CommuteUtils.calculateWorkMinutes(record);
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
        const tax = grossPay * 0.1; // 간소화된 세금 계산
        const netPay = grossPay - tax;

        return {
            success: true,
            data: {
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
                calculatedAt: new Date(),
                mode: 'offline'
            }
        };
    }

    // ============ 컴플라이언스 체크 ============
    async checkCompliance(weekStart) {
        if (!this.isOnline) {
            throw new Error('컴플라이언스 체크는 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.checkCompliance(weekStart);
    }

    // ============ 백업 관리 ============
    async createBackup() {
        if (!this.isOnline) {
            throw new Error('백업 생성은 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.createBackup();
    }

    async getBackupList() {
        if (!this.isOnline) {
            throw new Error('백업 목록 조회는 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.getBackupList();
    }

    // ============ Excel 내보내기 ============
    async exportToExcel(records) {
        // Excel 내보내기는 로컬에서 처리 가능
        const XLSX = require('xlsx');
        
        const data = records.map(r => ({
            '날짜': r.date,
            '이름': r.userName,
            '출근': r.checkIn || '',
            '퇴근': r.checkOut || '',
            '휴식(분)': r.totalBreakMinutes || 0,
            '실근무(분)': CommuteUtils.calculateWorkMinutes(r)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '출퇴근기록');

        // 열 너비 설정
        ws['!cols'] = [
            { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }
        ];

        return { workbook: wb, success: true };
    }

    // ============ 설정 관리 ============
    async getSettings() {
        if (this.isOnline) {
            const settings = await this.apiClient.getSettings();
            this.offlineData.settings = settings;
            return settings;
        }
        return this.offlineData.settings;
    }

    async saveSettings(settings) {
        if (!this.isOnline) {
            throw new Error('설정 저장은 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.saveSettings(settings);
    }

    // ============ 스케줄 관리 ============
    async getEmployeeSchedule(employeeName) {
        if (this.isOnline) {
            return await this.apiClient.getEmployeeSchedule(employeeName);
        }

        const employee = this.offlineData.employees.find(e => e.name === employeeName);
        return employee ? { schedule: employee.schedule || [], contract: employee.contract || null } : null;
    }

    async saveEmployeeSchedule(employeeName, schedule) {
        if (!this.isOnline) {
            throw new Error('스케줄 저장은 온라인 모드에서만 가능합니다.');
        }
        return await this.apiClient.saveEmployeeSchedule(employeeName, schedule);
    }
}

module.exports = CommuteAdminAPI;