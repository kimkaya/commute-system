const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// 환경변수 로드 (개발/빌드 환경 모두 지원)
const isDev = !app.isPackaged;
if (isDev) {
  require('dotenv').config();
} else {
  require('dotenv').config({ path: path.join(process.resourcesPath, '.env') });
}

let mainWindow;
let db;

// MongoDB 연결 설정 (환경변수에서 로드)
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'commuteApp';

// 보안 설정
const SALT_ROUNDS = 10;
const MAX_FAIL_COUNT = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30분 잠금

// 환경변수 검증
if (!MONGO_URI) {
  console.error('경고: MONGO_URI 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

// 입력 검증 유틸리티
function sanitizeString(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>\"\'&]/g, '');
}

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

function isValidTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return true;
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
}

function validateRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('잘못된 레코드 형식');
  }
  if (!isValidDate(record.date)) {
    throw new Error('잘못된 날짜 형식');
  }
  if (!record.userName || typeof record.userName !== 'string') {
    throw new Error('사용자 이름이 필요합니다');
  }
  if (record.checkIn && !isValidTime(record.checkIn)) {
    throw new Error('잘못된 출근 시간 형식');
  }
  if (record.checkOut && !isValidTime(record.checkOut)) {
    throw new Error('잘못된 퇴근 시간 형식');
  }

  return {
    date: record.date,
    userName: sanitizeString(record.userName, 50),
    checkIn: record.checkIn || null,
    checkOut: record.checkOut || null,
    totalBreakMinutes: typeof record.totalBreakMinutes === 'number'
      ? Math.min(Math.max(0, record.totalBreakMinutes), 1440)
      : 0
  };
}

function validateName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('이름이 필요합니다');
  }
  return sanitizeString(name, 50);
}

// MongoDB 연결
async function connectDB() {
  if (!MONGO_URI) {
    console.error('MongoDB URI가 설정되지 않았습니다.');
    return false;
  }

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.ico')
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
}

// 출퇴근 데이터 로드
async function loadData() {
  try {
    const collection = db.collection('records');
    const records = await collection.find({}).sort({ date: -1, _id: -1 }).toArray();
    return { records };
  } catch (error) {
    console.error('데이터 로드 오류:', error.message);
    return { records: [] };
  }
}

