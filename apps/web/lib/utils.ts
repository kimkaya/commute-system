import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function calculateWorkHours(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    present: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    absent: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    late: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    'half-day': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    approved: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    rejected: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  };
  return colors[status] || 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
