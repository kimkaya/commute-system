# 🚀 출퇴근 관리 시스템 - Cloud API (Supabase)

Supabase 기반의 무료 클라우드 백엔드로 PostgreSQL, 인증, 스토리지, 실시간 기능을 제공합니다.

## 📋 개요

이 프로젝트는 기존 MongoDB 기반 시스템을 Supabase로 마이그레이션하여 무료 클라우드 서비스를 활용한 출퇴근 관리 백엔드입니다.

### 주요 기능

- ✅ **PostgreSQL 데이터베이스**: 500MB 무료 스토리지
- ✅ **인증 시스템**: Supabase Auth 기반
- ✅ **Row Level Security (RLS)**: 데이터 보안
- ✅ **Edge Functions**: 서버리스 API
- ✅ **실시간 동기화**: Realtime subscriptions
- ✅ **파일 스토리지**: 얼굴 이미지 저장 (1GB)

## 🏗️ 프로젝트 구조

```
cloud-api/
├── supabase/
│   ├── migrations/              # 데이터베이스 마이그레이션
│   │   └── 001_initial_schema.sql
│   ├── functions/               # Edge Functions
│   │   ├── attendance/         # 출퇴근 기록 관리
│   │   ├── employees/          # 직원 관리
│   │   └── auth/               # 인증 및 권한
│   └── config.toml             # Supabase 설정
├── src/
│   └── lib/
│       └── supabase.ts         # TypeScript 클라이언트
├── package.json
├── .env.example
└── README.md
```

## 🔧 설치 및 설정

### 1. 필수 요구사항

- **Node.js**: v18.0 이상
- **Supabase CLI**: 최신 버전
- **Git**: 최신 버전

### 2. Supabase CLI 설치

```bash
# npm을 통한 설치
npm install -g supabase

# 또는 Homebrew (macOS)
brew install supabase/tap/supabase

# 또는 Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 3. 프로젝트 설정

```bash
# 저장소 클론
cd cloud-api

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 Supabase 프로젝트 정보 입력
```

### 4. 로컬 개발 환경 시작

```bash
# Supabase 로컬 환경 시작 (Docker 필요)
supabase start

# 출력된 정보 확인:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - anon key: eyJhbGc...
# - service_role key: eyJhbGc...
```

### 5. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
supabase db reset

# 또는 특정 마이그레이션만 실행
supabase migration up
```

## 🚀 사용 방법

### Supabase Studio 접속

로컬 개발 중에는 `http://localhost:54323`에서 Supabase Studio를 사용할 수 있습니다.

- 데이터베이스 테이블 조회/편집
- SQL 쿼리 실행
- API 문서 확인
- 인증 사용자 관리

### TypeScript 클라이언트 사용

```typescript
import { 
  supabase, 
  login, 
  getEmployees, 
  checkIn, 
  checkOut 
} from './src/lib/supabase'

// 로그인
const { data, error } = await login('EMP001', 'password123')

// 직원 목록 조회
const employees = await getEmployees()

// 출근 체크
const attendance = await checkIn('employee-uuid', 'device-id')

// 퇴근 체크
const checkOutRecord = await checkOut('employee-uuid', 'device-id')
```

### Edge Functions 테스트

```bash
# 모든 Edge Functions 실행
supabase functions serve

# 특정 Function만 실행
supabase functions serve attendance

# Function 호출 테스트
curl -i --location --request POST 'http://localhost:54321/functions/v1/attendance/check-in' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"employee_id":"uuid","device_id":"device1"}'
```

## 📊 데이터베이스 스키마

### 주요 테이블

1. **employees**: 직원 정보
2. **face_embeddings**: 얼굴 인식 데이터
3. **attendance**: 출퇴근 기록
4. **leaves**: 휴가 신청
5. **payroll**: 급여 정보
6. **settings**: 시스템 설정
7. **registered_devices**: 등록된 기기

자세한 스키마는 `supabase/migrations/001_initial_schema.sql`을 참조하세요.

## 🔒 보안 (Row Level Security)

모든 테이블에 RLS가 활성화되어 있으며, 다음과 같은 정책이 적용됩니다:

- **관리자**: 모든 데이터 접근 가능
- **직원**: 자신의 데이터만 조회 가능
- **인증되지 않은 사용자**: 접근 불가

## 🌐 배포

### Supabase 클라우드 배포

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. 프로젝트 설정 가져오기:

```bash
# Supabase 프로젝트 링크
supabase link --project-ref your-project-ref

# 마이그레이션 배포
supabase db push

# Edge Functions 배포
supabase functions deploy attendance
supabase functions deploy employees
supabase functions deploy auth
```

3. 환경 변수 설정:
   - Supabase Dashboard에서 프로젝트 설정 확인
   - `.env` 파일에 실제 URL과 키 입력

### 프로덕션 체크리스트

- [ ] RLS 정책 검증
- [ ] API 키 안전하게 관리
- [ ] 백업 스케줄 설정
- [ ] 모니터링 설정
- [ ] Rate limiting 설정

## 📈 무료 티어 제한사항

Supabase 무료 티어의 제한사항:

- **데이터베이스**: 500MB
- **스토리지**: 1GB
- **월간 활성 사용자**: 50,000명
- **Edge Function 실행**: 500,000회/월
- **Realtime 동시 연결**: 200개

이 제한은 30~50명 규모의 회사에 충분합니다.

## 🔄 MongoDB에서 마이그레이션

기존 MongoDB 데이터를 Supabase로 마이그레이션하는 방법은 [MIGRATION.md](../MIGRATION.md)를 참조하세요.

## 🛠️ 문제 해결

### Supabase가 시작되지 않을 때

```bash
# Docker 상태 확인
docker ps

# Supabase 완전히 중지하고 재시작
supabase stop
supabase start
```

### 마이그레이션 오류

```bash
# 데이터베이스 리셋
supabase db reset

# 로그 확인
supabase status
```

### Edge Function 디버깅

```bash
# Function 로그 확인
supabase functions logs attendance

# 로컬에서 디버깅
supabase functions serve --debug
```

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)

## 🤝 기여

이슈나 개선 사항이 있으면 언제든 제안해주세요.

## 📄 라이선스

MIT License
