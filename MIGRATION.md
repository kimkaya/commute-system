# 📦 MongoDB에서 Supabase로 마이그레이션 가이드

기존 MongoDB 기반 출퇴근 관리 시스템을 Supabase (PostgreSQL)로 마이그레이션하는 완전한 가이드입니다.

## 📋 목차

1. [마이그레이션 개요](#마이그레이션-개요)
2. [사전 준비](#사전-준비)
3. [데이터 내보내기 (Export)](#데이터-내보내기-export)
4. [Supabase 설정](#supabase-설정)
5. [데이터 가져오기 (Import)](#데이터-가져오기-import)
6. [데이터 검증](#데이터-검증)
7. [클라이언트 앱 업데이트](#클라이언트-앱-업데이트)
8. [문제 해결](#문제-해결)

## 🎯 마이그레이션 개요

### 왜 Supabase로 마이그레이션하나요?

| 항목 | MongoDB (기존) | Supabase (신규) |
|------|----------------|-----------------|
| **비용** | 서버 운영 비용 발생 | 무료 티어 (500MB) |
| **관리** | 직접 서버 관리 필요 | 완전 관리형 서비스 |
| **백업** | 수동 백업 설정 | 자동 백업 제공 |
| **보안** | 수동 보안 설정 | RLS 기본 제공 |
| **확장성** | 제한적 | 쉬운 스케일업 |
| **실시간** | 별도 구현 필요 | 내장 Realtime |

### 마이그레이션 전략

- **단계적 마이그레이션**: 데이터를 순차적으로 이전
- **병렬 운영**: 일정 기간 두 시스템 동시 운영 후 전환
- **롤백 계획**: 문제 발생 시 MongoDB로 복귀 가능

## 📝 사전 준비

### 1. 필수 도구 설치

```bash
# Node.js 설치 확인
node --version  # v18.0 이상 필요

# Supabase CLI 설치
npm install -g supabase

# PostgreSQL 클라이언트 설치 (선택사항)
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# https://www.postgresql.org/download/windows/
```

### 2. 현재 데이터 백업

⚠️ **중요**: 마이그레이션 전에 반드시 전체 데이터를 백업하세요!

```bash
# MongoDB 전체 백업
mongodump --uri="mongodb://localhost:27017/commuteApp" --out=/backup/mongodb-backup-$(date +%Y%m%d)

# 백업 확인
ls -lh /backup/mongodb-backup-*
```

### 3. 데이터 현황 파악

```bash
# MongoDB 콜렉션 및 문서 수 확인
mongo commuteApp --eval "db.stats()"
mongo commuteApp --eval "db.employees.count()"
mongo commuteApp --eval "db.attendance.count()"
mongo commuteApp --eval "db.leaves.count()"
mongo commuteApp --eval "db.payroll.count()"
```

## 📤 데이터 내보내기 (Export)

### 1. 마이그레이션 스크립트 생성

`migrate-to-supabase.js` 파일을 생성합니다:

```javascript
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB 연결
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'commuteApp';

// 출력 디렉토리
const OUTPUT_DIR = './migration-data';

async function exportData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(DB_NAME);
    
    // 출력 디렉토리 생성
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }
    
    // 컬렉션 목록
    const collections = [
      'employees',
      'faces',  // face_embeddings로 변환될 예정
      'records', // attendance로 변환될 예정
      'leave',
      'payroll',
      'settings'
    ];
    
    for (const collectionName of collections) {
      console.log(`\n📦 ${collectionName} 내보내기 중...`);
      
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      console.log(`   총 ${documents.length}개 문서 발견`);
      
      // JSON 파일로 저장
      const outputPath = path.join(OUTPUT_DIR, `${collectionName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(documents, null, 2));
      
      console.log(`   ✅ ${outputPath}에 저장됨`);
    }
    
    console.log('\n🎉 모든 데이터 내보내기 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
  }
}

exportData();
```

### 2. 스크립트 실행

```bash
# 의존성 설치
npm install mongodb

# 마이그레이션 스크립트 실행
node migrate-to-supabase.js

# 출력 확인
ls -lh migration-data/
```

## 🔧 Supabase 설정

### 1. Supabase 프로젝트 생성

**옵션 A: 클라우드 (프로덕션 권장)**

1. [Supabase](https://supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `commute-system`
   - Database Password: 강력한 비밀번호 생성
   - Region: 가까운 지역 선택 (예: Northeast Asia - Seoul)
4. "Create new project" 클릭
5. 프로젝트 URL과 API 키 복사

**옵션 B: 로컬 (개발/테스트용)**

```bash
cd cloud-api

# Supabase 초기화
supabase init

# 로컬 환경 시작
supabase start

# 출력된 정보 기록:
# - API URL
# - anon key
# - service_role key
```

### 2. 환경 변수 설정

```bash
cd cloud-api

# .env 파일 생성
cp .env.example .env

# .env 파일 편집
nano .env
```

`.env` 파일 내용:

```env
# Supabase 클라우드
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 또는 로컬
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 데이터베이스 스키마 생성

```bash
# 마이그레이션 실행
supabase db reset

# 또는 클라우드에 배포
supabase db push
```

## 📥 데이터 가져오기 (Import)

### 1. 데이터 변환 스크립트 생성

`import-to-supabase.js` 파일을 생성합니다:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 연결
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_DIR = './migration-data';

// MongoDB ObjectId를 UUID로 변환하는 맵
const idMap = new Map();

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function importData() {
  try {
    console.log('🚀 Supabase로 데이터 가져오기 시작\n');
    
    // 1. 직원 데이터 가져오기
    console.log('📦 직원 데이터 가져오기...');
    const employeesData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'employees.json'), 'utf8')
    );
    
    for (const emp of employeesData) {
      const newId = generateUUID();
      idMap.set(emp._id.toString(), newId);
      
      const { data, error } = await supabase
        .from('employees')
        .insert({
          id: newId,
          employee_number: emp.employeeNumber,
          name: emp.name,
          email: emp.email,
          department: emp.department,
          position: emp.position,
          phone: emp.phone,
          hire_date: emp.hireDate,
          role: emp.role || 'EMPLOYEE',
          status: emp.status || 'ACTIVE',
          password_hash: emp.password,
          created_at: emp.createdAt,
          updated_at: emp.updatedAt || emp.createdAt
        });
      
      if (error) {
        console.error(`   ❌ 오류: ${emp.name}`, error);
      } else {
        console.log(`   ✅ ${emp.name} 추가됨`);
      }
    }
    
    // 2. 얼굴 임베딩 데이터 가져오기
    console.log('\n📦 얼굴 데이터 가져오기...');
    const facesData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'faces.json'), 'utf8')
    );
    
    for (const face of facesData) {
      const employeeId = idMap.get(face.employeeId?.toString());
      
      if (!employeeId) {
        console.log(`   ⚠️  직원을 찾을 수 없음: ${face.employeeId}`);
        continue;
      }
      
      const { error } = await supabase
        .from('face_embeddings')
        .insert({
          employee_id: employeeId,
          embedding: face.embedding,
          image_url: face.imageUrl,
          is_primary: face.isPrimary || false,
          created_at: face.createdAt
        });
      
      if (error) {
        console.error(`   ❌ 오류:`, error);
      } else {
        console.log(`   ✅ 얼굴 데이터 추가됨`);
      }
    }
    
    // 3. 출퇴근 기록 가져오기
    console.log('\n📦 출퇴근 기록 가져오기...');
    const recordsData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'records.json'), 'utf8')
    );
    
    for (const record of recordsData) {
      const employeeId = idMap.get(record.employeeId?.toString());
      
      if (!employeeId) {
        console.log(`   ⚠️  직원을 찾을 수 없음: ${record.employeeId}`);
        continue;
      }
      
      const { error } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          date: record.date,
          check_in: record.checkIn,
          check_out: record.checkOut,
          check_in_device: record.checkInDevice,
          check_out_device: record.checkOutDevice,
          total_break_minutes: record.totalBreakMinutes || 0,
          work_minutes: record.workMinutes,
          status: record.status,
          note: record.note,
          created_at: record.createdAt
        });
      
      if (error) {
        console.error(`   ❌ 오류:`, error);
      } else {
        console.log(`   ✅ 출퇴근 기록 추가됨: ${record.date}`);
      }
    }
    
    // 4. 휴가 데이터 가져오기
    console.log('\n📦 휴가 데이터 가져오기...');
    const leaveData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'leave.json'), 'utf8')
    );
    
    for (const leave of leaveData) {
      const employeeId = idMap.get(leave.employeeId?.toString());
      const approvedBy = leave.approvedBy ? idMap.get(leave.approvedBy.toString()) : null;
      
      if (!employeeId) continue;
      
      const { error } = await supabase
        .from('leaves')
        .insert({
          employee_id: employeeId,
          type: leave.type,
          start_date: leave.startDate,
          end_date: leave.endDate,
          days: leave.days,
          reason: leave.reason,
          status: leave.status || 'PENDING',
          approved_by: approvedBy,
          approved_at: leave.approvedAt,
          created_at: leave.createdAt
        });
      
      if (error) {
        console.error(`   ❌ 오류:`, error);
      } else {
        console.log(`   ✅ 휴가 데이터 추가됨`);
      }
    }
    
    // 5. 급여 데이터 가져오기
    console.log('\n📦 급여 데이터 가져오기...');
    const payrollData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'payroll.json'), 'utf8')
    );
    
    for (const pay of payrollData) {
      const employeeId = idMap.get(pay.employeeId?.toString());
      
      if (!employeeId) continue;
      
      const { error } = await supabase
        .from('payroll')
        .insert({
          employee_id: employeeId,
          year_month: pay.yearMonth,
          base_salary: pay.baseSalary,
          overtime_pay: pay.overtimePay || 0,
          deductions: pay.deductions || 0,
          net_salary: pay.netSalary,
          work_days: pay.workDays,
          total_work_hours: pay.totalWorkHours,
          created_at: pay.createdAt
        });
      
      if (error) {
        console.error(`   ❌ 오류:`, error);
      } else {
        console.log(`   ✅ 급여 데이터 추가됨: ${pay.yearMonth}`);
      }
    }
    
    console.log('\n🎉 모든 데이터 가져오기 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

importData();
```

### 2. 데이터 가져오기 실행

```bash
# 의존성 설치
cd cloud-api
npm install

# 환경 변수 로드
source .env

# 가져오기 스크립트 실행
node ../import-to-supabase.js
```

## ✅ 데이터 검증

### 1. 데이터 수 확인

```sql
-- Supabase Studio (http://localhost:54323) 또는 SQL Editor에서 실행

-- 직원 수
SELECT COUNT(*) FROM employees;

-- 출퇴근 기록 수
SELECT COUNT(*) FROM attendance;

-- 휴가 수
SELECT COUNT(*) FROM leaves;

-- 급여 기록 수
SELECT COUNT(*) FROM payroll;
```

### 2. 샘플 데이터 확인

```sql
-- 직원 샘플
SELECT * FROM employees LIMIT 5;

-- 최근 출퇴근 기록
SELECT 
  a.*,
  e.name,
  e.department
FROM attendance a
JOIN employees e ON a.employee_id = e.id
ORDER BY a.date DESC
LIMIT 10;
```

### 3. 자동 검증 스크립트

```bash
# verify-migration.js 생성 후 실행
node verify-migration.js
```

## 🔄 클라이언트 앱 업데이트

### 1. API 엔드포인트 변경

기존 앱들을 Supabase API로 전환합니다:

```javascript
// 기존 (MongoDB API)
const API_URL = 'http://localhost:4000';

// 새로운 (Supabase)
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 2. API 호출 변경

```javascript
// 기존 (fetch API)
const response = await fetch(`${API_URL}/api/employees`);
const employees = await response.json();

// 새로운 (Supabase)
const { data: employees, error } = await supabase
  .from('employees')
  .select('*');
```

### 3. 인증 변경

```javascript
// 기존
const response = await fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ employeeNumber, password })
});

// 새로운
const { data, error } = await supabase.auth.signInWithPassword({
  email: `${employeeNumber}@commute.local`,
  password: password
});
```

## 🐛 문제 해결

### 일반적인 오류

#### 1. "Cannot connect to Supabase"

```bash
# Supabase 상태 확인
supabase status

# 재시작
supabase stop
supabase start
```

#### 2. "Permission denied" (RLS 오류)

```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'employees';

-- 임시로 RLS 비활성화 (개발 중에만!)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
```

#### 3. 데이터 타입 불일치

```javascript
// MongoDB의 ObjectId를 UUID로 변환
const uuid = generateUUID(); // 또는 crypto.randomUUID()
```

### 롤백 절차

문제가 발생하면 MongoDB로 복귀:

```bash
# 1. Supabase 중지
supabase stop

# 2. MongoDB 백업 복원
mongorestore --uri="mongodb://localhost:27017" /backup/mongodb-backup-YYYYMMDD

# 3. 기존 API 서버 재시작
cd unified-api
node server.js
```

## 📈 마이그레이션 후 작업

### 1. 성능 모니터링

- Supabase Dashboard에서 쿼리 성능 확인
- 느린 쿼리 식별 및 인덱스 추가

### 2. 백업 설정

```bash
# Supabase 자동 백업은 기본 활성화
# 추가 백업이 필요한 경우:
supabase db dump -f backup.sql
```

### 3. 문서 업데이트

- API 문서 업데이트
- 팀원에게 새로운 시스템 교육
- README 및 가이드 업데이트

## 🎯 체크리스트

마이그레이션 완료 전 확인사항:

- [ ] MongoDB 전체 백업 완료
- [ ] Supabase 프로젝트 생성 및 설정
- [ ] 데이터베이스 스키마 생성 완료
- [ ] 모든 데이터 가져오기 완료
- [ ] 데이터 수 검증 완료
- [ ] 샘플 데이터 정확성 확인
- [ ] 클라이언트 앱 API 엔드포인트 업데이트
- [ ] 인증 시스템 테스트
- [ ] 출퇴근 체크 기능 테스트
- [ ] 관리자 기능 테스트
- [ ] 성능 테스트
- [ ] 롤백 계획 수립
- [ ] 팀원 교육 완료
- [ ] 문서 업데이트 완료

## 📞 지원

마이그레이션 중 문제가 발생하면:

1. [Supabase Discord](https://discord.supabase.com) 커뮤니티
2. [Supabase Docs](https://supabase.com/docs)
3. 프로젝트 GitHub Issues

---

**성공적인 마이그레이션을 기원합니다! 🚀**
