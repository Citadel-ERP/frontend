// access/types.ts

export interface Employee {
  employee_id: string;
  email: string | null;
  first_name: string;
  last_name: string | null;
  full_name: string;
  role: 'employee' | 'manager' | 'admin';
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
  bio: string | null;
}

export interface ModuleItem {
  module_name: string;
  is_generic: boolean;
  module_id: string;
  module_icon: string | null;
  created_at: string;
  updated_at: string;
  allowed_tags: Tag[];
  module_unique_name: string;
  // only in employee detail context
  access?: boolean;
}

export interface Tag {
  id: number;
  tag_name: string;
  tag_id: string;
  tag_type: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDetailData {
  employee: Employee;
  modules: ModuleItem[];
}

export type ViewMode = 'list' | 'employeeDetail' | 'moduleDetail';
export type ActiveTab = 'employees' | 'modules';

export interface AccessProps {
  onBack: () => void;
}

export const TOKEN_KEY = 'token_2';
export const BACKEND_ADMIN = 'admin'; // path segment

// WhatsApp-inspired color palette
export const COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
};