// 출퇴근 데이터 저장 (단일 레코드 업서트)
async function saveRecord(record) {
  try {
    const validatedRecord = validateRecord(record);
    const collection = db.collection('records');
    await collection.updateOne(
      { date: validatedRecord.date, userName: validatedRecord.userName },
      { $set: validatedRecord },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('데이터 저장 오류:', error.message);
    return false;
  }
}

// 출퇴근 기록 삭제
async function deleteRecord(date, userName) {
  try {
    if (!isValidDate(date)) {
      throw new Error('잘못된 날짜 형식');
    }
    const validatedName = validateName(userName);
    const collection = db.collection('records');
    await collection.deleteOne({ date, userName: validatedName });
    return true;
  } catch (error) {
    console.error('기록 삭제 오류:', error.message);
    return false;
  }
}

// 얼굴 데이터 로드
async function loadFaces() {
  try {
    const collection = db.collection('faces');
    const users = await collection.find({}).toArray();
    return { users };
  } catch (error) {
    console.error('얼굴 데이터 로드 오류:', error.message);
    return { users: [] };
  }
}

// 얼굴 데이터 저장 (단일 사용자 업서트)
async function saveFace(user) {
  try {
    if (!user || typeof user !== 'object') {
      throw new Error('잘못된 사용자 형식');
    }
    const validatedName = validateName(user.name);
    const collection = db.collection('faces');
    await collection.updateOne(
      { name: validatedName },
      { $set: { ...user, name: validatedName } },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('얼굴 데이터 저장 오류:', error.message);
    return false;
  }
}

// 얼굴 데이터 삭제
async function deleteFace(name) {
  try {
    const validatedName = validateName(name);
    const collection = db.collection('faces');
    await collection.deleteOne({ name: validatedName });
    return true;
  } catch (error) {
    console.error('얼굴 삭제 오류:', error.message);
    return false;
  }
}

// 설정 로드 (bcrypt 해시 사용)
async function loadSettings() {
  try {
    const collection = db.collection('settings');
    const settings = await collection.findOne({ _id: 'adminSettings' });

    if (!settings) {
      // 초기 설정: 기본 비밀번호 'admin1234'를 해시하여 저장
      const defaultHash = await bcrypt.hash('admin1234', SALT_ROUNDS);
      const defaultSettings = {
        _id: 'adminSettings',
        passwordHash: defaultHash,
        failCount: 0,
        lockedUntil: null
      };
      await collection.insertOne(defaultSettings);
      return defaultSettings;
    }

    // 기존 평문 비밀번호가 있으면 해시로 마이그레이션
    if (settings.password && !settings.passwordHash) {
      const hash = await bcrypt.hash(settings.password, SALT_ROUNDS);
      await collection.updateOne(
        { _id: 'adminSettings' },
        {
          $set: { passwordHash: hash, lockedUntil: null },
          $unset: { password: '' }
        }
      );
      settings.passwordHash = hash;
      delete settings.password;
    }

    return settings;
  } catch (error) {
    console.error('설정 로드 오류:', error.message);
    return { passwordHash: null, failCount: 0, lockedUntil: null };
  }
}

// 비밀번호 검증 (bcrypt 사용)
async function verifyPassword(inputPassword, settings) {
  try {
    // 잠금 상태 확인
    if (settings.lockedUntil && new Date(settings.lockedUntil) > new Date()) {
      const remainingMs = new Date(settings.lockedUntil) - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return {
        success: false,
        locked: true,
        message: `계정이 잠겼습니다. ${remainingMin}분 후에 다시 시도하세요.`
      };
    }

    const isValid = await bcrypt.compare(inputPassword, settings.passwordHash);

    if (isValid) {
      // 로그인 성공: 실패 카운트 초기화
      await saveSettingsInternal({
        failCount: 0,
        lockedUntil: null
      });
      return { success: true };
    } else {
      // 로그인 실패
      const newFailCount = (settings.failCount || 0) + 1;
      const updateData = { failCount: newFailCount };

      if (newFailCount >= MAX_FAIL_COUNT) {
        // 5회 실패: 30분 잠금
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
        updateData.failCount = 0;
        await saveSettingsInternal(updateData);
        return {
          success: false,
          locked: true,
          message: `${MAX_FAIL_COUNT}회 실패! 30분간 계정이 잠깁니다.`
        };
      }

      await saveSettingsInternal(updateData);
      return {
        success: false,
        locked: false,
        failCount: newFailCount,
        message: `비밀번호가 틀렸습니다. (${newFailCount}/${MAX_FAIL_COUNT})`
      };
    }
  } catch (error) {
    console.error('비밀번호 검증 오류:', error.message);
    return { success: false, message: '검증 오류가 발생했습니다.' };
  }
}

// 비밀번호 변경 (bcrypt 사용)
async function changePassword(currentPassword, newPassword) {
  try {
    // 비밀번호 정책 검증
    if (!newPassword || newPassword.length < 8) {
      return { success: false, message: '새 비밀번호는 8자 이상이어야 합니다.' };
    }

    // 복잡도 검증: 영문, 숫자 포함
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return { success: false, message: '비밀번호는 영문과 숫자를 포함해야 합니다.' };
    }

    const settings = await loadSettings();

    // 현재 비밀번호 확인
    const isCurrentValid = await bcrypt.compare(currentPassword, settings.passwordHash);
    if (!isCurrentValid) {
      return { success: false, message: '현재 비밀번호가 틀렸습니다.' };
    }

    // 새 비밀번호 해시 저장
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await saveSettingsInternal({ passwordHash: newHash });

    return { success: true, message: '비밀번호가 변경되었습니다.' };
  } catch (error) {
    console.error('비밀번호 변경 오류:', error.message);
    return { success: false, message: '변경 중 오류가 발생했습니다.' };
  }
}

// 내부 설정 저장 (부분 업데이트)
async function saveSettingsInternal(data) {
  try {
    const collection = db.collection('settings');
    await collection.updateOne(
      { _id: 'adminSettings' },
      { $set: data },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('설정 저장 오류:', error.message);
    return false;
  }
}

// IPC 핸들러
ipcMain.handle('load-data', async () => {
  return await loadData();
});

ipcMain.handle('save-record', async (event, record) => {
  return await saveRecord(record);
});

ipcMain.handle('delete-record', async (event, date, userName) => {
  return await deleteRecord(date, userName);
});

ipcMain.handle('load-faces', async () => {
  return await loadFaces();
});

ipcMain.handle('save-face', async (event, user) => {
  return await saveFace(user);
});

ipcMain.handle('delete-face', async (event, name) => {
  return await deleteFace(name);
});

ipcMain.handle('load-settings', async () => {
  const settings = await loadSettings();
  // 해시는 클라이언트에 노출하지 않음
  return {
    failCount: settings.failCount || 0,
    lockedUntil: settings.lockedUntil || null
  };
});

ipcMain.handle('verify-password', async (event, password) => {
  const settings = await loadSettings();
  return await verifyPassword(password, settings);
});

ipcMain.handle('change-password', async (event, currentPassword, newPassword) => {
  return await changePassword(currentPassword, newPassword);
});

ipcMain.handle('check-db-connection', () => {
  return db !== undefined;
});

// 직원 비밀번호 재설정
ipcMain.handle('reset-employee-password', async (event, name, newPassword) => {
  try {
    if (!name || typeof name !== 'string') {
      return { success: false, message: '직원 이름이 필요합니다.' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: '비밀번호는 4자리 이상이어야 합니다.' };
    }

    const collection = db.collection('faces');
    const user = await collection.findOne({ name: validateName(name) });

    if (!user) {
      return { success: false, message: '직원을 찾을 수 없습니다.' };
    }

    // SHA256 해시 (Commute 앱과 동일한 방식)
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    await collection.updateOne(
      { name: validateName(name) },
      { $set: { passwordHash: passwordHash } }
    );

    return { success: true, message: '비밀번호가 재설정되었습니다.' };
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error.message);
    return { success: false, message: '오류가 발생했습니다.' };
  }
});

// 직원 등록 기기 초기화
ipcMain.handle('reset-employee-devices', async (event, name) => {
  try {
    if (!name || typeof name !== 'string') {
      return { success: false, message: '직원 이름이 필요합니다.' };
    }

    const collection = db.collection('faces');
    await collection.updateOne(
      { name: validateName(name) },
      { $set: { registeredDevices: [] } }
    );

    return { success: true, message: '등록된 기기가 초기화되었습니다.' };
  } catch (error) {
    console.error('기기 초기화 오류:', error.message);
    return { success: false, message: '오류가 발생했습니다.' };
  }
});

// 엑셀 저장
ipcMain.handle('export-excel', async (event, records) => {
  const XLSX = require('xlsx');

  const result = await dialog.showSaveDialog(mainWindow, {
    title: '엑셀로 저장',
    defaultPath: `출퇴근기록_${new Date().toISOString().split('T')[0]}.xlsx`,
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  });

  if (result.canceled) return { success: false };

  try {
    const data = records.map(r => ({
      '날짜': r.date,
      '이름': r.userName,
      '출근': r.checkIn || '',
      '퇴근': r.checkOut || '',
      '휴식(분)': r.totalBreakMinutes || 0,
      '실근무(분)': calculateWorkMinutes(r)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출퇴근기록');

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }
    ];

    XLSX.writeFile(wb, result.filePath);
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error('엑셀 저장 오류:', error.message);
    return { success: false, error: error.message };
  }
});

function calculateWorkMinutes(record) {
  if (!record.checkIn || !record.checkOut) return 0;

  const [inH, inM] = record.checkIn.split(':').map(Number);
  const [outH, outM] = record.checkOut.split(':').map(Number);

  let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  return Math.max(0, totalMinutes - (record.totalBreakMinutes || 0));
}

// 급여 계산 엔진

// 직원 개별 스케줄 및 계약 관리 핸들러
ipcMain.handle('get-employee-schedule', async (event, name) => {
        const user = await db.collection('faces').findOne({ name });
        if (!user) {
            return { success: false, message: '사용자를 찾을 수 없습니다.' };
        }
        return { success: true, schedule: user.schedule, contract: user.contract };
});

ipcMain.handle('set-employee-schedule', async (event, name, schedule, contractPath) => {
        const result = await db.collection('faces').updateOne(
            { name },
            { $set: { schedule, contract: contractPath } }
        );
        return { success: result.modifiedCount > 0 };
});

ipcMain.handle('open-contract', (event, contractPath) => {
    const contractWindow = new BrowserWindow({ width: 800, height: 600 });
    contractWindow.loadFile(contractPath);
});
class PayrollCalculator {
  constructor(settings = {}) {
    this.defaultHourlyRate = settings.defaultHourlyRate || 10000;
    this.overtimeRate = settings.overtimeRate || 1.5;
    this.nightWorkRate = settings.nightWorkRate || 1.5;
    this.holidayWorkRate = settings.holidayWorkRate || 2.0;
    this.weeklyRegularHours = settings.weeklyRegularHours || 40;
  }

  calculatePayroll(employee, workHours, allowances = {}, customDeductions = {}) {
    const hourlyRate = employee.hourlyRate || this.defaultHourlyRate;
    
    // 기본급 계산
    const basePay = workHours.regular * hourlyRate;
    
    // 수당 계산
    const overtimePay = workHours.overtime * hourlyRate * this.overtimeRate;
    const nightPay = workHours.night * hourlyRate * this.nightWorkRate;
    const holidayPay = workHours.holiday * hourlyRate * this.holidayWorkRate;
    
    // 추가 수당
    const bonusAmount = allowances.bonus || 0;
    const incentiveAmount = allowances.incentive || 0;
    const transportationAllowance = allowances.transportation || 0;
    const mealAllowance = allowances.meal || 0;
    const communicationAllowance = allowances.communication || 0;
    const qualificationAllowance = allowances.qualification || 0;
    
    const totalAllowances = bonusAmount + incentiveAmount + transportationAllowance + 
                           mealAllowance + communicationAllowance + qualificationAllowance;
    
    const grossPay = basePay + overtimePay + nightPay + holidayPay + totalAllowances;
    
    // 세금 및 공제 계산 (간소화된 버전)
    const incomeTax = this.calculateIncomeTax(grossPay);
    const nationalPension = this.calculateNationalPension(grossPay);
    const healthInsurance = this.calculateHealthInsurance(grossPay);
    const employmentInsurance = this.calculateEmploymentInsurance(grossPay);
    
    const statutoryDeductions = incomeTax + nationalPension + healthInsurance + employmentInsurance;
    const otherDeductions = (customDeductions.attendance || 0) + (customDeductions.other || 0);
    const totalDeductions = statutoryDeductions + otherDeductions;
    
    const netPay = grossPay - totalDeductions;
    
    return {
      employee: employee.name,
      month: new Date().toISOString().substring(0, 7),
      workHours: workHours,
      hourlyRate: hourlyRate,
      
      // 지급 항목
      basePay: basePay,
      overtimePay: overtimePay,
      nightPay: nightPay,
      holidayPay: holidayPay,
      allowances: {
        bonus: bonusAmount,
        incentive: incentiveAmount,
        transportation: transportationAllowance,
        meal: mealAllowance,
        communication: communicationAllowance,
        qualification: qualificationAllowance,
        total: totalAllowances
      },
      grossPay: grossPay,
      
      // 공제 항목
      deductions: {
        incomeTax: incomeTax,
        nationalPension: nationalPension,
        healthInsurance: healthInsurance,
        employmentInsurance: employmentInsurance,
        attendance: customDeductions.attendance || 0,
        other: customDeductions.other || 0,
        total: totalDeductions
      },
      
      netPay: netPay,
      
      createdAt: new Date(),
      calculatedBy: 'system'
    };
  }

  calculateIncomeTax(grossPay) {
    // 간소화된 소득세 계산 (실제로는 더 복잡한 계산이 필요)
    if (grossPay <= 1000000) return 0;
    if (grossPay <= 2000000) return grossPay * 0.06;
    if (grossPay <= 4600000) return grossPay * 0.15;
    return grossPay * 0.24;
  }

  calculateNationalPension(grossPay) {
    const maxBase = 5530000; // 2024년 기준
    const pensionBase = Math.min(grossPay, maxBase);
    return pensionBase * 0.045; // 4.5%
  }

  calculateHealthInsurance(grossPay) {
    return grossPay * 0.0335; // 3.35% (2024년 기준)
  }

  calculateEmploymentInsurance(grossPay) {
    return grossPay * 0.009; // 0.9% (근로자 부담분)
  }
}

// 근로기준법 컴플라이언스 체커
class ComplianceChecker {
  constructor(settings = {}) {
    this.weeklyLegalHours = settings.weeklyRegularHours || 40;
    this.maxWeeklyOvertime = 12; // 주 12시간 연장근무 한도
    this.maxMonthlyOvertime = 52; // 월 52시간 연장근무 한도
    this.maxContinuousWorkDays = 6; // 연속 근무일 한도
    this.standardStartTime = settings.standardStartTime || '09:00';
    this.standardEndTime = settings.standardEndTime || '18:00';
    this.nightWorkStartTime = settings.nightWorkStartTime || '22:00';
  }

  checkCompliance(records, employee) {
    const violations = [];
    const warnings = [];
    const info = [];
    
    // 주간 근로시간 체크
    const weeklyStats = this.calculateWeeklyStats(records, employee);
    if (weeklyStats.totalHours > this.weeklyLegalHours + this.maxWeeklyOvertime) {
      violations.push(`${employee}: 주간 근로시간 ${weeklyStats.totalHours}시간 (한도: ${this.weeklyLegalHours + this.maxWeeklyOvertime}시간)`);
    } else if (weeklyStats.totalHours > this.weeklyLegalHours) {
      warnings.push(`${employee}: 주간 연장근무 ${weeklyStats.overtimeHours}시간`);
    }
    
    // 연속 근무일 체크
    const continuousDays = this.calculateContinuousWorkDays(records, employee);
    if (continuousDays > this.maxContinuousWorkDays) {
      violations.push(`${employee}: 연속 근무일 ${continuousDays}일 (한도: ${this.maxContinuousWorkDays}일)`);
    }
    
    // 야간근무 체크
    const nightWorkDays = this.calculateNightWorkDays(records, employee);
    if (nightWorkDays > 0) {
      info.push(`${employee}: 야간근무 ${nightWorkDays}일`);
    }
    
    return {
      employee: employee,
      weeklyHours: weeklyStats.totalHours,
      weeklyOvertime: weeklyStats.overtimeHours,
      continuousWorkDays: continuousDays,
      nightWorkDays: nightWorkDays,
      status: violations.length > 0 ? 'violation' : (warnings.length > 0 ? 'warning' : 'good'),
      violations: violations,
      warnings: warnings,
      info: info
    };
  }

  calculateWeeklyStats(records, employee) {
    // 주간 근무시간 계산 로직
    const weeklyRecords = records.filter(r => r.userName === employee);
    let totalHours = 0;
    let overtimeHours = 0;
    
    weeklyRecords.forEach(record => {
      if (record.checkIn && record.checkOut) {
        const workMinutes = calculateWorkMinutes(record);
        const dailyHours = workMinutes / 60;
        totalHours += dailyHours;
        
        // 8시간 초과 시 연장근무
        if (dailyHours > 8) {
          overtimeHours += (dailyHours - 8);
        }
      }
    });
    
    return { totalHours, overtimeHours };
  }

  calculateContinuousWorkDays(records, employee) {
    const employeeRecords = records.filter(r => r.userName === employee && r.checkIn && r.checkOut);
    // 연속 근무일 계산 로직 구현
    return employeeRecords.length; // 임시 구현
  }

  calculateNightWorkDays(records, employee) {
    const employeeRecords = records.filter(r => r.userName === employee && r.checkOut);
    let nightWorkDays = 0;
    
    employeeRecords.forEach(record => {
      if (record.checkOut && record.checkOut >= this.nightWorkStartTime) {
        nightWorkDays++;
      }
    });
    
    return nightWorkDays;
  }
}

// 자동 백업 시스템
class BackupManager {
  constructor() {
    this.backupPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'commute-backups');
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    const fs = require('fs');
if (fs.existsSync(this.backupPath)) {
            if (!fs.lstatSync(this.backupPath).isDirectory()) {
                console.error('구체적 경로 확인:', this.backupPath);
                throw new Error(`${this.backupPath} 경로에 파일이 있어 디렉토리를 생성할 수 없습니다.`);
            }
        } else {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_${timestamp}.json`;
      const backupFilePath = path.join(this.backupPath, backupFileName);
      
      // 모든 컬렉션 백업
      const backupData = {
        timestamp: new Date().toISOString(),
        records: await db.collection('records').find({}).toArray(),
        faces: await db.collection('faces').find({}).toArray(),
        settings: await db.collection('settings').find({}).toArray(),
        payroll: await db.collection('payroll').find({}).toArray(),
        leave: await db.collection('leave').find({}).toArray(),
        metadata: {
          version: '1.0',
          totalRecords: await db.collection('records').countDocuments(),
          totalEmployees: await db.collection('faces').countDocuments()
        }
      };
      
      // 개인정보는 암호화하여 저장
      const encryptedData = this.encryptSensitiveData(backupData);
      
      const fs = require('fs').promises;
      await fs.writeFile(backupFilePath, JSON.stringify(encryptedData, null, 2));
      
      console.log(`백업 완료: ${backupFilePath}`);
      return { success: true, filePath: backupFilePath, fileName: backupFileName };
    } catch (error) {
      console.error('백업 실패:', error);
      return { success: false, error: error.message };
    }
  }

  encryptSensitiveData(data) {
    // 실제 환경에서는 강력한 암호화 적용
    // 여기서는 간단한 처리만 구현
    const sensitiveFields = ['descriptors', 'passwordHash'];
    
    // faces 컬렉션의 민감한 데이터 마스킹
    if (data.faces) {
      data.faces = data.faces.map(face => ({
        ...face,
        descriptors: face.descriptors ? '[ENCRYPTED]' : null,
        passwordHash: face.passwordHash ? '[ENCRYPTED]' : null
      }));
    }
    
    return data;
  }

  async getBackupList() {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.backupPath);
      const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      const backupInfo = await Promise.all(
        backupFiles.map(async (fileName) => {
          const filePath = path.join(this.backupPath, fileName);
          const stats = await fs.stat(filePath);
          
          return {
            fileName: fileName,
            filePath: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
      );
      
      return backupInfo.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('백업 목록 조회 실패:', error);
      return [];
    }
  }

  async scheduleBackup(frequency, time) {
    // 자동 백업 스케줄링 (실제로는 cron job이나 스케줄러 사용)
    console.log(`백업 스케줄 설정: ${frequency}, ${time}`);
    return { success: true, message: '백업 스케줄이 설정되었습니다.' };
  }
}

const backupManager = new BackupManager();

// 급여 계산
ipcMain.handle('calculate-payroll', async (event, employeeName, month, allowances, customDeductions) => {
  try {
    const settings = await loadSettings();
    const calculator = new PayrollCalculator(settings);
    
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
    
    // 근무시간 계산
    let regularHours = 0, overtimeHours = 0, nightHours = 0, holidayHours = 0;
    
    records.forEach(record => {
      if (record.checkIn && record.checkOut) {
        const workMinutes = calculateWorkMinutes(record);
        const dailyHours = workMinutes / 60;
        
        // 8시간까지는 정규시간, 초과는 연장시간
        if (dailyHours <= 8) {
          regularHours += dailyHours;
        } else {
          regularHours += 8;
          overtimeHours += (dailyHours - 8);
        }
        
        // 야간근무 시간 계산 (간소화)
        if (record.checkOut && record.checkOut >= '22:00') {
          nightHours += 1; // 임시 계산
        }
      }
    });
    
    const employee = { name: employeeName, hourlyRate: settings.defaultHourlyRate };
    const workHours = { regular: regularHours, overtime: overtimeHours, night: nightHours, holiday: holidayHours };
    
    const payrollData = calculator.calculatePayroll(employee, workHours, allowances, customDeductions);
    
    // 급여 데이터 저장
    await db.collection('payroll').updateOne(
      { employee: employeeName, month: month },
      { $set: payrollData },
      { upsert: true }
    );
    
    return { success: true, data: payrollData };
  } catch (error) {
    console.error('급여 계산 오류:', error);
    return { success: false, error: error.message };
  }
});

// 급여 데이터 조회
ipcMain.handle('get-payroll-data', async (event, month, employeeName = null) => {
  try {
    const query = { month: month };
    if (employeeName) {
      query.employee = employeeName;
    }
    
    const payrollData = await db.collection('payroll').find(query).toArray();
    return { success: true, data: payrollData };
  } catch (error) {
    console.error('급여 데이터 조회 오류:', error);
    return { success: false, error: error.message };
  }
});

// 근로기준법 컴플라이언스 체크
ipcMain.handle('check-compliance', async (event, weekStart) => {
  try {
    const settings = await loadSettings();
    const checker = new ComplianceChecker(settings);
    
    // 주간 기록 조회
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const records = await db.collection('records').find({
      date: { 
        $gte: weekStart, 
        $lte: weekEnd.toISOString().split('T')[0] 
      }
    }).toArray();
    
    // 모든 직원에 대해 컴플라이언스 체크
    const employees = [...new Set(records.map(r => r.userName))];
    const complianceResults = employees.map(employee => 
      checker.checkCompliance(records, employee)
    );
    
    return { success: true, data: complianceResults };
  } catch (error) {
    console.error('컴플라이언스 체크 오류:', error);
    return { success: false, error: error.message };
  }
});

// 근무 설정 저장
ipcMain.handle('save-work-settings', async (event, settings) => {
  try {
    await saveSettingsInternal(settings);
    return { success: true, message: '근무 설정이 저장되었습니다.' };
  } catch (error) {
    console.error('근무 설정 저장 오류:', error);
    return { success: false, error: error.message };
  }
});

// 백업 실행
ipcMain.handle('create-backup', async () => {
  return await backupManager.createBackup();
});

// 백업 목록 조회
ipcMain.handle('get-backup-list', async () => {
  return await backupManager.getBackupList();
});

// 백업 설정 저장
ipcMain.handle('save-backup-settings', async (event, settings) => {
  try {
    await saveSettingsInternal({ backupSettings: settings });
    await backupManager.scheduleBackup(settings.frequency, settings.time);
    return { success: true, message: '백업 설정이 저장되었습니다.' };
  } catch (error) {
    console.error('백업 설정 저장 오류:', error);
    return { success: false, error: error.message };
  }
});

// 직원 시급 설정
ipcMain.handle('set-employee-hourly-rate', async (event, employeeName, hourlyRate) => {
  try {
    await db.collection('faces').updateOne(
      { name: employeeName },
      { $set: { hourlyRate: hourlyRate } }
    );
    return { success: true, message: '시급이 설정되었습니다.' };
  } catch (error) {
    console.error('시급 설정 오류:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  await connectDB();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
