/**
 * Type definitions for Module Access Management
 */

export interface Employee {
  employee_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  designation?: string;
  email?: string;
  phone?: string;
  office?: {
    address?: {
      city?: string;
    };
  };
  is_active?: boolean;
}

export interface Module {
  module_id: number;
  module_name: string;
  module_unique_name: string;
  module_icon?: string;
  access?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeData {
  employee: Employee;
  modules: Module[];
}

export interface CityGroup {
  city: string;
  employees: Employee[];
}

export interface ApiResponse<T = any> {
  message: string;
  [key: string]: any;
}

export interface GrantAccessPayload {
  token: string;
  employee_id: string;
  module_id: number;
}

export interface RevokeAccessPayload {
  token: string;
  employee_id: string;
  module_id: number;
}

export interface UpdateModulePayload {
  token: string;
  module_id: number;
  module_name?: string;
  module_icon?: string;
}

export interface IconOption {
  name: string;
  value: string;
  icon: string;
  family: 'Ionicons' | 'FontAwesome5' | 'MaterialCommunityIcons';
}