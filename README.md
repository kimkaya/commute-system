# 🚀 출퇴근 관리 시스템 (Commute Management System)

통합 출퇴근 관리 시스템으로 직원 관리, 출퇴근 기록, 급여 계산, 휴가 관리 등을 제공합니다.

## 📋 프로젝트 개요

이 시스템은 30~50명 규모의 소규모 조직을 위한 출퇴근 관리 솔루션입니다. 무료 클라우드 서비스(Supabase)를 활용하여 비용 효율적으로 운영할 수 있습니다.

### 주요 기능

- ✅ **직원 관리**: 직원 정보, 부서, 직책 관리
- ✅ **출퇴근 기록**: 얼굴 인식 기반 출퇴근 체크
- ✅ **휴가 관리**: 휴가 신청, 승인, 잔여 일수 계산
- ✅ **급여 계산**: 근무 시간 기반 자동 급여 산정
- ✅ **보고서**: 월별, 부서별 통계 및 리포트
- ✅ **실시간 동기화**: 모든 플랫폼 간 실시간 데이터 동기화

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                   출퇴근 관리 시스템                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   직원용     │  │   관리자용   │  │  모바일/웹   │      │
│  │ Electron 앱  │  │ Electron 앱  │  │   Admin      │      │
│  │  (Commute)   │  │(CommuteAdmin)│  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│          │               │               │                 │
│          └───────────────┼───────────────┘                 │
│                          │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              통합 API 서버                            │  │
│  │          (unified-api - MongoDB)                     │  │
│  │                                                      │  │
│  │  또는                                                │  │
│  │                                                      │  │
│  │         Supabase Cloud Backend                      │  │
│  │          (cloud-api - PostgreSQL)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📁 프로젝트 구조

```
commute-system/
├── Commute/                    # 직원용 Electron 앱
│   ├── main.js                # Electron 메인 프로세스
│   ├── renderer.js            # 얼굴 인식 및 UI
│   └── package.json
│
├── CommuteAdmin/               # 관리자용 Electron 앱
│   ├── main.js                # Electron 메인 프로세스
│   ├── renderer.js            # 관리 UI
│   ├── api-client.js          # API 클라이언트
│   └── package.json
│
├── unified-api/                # MongoDB 기반 통합 API 서버
│   ├── server.js              # Express 서버
│   ├── migrate-database.js    # DB 마이그레이션
│   ├── integration-test.js    # 통합 테스트
│   └── shared/                # 공통 컴포넌트
│
├── cloud-api/                  # ⭐ Supabase 기반 클라우드 백엔드 (NEW!)
│   ├── supabase/              # Supabase 설정
│   │   ├── migrations/        # 데이터베이스 스키마
│   │   └── functions/         # Edge Functions (서버리스 API)
│   ├── src/lib/               # TypeScript 클라이언트
│   ├── package.json
│   └── README.md
│
├── MIGRATION.md                # MongoDB → Supabase 마이그레이션 가이드
└── README.md                   # 이 파일
```

## 🚀 빠른 시작

### 방법 1: Supabase 클라우드 백엔드 사용 (권장)

**장점**: 무료, 확장 가능, 관리 불필요

```bash
# 1. cloud-api 디렉토리로 이동
cd cloud-api

# 2. 의존성 설치
npm install

# 3. Supabase CLI 설치 (아직 설치하지 않았다면)
npm install -g supabase

# 4. 로컬 개발 환경 시작
supabase start

# 5. 데이터베이스 마이그레이션
supabase db reset

# 6. Supabase Studio 접속
# http://localhost:54323
```

자세한 설정 방법은 [cloud-api/README.md](./cloud-api/README.md)를 참조하세요.

### 방법 2: MongoDB 기반 API 서버 사용

**장점**: 기존 시스템, 완전한 제어

```bash
# 1. MongoDB 설치 및 실행
# https://www.mongodb.com/docs/manual/installation/

# 2. unified-api 디렉토리로 이동
cd unified-api

# 3. 의존성 설치
npm install

# 4. 환경 변수 설정
# .env 파일 생성 및 MongoDB URI 설정

# 5. 데이터베이스 마이그레이션
node migrate-database.js

# 6. API 서버 시작
node server.js
```

자세한 설정 방법은 [unified-api/README.md](./unified-api/README.md)를 참조하세요.

## 💻 클라이언트 앱 실행

### 직원용 앱 (Commute)

```bash
cd Commute
npm install
npm start
```

- 얼굴 인식 기반 출퇴근 체크
- 개인 출퇴근 기록 조회
- 휴가 신청

