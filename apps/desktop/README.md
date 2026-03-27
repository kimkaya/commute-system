# Commute System - Desktop Application

Desktop application wrapper for the Commute Management System using Electron.

## 🚀 Features

- **Native Desktop Experience**: Cross-platform desktop application for Windows, macOS, and Linux
- **Offline Support**: Works with cached data when network is unavailable
- **System Integration**: Native menus, notifications, and system tray
- **Auto Updates**: Automatic application updates via GitHub Releases
- **Secure**: Sandboxed renderer process with context isolation

## 📦 Installation

### Prerequisites

- Node.js 16+ installed
- The web application built in `../web/out` directory

### Development

```bash
# Install dependencies
npm install

# Start the app in development mode (requires Next.js dev server running)
npm start
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 🏗️ Project Structure

```
apps/desktop/
├── main.js                 # Electron main process
├── preload.js              # Preload script (context bridge)
├── package.json            # Dependencies and scripts
├── electron-builder.yml    # Build configuration
├── build/                  # Build assets (icons, etc.)
└── dist/                   # Build output directory
```

## ⚙️ Configuration

### Development Mode

In development, the app loads from the Next.js dev server at `http://localhost:3000`. Make sure the web app is running:

```bash
cd ../web
npm run dev
```

Then start the Electron app:

```bash
npm start
```

### Production Mode

In production, the app loads from the static files built by Next.js:

```bash
# First, build the web app
cd ../web
npm run build

# Then build the desktop app
cd ../desktop
npm run build
```

## 🖼️ App Icons

Place your app icons in the `build/` directory:

- **Windows**: `icon.ico` (256x256)
- **macOS**: `icon.icns` (512x512)
- **Linux**: `icons/` folder with multiple sizes

You can use tools like [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) to generate icons from a source image.

## 📝 Build Configuration

Edit `electron-builder.yml` to customize:

- App ID and product name
- Target platforms and architectures
- Installation options
- Code signing (for distribution)
- Auto-update settings

## 🔒 Security

The application follows Electron security best practices:

- **Context Isolation**: Enabled
- **Node Integration**: Disabled in renderer
- **Preload Script**: Limited API exposure via context bridge
- **Web Security**: Enabled
- **Content Security Policy**: Applied to web content

## 📦 Distribution

### GitHub Releases

The app can be automatically distributed via GitHub Releases:

1. Tag a version: `git tag v1.0.0`
2. Push the tag: `git push --tags`
3. GitHub Actions will build and publish the release

### Manual Distribution

After building, distributable files will be in the `dist/` directory:

- **Windows**: `.exe` installer
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` and `.deb` packages

## 🔧 Troubleshooting

### App doesn't start

- Check that Node.js is installed
- Verify dependencies are installed: `npm install`
- Check console for error messages

### Blank white screen

- In development: Ensure web dev server is running
- In production: Ensure web app is built in `../web/out`
- Check DevTools console for errors

### Build fails

- Verify all dependencies are installed
- Check that web app is built first
- Review electron-builder logs for specific errors

## 🤝 Contributing

1. Make changes to the code
2. Test in development mode
3. Build for production
4. Create a pull request

## 📄 License

MIT License - See LICENSE file for details
