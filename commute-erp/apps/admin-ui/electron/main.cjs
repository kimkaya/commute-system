const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// 개발 모드 확인
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    title: '출퇴근 ERP - 관리자',
    show: false, // 준비될 때까지 숨김
  });

  // 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 디버그용: 항상 DevTools 열기
  mainWindow.webContents.openDevTools();

  if (isDev) {
    // 개발 모드: localhost 로드
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // 프로덕션: 빌드된 파일 로드
    Menu.setApplicationMenu(null);
    
    // asar 패키징 시 __dirname은 asar 내부를 가리킴
    const indexPath = path.join(__dirname, '../dist/index.html');
    
    console.log('App packaged:', app.isPackaged);
    console.log('__dirname:', __dirname);
    console.log('Index path:', indexPath);
    console.log('resourcesPath:', process.resourcesPath);
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load:', err);
      mainWindow.loadURL(`data:text/html,<h1>Error loading app</h1><p>Path: ${indexPath}</p><p>${err.message}</p>`);
    });
  }

  // 로드 에러 처리
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
