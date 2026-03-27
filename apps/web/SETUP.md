# Commute Management System - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd apps/web
npm install
```

### 2. Set Up Supabase

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Copy your project URL and anon key
4. Create `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
5. Update `.env.local` with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Set Up Database

Run these SQL queries in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  department TEXT,
  position TEXT,
  face_descriptor FLOAT8[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave applications table
CREATE TABLE leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll table
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_start_time TIME NOT NULL DEFAULT '09:00',
  work_end_time TIME NOT NULL DEFAULT '17:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  half_day_hours DECIMAL(4,2) NOT NULL DEFAULT 4,
  full_day_hours DECIMAL(4,2) NOT NULL DEFAULT 8,
  enable_face_recognition BOOLEAN DEFAULT TRUE,
  enable_location_tracking BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for attendance
CREATE POLICY "Users can view their own attendance" ON attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own attendance" ON attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for leave_applications
CREATE POLICY "Users can view their own leaves" ON leave_applications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own leaves" ON leave_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all leaves" ON leave_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for payroll
CREATE POLICY "Users can view their own payroll" ON payroll
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all payroll" ON payroll
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for settings
CREATE POLICY "Everyone can view settings" ON settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_check_in_time ON attendance(check_in_time);
CREATE INDEX idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_payroll_user_id ON payroll(user_id);
CREATE INDEX idx_payroll_year_month ON payroll(year, month);
```

### 4. Download Face Recognition Models

```bash
cd apps/web/public/models

# Clone the face-api.js models repository
git clone https://github.com/justadudewhohacks/face-api.js-models.git temp_models

# Copy required models
cp temp_models/tiny_face_detector/* .
cp temp_models/face_landmark_68/* .
cp temp_models/face_recognition/* .
cp temp_models/face_expression/* .

# Clean up
rm -rf temp_models
```

### 5. Create Database Trigger (Optional)

Create a trigger to automatically create a user profile when someone signs up:

```sql
-- Function to create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    'employee'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 6. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 7. Build for Production

```bash
npm run build
npm start
```

## Testing the Application

### Create Test Users

1. Register a new employee user through the UI
2. Manually create an admin user in Supabase:
   ```sql
   -- First, sign up through the UI, then update the role
   UPDATE users 
   SET role = 'admin' 
   WHERE email = 'admin@example.com';
   ```

### Test Features

#### As Employee:
1. Login with employee credentials
2. Register face (if not done during signup)
3. Check-in with face recognition
4. View attendance records
5. Apply for leave
6. Check-out

#### As Admin:
1. Login with admin credentials
2. View dashboard statistics
3. Manage employees
4. View all attendance records
5. Process payroll
6. Update system settings

## Troubleshooting

### Face Recognition Not Working
- Ensure camera permissions are granted
- Check if models are downloaded in `public/models/`
- Verify browser supports WebRTC (Chrome, Firefox, Safari 14+)

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure API keys are not expired

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (requires 18+)

## Production Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms
- Netlify: Add `npm run build` as build command
- AWS Amplify: Configure build settings
- Docker: Use provided Dockerfile (if available)

## Security Considerations

1. **Never commit `.env.local`** - It's in .gitignore
2. **Enable RLS** - All tables have Row Level Security
3. **Use HTTPS** - Always in production
4. **Rotate keys** - Regularly update API keys
5. **Audit logs** - Monitor Supabase logs regularly

## Support

For issues or questions:
1. Check README.md
2. Review Supabase documentation
3. Check Next.js documentation
4. Open an issue in the repository

## License

MIT
