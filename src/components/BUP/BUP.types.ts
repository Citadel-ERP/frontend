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
  status: 'active' | 'hold' | 'no-requirement' | 'closed' | 'mandate' | 'transaction-complete' | 'non-responsive';
  assigned_by: string | null;
  assigned_to: AssignedTo;
  created_at: string;
  updated_at: string;
  phase: string;
  subphase: string;
  meta: any;
  createdAt?: string;
  collaborators?: CollaboratorData[];
  comments?: ApiComment[];
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

export interface DefaultComment {
  id: number;
  data: string;
  at_subphase: string;
  at_phase: string;
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

export interface LeadCardProps {
  lead: Lead;
  onPress: () => void;
}

export interface DetailViewProps {
  insets: any;
  selectedLead: Lead;
  setSelectedLead: (lead: Lead | null) => void;
  isEditMode: boolean;
  setIsEditMode: (mode: boolean) => void;
  onBack: () => void;
  comments: Comment[];
  setComments: (comments: Comment[]) => void;
  collaborators: CollaboratorData[];
  loadingComments: boolean;
  loadingCollaborators: boolean;
  commentsPagination: Pagination | null;
  loadingMoreComments: boolean;
  editingEmails: string[];
  setEditingEmails: (emails: string[]) => void;
  editingPhones: string[];
  setEditingPhones: (phones: string[]) => void;
  newEmail: string;
  setNewEmail: (email: string) => void;
  newPhone: string;
  setNewPhone: (phone: string) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  newCollaborator: string;
  setNewCollaborator: (collaborator: string) => void;
  showDefaultComments: boolean;
  setShowDefaultComments: (show: boolean) => void;
  defaultComments: DefaultComment[];
  loadingDefaultComments: boolean;
  selectedDocuments: DocumentPicker.DocumentPickerAsset[];
  setSelectedDocuments: (docs: DocumentPicker.DocumentPickerAsset[]) => void;
  addingComment: boolean;
  potentialCollaborators: PotentialCollaborator[];
  setPotentialCollaborators: (collaborators: PotentialCollaborator[]) => void;
  showPotentialCollaborators: boolean;
  setShowPotentialCollaborators: (show: boolean) => void;
  loadingPotentialCollaborators: boolean;
  activeDropdown: string | null;
  setActiveDropdown: (dropdown: string | null) => void;
  allPhases: FilterOption[];
  allSubphases: FilterOption[];
  loading: boolean;
  token: string | null;
  fetchSubphases: (phase: string) => Promise<void>;
  fetchComments: (leadId: number, page: number, append: boolean) => Promise<void>;
  fetchCollaborators: (leadId: number) => Promise<void>;
}

export interface CreateLeadViewProps {
  insets: any;
  onBack: () => void;
  allPhases: FilterOption[];
  allSubphases: FilterOption[];
  newLeadName: string;
  setNewLeadName: (name: string) => void;
  newLeadCompany: string;
  setNewLeadCompany: (company: string) => void;
  newLeadEmails: string[];
  setNewLeadEmails: (emails: string[]) => void;
  newLeadPhones: string[];
  setNewLeadPhones: (phones: string[]) => void;
  newLeadStatus: string;
  setNewLeadStatus: (status: string) => void;
  newLeadPhase: string;
  setNewLeadPhase: (phase: string) => void;
  newLeadSubphase: string;
  setNewLeadSubphase: (subphase: string) => void;
  newLeadAssignedTo: string;
  setNewLeadAssignedTo: (assignedTo: string) => void;
  newEmailInput: string;
  setNewEmailInput: (email: string) => void;
  newPhoneInput: string;
  setNewPhoneInput: (phone: string) => void;
  potentialBDTs: PotentialCollaborator[];
  setPotentialBDTs: (bdts: PotentialCollaborator[]) => void;
  creatingLead: boolean;
  activeDropdown: string | null;
  setActiveDropdown: (dropdown: string | null) => void;
  token: string | null;
  fetchSubphases: (phase: string) => Promise<void>;
  fetchLeads: (page: number) => Promise<void>;
  setViewMode: (mode: string) => void;
}

export interface DefaultCommentsViewProps {
  insets: any;
  onBack: () => void;
  allPhases: FilterOption[];
  allSubphases: FilterOption[];
  allDefaultComments: DefaultComment[];
  setAllDefaultComments: (comments: DefaultComment[]) => void;
  selectedDefaultCommentPhase: string;
  setSelectedDefaultCommentPhase: (phase: string) => void;
  selectedDefaultCommentSubphase: string;
  setSelectedDefaultCommentSubphase: (subphase: string) => void;
  newDefaultCommentText: string;
  setNewDefaultCommentText: (text: string) => void;
  addingDefaultComment: boolean;
  loading: boolean;
  activeDropdown: string | null;
  setActiveDropdown: (dropdown: string | null) => void;
  token: string | null;
  fetchSubphases: (phase: string) => Promise<void>;
}