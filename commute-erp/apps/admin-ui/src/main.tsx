import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', registration.scope);
      
      // 업데이트 확인
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New Service Worker available');
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  // StrictMode 제거 - 프로덕션 빌드에서는 영향 없지만 개발 시 이중 렌더링 방지
  createRoot(rootElement).render(<App />);
}
