const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ============ 기존 호환성 유지 ============
  loadData: () => ipcRenderer.invoke('load-data'),
  saveRecord: (record) => ipcRenderer.invoke('save-record', record),
  deleteRecord: (date, userName) => ipcRenderer.invoke('delete-record', date, userName),
  loadFaces: () => ipcRenderer.invoke('load-faces'),
  saveFace: (user) => ipcRenderer.invoke('save-face', user),
  deleteFace: (name) => ipcRenderer.invoke('delete-face', name),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  verifyPassword: (password) => ipcRenderer.invoke('verify-password', password),
  changePassword: (currentPassword, newPassword) => ipcRenderer.invoke('change-password', currentPassword, newPassword),
  checkDbConnection: () => ipcRenderer.invoke('check-db-connection'),
  exportExcel: (records) => ipcRenderer.invoke('export-excel', records),
  resetEmployeePassword: (name, newPassword) => ipcRenderer.invoke('reset-employee-password', name, newPassword),
  resetEmployeeDevices: (name) => ipcRenderer.invoke('reset-employee-devices', name),

  // ============ 새로운 통합 API 메서드 ============
  // 연결 상태 관리
  checkApiConnection: () => ipcRenderer.invoke('check-api-connection'),
  syncData: () => ipcRenderer.invoke('sync-data'),
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),

  // 급여 계산
  calculatePayroll: (employeeName, month, options) => ipcRenderer.invoke('calculate-payroll', employeeName, month, options),
  getPayrollData: (month) => ipcRenderer.invoke('get-payroll-data', month),
  getEmployeePayroll: (month, employee) => ipcRenderer.invoke('get-employee-payroll', month, employee),

  // 컴플라이언스 체크
  checkCompliance: (weekStart) => ipcRenderer.invoke('check-compliance', weekStart),
  getComplianceReport: (weekStart) => ipcRenderer.invoke('get-compliance-report', weekStart),

  // 백업 관리
  createBackup: () => ipcRenderer.invoke('create-backup'),
  getBackupList: () => ipcRenderer.invoke('get-backup-list'),
  restoreBackup: (backupId) => ipcRenderer.invoke('restore-backup', backupId),

  // 스케줄 관리
  getEmployeeSchedule: (employeeName) => ipcRenderer.invoke('get-employee-schedule', employeeName),
  saveEmployeeSchedule: (employeeName, schedule) => ipcRenderer.invoke('save-employee-schedule', employeeName, schedule),

  // 향상된 직원 관리
  getEmployees: () => ipcRenderer.invoke('get-employees'),
  createEmployee: (employeeData) => ipcRenderer.invoke('create-employee', employeeData),
  updateEmployee: (id, employeeData) => ipcRenderer.invoke('update-employee', id, employeeData),
  deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),

  // 향상된 기록 관리
  getRecords: (filters) => ipcRenderer.invoke('get-records', filters),
  createRecord: (recordData) => ipcRenderer.invoke('create-record', recordData),
  updateRecord: (id, recordData) => ipcRenderer.invoke('update-record', id, recordData),

  // 설정 관리
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // 내보내기 기능
  exportPayrollToExcel: (month) => ipcRenderer.invoke('export-payroll-excel', month),

  // API 정보
  getApiInfo: () => ipcRenderer.invoke('get-api-info'),
  getApiHealth: () => ipcRenderer.invoke('get-api-health')
});
