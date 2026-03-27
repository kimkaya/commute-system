# ⚡ Quick Start Guide

Get the Commute Management System running in 5 minutes!

## 🎯 What You'll Build

A full-stack commute management system with:
- ✅ Face recognition check-in
- ✅ Admin dashboard
- ✅ Employee attendance tracking
- ✅ Leave management
- ✅ Payroll calculation

## 📦 Step 1: Prerequisites

Install these first:
```bash
# Check Node.js (need 18+)
node --version

# Check npm
npm --version
```

Don't have Node.js? [Download here](https://nodejs.org/)

## 🚀 Step 2: Clone & Install

```bash
# Clone repository
git clone https://github.com/kimkaya/commute-system.git
cd commute-system

# Install web app dependencies
cd apps/web
npm install
```

## 🔐 Step 3: Setup Supabase (5 minutes)

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in details:
   - Name: `commute-system`
   - Database password: (save this!)
   - Region: (closest to you)
4. Click "Create new project"
5. Wait ~2 minutes for setup

### Get Your Keys
1. Go to Project Settings → API
2. Copy these values:
   - Project URL
   - anon/public key

### Setup Database
1. Go to SQL Editor
2. Click "New Query"
3. Copy entire SQL from `apps/web/SETUP.md`
4. Click "Run"
5. Should see: "Success. No rows returned"

## ⚙️ Step 4: Configure Environment

```bash
# In apps/web directory
cp .env.local.example .env.local

# Edit .env.local with your keys
nano .env.local  # or use any text editor
```

Paste your Supabase URL and key:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 🎨 Step 5: Download Face Recognition Models

```bash
# Still in apps/web directory
cd public/models

# Download models (choose one method)

# Method 1: Direct download
wget https://github.com/justadudewhohacks/face-api.js-models/raw/master/tiny_face_detector_model-weights_manifest.json
wget https://github.com/justadudewhohacks/face-api.js-models/raw/master/tiny_face_detector_model-shard1
wget https://github.com/justadudewhohacks/face-api.js-models/raw/master/face_landmark_68_model-weights_manifest.json
wget https://github.com/justadudewhohacks/face-api.js-models/raw/master/face_landmark_68_model-shard1
wget https://github.com/justadudewhohacks/face-api.js-models/raw/master/face_recognition_model-weights_manifest.json
wget https://github.com/justadudewhohacks/face-api.js-models/raw/master/face_recognition_model-shard1
wget https://github.com/justadudewhohacks/face-api.js-models/raw/master/face_recognition_model-shard2

# Method 2: Clone and copy
git clone https://github.com/justadudewhohacks/face-api.js-models
cp face-api.js-models/tiny_face_detector/* .
cp face-api.js-models/face_landmark_68/* .
cp face-api.js-models/face_recognition/* .
rm -rf face-api.js-models

# Go back to web root
cd ../..
```

## 🏃 Step 6: Run the App

```bash
# Still in apps/web
npm run dev
```

You should see:
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
- Ready in 2.5s
```

## 🎉 Step 7: Open & Test

1. **Open Browser**: http://localhost:3000
2. **Register Account**:
   - Click "Register"
   - Fill in details
   - Allow camera access
   - Capture face (3 photos)
3. **Login**:
   - Use registered credentials
   - Dashboard loads!
4. **Test Check-in**:
   - Go to "Check In"
   - Click "Check In with Face"
   - Camera activates
   - Face matched → Success!

## 🖥️ Bonus: Desktop App

Want the desktop version?

```bash
# Terminal 1: Keep web app running
cd apps/web
npm run dev

# Terminal 2: Start Electron
cd apps/desktop
npm install
npm start
```

## 🎨 What's Next?

### Customize
- Change colors in `tailwind.config.js`
- Update company name in `app/layout.tsx`
- Add logo to `public/`

### Add Features
- Email notifications
- Reports export
- Mobile app version
- Multi-language support

### Deploy
- See `DEPLOYMENT.md` for production deploy
- Vercel (web) + GitHub Releases (desktop)

## 🐛 Troubleshooting

### Port 3000 Already in Use?
```bash
# Use different port
npm run dev -- -p 3001
```

### Camera Not Working?
- Use HTTPS or localhost
- Check browser permissions
- Try different browser

### Face Not Detected?
- Ensure good lighting
- Face camera directly
- Move closer/farther
- Check models downloaded

### Build Errors?
```bash
# Clear cache
rm -rf node_modules .next
npm install
npm run dev
```

### Supabase Connection Failed?
- Check internet connection
- Verify .env.local keys
- Ensure Supabase project is active
- Check RLS policies enabled

## 📚 Learn More

- [Full Documentation](README.md)
- [Web App Setup](apps/web/SETUP.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Desktop App](apps/desktop/README.md)

## 🎓 Tutorial Videos (Coming Soon)
- Complete setup walkthrough
- Face recognition demo
- Admin features tour
- Deployment tutorial

## 💡 Tips

1. **Dark Mode**: Toggle in top-right corner
2. **Admin Account**: First registered user is admin
3. **Face Photos**: Good lighting crucial
4. **Test Data**: Add sample employees for testing
5. **Mobile**: Responsive design works on phones

## 🤝 Need Help?

- 🐛 [Report Issues](https://github.com/kimkaya/commute-system/issues)
- 💬 [Discussions](https://github.com/kimkaya/commute-system/discussions)
- 📧 Email: (your-email)

---

**Enjoy your new commute system!** 🎊

Total setup time: ~10 minutes
