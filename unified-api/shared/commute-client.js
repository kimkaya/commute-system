// 모든 플랫폼에서 사용할 수 있는 공통 유틸리티 클래스

class CommuteAPIClient {
    constructor(baseURL = 'http://localhost:4000', options = {}) {
        this.baseURL = baseURL;
        this.options = {
            timeout: 30000,
            retries: 3,
            ...options
        };
        this.isAuthenticated = false;
    }

    // ============ HTTP 요청 유틸리티 ============
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include', // 세션 쿠키 포함
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API 요청 실패 [${config.method} ${url}]:`, error.message);
            throw error;
        }
    }

    // ============ 인증 메서드 ============
    async login(password) {
        const result = await this.request('/api/auth/login', {
            method: 'POST',
            body: { password }
        });
        
        if (result.success) {
            this.isAuthenticated = true;
        }
        
        return result;
    }

    async logout() {
        const result = await this.request('/api/auth/logout', { method: 'POST' });
        this.isAuthenticated = false;
        return result;
    }

    async verifyAuth() {
        try {
            const result = await this.request('/api/auth/verify', { method: 'POST' });
            this.isAuthenticated = result.isAuthenticated;
            return result;
        } catch (error) {
            this.isAuthenticated = false;
            return { isAuthenticated: false };
        }
    }

    async changePassword(currentPassword, newPassword) {
        return await this.request('/api/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });
    }

    // ============ 직원 관리 메서드 ============
    async getEmployees() {
        return await this.request('/api/employees');
    }

    async createEmployee(employeeData) {
        return await this.request('/api/employees', {
            method: 'POST',
            body: employeeData
        });
    }

    async updateEmployee(id, employeeData) {
        return await this.request(`/api/employees/${id}`, {
            method: 'PUT',
            body: employeeData
        });
    }

    async deleteEmployee(id) {
        return await this.request(`/api/employees/${id}`, { method: 'DELETE' });
    }

    async resetEmployeePassword(id, newPassword) {
        return await this.request(`/api/employees/${id}/reset-password`, {
            method: 'POST',
            body: { newPassword }
        });
    }

    async resetEmployeeDevices(id) {
        return await this.request(`/api/employees/${id}/reset-devices`, {
            method: 'POST'
        });
    }

    // ============ 출퇴근 기록 메서드 ============
    async getRecords(filters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        
        const endpoint = `/api/records${params.toString() ? `?${params.toString()}` : ''}`;
        return await this.request(endpoint);
    }

    async createRecord(recordData) {
        return await this.request('/api/records', {
            method: 'POST',
            body: recordData
        });
    }

    async updateRecord(id, recordData) {
        return await this.request(`/api/records/${id}`, {
            method: 'PUT',
            body: recordData
        });
    }

    async deleteRecord(id) {
        return await this.request(`/api/records/${id}`, { method: 'DELETE' });
    }

    // ============ 얼굴 인식 메서드 ============
    async getFaces() {
        return await this.request('/api/faces');
    }

    async saveFace(faceData) {
        return await this.request('/api/faces', {
            method: 'POST',
            body: faceData
        });
    }

    async deleteFace(name) {
        return await this.request(`/api/faces/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
    }

    // ============ 급여 계산 메서드 ============
    async calculatePayroll(employeeName, month, options = {}) {
        return await this.request('/api/payroll/calculate', {
            method: 'POST',
            body: { employeeName, month, ...options }
        });
    }

    async getPayrollData(month) {
        return await this.request(`/api/payroll/${month}`);
    }

    async getEmployeePayroll(month, employee) {
        return await this.request(`/api/payroll/${month}/${encodeURIComponent(employee)}`);
    }

    // ============ 컴플라이언스 체크 메서드 ============
    async checkCompliance(weekStart) {
        return await this.request('/api/compliance/check', {
            method: 'POST',
            body: { weekStart }
        });
    }

    async getComplianceReport(weekStart) {
        return await this.request(`/api/compliance/report/${weekStart}`);
    }

    // ============ 백업 메서드 ============
    async createBackup() {
        return await this.request('/api/backup/create', { method: 'POST' });
    }

    async getBackupList() {
        return await this.request('/api/backup/list');
    }

    async restoreBackup(backupId) {
        return await this.request('/api/backup/restore', {
            method: 'POST',
            body: { backupId }
        });
    }

    // ============ 내보내기 메서드 ============
    async exportToExcel(records) {
        return await this.request('/api/export/excel', {
            method: 'POST',
            body: { records }
        });
    }

    async exportPayrollToExcel(month) {
        return await this.request('/api/export/payroll', {
            method: 'POST',
            body: { month }
        });
    }

    // ============ 설정 메서드 ============
    async getSettings() {
        return await this.request('/api/settings');
    }

    async saveSettings(settings) {
        return await this.request('/api/settings', {
            method: 'POST',
            body: settings
        });
    }

    // ============ 스케줄 메서드 ============
    async getEmployeeSchedule(employeeName) {
        return await this.request(`/api/schedules/${encodeURIComponent(employeeName)}`);
    }

    async saveEmployeeSchedule(employeeName, schedule) {
        return await this.request(`/api/schedules/${encodeURIComponent(employeeName)}`, {
            method: 'POST',
            body: schedule
        });
    }

    // ============ 상태 확인 메서드 ============
    async getHealth() {
        return await this.request('/api/health');
    }

    async getApiInfo() {
        return await this.request('/api/info');
    }
}

