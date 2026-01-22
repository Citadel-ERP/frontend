export interface Employee {
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
}

export interface AttendanceRecord {
  date: string;
  attendance_status: 'present' | 'leave' | 'wfh' | 'absent' | 'holiday' | 'pending' | 'weekend';
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
}

export interface AssignedAsset {
  asset: {
    name: string;
    type: string;
    serial_number: string;
  };
  assigned_at: string;
}

export interface EmployeeDetails {
  employee: Employee;
  leaves?: LeaveRequest[];
  assigned_assets?: AssignedAsset[];
  total_assigned_assets?: number;
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