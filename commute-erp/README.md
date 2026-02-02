# Commute ERP - 멀티사업장 출퇴근 관리 시스템

멀티사업장을 지원하는 출퇴근 관리 시스템입니다. 관리자 UI, 직원 포털, 키오스크 앱으로 구성되어 있습니다.

## 배포 URL

| 앱 | URL |
|---|---|
| Admin UI | https://commute-erp-admin.vercel.app |
| Employee Portal | https://employee-portal-eosin.vercel.app |
| Kiosk | https://kiosk-alpha-wheat.vercel.app |

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Headless UI
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **배포**: Vercel

## 프로젝트 구조

```
commute-erp/
├── apps/
│   ├── admin-ui/          # 관리자 대시보드
│   ├── employee-portal/   # 직원용 웹앱
│   └── kiosk/             # 키오스크 앱 (얼굴인식)
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # DB 마이그레이션
└── package.json           # 루트 패키지 (monorepo)
```

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone https://github.com/kimkaya/commute-system.git
cd commute-system
```

### 2. 의존성 설치

```bash
# 루트에서 모든 앱 의존성 설치
npm install

# 또는 개별 앱 설치
cd apps/admin-ui && npm install
cd apps/employee-portal && npm install
cd apps/kiosk && npm install
```

### 3. 환경변수 설정

각 앱 폴더에 `.env.example` 파일을 `.env`로 복사한 후 값을 설정합니다.

```bash
# Admin UI
cp apps/admin-ui/.env.example apps/admin-ui/.env

# Employee Portal
cp apps/employee-portal/.env.example apps/employee-portal/.env

# Kiosk
cp apps/kiosk/.env.example apps/kiosk/.env
```

#### 필수 환경변수

| 변수 | 설명 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key |

### 4. 개발 서버 실행

```bash
# Admin UI (기본 포트: 5173)
cd apps/admin-ui && npm run dev

# Employee Portal (기본 포트: 5174)
cd apps/employee-portal && npm run dev

# Kiosk (기본 포트: 5175)
cd apps/kiosk && npm run dev
```

## Supabase 설정

### Edge Functions 배포

```bash
# Supabase CLI 로그인
npx supabase login

# 프로젝트 연결
npx supabase link --project-ref <PROJECT_REF>

# Edge Functions 배포 (모든 함수)
npx supabase functions deploy --no-verify-jwt
```

### DB 마이그레이션

```bash
# 마이그레이션 적용
npx supabase db push
```

또는 Supabase Dashboard의 SQL Editor에서 직접 실행:
- `supabase/migrations/003_multi_tenant.sql` - 멀티사업장 스키마
- `supabase/migrations/004_employee_tax_settings.sql` - 소득세 설정

## Edge Functions 목록

| 함수 | 설명 |
|------|------|
| `admin-login-v2` | 관리자 로그인 |
| `admin-register` | 관리자 회원가입 |
| `employee-login-v2` | 직원 로그인 |
| `employee-register` | 직원 회원가입 |
| `validate-invite-code` | 초대코드 검증 |
| `kiosk-auth` | 키오스크 인증 |
| `register-kiosk-device` | 키오스크 기기 등록 |
| `regenerate-invite-code` | 초대코드 재발급 |

## 테스트 계정 (Demo)

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@demo.com | admin1234 |
| 직원 | testuser02@demo.com | test1234 |

- **초대코드**: `INV-DEMO0001`
- **키오스크 기기코드**: `DEV-3Z9MFFS9`

## 주요 기능

### 관리자 UI (Admin)
- 직원 관리 (CRUD, 초대코드 발급)
- 근태 관리 (출퇴근 기록 조회/수정)
- 급여 관리 (급여 계산, 명세서 발급)
- 사업장 관리 (멀티사업장 지원)
- 키오스크 기기 관리
- 소득세 개인별 계산 (2024년 간이세액표 기준)

### 직원 포털 (Employee Portal)
- 출퇴근 체크 (웹)
- 근태 현황 조회
- 급여명세서 조회
- 개인정보 수정

### 키오스크 (Kiosk)
- 얼굴인식 출퇴근 체크
- 기기 등록 및 인증

## 빌드 및 배포

```bash
# Admin UI 빌드
cd apps/admin-ui && npm run build

# Employee Portal 빌드
cd apps/employee-portal && npm run build

# Kiosk 빌드
cd apps/kiosk && npm run build
```

Vercel에 자동 배포가 설정되어 있으며, `master` 브랜치 푸시 시 자동으로 배포됩니다.

## 라이선스

Private - All rights reserved
