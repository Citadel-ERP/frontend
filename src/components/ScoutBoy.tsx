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

interface ScoutBoyProps { 
  onBack: () => void; 
}

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

interface Site {
  id: number;
  assigned_to: AssignedTo | null;
  assigned_by: AssignedTo | null;
  building_photos: any[];
  collaborator: CollaboratorData[];
  building_name: string;
  location_link: string | null;
  location: string | null;
  landmark: string | null;
  total_floors: number;
  number_of_basements: number;
  floor_condition: 'bareshell' | 'warm_shell' | 'fully_furnished';
  area_per_floor: string | null;
  total_area: string | null;
  availble_floors: string | null;
  car_parking_charges: string | null;
  car_parking_ratio: string | null;
  car_parking_slots: number;
  building_status: 'available' | 'ready_to_move_in' | 'under_construction' | 'occupied';
  rent: string | null;
  cam: string | null;
  cam_deposit: string | null;
  oc: boolean;
  rental_escalation: string | null;
  security_deposit: string | null;
  two_wheeler_slots: number;
  two_wheeler_charges: string | null;
  efficiency: number;
  notice_period: number;
  lease_term: string | null;
  lock_in_period: number;
  will_developer_do_fitouts: boolean;
  contact_person_name: string | null;
  contact_person_designation: string | null;
  contact_person_number: string | null;
  contact_person_email: string | null;
  power: string | null;
  power_backup: string | null;
  number_of_cabins: number;
  number_of_workstations: number;
  size_of_workstation: string | null;
  server_room: number;
  training_room: number;
  pantry: number;
  electrical_ups_room: number;
  cafeteria: number;
  gym: number;
  discussion_room: number;
  meeting_room: number;
  remarks: string | null;
  meta: any;
  created_at: string;
  updated_at: string;
  latitude: number;
  longitude: number;
  visit_date: string | null;
  visit_completed: boolean;
  purpose: string | null;
  proof: string | null;
  active: boolean;
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
  comment: CommentData;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  commentBy: string;
  date: string;
  content: string;
  documents?: DocumentType[];
}

interface CollaboratorData {
  id: number;
  user: CommentUser;
  created_at: string;
  updated_at: string;
}

