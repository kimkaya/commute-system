const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// 개발 모드 확인
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,
    minWidth: 375,
    minHeight: 667,
    maxWidth: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    title: '직원 포털',
    resizable: true,
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 디버그용: 항상 DevTools 열기
  mainWindow.webContents.openDevTools();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5175');
  } else {
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
