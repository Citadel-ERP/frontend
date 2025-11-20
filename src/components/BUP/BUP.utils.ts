import { FilterOption } from './BUP.types';
import { colors } from '../../styles/theme';

export const beautifyName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const createFilterOption = (value: string): FilterOption => ({
  value,
  label: beautifyName(value)
});

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatTime = (dateString?: string): string => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return colors.success;
    case 'hold': return colors.warning;
    case 'mandate': return colors.info;
    case 'closed': return colors.error;
    case 'no-requirement': return colors.gray;
    case 'transaction-complete': return colors.primary;
    case 'non-responsive': return colors.textSecondary;
    default: return colors.textSecondary;
  }
};