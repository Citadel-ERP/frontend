import * as DocumentPicker from 'expo-document-picker';

export interface BUPProps { 
  onBack: () => void; 
}

export interface AssignedTo {
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

export interface ContactEmail {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ContactPhone {
  id: number;
  number: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  name: string;
  emails: ContactEmail[];
  phone_numbers: ContactPhone[];
  company: string | null;
  status: 'active' | 'hold' | 'no_requirement' | 'closed' | 'mandate' | 'transaction_complete' | 'non_responsive';
  assigned_by: string | null;
  assigned_to: AssignedTo | null;
  created_at: string;
  updated_at: string;
  phase: string;
  subphase: string;
  meta: any;
  city: string;
  createdAt?: string;
  collaborators?: CollaboratorData[];
  comments?: ApiComment[];
  incentive_present?: boolean;
}

export interface DocumentType {
  id: number;
  document: string;
  document_url: string;
  document_name: string;
  uploaded_at: string;
}

export interface CommentUser {
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

export interface CommentData {
  id: number;
  user: CommentUser;
  content: string;
  documents: DocumentType[];
  created_at: string;
  updated_at: string;
}

export interface ApiComment {
  id: number;
  lead: Lead;
  comment: CommentData;
  created_at: string;
  updated_at: string;
  created_at_phase: string;
  created_at_subphase: string;
}

export interface Comment {
  id: string; 
  commentBy: string; 
  date: string; 
  phase: string; 
  subphase: string;
  content: string; 
  hasFile?: boolean; 
  fileName?: string; 
  documents?: DocumentType[];
  employeeId?: string;
}

export interface AssignedToOption {
  value: string; // employee_id
  label: string; // first_name last_name
  first_name: string;
  last_name: string;
}

export interface CollaboratorData {
  id: number;
  user: CommentUser;
  created_at: string;
  updated_at: string;
}

export interface PotentialCollaborator {
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

export interface PotentialCollaboratorsResponse {
  message: string;
  potential_collaborators: PotentialCollaborator[];
}

export interface FilterOption { 
  value: string; 
  label: string; 
}

export interface DropdownModalProps {
  visible: boolean; 
  onClose: () => void; 
  options: FilterOption[];
  onSelect: (value: string) => void; 
  title: string; 
  searchable?: boolean;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
}

export interface LeadsResponse {
  message: string;
  leads: Lead[];
  pagination?: Pagination;
}

export interface CommentsResponse {
  message: string;
  comments: ApiComment[];
  pagination: Pagination;
}

export interface CollaboratorsResponse {
  message: string;
  collaborators: CollaboratorData[];
}

export interface UpdateLeadResponse {
  message: string;
  lead: Lead;
}

export interface CreateLeadResponse {
  message: string;
  lead: Lead;
}

export interface PhasesResponse {
  message: string;
  phases: string[];
}

export interface SubphasesResponse {
  message: string;
  subphases: string[];
}

export interface AddCommentResponse {
  message: string;
  lead_comment: ApiComment;
}

export type ViewMode = 'city-selection' | 'list' | 'detail' | 'create';

export interface ThemeColors {
  primary: string;
  primaryBlue: string;
  background: string;
  backgroundSecondary: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  textLight: string;
  border: string;
  white: string;
  gray: string;
  info: string;
  error: string;
  success: string;
  warning: string;
  moduleColors: {
    bup: string;
    hr: string;
    cab: string;
    attendance: string;
  };
  headerBg: string;
  gradientStart: string;
  gradientEnd: string;
  leadStatusColors: {
    active: string;
    pending: string;
    cold: string;
  };
}