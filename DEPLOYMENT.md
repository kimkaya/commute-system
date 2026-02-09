# 🚀 Deployment Guide

This guide covers deploying the Commute Management System to various platforms.

## 📋 Prerequisites

### Required
- Node.js 18 or higher
- npm or yarn
- Supabase account (free tier works)
- Git

### For Desktop Builds
- Windows: Windows 10/11
- macOS: macOS 10.15+
- Linux: Ubuntu 20.04+ or equivalent

## 🌐 Web Application Deployment

### Option 1: Vercel (Recommended)

1. **Setup Vercel Account**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   cd apps/web
   vercel --prod
   ```

3. **Set Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Auto-Deploy with GitHub Actions**
   - Set GitHub Secrets:
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`
   - Push to `main` branch triggers auto-deploy

### Option 2: GitHub Pages

1. **Build the Application**
   ```bash
   cd apps/web
   npm run build
   ```

2. **Deploy via GitHub Actions**
   - Enable GitHub Pages in repository settings
   - Source: GitHub Actions
   - Push to `main` triggers deployment
   - Site will be available at: `https://username.github.io/commute-system`

3. **Manual Deploy**
   ```bash
   # Install gh-pages
   npm install -g gh-pages
   
   # Deploy
   gh-pages -d out
   ```

### Option 3: Netlify

1. **Connect Repository**
   - Go to Netlify
   - New site from Git
   - Select repository

2. **Build Settings**
   - Build command: `cd apps/web && npm run build`
   - Publish directory: `apps/web/out`

3. **Environment Variables**
   - Add Supabase credentials in Netlify dashboard

## 🖥️ Desktop Application Deployment

### Manual Build

#### Windows
```bash
cd apps/desktop
npm install
npm run build:win
```
Output: `dist/Commute System-Setup-1.0.0.exe`

#### macOS
```bash
cd apps/desktop
npm install
npm run build:mac
```
Output: `dist/Commute System-1.0.0.dmg`

#### Linux
```bash
cd apps/desktop
npm install
npm run build:linux
```
Output: `dist/Commute System-1.0.0.AppImage`

### Automated Release via GitHub Actions

1. **Tag a Release**
   ```bash
   git tag v1.0.0
   git push --tags
   ```

2. **GitHub Actions Workflow**
   - Automatically builds for Windows, macOS, and Linux
   - Creates GitHub Release
   - Uploads installers as release assets

3. **Download**
   - Go to repository Releases page
   - Download installer for your platform

### Code Signing (Optional)

#### macOS
1. Get Apple Developer certificate
2. Add to GitHub Secrets:
   - `MAC_CERTIFICATE` (base64 encoded .p12)
   - `MAC_CERTIFICATE_PASSWORD`

#### Windows
1. Get code signing certificate
2. Add to GitHub Secrets:
   - `WINDOWS_CERTIFICATE` (base64 encoded .pfx)
   - `WINDOWS_CERTIFICATE_PASSWORD`

## 🔐 Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Save URL and anon key

### 2. Run Database Migrations

Copy SQL from `apps/web/SETUP.md` and run in Supabase SQL Editor:
- Create tables
- Set up RLS policies
- Create indexes

### 3. Configure Authentication

1. Enable Email authentication
2. Disable email confirmation for testing (optional)
3. Configure email templates if needed

## 🔧 Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Production

Set these in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- GitHub Actions: Repository → Settings → Secrets

## 🧪 Testing Deployment

### Web App
1. Open deployed URL
2. Test login/register
3. Test face recognition (allow camera)
4. Check admin/employee features

### Desktop App
1. Install built application
2. Verify it connects to Supabase
3. Test offline behavior
4. Check auto-updates (if configured)

## 📊 Monitoring

### Web App
- Vercel Analytics (built-in)
- Google Analytics (add to layout.tsx)
- Sentry for error tracking

### Desktop App
- Electron crash reporter
- Custom analytics endpoint
- Update server logs

## 🔄 Updates

### Web App
- Push to main → Auto-deploy
- Zero downtime
- Instant rollback available

### Desktop App
- Tag new version → Auto-build
- Users download from Releases
- Future: Implement auto-updater

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (18+)
- Clear node_modules and reinstall
- Check for TypeScript errors

### Deployment Fails
- Verify environment variables
- Check build logs
- Ensure Supabase is accessible

### Desktop App Won't Start
- Check antivirus/firewall
- Verify app signature (macOS/Windows)
- Check console for errors

## 📝 Checklist

Before deploying:
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Build succeeds locally
- [ ] Tests pass
- [ ] Face-API models downloaded
- [ ] RLS policies configured
- [ ] README updated with URLs

## 🆘 Support

- Issues: GitHub Issues
- Discussions: GitHub Discussions
- Docs: Repository README files

---

**Ready to deploy!** 🎉
