# Shared Package

Shared TypeScript types and constants used across the Commute System web and desktop applications.

## 📦 Contents

### Types (`types.ts`)

Shared TypeScript interfaces and types:

- **User Types**: `User`, `Employee`, `Admin`
- **Attendance**: `AttendanceRecord`, `Location`
- **Leave**: `LeaveRequest`
- **Payroll**: `PayrollRecord`
- **Settings**: `SystemSettings`, `Holiday`
- **Dashboard**: `DashboardStats`, `AttendanceSummary`
- **API**: `ApiResponse`, `PaginatedResponse`
- **Face Recognition**: `FaceDescriptor`, `FaceMatch`

### Constants (`constants.ts`)

Shared constants and configurations:

- **API Endpoints**: All API route paths
- **Status Values**: Leave, attendance, and payroll statuses with labels and colors
- **Work Schedule**: Default work hours and overtime settings
- **Face Recognition**: Match thresholds and model settings
- **Validation**: Input validation rules
- **Messages**: Error and success messages in Korean
- **Storage**: Local storage key names
- **Formats**: Date and time format strings

## 🔧 Usage

### In Web App (Next.js)

```typescript
import { User, ATTENDANCE_STATUS, API_ENDPOINTS } from '@/../../packages/shared';

// Use shared types
const user: User = {
  id: '1',
  email: 'user@example.com',
  // ...
};

// Use constants
const statusLabel = ATTENDANCE_STATUS.find(s => s.value === 'present')?.label;
const endpoint = API_ENDPOINTS.CHECK_IN;
```

### In Desktop App (Electron)

```typescript
import { Employee, LEAVE_TYPES } from '../../packages/shared';

// Types are shared between web and desktop
const employee: Employee = {
  // ...
};
```

## 📝 Adding New Shared Code

When adding new types or constants that should be shared:

1. Add to appropriate file (`types.ts` or `constants.ts`)
2. Export from `index.ts`
3. Use in both web and desktop apps

## 🎯 Benefits

- **Type Safety**: Consistent types across applications
- **Single Source of Truth**: Constants defined once
- **Easy Updates**: Change in one place affects all apps
- **Better DX**: Autocomplete and IntelliSense support
- **Reduced Duplication**: No need to copy-paste types

## 📄 License

MIT
