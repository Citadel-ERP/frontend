// utils.ts - Utility functions

import { colors } from '../../styles/theme';
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatTime = (timeString: string): string => {
  const time = new Date(timeString);
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'present': return colors.success;
    case 'absent': return colors.error;
    case 'late': return colors.warning;
    case 'half_day': return colors.info;
    default: return colors.textSecondary;
  }
};

export const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'approved': return colors.success;
    case 'rejected': return colors.error;
    case 'pending': return colors.warning;
    default: return colors.textSecondary;
  }
};

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const getCurrentYear = () => new Date().getFullYear();

export const getYearsList = (range = 10) => {
  const currentYear = getCurrentYear();
  return Array.from({ length: range }, (_, i) => currentYear - 5 + i);
};

export const formatDateTime = (dateTimeString: string): string => {
  try {
    const date = new Date(dateTimeString);
    const dateOptions: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    };
    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
    return `${formattedDate} at ${formattedTime}`;
  } catch (error) {
    return dateTimeString;
  }
};