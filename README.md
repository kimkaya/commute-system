# 출퇴근 관리 시스템 (Commute Management System)

통합 웹 및 데스크톱 출퇴근 관리 시스템 - Next.js 14 + Electron + Supabase

[![Deploy Web](https://github.com/kimkaya/commute-system/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/kimkaya/commute-system/actions/workflows/deploy-web.yml)
[![Build Desktop](https://github.com/kimkaya/commute-system/actions/workflows/build-desktop.yml/badge.svg)](https://github.com/kimkaya/commute-system/actions/workflows/build-desktop.yml)

## 🎯 프로젝트 개요

하나의 코드베이스로 **웹 브라우저**와 **Electron 데스크톱 앱** 모두를 지원하는 현대적인 출퇴근 관리 시스템입니다.

### 주요 기능

**직원용 기능:**
- 🎥 얼굴 인식 기반 출퇴근 체크 (face-api.js)
- 📊 출퇴근 기록 조회 및 통계
- 📝 휴가 신청 및 상태 확인
- 📍 위치 기반 체크인 (선택사항)

**관리자용 기능:**
- 📈 실시간 대시보드 및 통계
- 👥 직원 관리 (CRUD)
- 📅 출퇴근 기록 관리 및 조회
- 💰 급여 계산 시스템
- ✅ 휴가 승인/거절
- ⚙️ 시스템 설정

**공통 기능:**
- 🔐 Supabase 인증 (이메일/비밀번호)
- 🔄 실시간 데이터 동기화
- 🌓 다크모드 지원
- 📱 반응형 디자인 (모바일 최적화)
- 🎨 Tailwind CSS 기반 모던 UI

## 🏗️ 프로젝트 구조

```
commute-system/
├── apps/
│   ├── web/                      # Next.js 14 웹 애플리케이션
│   │   ├── src/app/             # App Router 페이지
│   │   ├── src/components/      # React 컴포넌트
│   │   ├── src/lib/             # 유틸리티 및 라이브러리
│   │   ├── src/hooks/           # React 훅
│   │   └── public/              # 정적 파일 (face-api 모델 등)
│   │
│   └── desktop/                  # Electron 데스크톱 래퍼
│       ├── main.js              # Electron 메인 프로세스
│       ├── preload.js           # 프리로드 스크립트
│       └── electron-builder.yml # 빌드 설정
│
├── packages/
│   └── shared/                   # 공통 타입 및 상수
│       ├── types.ts             # TypeScript 타입 정의
│       └── constants.ts         # 공통 상수
│
├── .github/
│   └── workflows/
│       ├── deploy-web.yml       # 웹 자동 배포
│       └── build-desktop.yml    # 데스크톱 빌드 및 릴리즈
│
└── (기존 폴더들 - Legacy)
    ├── commute-erp/             # 기존 ERP 시스템
    ├── unified-api/             # MongoDB API (호환성)
    ├── Commute/                 # 레거시 앱
    └── CommuteAdmin/            # 레거시 앱
```

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Supabase 프로젝트 (무료 티어 가능)

### 1. 저장소 클론

```bash
git clone https://github.com/kimkaya/commute-system.git
cd commute-system
```

### 2. 웹 애플리케이션 설정

```bash
cd apps/web

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 편집하여 Supabase 정보 입력

# 개발 서버 실행
npm run dev
```

웹 앱이 http://localhost:3000 에서 실행됩니다.

### 3. 데스크톱 애플리케이션 (선택사항)

```bash
cd apps/desktop

# 의존성 설치
npm install

# 웹 앱 빌드 (먼저 필요)
cd ../web
npm run build

# Electron 앱 실행
cd ../desktop
npm start
```

## 📦 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript 5.3
- **스타일링**: Tailwind CSS 3.4
- **UI 아이콘**: Lucide React
- **차트**: Recharts

### 백엔드
- **BaaS**: Supabase
- **인증**: Supabase Auth
- **데이터베이스**: PostgreSQL (Supabase)
- **실시간**: Supabase Realtime

### AI/ML
- **얼굴 인식**: face-api.js
- **모델**: SSD MobileNet v1, Face Recognition

### 데스크톱
- **프레임워크**: Electron 28
- **빌더**: electron-builder 24

### CI/CD
- **배포**: GitHub Actions
- **웹 호스팅**: Vercel / GitHub Pages
- **데스크톱**: GitHub Releases

## 📖 상세 문서

- [웹 앱 설정 가이드](apps/web/SETUP.md)
- [웹 앱 README](apps/web/README.md)
- [데스크톱 앱 README](apps/desktop/README.md)
- [공유 패키지 README](packages/shared/README.md)

## 🔧 개발

### 웹 앱 개발

```bash
cd apps/web
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run lint         # ESLint 검사
```

### 데스크톱 앱 빌드

```bash
cd apps/desktop
npm run build        # 현재 플랫폼용 빌드
npm run build:win    # Windows 빌드
npm run build:mac    # macOS 빌드
npm run build:linux  # Linux 빌드
```

## 🌐 배포

### 웹 애플리케이션

**자동 배포** (main 브랜치 푸시 시):
- GitHub Pages 또는 Vercel에 자동 배포
- 환경 변수를 GitHub Secrets에 설정 필요

**수동 배포**:
```bash
cd apps/web
npm run build
# out/ 폴더를 정적 호스팅 서비스에 배포
```

### 데스크톱 애플리케이션

**자동 릴리즈** (태그 푸시 시):
```bash
git tag v1.0.0
git push --tags
# GitHub Actions가 자동으로 빌드 및 릴리즈
```

**수동 빌드**:
```bash
cd apps/desktop
npm run build
# dist/ 폴더에서 설치 파일 확인
```

## 🔐 환경 변수

`.env.example` 파일을 참고하여 다음 환경 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

GitHub Actions 시크릿:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VERCEL_TOKEN` (Vercel 배포 시)
- `VERCEL_ORG_ID` (Vercel 배포 시)
- `VERCEL_PROJECT_ID` (Vercel 배포 시)

## 📊 Supabase 데이터베이스 스키마

상세한 스키마 및 RLS 정책은 [apps/web/SETUP.md](apps/web/SETUP.md) 를 참조하세요.

주요 테이블:
- `users` - 사용자 (직원/관리자)
- `attendance_records` - 출퇴근 기록
- `leave_requests` - 휴가 신청
- `payroll_records` - 급여 기록
- `system_settings` - 시스템 설정

## 🤝 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - React 프레임워크
- [Supabase](https://supabase.com/) - Backend as a Service
- [face-api.js](https://github.com/justadudewhohacks/face-api.js/) - 얼굴 인식
- [Electron](https://www.electronjs.org/) - 데스크톱 앱 프레임워크
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크

## 📞 지원

- **Issues**: [GitHub Issues](https://github.com/kimkaya/commute-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kimkaya/commute-system/discussions)

---

**Made with ❤️ for efficient workforce management**
