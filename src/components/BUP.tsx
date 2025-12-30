import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, TextInput, FlatList, Dimensions, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
import * as DocumentPicker from 'expo-document-picker';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

interface BUPProps { onBack: () => void; }

interface AssignedTo {
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

interface ContactEmail {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
}

interface ContactPhone {
  id: number;
  number: string;
  created_at: string;
  updated_at: string;
}

interface Lead {
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

interface DocumentType {
  id: number;
  document: string;
  document_url: string;
  document_name: string;
  uploaded_at: string;
}

interface CommentUser {
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

interface CommentData {
  id: number;
  user: CommentUser;
  content: string;
  documents: DocumentType[];
  created_at: string;
  updated_at: string;
}

interface ApiComment {
  id: number;
  lead: Lead;
  comment: CommentData;
  created_at: string;
  updated_at: string;
  created_at_phase: string;
  created_at_subphase: string;
}

interface Comment {
  id: string; commentBy: string; date: string; phase: string; subphase: string;
  content: string; hasFile?: boolean; fileName?: string; documents?: DocumentType[];
}

interface CollaboratorData {
  id: number;
  user: CommentUser;
  created_at: string;
  updated_at: string;
}

interface PotentialCollaborator {
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

interface PotentialCollaboratorsResponse {
  message: string;
  potential_collaborators: PotentialCollaborator[];
}

interface FilterOption { value: string; label: string; }

interface DropdownModalProps {
  visible: boolean; onClose: () => void; options: FilterOption[];
  onSelect: (value: string) => void; title: string; searchable?: boolean;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
}

interface LeadsResponse {
  message: string;
  leads: Lead[];
  pagination?: Pagination;
}

interface CommentsResponse {
  message: string;
  comments: ApiComment[];
  pagination: Pagination;
}

interface CollaboratorsResponse {
  message: string;
  collaborators: CollaboratorData[];
}

interface UpdateLeadResponse {
  message: string;
  lead: Lead;
}

interface CreateLeadResponse {
  message: string;
  lead: Lead;
}

interface PhasesResponse {
  message: string;
  phases: string[];
}

interface SubphasesResponse {
  message: string;
  subphases: string[];
}

interface AddCommentResponse {
  message: string;
  lead_comment: ApiComment;
}

const CITIES: FilterOption[] = [
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Bangalore', label: 'Bangalore' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Gurgaon', label: 'Gurgaon' },
  { value: 'Noida', label: 'Noida' }
];

const beautifyName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const createFilterOption = (value: string): FilterOption => ({
  value,
  label: beautifyName(value)
});

const DropdownModal: React.FC<DropdownModalProps> = ({ 
  visible, onClose, options, onSelect, title, searchable = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOptions = searchable 
    ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            {searchable && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => { onSelect(item.value); onClose(); }}
                >
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyDropdown}>
                  <Text style={styles.emptyDropdownText}>No options found</Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const BUP: React.FC<BUPProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'city-selection' | 'list' | 'detail' | 'create'>('city-selection');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<Pagination | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newCollaborator, setNewCollaborator] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'filter' | 'filter-phase' | 'filter-subphase' | 'assigned-to' | 'city-select' | null>(null);

  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);

  const [potentialCollaborators, setPotentialCollaborators] = useState<PotentialCollaborator[]>([]);
  const [showPotentialCollaborators, setShowPotentialCollaborators] = useState(false);
  const [loadingPotentialCollaborators, setLoadingPotentialCollaborators] = useState(false);
  const [collaboratorSearchTimeout, setCollaboratorSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const [potentialAssignees, setPotentialAssignees] = useState<PotentialCollaborator[]>([]);
  const [showPotentialAssignees, setShowPotentialAssignees] = useState(false);
  const [loadingPotentialAssignees, setLoadingPotentialAssignees] = useState(false);
  const [assigneeSearchTimeout, setAssigneeSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [assignToEmail, setAssignToEmail] = useState('');

  const [editingEmails, setEditingEmails] = useState<string[]>([]);
  const [editingPhones, setEditingPhones] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [createLeadForm, setCreateLeadForm] = useState({
    name: '',
    company: '',
    status: 'active' as Lead['status'],
    phase: 'initial_phase',
    subphase: 'without_contact_details'
  });

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no_requirement', label: 'No Requirement' },
    { value: 'transaction_complete', label: 'Transaction Complete' },
    { value: 'non_responsive', label: 'Non Responsive' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Leads' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'phase', label: 'Filter by Phase' },
    { value: 'subphase', label: 'Filter by Subphase' }
  ];

  // Filter leads based on selected filters
  const filteredLeads = leads.filter(lead => {
    let matchesFilter = true;
    if (filterBy && filterValue) {
      if (filterBy === 'status') {
        matchesFilter = lead.status === filterValue;
      } else if (filterBy === 'phase') {
        matchesFilter = lead.phase === filterValue;
      } else if (filterBy === 'subphase') {
        matchesFilter = lead.subphase === filterValue;
      }
    }
    return matchesFilter;
  });

  // ==================== EFFECT HOOKS ====================
  useEffect(() => {
    const getToken = async () => {
      try {
        const API_TOKEN = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(API_TOKEN);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token && selectedCity && viewMode === 'list') {
      fetchLeads(1);
      fetchPhases();
    }
  }, [token, selectedCity]);

  // ==================== DATA FETCHING FUNCTIONS ====================
  const fetchPotentialCollaborators = async (query: string): Promise<void> => {
    if (!query.trim() || !token) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }

    try {
      setLoadingPotentialCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/manager/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PotentialCollaboratorsResponse = await response.json();
      setPotentialCollaborators(data.potential_collaborators);
      setShowPotentialCollaborators(data.potential_collaborators.length > 0);
    } catch (error) {
      console.error('Error fetching potential collaborators:', error);
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    } finally {
      setLoadingPotentialCollaborators(false);
    }
  };

  const fetchPotentialAssignees = async (query: string): Promise<void> => {
    if (!query.trim() || !token) {
      setPotentialAssignees([]);
      setShowPotentialAssignees(false);
      return;
    }

    try {
      setLoadingPotentialAssignees(true);

      const response = await fetch(`${BACKEND_URL}/manager/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PotentialCollaboratorsResponse = await response.json();
      setPotentialAssignees(data.potential_collaborators);
      setShowPotentialAssignees(data.potential_collaborators.length > 0);
    } catch (error) {
      console.error('Error fetching potential assignees:', error);
      setPotentialAssignees([]);
      setShowPotentialAssignees(false);
    } finally {
      setLoadingPotentialAssignees(false);
    }
  };

  const fetchLeads = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token || !selectedCity) return;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const requestBody: any = {
        token: token,
        city: selectedCity,
        page: page
      };

      if (filterBy && filterValue) {
        requestBody.filters = {
          [filterBy]: filterValue
        };
      }

      const response = await fetch(`${BACKEND_URL}/manager/getLeads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      
      const transformedLeads = data.leads.map(lead => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: []
      }));

      if (append) {
        setLeads(prevLeads => [...prevLeads, ...transformedLeads]);
      } else {
        setLeads(transformedLeads);
      }
      
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching leads:', error);
      Alert.alert('Error', 'Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const fetchComments = async (leadId: number, page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const response = await fetch(`${BACKEND_URL}/manager/getLeadComments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId,
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CommentsResponse = await response.json();
      
      const transformedComments: Comment[] = data.comments.map(apiComment => ({
        id: apiComment.comment.id.toString(),
        commentBy: apiComment.comment.user.full_name,
        date: apiComment.comment.created_at,
        phase: apiComment.created_at_phase,
        subphase: apiComment.created_at_subphase,
        content: apiComment.comment.content,
        hasFile: apiComment.comment.documents.length > 0,
        fileName: apiComment.comment.documents.length > 0 
          ? apiComment.comment.documents.map(doc => doc.document_name).join(', ')
          : undefined,
        documents: apiComment.comment.documents
      }));

      if (append) {
        setComments(prevComments => [...prevComments, ...transformedComments]);
      } else {
        setComments(transformedComments);
      }
      
      setCommentsPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to fetch comments. Please try again.');
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  const fetchCollaborators = async (leadId: number): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/manager/getLeadCollaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CollaboratorsResponse = await response.json();
      setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      Alert.alert('Error', 'Failed to fetch collaborators. Please try again.');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const fetchPhases = async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllPhases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PhasesResponse = await response.json();
      setAllPhases(data.phases.map(createFilterOption));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  };

  const fetchSubphases = async (phase: string): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SubphasesResponse = await response.json();
      setAllSubphases(data.subphases.map(createFilterOption));
    } catch (error) {
      console.error('Error fetching subphases:', error);
      setAllSubphases([]);
    }
  };

  const searchLeads = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setIsSearchMode(false);
      fetchLeads(1);
      return;
    }

