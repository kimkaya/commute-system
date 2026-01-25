# 무료 클라우드 배포 가이드

## 🚀 Railway 배포 (가장 추천)

### 1. 사전 준비
```bash
# Railway CLI 설치
npm install -g @railway/cli

# Railway 계정 생성
railway login
```

### 2. 프로젝트 설정
```bash
# 프로젝트 초기화
cd D:\xamp\htdocs\unified-api
railway init

# 환경 변수 설정
railway variables set MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/commuteApp"
railway variables set SESSION_SECRET="your-super-secret-key"
railway variables set NODE_ENV=production
```

### 3. 배포
```bash
# 프로덕션 서버로 배포
railway deploy
```

### 4. 도메인 확인
```bash
# 배포된 도메인 확인
railway open
# 예: https://your-app-name.railway.app
```

## 🌐 Render 배포

### 1. GitHub 저장소 연결
1. GitHub에 코드 업로드
2. Render.com 계정 생성
3. "New Web Service" 선택
4. GitHub 저장소 연결

### 2. 설정
```yaml
# render.yaml
services:
  - type: web
    name: commute-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: MONGO_URI
        value: mongodb+srv://username:password@cluster.mongodb.net/commuteApp
      - key: SESSION_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
```

## 💾 MongoDB Atlas 설정

### 1. 클러스터 생성
1. https://cloud.mongodb.com 접속
2. "Create a New Cluster" 선택
3. **Free Tier (M0)** 선택
4. **Region**: Asia Pacific - Seoul 선택

### 2. 사용자 및 네트워크 설정
```bash
# Database Access
Username: commuteapp
Password: [자동 생성된 강력한 비밀번호]

# Network Access
IP Address: 0.0.0.0/0 (모든 IP 허용)
```

### 3. 연결 문자열 복사
```
mongodb+srv://commuteapp:<password>@cluster0.xyz123.mongodb.net/commuteApp?retryWrites=true&w=majority
```

## 🔧 프론트엔드 배포

### Vercel (모바일 웹 앱)
```bash
# Vercel CLI 설치
npm i -g vercel

# 모바일 앱 배포
cd D:\xamp\htdocs\admin-web-app\public
vercel --prod

# 환경 변수 설정
vercel env add NEXT_PUBLIC_API_URL production
# 값: https://your-api-domain.railway.app
```

### Netlify (웹 관리자 앱)
1. Netlify.com 계정 생성
2. "New site from Git" 선택
3. GitHub 저장소 연결
4. 빌드 설정:
   ```bash
   Build command: npm run build
   Publish directory: public
   ```

## 📱 모바일 앱 빌드

### Android APK
```bash
cd D:\xamp\htdocs\admin-web-app

# Capacitor 설정 업데이트
npx cap sync android

# 프로덕션 API URL 설정
# capacitor.config.json 수정
{
  "server": {
    "url": "https://your-vercel-app.vercel.app"
  }
}

# APK 빌드
npx cap build android
```

## 🔒 보안 설정

### 환경 변수 (필수)
```bash
# 강력한 비밀번호 생성
openssl rand -base64 32

# 환경 변수 설정
SESSION_SECRET=generated-random-string
MONGO_URI=mongodb+srv://...
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-mobile.netlify.app
```

### HTTPS 강제 설정
```javascript
// server-production.js에서
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

## 📊 비용 예상

| 서비스 | 무료 한도 | 예상 비용 |
|--------|-----------|-----------|
| MongoDB Atlas | 512MB | **무료** |
| Railway | 500시간/월 | **무료** |
| Vercel | 100GB 대역폭 | **무료** |
| Netlify | 100GB 대역폭 | **무료** |
| **총 비용** | | **$0/월** |

## ⚡ 성능 최적화

### 1. 캐싱 설정
```javascript
// Redis 대신 메모리 캐시
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10분 캐시
```

### 2. 이미지 최적화
```bash
# 이미지 압축
npm install imagemin imagemin-mozjpeg imagemin-pngquant
```

### 3. gzip 압축
```javascript
const compression = require('compression');
app.use(compression());
```

## 🚨 모니터링

### 무료 모니터링 도구
1. **Uptime Robot**: 서버 가동 상태 모니터링
2. **LogRocket**: 프론트엔드 에러 추적
3. **Sentry**: 백엔드 에러 추적

### Health Check 설정
```bash
# Uptime Robot에서 모니터링할 URL
https://your-app.railway.app/health
```

## 🎯 완전한 배포 스크립트

<function_calls>
<invoke name="write">
<parameter name="content">#!/bin/bash

# 출퇴근 관리 시스템 자동 배포 스크립트

echo "🚀 출퇴근 관리 시스템 배포 시작"
echo "=================================="

# 1. MongoDB Atlas 연결 테스트
echo "📊 MongoDB Atlas 연결 테스트..."
if curl -s "https://cloud.mongodb.com" > /dev/null; then
    echo "✅ MongoDB Atlas 접근 가능"
else
    echo "❌ MongoDB Atlas 접근 실패"
    exit 1
fi

# 2. 환경 변수 확인
if [ -z "$MONGO_URI" ]; then
    echo "❌ MONGO_URI 환경 변수가 설정되지 않았습니다"
    echo "다음과 같이 설정하세요:"
    echo "export MONGO_URI='mongodb+srv://username:password@cluster.mongodb.net/commuteApp'"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET 환경 변수가 설정되지 않았습니다"
    echo "다음과 같이 설정하세요:"
    echo "export SESSION_SECRET='$(openssl rand -base64 32)'"
    exit 1
fi

# 3. 의존성 설치
echo "📦 의존성 설치..."
npm install

# 4. 데이터베이스 마이그레이션
echo "🗄️ 데이터베이스 마이그레이션..."
node migrate-database.js

# 5. Railway 배포
echo "🚀 Railway 배포..."
railway deploy

# 6. 배포 완료 확인
echo "✅ 배포 완료! 다음 URL에서 확인하세요:"
railway open

# 7. 모바일 앱 빌드 (선택사항)
read -p "모바일 앱도 빌드하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📱 모바일 앱 빌드..."
    cd ../admin-web-app
    npx cap sync
    npx cap build android
    echo "✅ APK 파일이 생성되었습니다: android/app/build/outputs/apk/debug/app-debug.apk"
fi

echo "🎉 배포가 완료되었습니다!"
echo "📱 모바일 앱: https://your-mobile-app.vercel.app"
echo "🖥️ API 서버: https://your-api.railway.app"
echo "💻 관리자 앱: Windows Electron 앱 사용"