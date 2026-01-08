// types.ts - Shared types and interfaces

export interface AttendanceProps {
  onBack: () => void;
}

export interface LeaveBalance {
  casual_leaves: number;
  sick_leaves: number;
  earned_leaves: number;
}

export interface User {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
}

export interface LeaveApplication {
  id: number;
  user: User;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  comment?: string | null;
  is_sandwich?: boolean;
  total_number_of_days?: string; // comes as "4.00", "5.00"
  approved_by?: User | null;
  approved_at?: string | null;
  rejected_at?: string | null;
}



export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string;
}

export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  check_in_time?: string;
  check_out_time?: string;
}

export interface LeaveForm {
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
}

// types.ts - Add these interfaces

export interface ReasonOption {
  value: string;
  label: string;
}

export const CHECKIN_REASONS: ReasonOption[] = [
  { value: 'client_visit', label: 'Client visit/meeting' },
  { value: 'field_work', label: 'Field work' },
  { value: 'sick', label: 'Sick/Medical appointment' },
  { value: 'personal_work', label: 'Personal work' },
  { value: 'other', label: 'Other (please specify)' }
];

export const CHECKOUT_REASONS: ReasonOption[] = [
  { value: 'early_leave', label: 'Early leave' },
  { value: 'client_meeting', label: 'Client meeting outside' },
  { value: 'personal_work', label: 'Personal work' },
  { value: 'sick', label: 'Feeling unwell' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other (please specify)' }
];

export type TabType = 'attendance' | 'leave' | 'calendar' | 'reports';