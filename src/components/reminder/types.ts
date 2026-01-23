export interface Employee {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
}

export interface ReminderItem {
  id: number;
  title: string;
  description: string;
  reminder_date: string;
  reminder_time: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  also_share_with: string[];
  color: string | null;
  created_by: number;
  type?: string;
}

export type ViewMode = 'month' | 'agenda';

export interface ReminderProps {
  onBack: () => void;
}