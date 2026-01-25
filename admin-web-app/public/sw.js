const CACHE_NAME = 'commute-admin-v1';
const urlsToCache = [
  '/',
  '/app.js',
  '/manifest.json',
  // 아이콘들도 캐시에 추가 예정
];

// 서비스 워커 설치
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시 생성 완료');
        return cache.addAll(urlsToCache);
      })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 찾으면 반환, 아니면 네트워크 요청
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// 새 버전의 서비스 워커 활성화
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});