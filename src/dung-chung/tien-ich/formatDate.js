import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return '—';
    return format(date, 'dd/MM/yyyy', { locale: vi });
  } catch {
    return '—';
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return '—';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch {
    return '—';
  }
}

export function toISODate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString();
}

export function todayISO() {
  return new Date().toISOString();
}

