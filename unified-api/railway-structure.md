# Railway 멀티 서비스 배포 구성

## 프로젝트 구조
unified-commute-system/
├── backend/                 # API 서버
│   ├── server.js
│   ├── package.json
│   └── ...
├── frontend-mobile/         # 모바일 웹 앱
│   ├── public/
│   ├── server.js
│   └── package.json
├── frontend-admin/          # 관리자 웹 앱
│   ├── public/
│   ├── server.js
│   └── package.json
└── railway.json            # Railway 설정 파일