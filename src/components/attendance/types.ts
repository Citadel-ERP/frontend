// types.ts - Shared types and interfaces

export interface AttendanceProps {
  onBack: () => void;
}

export interface LeaveBalance {
  casual_leaves: number;
  sick_leaves: number;
  earned_leaves: number;
}

export interface LeaveApplication {
  id: number;
  start_date: string;
  end_date: string;
  leave_type: string;
  leave_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_date: string;
  rejection_reason?: string;
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

export type TabType = 'attendance' | 'leave' | 'calendar' | 'reports';