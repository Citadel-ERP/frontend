import { eventColors } from './constants';

export const getColorName = (colorValue: string): string => {
  const colorObj = eventColors.find(c => c.value === colorValue);
  return colorObj ? colorObj.name : 'blue';
};

export const getColorValue = (colorName: string | null): string => {
  if (!colorName) return '#007AFF';
  const colorObj = eventColors.find(c => c.name === colorName);
  return colorObj ? colorObj.value : '#007AFF';
};

export const convertTo24Hour = (hour: string, period: string): string => {
  let hourNum = parseInt(hour);
  if (period === 'PM' && hourNum !== 12) {
    hourNum += 12;
  } else if (period === 'AM' && hourNum === 12) {
    hourNum = 0;
  }
  return hourNum.toString().padStart(2, '0');
};

export const convertTo12Hour = (time24: string): { hour: string; minute: string; period: string } => {
  const [hours, minutes] = time24.split(':');
  let hourNum = parseInt(hours);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  
  if (hourNum === 0) {
    hourNum = 12;
  } else if (hourNum > 12) {
    hourNum -= 12;
  }
  
  return {
    hour: hourNum.toString().padStart(2, '0'),
    minute: minutes,
    period
  };
};

export const formatDateToYYYYMMDD = (dateObj: Date): string => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'Invalid Date';
  
  try {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return 'Invalid Date';
    }
    
    const d = new Date(year, month - 1, day);
    
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatTime = (timeString: string): string => {
  const time24 = timeString.substring(0, 5);
  const time12 = convertTo12Hour(time24);
  return `${time12.hour}:${time12.minute} ${time12.period}`;
};

export const isDateBeforeToday = (dateStr: string): boolean => {
  const selectedDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);
  return selectedDate < today;
};

export const getMonthName = (month: number): string => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month];
};