// ============ 공통 유틸리티 함수 ============
class CommuteUtils {
    static formatDate(date) {
        if (typeof date === 'string') date = new Date(date);
        return date.toISOString().split('T')[0];
    }

    static formatTime(time) {
        if (time instanceof Date) {
            return time.toTimeString().slice(0, 5);
        }
        return time;
    }

    static calculateWorkMinutes(record) {
        if (!record.checkIn || !record.checkOut) return 0;

        const [inH, inM] = record.checkIn.split(':').map(Number);
        const [outH, outM] = record.checkOut.split(':').map(Number);

        let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;

        return Math.max(0, totalMinutes - (record.totalBreakMinutes || 0));
    }

    static validatePassword(password) {
        const errors = [];
        
        if (!password || password.length < 8) {
            errors.push('비밀번호는 8자 이상이어야 합니다.');
        }
        
        if (!/[a-zA-Z]/.test(password)) {
            errors.push('비밀번호는 영문을 포함해야 합니다.');
        }
        
        if (!/[0-9]/.test(password)) {
            errors.push('비밀번호는 숫자를 포함해야 합니다.');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static sanitizeInput(str, maxLength = 100) {
        if (typeof str !== 'string') return '';
        return str.slice(0, maxLength).replace(/[<>\"\'&]/g, '');
    }

    static isValidDate(dateStr) {
        if (typeof dateStr !== 'string') return false;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) return false;
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date);
    }

    static isValidTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return true;
        const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(timeStr);
    }

    static formatCurrency(amount, currency = 'KRW') {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }
}

// ============ 상태 관리 클래스 ============
class CommuteState {
    constructor() {
        this.data = {
            user: null,
            employees: [],
            records: [],
            settings: {},
            isLoading: false,
            error: null
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    setState(updates) {
        this.data = { ...this.data, ...updates };
        this.listeners.forEach(listener => listener(this.data));
    }

    getState() {
        return this.data;
    }

    setLoading(loading) {
        this.setState({ isLoading: loading });
    }

    setError(error) {
        this.setState({ error });
    }

    clearError() {
        this.setState({ error: null });
    }

    setUser(user) {
        this.setState({ user });
    }

    setEmployees(employees) {
        this.setState({ employees });
    }

    setRecords(records) {
        this.setState({ records });
    }

    setSettings(settings) {
        this.setState({ settings });
    }
}

// Node.js 환경에서 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommuteAPIClient, CommuteUtils, CommuteState };
}

// 브라우저 환경에서 전역 객체로 설정
if (typeof window !== 'undefined') {
    window.CommuteAPIClient = CommuteAPIClient;
    window.CommuteUtils = CommuteUtils;
    window.CommuteState = CommuteState;
}