    try {
      setLoading(true);
      setIsSearchMode(true);

      const response = await fetch(`${BACKEND_URL}/manager/searchLead?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      
      const transformedLeads = data.leads.map(lead => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: []
      }));

      setLeads(transformedLeads);
      setPagination(null);
    } catch (error) {
      console.error('Error searching leads:', error);
      Alert.alert('Error', 'Failed to search leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== CRUD OPERATIONS ====================
  const updateLead = async (leadData: Partial<Lead>, emails: string[], phones: string[]): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      setLoading(true);

      const updatePayload: any = {
        token: token,
        lead_id: selectedLead.id
      };

      if (emails.length > 0) updatePayload.emails = emails;
      if (phones.length > 0) updatePayload.phone_numbers = phones;
      if (leadData.name !== undefined) updatePayload.name = leadData.name;
      if (leadData.company !== undefined) updatePayload.company = leadData.company;
      if (leadData.status !== undefined) updatePayload.status = leadData.status;
      if (leadData.phase !== undefined) updatePayload.phase = leadData.phase;
      if (leadData.subphase !== undefined) updatePayload.subphase = leadData.subphase;
      if (leadData.city !== undefined) updatePayload.city = leadData.city;
      if (assignToEmail.trim()) updatePayload.assigned_to = assignToEmail.trim();

      const response = await fetch(`${BACKEND_URL}/manager/updateLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: UpdateLeadResponse = await response.json();
      
      const updatedLead = {
        ...data.lead,
        createdAt: data.lead.created_at,
        collaborators: collaborators,
        comments: []
      };
      
      setSelectedLead(updatedLead);
      
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === selectedLead.id ? updatedLead : lead
        )
      );

      Alert.alert('Success', 'Lead updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', error.message || 'Failed to update lead. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (): Promise<boolean> => {
    try {
      if (!token || !selectedCity) return false;
      
      if (!createLeadForm.name.trim()) {
        Alert.alert('Error', 'Lead name is required');
        return false;
      }

      setLoading(true);

      const createPayload: any = {
        token: token,
        name: createLeadForm.name.trim(),
        city: selectedCity,
        status: createLeadForm.status,
        phase: createLeadForm.phase,
        subphase: createLeadForm.subphase
      };

      if (createLeadForm.company.trim()) {
        createPayload.company = createLeadForm.company.trim();
      }

      if (editingEmails.length > 0) {
        createPayload.emails = editingEmails;
      }

      if (editingPhones.length > 0) {
        createPayload.phone_numbers = editingPhones;
      }

      if (assignToEmail.trim()) {
        createPayload.assigned_to = assignToEmail.trim();
      }

      const response = await fetch(`${BACKEND_URL}/manager/createLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: CreateLeadResponse = await response.json();
      
      Alert.alert('Success', 'Lead created successfully!');
      
      setCreateLeadForm({
        name: '',
        company: '',
        status: 'active',
        phase: 'initial_phase',
        subphase: 'without_contact_details'
      });
      setEditingEmails([]);
      setEditingPhones([]);
      setAssignToEmail('');
      
      fetchLeads(1);
      setViewMode('list');
      
      return true;
    } catch (error: any) {
      console.error('Error creating lead:', error);
      Alert.alert('Error', error.message || 'Failed to create lead. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (leadId: number): Promise<boolean> => {
    try {
      if (!token) return false;

      const response = await fetch(`${BACKEND_URL}/manager/deleteLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      Alert.alert('Success', 'Lead deleted successfully!');
      fetchLeads(1);
      setViewMode('list');
      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      Alert.alert('Error', 'Failed to delete lead. Please try again.');
      return false;
    }
  };

  const addCommentToBackend = async (comment: string, documents: DocumentPicker.DocumentPickerAsset[]): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      setAddingComment(true);

      const formData = new FormData();
      formData.append('token', token);
      formData.append('lead_id', selectedLead.id.toString());
      formData.append('comment', comment);

      if (documents && documents.length > 0) {
        documents.forEach((doc, index) => {
          formData.append('documents', {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name,
          } as any);
        });
      }

      const response = await fetch(`${BACKEND_URL}/manager/createLeadComment`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AddCommentResponse = await response.json();
      
      const newComment: Comment = {
        id: data.lead_comment.comment.id.toString(),
        commentBy: data.lead_comment.comment.user.full_name,
        date: data.lead_comment.comment.created_at,
        phase: data.lead_comment.created_at_phase,
        subphase: data.lead_comment.created_at_subphase,
        content: data.lead_comment.comment.content,
        hasFile: data.lead_comment.comment.documents.length > 0,
        fileName: data.lead_comment.comment.documents.length > 0 
          ? data.lead_comment.comment.documents.map(doc => doc.document_name).join(', ')
          : undefined,
        documents: data.lead_comment.comment.documents
      };

      setComments(prevComments => [newComment, ...prevComments]);
      
      Alert.alert('Success', 'Comment added successfully!');
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
      return false;
    } finally {
      setAddingComment(false);
    }
  };

