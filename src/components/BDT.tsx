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
interface BDTProps { onBack: () => void; }

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

interface Lead {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  company: string | null;
  status: 'active' | 'hold' | 'no-requirement' | 'closed' | 'mandate' | 'transaction-complete' | 'non-responsive';
  assigned_by: string | null;
  assigned_to: AssignedTo;
  created_at: string;
  updated_at: string;
  phase: string;
  subphase: string;
  meta: any;
  // Legacy fields for compatibility
  phone?: string;
  createdAt?: string;
  collaborators?: CollaboratorData[];
  comments?: ApiComment[];
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

// New interface for collaborators
interface CollaboratorData {
  id: number;
  user: CommentUser;
  created_at: string;
  updated_at: string;
}

// New interface for default comments
interface DefaultComment {
  id: number;
  data: string;
  at_subphase: string;
  at_phase: string;
}

interface DefaultCommentsResponse {
  message: string;
  comments: DefaultComment[];
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

// Utility functions for beautifying phase/subphase names
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

const BDT: React.FC<BDTProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedPhase, setSelectedPhase] = useState(''); // For subphase filtering
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Comments and collaborators states
  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<Pagination | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newCollaborator, setNewCollaborator] = useState('');
  const [showDefaultComments, setShowDefaultComments] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'filter' | 'filter-phase' | 'filter-subphase' | null>(null);

  // New states for default comments and file attachment
  const [defaultComments, setDefaultComments] = useState<DefaultComment[]>([]);
  const [loadingDefaultComments, setLoadingDefaultComments] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no-requirement', label: 'No Requirement' },
    { value: 'transaction-complete', label: 'Transaction Complete' },
    { value: 'non-responsive', label: 'Non Responsive' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Leads' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'phase', label: 'Filter by Phase' },
    { value: 'subphase', label: 'Filter by Subphase' }
  ];

  useEffect(() => {
    if (token) {
      fetchLeads(1);
      fetchPhases();
    }
  }, [token]);

  useEffect(() => {
      const getToken = async () => {
        try {
          const API_TOKEN = await AsyncStorage.getItem(TOKEN_KEY);
          console.log("setting", API_TOKEN);
          setToken(API_TOKEN);
        } catch (error) {
          console.error('Error getting token:', error);
        }
      };
      getToken();
    }, []);

  // New function to fetch default comments
  const fetchDefaultComments = async (phase: string, subphase: string): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingDefaultComments(true);

      const response = await fetch(`${BACKEND_URL}/employee/getDefaultComments?at_phase=${encodeURIComponent(phase)}&at_subphase=${encodeURIComponent(subphase)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DefaultCommentsResponse = await response.json();
      setDefaultComments(data.comments);
    } catch (error) {
      console.error('Error fetching default comments:', error);
      Alert.alert('Error', 'Failed to fetch default comments. Please try again.');
      setDefaultComments([]);
    } finally {
      setLoadingDefaultComments(false);
    }
  };

  // Function to handle document picker
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

  // Enhanced add comment function with file upload
  const addCommentToBackend = async (comment: string, documents: DocumentPicker.DocumentPickerAsset[]): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      setAddingComment(true);

      const formData = new FormData();
      formData.append('token', token);
      formData.append('lead_id', selectedLead.id.toString());
      formData.append('comment', comment);

      // Add documents if any
      if (documents && documents.length > 0) {
        documents.forEach((doc, index) => {
          formData.append('documents', {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name,
          } as any);
        });
      }

      const response = await fetch(`${BACKEND_URL}/employee/addComment`, {
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
      
      // Transform the response comment to match frontend interface
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

      // Add comment to the beginning of the list (most recent first)
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

  // API functions
  const fetchLeads = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      console.log("o", token);
      if (!token) return;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getLeads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      
      // Transform backend data to match frontend interface
      const transformedLeads = data.leads.map(lead => ({
        ...lead,
        phone: lead.phone_number || '',
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

      const response = await fetch(`${BACKEND_URL}/employee/getComments`, {
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
      
      // Transform API comments to match frontend interface
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

  // New function to fetch collaborators
  const fetchCollaborators = async (leadId: number): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/employee/getCollaborators`, {
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

  // New function to update lead
  const updateLead = async (leadData: Partial<Lead>): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      setLoading(true);

      const updatePayload: any = {
        token: token,
        lead_id: selectedLead.id
      };

      // Add only the fields that can be updated
      if (leadData.phone_number !== undefined) updatePayload.phone_number = leadData.phone_number;
      if (leadData.email !== undefined) updatePayload.email = leadData.email;
      if (leadData.status !== undefined) updatePayload.status = leadData.status;
      if (leadData.phase !== undefined) updatePayload.phase = leadData.phase;
      if (leadData.subphase !== undefined) updatePayload.subphase = leadData.subphase;

      const response = await fetch(`${BACKEND_URL}/employee/updateLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UpdateLeadResponse = await response.json();
      
      // Update the selected lead with the response data
      const updatedLead = {
        ...data.lead,
        phone: data.lead.phone_number || '',
        createdAt: data.lead.created_at,
        collaborators: collaborators,
        comments: []
      };
      
      setSelectedLead(updatedLead);
      
      // Update the lead in the leads list
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === selectedLead.id ? updatedLead : lead
        )
      );

      Alert.alert('Success', 'Lead updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // New function to add collaborator
  const addCollaborator = async (email: string): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      const response = await fetch(`${BACKEND_URL}/employee/addCollaborators`, {
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

      // Refresh collaborators list
      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator added successfully!');
      return true;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      Alert.alert('Error', 'Failed to add collaborator. Please try again.');
      return false;
    }
  };

  // New function to remove collaborator
  const removeCollaborator = async (collaboratorId: number): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      const response = await fetch(`${BACKEND_URL}/employee/removeCollaborator`, {
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

      // Refresh collaborators list
      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator removed successfully!');
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', 'Failed to remove collaborator. Please try again.');
      return false;
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

      const response = await fetch(`${BACKEND_URL}/employee/searchLeads?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      
      // Transform backend data to match frontend interface
      const transformedLeads = data.leads.map(lead => ({
        ...lead,
        phone: lead.phone_number || '',
        createdAt: lead.created_at,
        collaborators: [],
        comments: []
      }));

      setLeads(transformedLeads);
      setPagination(null); // No pagination for search results
    } catch (error) {
      console.error('Error searching leads:', error);
      Alert.alert('Error', 'Failed to search leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhases = async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getAllPhases`, {
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
      // Fallback to empty array
      setAllPhases([]);
    }
  };

  const fetchSubphases = async (phase: string): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
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

  // Handle search with enter key
  const handleSearchSubmit = () => {
    searchLeads(searchQuery);
  };

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchLeads(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode]);

  // Handle load more comments
  const handleLoadMoreComments = useCallback(() => {
    if (commentsPagination && commentsPagination.has_next && !loadingMoreComments && selectedLead) {
      fetchComments(selectedLead.id, commentsPagination.current_page + 1, true);
    }
  }, [commentsPagination, loadingMoreComments, selectedLead]);

  // Check if user is near bottom of scroll
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  };

  // Check if user is near bottom of comments scroll
  const handleCommentsScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMoreComments();
    }
  };

  // Filter leads (client-side filtering for now)
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

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
    
    // Reset comments and collaborators state
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    setNewComment('');
    
    // Fetch comments, collaborators, and default comments for this lead
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
    fetchDefaultComments(lead.phase, lead.subphase);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedLead(null);
    setIsEditMode(false);
    setNewComment('');
    setNewCollaborator('');
    
    // Reset comments and collaborators state
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    setDefaultComments([]);
  };

  const handleSave = async () => {
    if (!selectedLead) return;
    
    const success = await updateLead(selectedLead);
    if (success) {
      setIsEditMode(false);
    }
  };

  // Enhanced add comment function
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

  // Handle default comment selection
  const handleDefaultCommentSelect = (defaultComment: DefaultComment) => {
    try {
      // Parse the JSON string in the data field
      const commentText = JSON.parse(defaultComment.data);
      setNewComment(commentText);
      setShowDefaultComments(false);
    } catch (error) {
      // If JSON parse fails, use the raw data
      setNewComment(defaultComment.data);
      setShowDefaultComments(false);
    }
  };

  // Handle showing default comments
  const handleShowDefaultComments = () => {
    if (selectedLead) {
      fetchDefaultComments(selectedLead.phase, selectedLead.subphase);
      setShowDefaultComments(true);
    }
  };

  // Handle removing selected documents
  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return colors.success;
      case 'hold': return colors.warning;
      case 'mandate': return colors.info;
      case 'closed': return colors.error;
      case 'no-requirement': return colors.gray;
      case 'transaction-complete': return colors.primary;
      case 'non-responsive': return colors.textSecondary;
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
          // For subphase, we need to select phase first
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
      // Fetch subphases for the selected phase
      fetchSubphases(phase);
      setTimeout(() => {
        setActiveDropdown('filter-subphase');
      }, 300);
    }
  };

  // Updated phase selection handler for editing lead
  const handlePhaseSelection = async (phase: string) => {
    if (!selectedLead) return;
    
    setSelectedLead({...selectedLead, phase: phase});
    // Fetch subphases for the selected phase and reset subphase
    await fetchSubphases(phase);
    
    // Reset subphase when phase changes
    if (allSubphases.length > 0) {
      setSelectedLead(prev => prev ? {...prev, subphase: ''} : null);
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  if (viewMode === 'detail' && selectedLead) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead Details</Text>
          {!isEditMode ? (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditMode(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          style={styles.detailScrollView} 
          showsVerticalScrollIndicator={false}
          onScroll={handleCommentsScroll}
          scrollEventThrottle={16}
        >
          {/* Lead Header */}
          <View style={styles.detailCard}>
            <View style={styles.leadHeader}>
              <View style={styles.leadInfo}>
                <Text style={styles.leadName}>{selectedLead.name}</Text>
                <Text style={styles.leadCompany}>{selectedLead.company || 'No company'}</Text>
                <Text style={styles.leadDate}>Created: {formatDate(selectedLead.created_at || selectedLead.createdAt)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedLead.status) }]}>
                <Text style={styles.statusBadgeText}>{selectedLead.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedLead.email || ''}
                onChangeText={isEditMode ? (text) => setSelectedLead({...selectedLead, email: text}) : undefined}
                editable={isEditMode}
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedLead.phone_number || selectedLead.phone || ''}
                onChangeText={isEditMode ? (text) => setSelectedLead({...selectedLead, phone_number: text, phone: text}) : undefined}
                editable={isEditMode}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Lead Management */}
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
          </View>

          {/* Collaborators */}
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
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newCollaborator}
                  onChangeText={setNewCollaborator}
                  placeholder="Enter collaborator email..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddCollaborator}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Comments Section */}
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
                        <Text style={styles.commentValue}>{formatDate(comment.date)}</Text>
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
                    {comment.hasFile && !comment.documents && (
                      <TouchableOpacity style={styles.fileButton}>
                        <Text style={styles.fileButtonText}>📎 {comment.fileName}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Load more comments indicator */}
                {loadingMoreComments && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more comments...</Text>
                  </View>
                )}

                {/* End of comments indicator */}
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

            {/* Add Comment Section */}
            <View style={styles.addCommentSection}>
              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShowDefaultComments}
                  disabled={loadingDefaultComments}
                >
                  {loadingDefaultComments ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.actionButtonText}>Default Comments</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleAttachDocuments}
                >
                  <Text style={styles.actionButtonText}>📎 Attach ({selectedDocuments.length})</Text>
                </TouchableOpacity>
              </View>

              {/* Display selected documents */}
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

        {/* Modals for detail view */}
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

        {/* Enhanced Default Comments Modal */}
        <Modal visible={showDefaultComments} transparent animationType="fade" onRequestClose={() => setShowDefaultComments(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDefaultComments(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.defaultCommentsModal}>
                <Text style={styles.modalTitle}>
                  Default Comments - {beautifyName(selectedLead.phase)} → {beautifyName(selectedLead.subphase)}
                </Text>
                <ScrollView style={styles.defaultCommentsList}>
                  {loadingDefaultComments ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.loadingText}>Loading default comments...</Text>
                    </View>
                  ) : defaultComments.length > 0 ? (
                    defaultComments.map((comment) => (
                      <TouchableOpacity
                        key={comment.id}
                        style={styles.defaultCommentItem}
                        onPress={() => handleDefaultCommentSelect(comment)}
                      >
                        <Text style={styles.defaultCommentText}>
                          {(() => {
                            try {
                              return JSON.parse(comment.data);
                            } catch {
                              return comment.data;
                            }
                          })()}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No default comments available for this phase/subphase
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BDT Module</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads... (Press Enter)"
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
              fetchLeads(1); // Refresh leads when clearing filter
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
                        <Text style={styles.leadCardCompany}>
                          {lead.company || 'No company specified'}
                        </Text>
                      </View>
                      <View style={[styles.leadStatusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
                        <Text style={styles.leadStatusText}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.leadCardContact} numberOfLines={1}>
                      {lead.email || 'No email'} • {lead.phone_number || lead.phone || 'No phone'}
                    </Text>
                    <View style={styles.leadCardMeta}>
                      <Text style={styles.leadCardPhase}>
                        {beautifyName(lead.phase)} → {beautifyName(lead.subphase)}
                      </Text>
                      <Text style={styles.leadCardDate}>
                        {formatDate(lead.created_at || lead.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {/* Load more indicator */}
                {loadingMore && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more leads...</Text>
                  </View>
                )}
                
                {/* End of list indicator */}
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
                    : 'Your leads will appear here when they are created'
                  }
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Filter Modal */}
      <DropdownModal
        visible={activeDropdown === 'filter'}
        onClose={() => setActiveDropdown(null)}
        options={FILTER_OPTIONS}
        onSelect={handleFilterSelection}
        title="Filter Options"
      />

      {/* Secondary filter dropdowns for list view */}
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
    justifyItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xs,
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
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
    emptyCollaborators: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCollaboratorsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
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

  contentContainer: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },

  leadCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  leadCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  leadCardInfo: { flex: 1, marginRight: spacing.sm },
  leadCardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  leadCardCompany: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  leadStatusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    minWidth: 80, alignItems: 'center',
  },
  leadStatusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600' },
  leadCardContact: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },

  emptyState: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  emptyStateText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs },
  emptyStateSubtext: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },

  // Detail View Styles
  detailScrollView: { flex: 1, backgroundColor: colors.backgroundSecondary },
  detailCard: {
    backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.md,
  },

  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  leadInfo: { flex: 1 },
  leadName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  leadCompany: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.sm },
  leadDate: { fontSize: fontSize.sm, color: colors.textLight },
  statusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
    alignItems: 'center', minWidth: 90,
  },
  statusBadgeText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 0.5 },

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
  collaboratorName: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
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
  }, endOfListContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  endOfListText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  commentValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  commentContentRow: { marginTop: spacing.sm },
  commentContentText: { 
    fontSize: fontSize.md, color: colors.text, lineHeight: 22, marginTop: spacing.xs,
    backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md,
  },
  fileButton: { backgroundColor: colors.info + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  fileButtonText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '500' },

  emptyComments: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyCommentsText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  emptyCommentsSubtext: { fontSize: fontSize.sm, color: colors.textLight, textAlign: 'center' },

  addCommentSection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
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

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', paddingHorizontal: spacing.xl },
  dropdownContainer: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl, maxHeight: screenHeight * 0.6, ...shadows.lg,
  },
  dropdownTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownList: { maxHeight: screenHeight * 0.4 },
  dropdownItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  emptyDropdown: { padding: spacing.xl, alignItems: 'center' },
  emptyDropdownText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },

  defaultCommentsModal: { backgroundColor: colors.white, borderRadius: borderRadius.xl, maxHeight: screenHeight * 0.6, ...shadows.lg },
  modalTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  defaultCommentsList: { maxHeight: screenHeight * 0.4, padding: spacing.sm },
  defaultCommentItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  defaultCommentText: { fontSize: fontSize.md, color: colors.text },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },loadMoreContainer: {
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
  leadCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadCardPhase: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  leadCardDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
   collaboratorInfo: {
    flex: 1,
  },
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
});
export default BDT;