# Commute Management System - Web Application

A modern Next.js 14 web application for commute and attendance management with AI-powered face recognition.

## Features

- 🔐 **Authentication**: Secure login and registration with Supabase
- 👤 **Face Recognition**: AI-powered face detection and verification using face-api.js
- ⏰ **Attendance Tracking**: Real-time check-in/check-out with location tracking
- 📊 **Dashboard**: Comprehensive analytics and reports for administrators
- 🏖️ **Leave Management**: Easy leave application and approval workflow
- 💰 **Payroll**: Automated payroll calculation based on attendance
- 🌓 **Dark Mode**: Full dark mode support
- 📱 **Responsive**: Mobile-friendly design

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Authentication)
- **AI/ML**: face-api.js for face recognition
- **State Management**: Zustand (optional)
- **Charts**: Recharts

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Modern browser with camera access (for face recognition)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd apps/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Download face-api.js models (see `public/models/README.md`)

5. Set up Supabase database (see Database Schema below)

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## Database Schema

Create the following tables in your Supabase project:

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  department TEXT,
  position TEXT,
  face_descriptor FLOAT8[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### attendance
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### leave_applications
```sql
CREATE TABLE leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### payroll
```sql
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL,
  deductions DECIMAL(10,2) DEFAULT 0,
  bonuses DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### settings
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_start_time TIME NOT NULL,
  work_end_time TIME NOT NULL,
  late_threshold_minutes INTEGER NOT NULL,
  half_day_hours DECIMAL(4,2) NOT NULL,
  full_day_hours DECIMAL(4,2) NOT NULL,
  enable_face_recognition BOOLEAN DEFAULT TRUE,
  enable_location_tracking BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Project Structure

```
apps/web/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Authentication pages
│   ├── (employee)/          # Employee pages
│   ├── (admin)/             # Admin pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # UI components (Button, Card, etc.)
│   ├── FaceRecognition.tsx
│   ├── Navigation.tsx
│   └── AttendanceCard.tsx
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts
│   ├── useAttendance.ts
│   └── useFaceRecognition.ts
├── lib/                     # Utility libraries
│   ├── supabase.ts
│   ├── face-api.ts
│   └── utils.ts
├── types/                   # TypeScript type definitions
│   └── index.ts
├── public/                  # Static assets
│   └── models/             # face-api.js models
└── package.json
```

## Features Guide

### For Employees

1. **Check-In/Check-Out**: Use face recognition or manual check-in
2. **View Records**: See your attendance history and statistics
3. **Apply for Leave**: Submit leave applications with reasons
4. **Track Status**: Monitor leave application status

### For Administrators

1. **Dashboard**: View overall attendance statistics
2. **Manage Employees**: Add, edit, and view employee information
3. **Attendance Reports**: View and export attendance records
4. **Payroll Processing**: Calculate and manage employee payroll
5. **System Settings**: Configure work hours, rules, and features

## Security

- All API routes are protected with Supabase authentication
- Row Level Security (RLS) policies should be configured in Supabase
- Face descriptors are stored securely in the database
- Environment variables for sensitive data

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Camera access is required for face recognition features.

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
