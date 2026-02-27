import { Alert } from 'react-native';

// Theme Colors - WhatsApp Dark Mode
export const lightColors = {
  primary: '#e7e6e5',
  backgroundSecondary: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E7EB',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  attendanceGreen: '#00D492',
  hrPink: '#FF637F',
  cabOrange: '#FFBB64',
  headerBg: '#2D3748',
  primaryBlue: '#008069',
  gradientStart: '#086755ff',
  gradientEnd: '#036c59ff',
};

export const darkColors = {
  primary: '#000D24',
  backgroundSecondary: '#0C1D33',
  white: '#0C1D33',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textLight: '#999999',
  border: '#404040',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  attendanceGreen: '#00D492',
  hrPink: '#FF637F',
  cabOrange: '#FFBB64',
  headerBg: '#141414ff',
  primaryBlue: '#008069',
  gradientStart: '#086755ff',
  gradientEnd: '#036c59ff',
  headerBgLight: '#d8d8d8ff',
};

// Interfaces
export interface IconItem {
  name: string;
  color: string;
  icon: string;
  library: 'fa5' | 'mci';
  module_unique_name?: string;
  iconUrl?: string;
}

export interface Event {
  name: string;
  date: string;
  image: string;
  type?: 'birthday' | 'anniversary';
  years?: number;
}

export interface UserData {
  role: string;
  employee_id: string;
  email: string;
  token: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mpin: string;
  home_address: any;
  office: any;
  phone_number: string;
  profile_picture: string | undefined;
  current_location: any;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  approved_by_hr_at: string | null;
  approved_by_admin_at: string | null;
  is_archived: boolean;
  created_at: string;
  birth_date: string;
  joining_date: string;
  updated_at: string;
  earned_leaves: number;
  sick_leaves: number;
  casual_leaves: number;
  login_time: string | null;
  logout_time: string | null;
  first_login: boolean;
  bio: string;
  designation?: string;
  user_tags: Array<any>;
  reporting_tags: Array<any>;
  days_present: number;
  leaves_applied: number;
  holidays: number;
  late_arrivals: number;
}

export interface Module {
  title: string;
  iconUrl: string;
  module_unique_name: string;
  is_generic: boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  reminder_date: string;
  description?: string;
  created_by?: any;
  color?: string;
  is_completed?: boolean;
}

export interface UpcomingEvent {
  full_name: string;
  date: string;
  type: 'birthday' | 'anniversary';
  years?: number;
  anniversaryYears?: number;
}

export interface ApiResponse {
  message: string;
  modules: Array<{
    module_name: string;
    is_generic: boolean;
    module_id: string;
    module_unique_name: string;
    module_icon: string;
    created_at: string;
    updated_at: string;
  }>;
  user: any;
  upcoming_birthdays: any[];
  is_driver: boolean;
  upcoming_anniversary: any[];
  autoReconfigure: boolean;
  hours_worked_last_7_attendance: any[];
  overtime_hours: any[];
  upcoming_reminder: any[];
  city?: string;
  big_tile?: string;           // ADD THIS
  small_tile_1?: string;        // ADD THIS
  small_tile_2?: string; 
}

export type ActivePage = 
  | 'dashboard' 
  | 'profile' 
  | 'settings' 
  | 'notifications' 
  | 'privacy' 
  | 'messages'
  | 'attendance'
  | 'hr'
  | 'cab'
  | 'assets'
  | 'driver'
  | 'bdt'
  | 'medical'
  | 'scoutBoy'
  | 'reminder'
  | 'bup'
  | 'siteManager'
  | 'employeeManagement'
  | 'hrEmployeeManager'
  | 'driverManager'
  | 'hrManager'
  | 'chat'
  | 'chatRoom'
  | 'validation'
  | 'asset'  
  | 'assets'
  | 'office'
  | 'access'

// Helper functions
export const getInitials = (fullName: string): string => {
  return fullName.split(' ').map(name => name.charAt(0).toUpperCase()).join('').substring(0, 2);
};

export const formatEventDate = (dateString: string): { day: string, month: string, year?: string } => {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString().padStart(2, '0'),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    year: date.getFullYear().toString()
  };
};

export const formatAnniversaryYears = (years: number): string => {
  if (years === 1) return '1st';
  if (years === 2) return '2nd';
  if (years === 3) return '3rd';
  return `${years}th`;
};

export const getModuleColor = (moduleName: string): string => {
  switch (moduleName.toLowerCase()) {
    case 'hr':
      return '#00d285';
    case 'car':
      return '#ff5e7a';
    case 'attendance':
      return '#ffb157';
    case 'bdt':
      return '#1da1f2';
    default:
      return '#008069';
  }
};