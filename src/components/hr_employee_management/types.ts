// hr_employee_management/types.ts
export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  designation: string;
  profile_picture: string | null;
  phone_number: string;
  joining_date: string;
  is_active: boolean;
  is_archived: boolean;
  earned_leaves: number;
  sick_leaves: number;
  casual_leaves: number;
  reporting_tags?: Array<any>;
  token: string;
  gift_basket_sent?: boolean;
  login_time?: string;
  logout_time?: string;
  city?: string;
  any_action?: boolean;
  action_type?: string;
  birth_date?: string | null;        
}

export interface AttendanceRecord {
  date: string;
  attendance_status?: string;
  day?: string;
  check_in_time?: string;
  check_out_time?: string;
  captured_locations?: any[];
}

export interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_number_of_days?: number;
  reason?: string;
  status: string;
  manager_comment?: string;
  admin_comment?: string;
  reject_reason?: string;
}

export interface AssignedAsset {
  id: string;
  asset: {
    name: string;
    type: string;
    serial_number: string;
  };
  asset_count: number;
  assigned_at: string;
}

export interface EmployeeDetails {
  employee: Employee;
  leaves?: LeaveRequest[];
  assigned_assets?: AssignedAsset[];
  total_assigned_assets?: number;
  mediclaim?: any;
}

export type ActiveTab = 'overview' | 'attendance' | 'leaves';

export interface EmployeeManagementProps {
  onBack: () => void;
}

export interface EmployeeDetailsProps {
  employee: Employee;
  onBack: () => void;
  token: string;
}

export interface MediclaimData {
  policy_number: string;
  insurance_provider_name: string;
  sum_insured_opted: number;
  base_cover: number;
  optional_top_up_cover: number;
  uploaded_to_portal_on: string;
  update_allowed: boolean;
  employee_signature: string | null;
  sig_and_stamp: string | null;
}