interface Visit {
  id: number;
  site: Site;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface FilterOption { 
  value: string; 
  label: string; 
}

interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  options: FilterOption[];
  onSelect: (value: string) => void;
  title: string;
  searchable?: boolean;
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

const ScoutBoy: React.FC<ScoutBoyProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'visits'>('list');
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [sites, setSites] = useState<Site[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<Pagination | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [newComment, setNewComment] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'floor_condition' | 'filter' | null>(null);

  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'available', label: 'Available' },
    { value: 'ready_to_move_in', label: 'Ready To Move In' },
    { value: 'under_construction', label: 'Under Construction' },
    { value: 'occupied', label: 'Occupied' }
  ];

  const FLOOR_CONDITION_CHOICES: FilterOption[] = [
    { value: 'bareshell', label: 'Bare Shell' },
    { value: 'warm_shell', label: 'Warm Shell' },
    { value: 'fully_furnished', label: 'Fully Furnished' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Sites' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'floor_condition', label: 'Filter by Floor Condition' }
  ];

  useEffect(() => {
    if (token) {
      fetchSites(1);
    }
  }, [token]);

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

  const fetchSites = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getSiteLocations`, {
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

      const data = await response.json();
      
      if (append) {
        setSites(prevSites => [...prevSites, ...data.sites]);
      } else {
        setSites(data.sites);
      }
      
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching sites:', error);
      Alert.alert('Error', 'Failed to fetch sites. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const fetchComments = async (siteId: number, page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getCommentsSite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          site_id: siteId,
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const transformedComments: Comment[] = data.site_comments.map((apiComment: ApiComment) => ({
        id: apiComment.comment.id.toString(),
        commentBy: apiComment.comment.user.full_name,
        date: apiComment.comment.created_at,
        content: apiComment.comment.content,
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

  const fetchVisits = async (): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingVisits(true);

      const response = await fetch(`${BACKEND_URL}/employee/getAssignedVisits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setVisits(data.assigned_visits);
    } catch (error) {
      console.error('Error fetching visits:', error);
      Alert.alert('Error', 'Failed to fetch visits. Please try again.');
    } finally {
      setLoadingVisits(false);
    }
  };

  const updateSite = async (siteData: Partial<Site>): Promise<boolean> => {
    try {
      if (!token || !selectedSite) return false;

      setLoading(true);

      const updatePayload: any = {
        token: token,
        site_id: selectedSite.id,
        ...siteData
      };

      const response = await fetch(`${BACKEND_URL}/employee/updateSite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setSelectedSite(data.site);
      
      setSites(prevSites => 
        prevSites.map(site => 
          site.id === selectedSite.id ? data.site : site
        )
      );

      Alert.alert('Success', 'Site updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating site:', error);
      Alert.alert('Error', 'Failed to update site. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addCommentToBackend = async (comment: string, documents: DocumentPicker.DocumentPickerAsset[]): Promise<boolean> => {
    try {
      if (!token || !selectedSite) return false;

      setAddingComment(true);

      const formData = new FormData();
      formData.append('token', token);
      formData.append('site_id', selectedSite.id.toString());
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

      const response = await fetch(`${BACKEND_URL}/employee/addCommentSite`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const newComment: Comment = {
        id: data.site_comment.comment.id.toString(),
        commentBy: data.site_comment.comment.user.full_name,
        date: data.site_comment.comment.created_at,
        content: data.site_comment.comment.content,
        documents: data.site_comment.comment.documents
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

  const searchSites = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setIsSearchMode(false);
      fetchSites(1);
      return;
    }

    try {
      setLoading(true);
      setIsSearchMode(true);

      const response = await fetch(`${BACKEND_URL}/employee/searchSite?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSites(data.sites);
      setPagination(null);
    } catch (error) {
      console.error('Error searching sites:', error);
      Alert.alert('Error', 'Failed to search sites. Please try again.');
    } finally {
      setLoading(false);
    }
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
    searchSites(searchQuery);
  };

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchSites(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode]);

  const handleLoadMoreComments = useCallback(() => {
    if (commentsPagination && commentsPagination.has_next && !loadingMoreComments && selectedSite) {
      fetchComments(selectedSite.id, commentsPagination.current_page + 1, true);
    }
  }, [commentsPagination, loadingMoreComments, selectedSite]);

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

  const filteredSites = sites.filter(site => {
    let matchesFilter = true;
    if (filterBy && filterValue) {
      if (filterBy === 'status') {
        matchesFilter = site.building_status === filterValue;
      } else if (filterBy === 'floor_condition') {
        matchesFilter = site.floor_condition === filterValue;
      }
    }
    return matchesFilter;
  });

  const handleSitePress = (site: Site) => {
    setSelectedSite({ ...site });
    setViewMode('detail');
    setIsEditMode(false);
    
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    setNewComment('');
    
    fetchComments(site.id, 1);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSite(null);
    setIsEditMode(false);
    setNewComment('');
    
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
  };

  const handleSave = async () => {
    if (!selectedSite) return;
    
    const success = await updateSite(selectedSite);
    if (success) {
      setIsEditMode(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedSite) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    const success = await addCommentToBackend(newComment.trim(), selectedDocuments);
    if (success) {
      setNewComment('');
      setSelectedDocuments([]);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  const handleShowVisits = () => {
    setViewMode('visits');
    fetchVisits();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
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
      case 'available': return colors.success;
      case 'ready_to_move_in': return colors.info;
      case 'under_construction': return colors.warning;
      case 'occupied': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'floor_condition': choices = FLOOR_CONDITION_CHOICES; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  const handleFilterSelection = (filterType: string) => {
    setFilterBy(filterType);
    if (!filterType) {
      setFilterValue('');
    } else {
      setTimeout(() => {
        if (filterType === 'status') {
          setActiveDropdown('status');
        } else if (filterType === 'floor_condition') {
          setActiveDropdown('floor_condition');
        }
      }, 300);
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  if (viewMode === 'visits') {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assigned Visits</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.detailScrollView} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Visits ({visits.length})</Text>
            
            {loadingVisits ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading visits...</Text>
              </View>
            ) : visits.length > 0 ? (
              visits.map((visit) => (
                <View key={visit.id} style={styles.visitCard}>
                  <View style={styles.visitHeader}>
                    <Text style={styles.visitSiteName}>{visit.site.building_name}</Text>
                    <View style={[styles.visitStatusBadge, { backgroundColor: getStatusColor(visit.status) }]}>
                      <Text style={styles.visitStatusText}>{beautifyName(visit.status)}</Text>
                    </View>
                  </View>
                  
                  {visit.site.location && (
                    <Text style={styles.visitLocation}>📍 {visit.site.location}</Text>
                  )}
                  
                  {visit.site.landmark && (
                    <Text style={styles.visitLandmark}>🏢 {visit.site.landmark}</Text>
                  )}
                  
                  <View style={styles.visitMeta}>
                    <Text style={styles.visitMetaText}>Created: {formatDate(visit.created_at)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No visits assigned</Text>
                <Text style={styles.emptyStateSubtext}>Visits will appear here when assigned to you</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (viewMode === 'detail' && selectedSite) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Site Details</Text>
          <View style={styles.headerActions}>
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
        </View>

        <ScrollView 
          style={styles.detailScrollView} 
          showsVerticalScrollIndicator={false}
          onScroll={handleCommentsScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.detailCard}>
            <View style={styles.siteHeader}>
              <View style={styles.siteInfo}>
                <Text style={styles.siteName}>{selectedSite.building_name}</Text>
                <View style={styles.statusIndicatorRow}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedSite.building_status) }]} />
                  <Text style={styles.statusText}>{beautifyName(selectedSite.building_status)}</Text>
                </View>
                {selectedSite.location && (
                  <Text style={styles.siteLocation}>📍 {selectedSite.location}</Text>
                )}
                {selectedSite.landmark && (
                  <Text style={styles.siteLandmark}>🏢 {selectedSite.landmark}</Text>
                )}
                <Text style={styles.siteDate}>Created: {formatDateTime(selectedSite.created_at)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Building Status</Text>
              {isEditMode ? (
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setActiveDropdown('status')}
                >
                  <Text style={styles.dropdownText}>
                    {getFilterLabel('status', selectedSite.building_status)}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>
                    {getFilterLabel('status', selectedSite.building_status)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Floor Condition</Text>
              {isEditMode ? (
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setActiveDropdown('floor_condition')}
                >
                  <Text style={styles.dropdownText}>
                    {getFilterLabel('floor_condition', selectedSite.floor_condition)}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>
                    {getFilterLabel('floor_condition', selectedSite.floor_condition)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.managementRow}>
              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>Total Floors</Text>
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={selectedSite.total_floors?.toString() || ''}
                  onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, total_floors: parseInt(text) || 0}) : undefined}
                  editable={isEditMode}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>Basements</Text>
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={selectedSite.number_of_basements?.toString() || ''}
                  onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, number_of_basements: parseInt(text) || 0}) : undefined}
                  editable={isEditMode}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Total Area (sq ft)</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedSite.total_area || ''}
                onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, total_area: text}) : undefined}
                editable={isEditMode}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rent (₹)</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedSite.rent || ''}
                onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, rent: text}) : undefined}
                editable={isEditMode}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Person Name</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedSite.contact_person_name || ''}
                onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, contact_person_name: text}) : undefined}
                editable={isEditMode}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Designation</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedSite.contact_person_designation || ''}
                onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, contact_person_designation: text}) : undefined}
                editable={isEditMode}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedSite.contact_person_number || ''}
                onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, contact_person_number: text}) : undefined}
                editable={isEditMode}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedSite.contact_person_email || ''}
                onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, contact_person_email: text}) : undefined}
                editable={isEditMode}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Parking Details</Text>
            
            <View style={styles.managementRow}>
              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>Car Parking Slots</Text>
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={selectedSite.car_parking_slots?.toString() || ''}
                  onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, car_parking_slots: parseInt(text) || 0}) : undefined}
                  editable={isEditMode}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>2-Wheeler Slots</Text>
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={selectedSite.two_wheeler_slots?.toString() || ''}
                  onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, two_wheeler_slots: parseInt(text) || 0}) : undefined}
                  editable={isEditMode}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Car Parking Ratio</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedSite.car_parking_ratio || ''}
                onChangeText={isEditMode ? (text) => setSelectedSite({...selectedSite, car_parking_ratio: text}) : undefined}
                editable={isEditMode}
              />
            </View>
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
          onSelect={(value) => setSelectedSite({...selectedSite, building_status: value as Site['building_status']})}
          title="Select Building Status"
        />
        
        <DropdownModal
          visible={activeDropdown === 'floor_condition'}
          onClose={() => setActiveDropdown(null)}
          options={FLOOR_CONDITION_CHOICES}
          onSelect={(value) => setSelectedSite({...selectedSite, floor_condition: value as Site['floor_condition']})}
          title="Select Floor Condition"
        />
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
        <Text style={styles.headerTitle}>Scout Boy Module</Text>
        <TouchableOpacity style={styles.visitsButton} onPress={handleShowVisits}>
          <Text style={styles.visitsButtonText}>📋 Visits</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search sites... (Press Enter)"
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
            if (!isSearchMode) {
              fetchSites(1);
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
            fetchSites(1);
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
                  searchSites(searchQuery);
                } else {
                  fetchSites(1);
                }
              }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Sites ({filteredSites.length}
              {pagination && !isSearchMode && (
                ` of ${pagination.total_items}`
              )})
              {isSearchMode && ' - Search Results'}
            </Text>
            
            {loading && sites.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading sites...</Text>
              </View>
            ) : filteredSites.length > 0 ? (
              <>
                {filteredSites.map((site) => (
                  <TouchableOpacity
                    key={site.id}
                    style={styles.siteCard}
                    onPress={() => handleSitePress(site)}
                  >
                    <View style={styles.siteCardHeader}>
                      <View style={styles.siteCardInfo}>
                        <Text style={styles.siteCardName}>{site.building_name}</Text>
                        <View style={styles.siteCardStatusRow}>
                          <View style={[styles.siteStatusDot, { backgroundColor: getStatusColor(site.building_status) }]} />
                          <Text style={styles.siteCardStatusText}>{beautifyName(site.building_status)}</Text>
                        </View>
                        {site.location && (
                          <Text style={styles.siteCardLocation}>
                            📍 {site.location}
                          </Text>
                        )}
                      </View>
                    </View>
                    {site.landmark && (
                      <Text style={styles.siteCardLandmark} numberOfLines={1}>
                        🏢 {site.landmark}
                      </Text>
                    )}
                    <View style={styles.siteCardMeta}>
                      <Text style={styles.siteCardDetails}>
                        {site.total_floors} Floors • {site.floor_condition ? beautifyName(site.floor_condition) : 'N/A'}
                      </Text>
                      <Text style={styles.siteCardDate}>
                        {formatDate(site.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {loadingMore && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more sites...</Text>
                  </View>
                )}
                
                {pagination && !pagination.has_next && !isSearchMode && sites.length > 0 && (
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
                  {searchQuery || filterValue ? 'No sites match your criteria' : 'No sites found'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery || filterValue 
                    ? 'Try adjusting your search or filters' 
                    : 'Sites will appear here when they are created'
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
        visible={activeDropdown === 'status' && !selectedSite}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Status"
      />
      
      <DropdownModal
        visible={activeDropdown === 'floor_condition' && !selectedSite}
        onClose={() => setActiveDropdown(null)}
        options={FLOOR_CONDITION_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Floor Condition"
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
  visitsButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.info, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  visitsButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
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

  siteCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  siteCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.sm 
  },
  siteCardInfo: { flex: 1, marginRight: spacing.sm },
  siteCardName: { 
    fontSize: fontSize.md, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: spacing.xs 
  },
  siteCardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  siteStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  siteCardStatusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  siteCardLocation: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary, 
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  siteCardLandmark: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary, 
    marginBottom: spacing.sm 
  },
  siteCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteCardDetails: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  siteCardDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
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

  siteHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.md 
  },
  siteInfo: { flex: 1 },
  siteName: { 
    fontSize: fontSize.xxl, 
    fontWeight: '700', 
    color: colors.text,
    marginBottom: spacing.sm,
  },
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
  siteLocation: { 
    fontSize: fontSize.md, 
    color: colors.textSecondary, 
    fontWeight: '500', 
    marginBottom: spacing.sm 
  },
  siteLandmark: { 
    fontSize: fontSize.md, 
    color: colors.textSecondary, 
    fontWeight: '500', 
    marginBottom: spacing.sm 
  },
  siteDate: { fontSize: fontSize.sm, color: colors.textLight },

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
  fileButton: { 
    backgroundColor: colors.info + '20', 
    paddingHorizontal: spacing.sm, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.sm, 
    alignSelf: 'flex-start', 
    marginTop: spacing.xs 
  },
  fileButtonText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '500' },

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

  visitCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  visitSiteName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  visitStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  visitStatusText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  visitLocation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  visitLandmark: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  visitMeta: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  visitMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});

export default ScoutBoy;