### 관리자용 앱 (CommuteAdmin)

```bash
cd CommuteAdmin
npm install
npm start
```

- 직원 관리 (생성, 수정, 삭제)
- 출퇴근 현황 모니터링
- 급여 계산 및 리포트
- 휴가 승인/거절
- 시스템 설정

## 📊 주요 기능 상세

### 1. 직원 관리

- 직원 정보 등록 (이름, 부서, 직책, 연락처 등)
- 얼굴 데이터 등록 및 관리
- 권한 설정 (관리자, 직원)
- 재직 상태 관리 (재직, 퇴사, 휴직)

### 2. 출퇴근 관리

- 얼굴 인식 기반 자동 체크인/체크아웃
- 수동 출퇴근 기록 수정 (관리자)
- 지각, 조퇴, 결근 자동 판단
- 실시간 출퇴근 현황 모니터링

### 3. 휴가 관리

- 휴가 신청 (연차, 병가, 무급 휴가 등)
- 관리자 승인/거절
- 잔여 휴가 일수 자동 계산
- 휴가 사용 내역 조회

### 4. 급여 계산

- 근무 시간 기반 자동 급여 계산
- 연장 근무 수당 산정
- 공제 항목 관리
- 월별 급여 명세서 생성

### 5. 보고서 및 통계

- 부서별 출퇴근 통계
- 월별 근무 시간 리포트
- 컴플라이언스 체크 (주 52시간 등)
- Excel 다운로드

## 🔄 MongoDB에서 Supabase로 마이그레이션

기존 MongoDB 데이터를 Supabase로 이전하려면 [MIGRATION.md](./MIGRATION.md) 가이드를 참조하세요.

### 마이그레이션 장점

- ✅ **무료 티어**: 500MB DB, 1GB Storage, 50,000 MAU
- ✅ **자동 백업**: Supabase에서 자동 관리
- ✅ **확장성**: 필요 시 유료 플랜으로 업그레이드
- ✅ **실시간 기능**: WebSocket 기반 실시간 동기화
- ✅ **보안**: Row Level Security로 데이터 보호
- ✅ **관리 간편**: MongoDB 서버 운영 불필요

## 🔧 환경 요구사항

### 공통

- **Node.js**: v18.0 이상
- **Git**: 최신 버전

### Supabase 백엔드 사용 시

- **Supabase CLI**: 최신 버전
- **Docker**: 로컬 개발 시 필요

### MongoDB 백엔드 사용 시

- **MongoDB**: v4.4 이상

## 🔒 보안

### 데이터 보안

- **비밀번호**: bcrypt 해시 저장
- **세션 관리**: JWT 토큰 기반 인증
- **API 키**: 환경 변수로 관리
- **얼굴 데이터**: 암호화 저장

### Row Level Security (Supabase)

- 관리자: 모든 데이터 접근 가능
- 직원: 자신의 데이터만 조회 가능
- 인증되지 않은 사용자: 접근 불가

## 📈 확장 가능성

### 현재 지원 규모

- **직원**: 30~50명
- **관리자**: 1~3명
- **동시 접속**: 100명

### 확장 방법

1. **Supabase 유료 플랜**: 더 많은 저장 공간 및 기능
2. **로드 밸런싱**: 여러 Edge Function 인스턴스
3. **CDN**: 정적 파일 배포 최적화

## 🛠️ 문제 해결

### API 서버 연결 실패

```bash
# 서버 상태 확인
curl http://localhost:4000/api/health

# 또는 Supabase
curl http://localhost:54321/rest/v1/
```

### 얼굴 인식 실패

- 카메라 권한 확인
- 조명 상태 확인
- 얼굴 데이터 재등록

### 데이터베이스 오류

```bash
# MongoDB 재시작
sudo systemctl restart mongod

# 또는 Supabase 재시작
supabase stop
supabase start
```

## 📚 참고 문서

- [Cloud API (Supabase) 가이드](./cloud-api/README.md)
- [Unified API (MongoDB) 가이드](./unified-api/README.md)
- [마이그레이션 가이드](./MIGRATION.md)
- [Supabase 공식 문서](https://supabase.com/docs)

## 🤝 기여

버그 리포트나 기능 제안은 GitHub Issues를 통해 제출해주세요.

## 📄 라이선스

MIT License

## 📞 지원

- 📧 기술 지원: tech-support@company.com
- 📖 문서: [프로젝트 Wiki](#)
- 🐛 버그 리포트: [GitHub Issues](#)

---

**즐거운 출퇴근 관리 되세요! 🎯**
