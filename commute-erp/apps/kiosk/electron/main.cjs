const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// 개발 모드 확인
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1920,
    fullscreen: !isDev,
    kiosk: !isDev,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    title: '출퇴근 키오스크',
    frame: isDev,
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!isDev) {
      mainWindow.setFullScreen(true);
      mainWindow.setKiosk(true);
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
    mainWindow.loadURL('http://localhost:5174');
  } else {
    Menu.setApplicationMenu(null);
    
    const indexPath = path.join(__dirname, '../dist/index.html');
    
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      const altPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
      mainWindow.loadFile(altPath).catch(err => {
        console.error('Failed to load:', err);
        mainWindow.loadURL(`data:text/html,<h1>Error loading app</h1><p>${err.message}</p>`);
      });
    }
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // 키오스크 모드 종료 단축키 (Ctrl+Shift+Q)
  if (!isDev) {
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
      app.quit();
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
