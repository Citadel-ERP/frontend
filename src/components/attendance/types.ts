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
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  status: string;
  approved_by?: any;
  approved_at?: string | null;
  rejected_at?: string | null;
  total_number_of_days?: number;
  is_sandwich?: boolean;
  comment?: string;
  user?: {
    full_name: string;
    employee_id: string;
    email: string;
    designation?: string;
  };
  cancelled_at?: string | null;
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

export interface LeaveModalProps {
  visible: boolean;
  onClose: () => void;
  leaveForm: LeaveForm;
  onFormChange: (form: LeaveForm) => void;
  onSubmit: () => void;
  loading: boolean;
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
  { value: 'client_meeting', label: 'Client meeting outside' },
  { value: 'personal_work', label: 'Personal work' },
  { value: 'sick', label: 'Feeling unwell' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other (please specify)' }
];

export type TabType = 'attendance' | 'leave' | 'calendar' | 'reports';

export interface LeaveInfoScreenProps {
  leave: LeaveApplication;
  onBack: () => void;
  baseUrl: string;
  token: string;
  onLeaveUpdate?: (updatedLeave: LeaveApplication) => void;
}