  const addCollaborator = async (email: string): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      const response = await fetch(`${BACKEND_URL}/manager/addCollaborator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: selectedLead.id,
          email: email
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator added successfully!');
      return true;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      Alert.alert('Error', 'Failed to add collaborator. Please try again.');
      return false;
    }
  };

  const removeCollaborator = async (collaboratorId: number): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      const response = await fetch(`${BACKEND_URL}/manager/removeCollaborator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: selectedLead.id,
          collaborator_id: collaboratorId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator removed successfully!');
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', 'Failed to remove collaborator. Please try again.');
      return false;
    }
  };

  // ==================== EVENT HANDLERS ====================
  const handleCollaboratorInputChange = (text: string) => {
    setNewCollaborator(text);
    
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    
    if (!text.trim()) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      fetchPotentialCollaborators(text);
    }, 500);
    
    setCollaboratorSearchTimeout(timeout);
  };

  const handleAssigneeInputChange = (text: string) => {
    setAssignToEmail(text);
    
    if (assigneeSearchTimeout) {
      clearTimeout(assigneeSearchTimeout);
    }
    
    if (!text.trim()) {
      setPotentialAssignees([]);
      setShowPotentialAssignees(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      fetchPotentialAssignees(text);
    }, 500);
    
    setAssigneeSearchTimeout(timeout);
  };

  const handlePotentialCollaboratorSelect = (collaborator: PotentialCollaborator) => {
    setNewCollaborator(collaborator.email);
    setShowPotentialCollaborators(false);
    setPotentialCollaborators([]);
  };

  const handlePotentialAssigneeSelect = (assignee: PotentialCollaborator) => {
    setAssignToEmail(assignee.email);
    setShowPotentialAssignees(false);
    setPotentialAssignees([]);
  };

  const handleAttachDocuments = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
      });

      if (!result.canceled && result.assets) {
        setSelectedDocuments(result.assets);
        Alert.alert(
          'Files Selected',
          `${result.assets.length} file(s) selected: ${result.assets.map(doc => doc.name).join(', ')}`
        );
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

  const handleSearchSubmit = () => {
    searchLeads(searchQuery);
  };

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchLeads(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode]);

  const handleLoadMoreComments = useCallback(() => {
    if (commentsPagination && commentsPagination.has_next && !loadingMoreComments && selectedLead) {
      fetchComments(selectedLead.id, commentsPagination.current_page + 1, true);
    }
  }, [commentsPagination, loadingMoreComments, selectedLead]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  };

  const handleCommentsScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMoreComments();
    }
  };

  const handleCitySelection = (city: string) => {
    setSelectedCity(city);
    setViewMode('list');
  };

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
    
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    setNewComment('');
    setNewCollaborator('');
    setPotentialCollaborators([]);
    setShowPotentialCollaborators(false);
    setAssignToEmail(lead.assigned_to?.email || '');
    setPotentialAssignees([]);
    setShowPotentialAssignees(false);
    
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    if (assigneeSearchTimeout) {
      clearTimeout(assigneeSearchTimeout);
    }
    
    setEditingEmails(lead.emails.map(e => e.email) || []);
    setEditingPhones(lead.phone_numbers.map(p => p.number) || []);
    
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedLead(null);
    setIsEditMode(false);
    setNewComment('');
    setNewCollaborator('');
    
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    
    setPotentialCollaborators([]);
    setShowPotentialCollaborators(false);
    setPotentialAssignees([]);
    setShowPotentialAssignees(false);
    setAssignToEmail('');
    
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    if (assigneeSearchTimeout) {
      clearTimeout(assigneeSearchTimeout);
    }
    
    setEditingEmails([]);
    setEditingPhones([]);
    setNewEmail('');
    setNewPhone('');
  };

  const handleBackToCitySelection = () => {
    setViewMode('city-selection');
    setSelectedCity('');
    setLeads([]);
    setSearchQuery('');
    setFilterBy('');
    setFilterValue('');
    setIsSearchMode(false);
  };

  const handleSave = async () => {
    if (!selectedLead) return;
    
    const success = await updateLead(selectedLead, editingEmails, editingPhones);
    if (success) {
      setIsEditMode(false);
      setNewEmail('');
      setNewPhone('');
      setAssignToEmail('');
      setPotentialAssignees([]);
      setShowPotentialAssignees(false);
    }
  };

  const handleDelete = () => {
    if (!selectedLead) return;
    
    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete "${selectedLead.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteLead(selectedLead.id)
        }
      ]
    );
  };

  const handleCreateLead = () => {
    setViewMode('create');
    setCreateLeadForm({
      name: '',
      company: '',
      status: 'active',
      phase: 'initial_phase',
      subphase: 'without_contact_details'
    });
    setEditingEmails([]);
    setEditingPhones([]);
    setAssignToEmail('');
    setPotentialAssignees([]);
    setShowPotentialAssignees(false);
    fetchPhases();
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (editingEmails.includes(newEmail.trim())) {
      Alert.alert('Error', 'This email already exists');
      return;
    }
    setEditingEmails([...editingEmails, newEmail.trim()]);
    setNewEmail('');
  };

  const handleRemoveEmail = (index: number) => {
    setEditingEmails(editingEmails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    if (!newPhone.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (editingPhones.includes(newPhone.trim())) {
      Alert.alert('Error', 'This phone number already exists');
      return;
    }
    setEditingPhones([...editingPhones, newPhone.trim()]);
    setNewPhone('');
  };

  const handleRemovePhone = (index: number) => {
    setEditingPhones(editingPhones.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedLead) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    const success = await addCommentToBackend(newComment.trim(), selectedDocuments);
    if (success) {
      setNewComment('');
      setSelectedDocuments([]);
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollaborator.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    const success = await addCollaborator(newCollaborator.trim());
    if (success) {
      setNewCollaborator('');
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    }
  };

  const handleRemoveCollaborator = (collaborator: CollaboratorData) => {
    Alert.alert(
      'Remove Collaborator',
      `Are you sure you want to remove ${collaborator.user.full_name} from this lead?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeCollaborator(collaborator.id)
        }
      ]
    );
  };

  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  const handleFilterSelection = (filterType: string) => {
    setFilterBy(filterType);
    if (!filterType) {
      setFilterValue('');
      setSelectedPhase('');
    } else {
      setTimeout(() => {
        if (filterType === 'status') {
          setActiveDropdown('status');
        } else if (filterType === 'phase') {
          setActiveDropdown('filter-phase');
        } else if (filterType === 'subphase') {
          if (allPhases.length > 0) {
            setActiveDropdown('filter-phase');
          }
        }
      }, 300);
    }
  };

  const handlePhaseSelectionForFilter = (phase: string) => {
    setSelectedPhase(phase);
    if (filterBy === 'phase') {
      setFilterValue(phase);
    } else if (filterBy === 'subphase') {
      fetchSubphases(phase);
      setTimeout(() => {
        setActiveDropdown('filter-subphase');
      }, 300);
    }
  };

  const handlePhaseSelection = async (phase: string) => {
    if (viewMode === 'create') {
      setCreateLeadForm({...createLeadForm, phase: phase, subphase: ''});
      await fetchSubphases(phase);
    } else if (selectedLead) {
      setSelectedLead({...selectedLead, phase: phase, subphase: ''});
      await fetchSubphases(phase);
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return colors.success;
      case 'hold': return colors.warning;
      case 'mandate': return colors.info;
      case 'closed': return colors.error;
      case 'no_requirement': return colors.gray;
      case 'transaction_complete': return colors.primary;
      case 'non_responsive': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'phase': choices = allPhases; break;
      case 'subphase': choices = allSubphases; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  // ==================== RENDER FUNCTIONS ====================
  
  // City Selection Screen
  if (viewMode === 'city-selection') {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select City</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.citySelectionContainer}>
          <Text style={styles.citySelectionTitle}>Choose a city to manage leads</Text>
          <Text style={styles.citySelectionSubtitle}>Select the city you want to work with</Text>
          
          <View style={styles.cityCardsContainer}>
            {CITIES.map((city) => (
              <TouchableOpacity
                key={city.value}
                style={styles.cityCard}
                onPress={() => handleCitySelection(city.value)}
              >
                <Text style={styles.cityCardIcon}>🏙️</Text>
                <Text style={styles.cityCardName}>{city.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Create Lead Screen
  if (viewMode === 'create') {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Lead</Text>
          <TouchableOpacity style={styles.saveButton} onPress={createLead} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lead Name *</Text>
              <TextInput
                style={styles.input}
                value={createLeadForm.name}
                onChangeText={(text) => setCreateLeadForm({...createLeadForm, name: text})}
                placeholder="Enter lead name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Company</Text>
              <TextInput
                style={styles.input}
                value={createLeadForm.company}
                onChangeText={(text) => setCreateLeadForm({...createLeadForm, company: text})}
                placeholder="Enter company name (optional)"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{selectedCity}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <Text style={styles.subsectionTitle}>Email Addresses ({editingEmails.length})</Text>
            {editingEmails.map((email, index) => (
              <View key={index} style={styles.contactItemContainer}>
                <View style={styles.contactItemContent}>
                  <Text style={styles.contactItemText}>📧 {email}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeContactButton}
                  onPress={() => handleRemoveEmail(index)}
                >
                  <Text style={styles.removeContactButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addContactContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Add email..."
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.subsectionTitle, { marginTop: spacing.lg }]}>Phone Numbers ({editingPhones.length})</Text>
            {editingPhones.map((phone, index) => (
              <View key={index} style={styles.contactItemContainer}>
                <View style={styles.contactItemContent}>
                  <Text style={styles.contactItemText}>📱 {phone}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeContactButton}
                  onPress={() => handleRemovePhone(index)}
                >
                  <Text style={styles.removeContactButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addContactContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Add phone..."
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddPhone}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Lead Management</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Status</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setActiveDropdown('status')}
              >
                <Text style={styles.dropdownText}>
                  {getFilterLabel('status', createLeadForm.status)}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phase</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setActiveDropdown('phase')}
              >
                <Text style={styles.dropdownText}>
                  {getFilterLabel('phase', createLeadForm.phase)}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subphase</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setActiveDropdown('subphase')}
              >
                <Text style={styles.dropdownText}>
                  {getFilterLabel('subphase', createLeadForm.subphase)}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assign To (BDT)</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={styles.input}
                  value={assignToEmail}
                  onChangeText={handleAssigneeInputChange}
                  placeholder="Enter BDT email (optional)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                />
                
                {showPotentialAssignees && (
                  <View style={styles.potentialCollaboratorsDropdown}>
                    {loadingPotentialAssignees ? (
                      <View style={styles.potentialCollaboratorLoadingItem}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.potentialCollaboratorLoadingText}>Searching...</Text>
                      </View>
                    ) : (
                      <ScrollView
                        style={styles.potentialCollaboratorsList}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                      >
                        {potentialAssignees.map((assignee) => (
                          <TouchableOpacity
                            key={assignee.employee_id}
                            style={styles.potentialCollaboratorItem}
                            onPress={() => handlePotentialAssigneeSelect(assignee)}
                          >
                            <View style={styles.potentialCollaboratorInfo}>
                              <Text style={styles.potentialCollaboratorName}>
                                {assignee.full_name}
                              </Text>
                              <Text style={styles.potentialCollaboratorEmail}>
                                {assignee.email}
                              </Text>
                              <Text style={styles.potentialCollaboratorRole}>
                                {assignee.designation || assignee.role}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <DropdownModal
          visible={activeDropdown === 'status'}
          onClose={() => setActiveDropdown(null)}
          options={STATUS_CHOICES}
          onSelect={(value) => setCreateLeadForm({...createLeadForm, status: value as Lead['status']})}
          title="Select Status"
        />
        <DropdownModal
          visible={activeDropdown === 'phase'}
          onClose={() => setActiveDropdown(null)}
          options={allPhases}
          onSelect={handlePhaseSelection}
          title="Select Phase"
        />
        <DropdownModal
          visible={activeDropdown === 'subphase'}
          onClose={() => setActiveDropdown(null)}
          options={allSubphases}
          onSelect={(value) => setCreateLeadForm({...createLeadForm, subphase: value})}
          title="Select Subphase"
        />
      </SafeAreaView>
    );
  }

  // Lead Detail Screen
  if (viewMode === 'detail' && selectedLead) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead Details</Text>
          <View style={styles.headerActions}>
            {!isEditMode ? (
              <>
                <TouchableOpacity style={styles.incentiveButton} onPress={() => Alert.alert('Coming Soon', 'Incentive view will be added soon')}>
                  <Text style={styles.incentiveButtonText}>💰</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editButton} onPress={() => setIsEditMode(true)}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView 
          style={styles.detailScrollView} 
          showsVerticalScrollIndicator={false}
          onScroll={handleCommentsScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.detailCard}>
            <View style={styles.leadHeader}>
              <View style={styles.leadInfo}>
                <View style={styles.leadNameRow}>
                  {isEditMode ? (
                    <TextInput
                      style={[styles.input, { fontSize: fontSize.xxl, fontWeight: '700', flex: 1 }]}
                      value={selectedLead.name}
                      onChangeText={(text) => setSelectedLead({...selectedLead, name: text})}
                      placeholder="Lead name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.leadName}>{selectedLead.name}</Text>
                  )}
                </View>
                <View style={styles.statusIndicatorRow}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedLead.status) }]} />
                  <Text style={styles.statusText}>{beautifyName(selectedLead.status)}</Text>
                </View>
                {isEditMode ? (
                  <TextInput
                    style={[styles.input, { marginBottom: spacing.sm }]}
                    value={selectedLead.company || ''}
                    onChangeText={(text) => setSelectedLead({...selectedLead, company: text})}
                    placeholder="Company name"
                    placeholderTextColor={colors.textSecondary}
                  />
                ) : (
                  <Text style={styles.leadCompany}>{selectedLead.company || 'No company'}</Text>
                )}
                <Text style={styles.leadDate}>Created: {formatDateTime(selectedLead.created_at || selectedLead.createdAt)}</Text>
                <Text style={styles.leadDate}>Updated: {formatDateTime(selectedLead.updated_at)}</Text>
                {selectedLead.assigned_to && (
                  <Text style={styles.leadAssigned}>
                    Assigned to: {selectedLead.assigned_to.full_name} ({selectedLead.assigned_to.email})
                  </Text>
                )}
                <View style={styles.cityBadge}>
                  <Text style={styles.cityBadgeText}>📍 {selectedLead.city}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Email Addresses ({editingEmails.length})</Text>
            
            {editingEmails.length > 0 ? (
              editingEmails.map((email, index) => (
                <View key={index} style={styles.contactItemContainer}>
                  <View style={styles.contactItemContent}>
                    <Text style={styles.contactItemText}>📧 {email}</Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity 
                      style={styles.removeContactButton}
                      onPress={() => handleRemoveEmail(index)}
                    >
                      <Text style={styles.removeContactButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyContactContainer}>
                <Text style={styles.emptyContactText}>No emails added</Text>
              </View>
            )}

            {isEditMode && (
              <View style={styles.addContactContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="Add email..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Phone Numbers ({editingPhones.length})</Text>
            
            {editingPhones.length > 0 ? (
              editingPhones.map((phone, index) => (
                <View key={index} style={styles.contactItemContainer}>
                  <View style={styles.contactItemContent}>
                    <Text style={styles.contactItemText}>📱 {phone}</Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity 
                      style={styles.removeContactButton}
                      onPress={() => handleRemovePhone(index)}
                    >
                      <Text style={styles.removeContactButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyContactContainer}>
                <Text style={styles.emptyContactText}>No phone numbers added</Text>
              </View>
            )}

            {isEditMode && (
              <View style={styles.addContactContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="Add phone..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddPhone}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Lead Management</Text>
            
            <View style={styles.managementRow}>
              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>Status</Text>
                {isEditMode ? (
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setActiveDropdown('status')}
                  >
                    <Text style={styles.dropdownText}>
                      {getFilterLabel('status', selectedLead.status)}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyText}>
                      {getFilterLabel('status', selectedLead.status)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>Phase</Text>
                {isEditMode ? (
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setActiveDropdown('phase')}
                  >
                    <Text style={styles.dropdownText}>
                      {getFilterLabel('phase', selectedLead.phase)}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyText}>
                      {getFilterLabel('phase', selectedLead.phase)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subphase</Text>
              {isEditMode ? (
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setActiveDropdown('subphase')}
                >
                  <Text style={styles.dropdownText}>
                    {getFilterLabel('subphase', selectedLead.subphase)}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>
                    {getFilterLabel('subphase', selectedLead.subphase)}
                  </Text>
                </View>
              )}
            </View>

            {isEditMode && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assign To (BDT)</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={styles.input}
                    value={assignToEmail}
                    onChangeText={handleAssigneeInputChange}
                    placeholder="Enter BDT email to reassign"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                  />
                  
                  {showPotentialAssignees && (
                    <View style={styles.potentialCollaboratorsDropdown}>
                      {loadingPotentialAssignees ? (
                        <View style={styles.potentialCollaboratorLoadingItem}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.potentialCollaboratorLoadingText}>Searching...</Text>
                        </View>
                      ) : (
                        <ScrollView
                          style={styles.potentialCollaboratorsList}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled={true}
                        >
                          {potentialAssignees.map((assignee) => (
                            <TouchableOpacity
                              key={assignee.employee_id}
                              style={styles.potentialCollaboratorItem}
                              onPress={() => handlePotentialAssigneeSelect(assignee)}
                            >
                              <View style={styles.potentialCollaboratorInfo}>
                                <Text style={styles.potentialCollaboratorName}>
                                  {assignee.full_name}
                                </Text>
                                <Text style={styles.potentialCollaboratorEmail}>
                                  {assignee.email}
                                </Text>
                                <Text style={styles.potentialCollaboratorRole}>
                                  {assignee.designation || assignee.role}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>
              Collaborators ({collaborators.length})
            </Text>
            
            {loadingCollaborators ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading collaborators...</Text>
              </View>
            ) : collaborators.length > 0 ? (
              collaborators.map((collaborator) => (
                <View key={collaborator.id} style={styles.collaboratorItem}>
                  <View style={styles.collaboratorInfo}>
                    <Text style={styles.collaboratorName}>{collaborator.user.full_name}</Text>
                    <Text style={styles.collaboratorEmail}>{collaborator.user.email}</Text>
                    <Text style={styles.collaboratorRole}>
                      {collaborator.user.designation || collaborator.user.role}
                    </Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveCollaborator(collaborator)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyCollaborators}>
                <Text style={styles.emptyCollaboratorsText}>No collaborators yet</Text>
              </View>
            )}
            
            {isEditMode && (
              <View style={styles.addCollaboratorContainer}>
                <View style={{ flex: 1, position: 'relative' }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newCollaborator}
                    onChangeText={handleCollaboratorInputChange}
                    placeholder="Enter collaborator email..."
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                  />
                  
                  {showPotentialCollaborators && (
                    <View style={styles.potentialCollaboratorsDropdown}>
                      {loadingPotentialCollaborators ? (
                        <View style={styles.potentialCollaboratorLoadingItem}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.potentialCollaboratorLoadingText}>Searching...</Text>
                        </View>
                      ) : (
                        <ScrollView
                          style={styles.potentialCollaboratorsList}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled={true}
                        >
                          {potentialCollaborators.map((collaborator) => (
                            <TouchableOpacity
                              key={collaborator.employee_id}
                              style={styles.potentialCollaboratorItem}
                              onPress={() => handlePotentialCollaboratorSelect(collaborator)}
                            >
                              <View style={styles.potentialCollaboratorInfo}>
                                <Text style={styles.potentialCollaboratorName}>
                                  {collaborator.full_name}
                                </Text>
                                <Text style={styles.potentialCollaboratorEmail}>
                                  {collaborator.email}
                                </Text>
                                <Text style={styles.potentialCollaboratorRole}>
                                  {collaborator.designation || collaborator.role}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>
                
                <TouchableOpacity style={styles.addButton} onPress={handleAddCollaborator}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>
              Comments ({comments.length}
              {commentsPagination && ` of ${commentsPagination.total_items}`})
            </Text>
            
            {loadingComments ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading comments...</Text>
              </View>
            ) : comments.length > 0 ? (
              <>
                {comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeaderRow}>
                      <View style={styles.commentMetaItem}>
                        <Text style={styles.commentLabel}>Comment By:</Text>
                        <Text style={styles.commentValue}>{comment.commentBy}</Text>
                      </View>
                      <View style={styles.commentMetaItem}>
                        <Text style={styles.commentLabel}>Date:</Text>
                        <Text style={styles.commentValue}>{formatDateTime(comment.date)}</Text>
                      </View>
                    </View>
                    <View style={styles.commentHeaderRow}>
                      <View style={styles.commentMetaItem}>
                        <Text style={styles.commentLabel}>Phase:</Text>
                        <Text style={styles.commentValue}>{beautifyName(comment.phase)}</Text>
                      </View>
                      <View style={styles.commentMetaItem}>
                        <Text style={styles.commentLabel}>Subphase:</Text>
                        <Text style={styles.commentValue}>{beautifyName(comment.subphase)}</Text>
                      </View>
                    </View>
                    <View style={styles.commentContentRow}>
                      <Text style={styles.commentLabel}>Content:</Text>
                      <Text style={styles.commentContentText}>{comment.content}</Text>
                    </View>
                    {comment.documents && comment.documents.length > 0 && (
                      <View style={styles.documentsContainer}>
                        <Text style={styles.documentsLabel}>Attachments:</Text>
                        {comment.documents.map((doc, index) => (
                          <TouchableOpacity key={doc.id} style={styles.fileButton}>
                            <Text style={styles.fileButtonText}>📎 {doc.document_name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}

                {loadingMoreComments && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more comments...</Text>
                  </View>
                )}

                {commentsPagination && !commentsPagination.has_next && comments.length > 0 && (
                  <View style={styles.endOfListContainer}>
                    <Text style={styles.endOfListText}>
                      You've reached the end of the comments
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Start the conversation by adding a comment below</Text>
              </View>
            )}

            <View style={styles.addCommentSection}>
              <View style={styles.commentActions}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleAttachDocuments}
                >
                  <Text style={styles.actionButtonText}>📎 Attach ({selectedDocuments.length})</Text>
                </TouchableOpacity>
              </View>

              {selectedDocuments.length > 0 && (
                <View style={styles.selectedDocumentsContainer}>
                  <Text style={styles.selectedDocumentsTitle}>Selected Files:</Text>
                  {selectedDocuments.map((doc, index) => (
                    <View key={index} style={styles.selectedDocumentItem}>
                      <Text style={styles.selectedDocumentName} numberOfLines={1}>
                        📎 {doc.name}
                      </Text>
                      <TouchableOpacity 
                        style={styles.removeDocumentButton}
                        onPress={() => handleRemoveDocument(index)}
                      >
                        <Text style={styles.removeDocumentButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add your comment here..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.textSecondary}
              />

              <TouchableOpacity 
                style={[styles.submitButton, addingComment && styles.submitButtonDisabled]} 
                onPress={handleAddComment}
                disabled={addingComment}
              >
                {addingComment ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Comment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <DropdownModal
          visible={activeDropdown === 'status'}
          onClose={() => setActiveDropdown(null)}
          options={STATUS_CHOICES}
          onSelect={(value) => setSelectedLead({...selectedLead, status: value as Lead['status']})}
          title="Select Status"
        />
        <DropdownModal
          visible={activeDropdown === 'phase'}
          onClose={() => setActiveDropdown(null)}
          options={allPhases}
          onSelect={handlePhaseSelection}
          title="Select Phase"
        />
        <DropdownModal
          visible={activeDropdown === 'subphase'}
          onClose={() => setActiveDropdown(null)}
          options={allSubphases}
          onSelect={(value) => setSelectedLead({...selectedLead, subphase: value})}
          title="Select Subphase"
        />
      </SafeAreaView>
    );
  }
  
  // Leads List Screen
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToCitySelection}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedCity} - BUP</Text>
        <TouchableOpacity style={styles.addLeadButton} onPress={handleCreateLead}>
          <Text style={styles.addLeadButtonText}>+ Lead</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setActiveDropdown('filter')}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {filterBy && filterValue && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            {getFilterLabel(filterBy, filterValue)}
          </Text>
          <TouchableOpacity onPress={() => { 
            setFilterBy(''); 
            setFilterValue(''); 
            setSelectedPhase('');
            if (!isSearchMode) {
              fetchLeads(1);
            }
          }}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSearchMode && (
        <View style={styles.searchModeIndicator}>
          <Text style={styles.searchModeText}>
            Search results for: "{searchQuery}"
          </Text>
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setIsSearchMode(false);
            fetchLeads(1);
          }}>
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.tabContent} 
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                if (isSearchMode) {
                  searchLeads(searchQuery);
                } else {
                  fetchLeads(1);
                }
              }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Leads ({filteredLeads.length}
              {pagination && !isSearchMode && (
                ` of ${pagination.total_items}`
              )})
              {isSearchMode && ' - Search Results'}
            </Text>
            
            {loading && leads.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading leads...</Text>
              </View>
            ) : filteredLeads.length > 0 ? (
              <>
                {filteredLeads.map((lead) => (
                  <TouchableOpacity
                    key={lead.id}
                    style={styles.leadCard}
                    onPress={() => handleLeadPress(lead)}
                  >
                    <View style={styles.leadCardHeader}>
                      <View style={styles.leadCardInfo}>
                        <Text style={styles.leadCardName}>{lead.name}</Text>
                        <View style={styles.leadCardStatusRow}>
                          <View style={[styles.leadStatusDot, { backgroundColor: getStatusColor(lead.status) }]} />
                          <Text style={styles.leadCardStatusText}>{beautifyName(lead.status)}</Text>
                        </View>
                        <Text style={styles.leadCardCompany}>
                          {lead.company || 'No company specified'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.leadCardContact} numberOfLines={1}>
                      {lead.emails && lead.emails.length > 0 
                        ? lead.emails.map(e => e.email).join(', ') 
                        : 'No email'} • {lead.phone_numbers && lead.phone_numbers.length > 0 
                        ? lead.phone_numbers.map(p => p.number).join(', ') 
                        : 'No phone'}
                    </Text>
                    <View style={styles.leadCardMeta}>
                      <Text style={styles.leadCardPhase}>
                        {beautifyName(lead.phase)} → {beautifyName(lead.subphase)}
                      </Text>
                      <View style={styles.leadCardDateContainer}>
                        <Text style={styles.leadCardDate}>
                          {formatDate(lead.created_at || lead.createdAt)}
                        </Text>
                        <Text style={styles.leadCardTime}>
                          {formatTime(lead.created_at || lead.createdAt)}
                        </Text>
                      </View>
                    </View>
                    {lead.assigned_to && (
                      <Text style={styles.leadCardAssigned}>
                        Assigned to: {lead.assigned_to.full_name}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                
                {loadingMore && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more leads...</Text>
                  </View>
                )}
                
                {pagination && !pagination.has_next && !isSearchMode && leads.length > 0 && (
                  <View style={styles.endOfListContainer}>
                    <Text style={styles.endOfListText}>
                      You've reached the end of the list
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {searchQuery || filterValue ? 'No leads match your criteria' : 'No leads found'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery || filterValue 
                    ? 'Try adjusting your search or filters' 
                    : 'Create your first lead to get started'
                  }
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <DropdownModal
        visible={activeDropdown === 'filter'}
        onClose={() => setActiveDropdown(null)}
        options={FILTER_OPTIONS}
        onSelect={handleFilterSelection}
        title="Filter Options"
      />

      <DropdownModal
        visible={activeDropdown === 'status' && !selectedLead}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Status"
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelectionForFilter}
        title={filterBy === 'subphase' ? "Select Phase (for Subphase)" : "Select Phase"}
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => setFilterValue(value)}
        title="Select Subphase"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, backgroundColor: colors.primary,
  },
  backButton: { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: colors.white, transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl, fontWeight: '600', color: colors.white, flex: 1, textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incentiveButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  incentiveButtonText: {
    fontSize: 18,
  },
  editButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.info, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  editButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  saveButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.success, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  saveButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  deleteButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.error, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  deleteButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  addLeadButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.success, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  addLeadButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },

  citySelectionContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  citySelectionTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  citySelectionSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  cityCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cityCard: {
    width: (screenWidth - spacing.xl * 2 - spacing.md) / 2,
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cityCardIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  cityCardName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },

  searchFilterContainer: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.primary, gap: spacing.md,
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.sm,
  },
  searchIcon: { fontSize: fontSize.lg, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, paddingVertical: spacing.sm },
  filterButton: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, justifyContent: 'center', alignItems: 'center', ...shadows.sm,
    flexDirection: 'row', gap: spacing.xs,
  },
  filterIcon: { fontSize: fontSize.md },
  filterText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },

  activeFilterContainer: {
    backgroundColor: colors.info + '20', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  activeFilterText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '600' },
  clearFilterText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },

  searchModeIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.success + '20',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchModeText: {
    color: colors.success,
    fontWeight: '500',
    flex: 1,
  },
  clearSearchText: {
    color: colors.error,
    fontWeight: '500',
  },

  contentContainer: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  subsectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },

  leadCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leadCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.sm 
  },
  leadCardInfo: { flex: 1, marginRight: spacing.sm },
  leadCardName: { 
    fontSize: fontSize.md, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: spacing.xs 
  },
  leadCardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  leadStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  leadCardStatusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  leadCardCompany: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary, 
    fontWeight: '500' 
  },
  leadCardContact: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary, 
    marginBottom: spacing.sm 
  },
  leadCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadCardPhase: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  leadCardDateContainer: {
    alignItems: 'flex-end',
  },
  leadCardDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  leadCardTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  leadCardAssigned: {
    fontSize: fontSize.xs,
    color: colors.info,
    marginTop: spacing.sm,
    fontWeight: '500',
  },

  emptyState: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  emptyStateText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs },
  emptyStateSubtext: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },

  detailScrollView: { flex: 1, backgroundColor: colors.backgroundSecondary },
  detailCard: {
    backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.md,
  },

  leadNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  leadName: { 
    fontSize: fontSize.xxl, 
    fontWeight: '700', 
    color: colors.text,
    flex: 1,
  },
  leadHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.md 
  },
  leadInfo: { flex: 1 },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  leadCompany: { 
    fontSize: fontSize.md, 
    color: colors.textSecondary, 
    fontWeight: '500', 
    marginBottom: spacing.sm 
  },
  leadDate: { fontSize: fontSize.sm, color: colors.textLight },
  leadAssigned: {
    fontSize: fontSize.sm,
    color: colors.info,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  cityBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  cityBadgeText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },

  contactItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  removeContactButton: {
    backgroundColor: colors.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  removeContactButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  addContactContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyContactContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.gray + '20',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  emptyContactText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md,
    color: colors.text, backgroundColor: colors.white, ...shadows.sm,
  },
  inputDisabled: { backgroundColor: colors.gray, color: colors.textSecondary },

  managementRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  managementItem: { flex: 1 },
  dropdown: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.white,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadows.sm,
  },
  dropdownText: { fontSize: fontSize.md, color: colors.text, flex: 1 },
  dropdownArrow: { fontSize: fontSize.sm, color: colors.textSecondary },
  readOnlyField: {
    backgroundColor: colors.gray, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  readOnlyText: { fontSize: fontSize.md, color: colors.textSecondary },

  collaboratorItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm,
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorName: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  collaboratorEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  collaboratorRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  removeButton: {
    backgroundColor: colors.error, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  removeButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },
  addCollaboratorContainer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  addButton: {
    backgroundColor: colors.primary, width: 40, height: 40, borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },
  emptyCollaborators: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCollaboratorsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  potentialCollaboratorsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    zIndex: 1000,
    ...shadows.md,
  },
  potentialCollaboratorsList: {
    maxHeight: 200,
  },
  potentialCollaboratorItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  potentialCollaboratorInfo: {
    flex: 1,
  },
  potentialCollaboratorName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  potentialCollaboratorEmail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  potentialCollaboratorRole: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
  },
  potentialCollaboratorLoadingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  potentialCollaboratorLoadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  commentItem: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.sm, borderLeftWidth: 4, borderLeftColor: colors.info,
  },
  commentHeaderRow: { 
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  commentMetaItem: { flex: 1, marginRight: spacing.sm },
  commentLabel: { 
    fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs,
  },
  commentValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  commentContentRow: { marginTop: spacing.sm },
  commentContentText: { 
    fontSize: fontSize.md, color: colors.text, lineHeight: 22, marginTop: spacing.xs,
    backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md,
  },
  fileButton: { 
    backgroundColor: colors.info + '20', 
    paddingHorizontal: spacing.sm, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.sm, 
    alignSelf: 'flex-start', 
    marginTop: spacing.xs 
  },
  fileButtonText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '500' },
  documentsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  documentsLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  emptyComments: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyCommentsText: { 
    fontSize: fontSize.lg, 
    fontWeight: '600', 
    color: colors.textSecondary, 
    marginBottom: spacing.sm 
  },
  emptyCommentsSubtext: { 
    fontSize: fontSize.sm, 
    color: colors.textLight, 
    textAlign: 'center' 
  },

  addCommentSection: { 
    marginTop: spacing.lg, 
    paddingTop: spacing.lg, 
    borderTopWidth: 1, 
    borderTopColor: colors.border 
  },
  commentActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  actionButton: {
    flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1,
    borderColor: colors.primary, borderRadius: borderRadius.lg, alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  actionButtonText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  commentInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md,
    backgroundColor: colors.white, fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.md,
    textAlignVertical: 'top', minHeight: 100, ...shadows.sm,
  },
  submitButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, alignItems: 'center', ...shadows.md,
  },
  submitButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },

  selectedDocumentsContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedDocumentsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  selectedDocumentName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  removeDocumentButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDocumentButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    paddingHorizontal: spacing.xl 
  },
  dropdownContainer: {
    backgroundColor: colors.white, 
    borderRadius: borderRadius.xl, 
    maxHeight: screenHeight * 0.6, 
    ...shadows.lg,
  },
  dropdownTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownList: { maxHeight: screenHeight * 0.4 },
  dropdownItem: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  dropdownItemText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  emptyDropdown: { padding: spacing.xl, alignItems: 'center' },
  emptyDropdownText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  loadMoreText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  endOfListText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default BUP;