export interface RequestNature {
  id: string;
  name: string;
  description?: string;
}

export interface CommentDocument {
  id: number;
  document: string;
  document_url: string;
  document_name: string;
  uploaded_at: string;
}

export interface Comment {
  id: string;
  comment?: string;
  content?: string;
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  is_hr_comment: boolean;
  images?: string[];
  documents?: CommentDocument[];
}

export interface Item {
  id: string;
  nature: string;
  description: string;
  issue?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  comments: Comment[];
}

export type TabType = 'requests' | 'grievances';
export type ViewMode = 'main' | 'itemDetail' | 'newItem';

export const OTHER_OPTION: RequestNature = {
  id: 'other',
  name: 'Other',
  description: 'Any other option not listed above'
};