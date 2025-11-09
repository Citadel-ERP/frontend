import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, TextInput, FlatList, Dimensions, ActivityIndicator,
  Image, Animated
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

interface SiteInfo {
  id: number;
  building_name: string;
  building_status: string | null;
  rent: string | null;
  car_parking_ratio: string | null;
  contact_person_name: string | null;
  contact_person_number: string | null;
  contact_person_email: string | null;
  total_area: string | null;
  area_per_floor: string | null;
  availble_floors: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  total_floors: number | null;
  number_of_basements: number | null;
  floor_condition: string | null;
  car_parking_charges: string | null;
  car_parking_slots: string | null;
  cam: string | null;
  cam_deposit: string | null;
  oc: string | null;
  rental_escalation: string | null;
  security_deposit: string | null;
  two_wheeler_slots: string | null;
  two_wheeler_charges: string | null;
  efficiency: string | null;
  notice_period: string | null;
  lease_term: string | null;
  lock_in_period: string | null;
  will_developer_do_fitouts: string | null;
  contact_person_designation: string | null;
  contact_person_email: string | null;
  power: string | null;
  power_backup: string | null;
  number_of_cabins: string | null;
  number_of_workstations: string | null;
  size_of_workstation: string | null;
  server_room: string | null;
  training_room: string | null;
  pantry: string | null;
  electrical_ups_room: string | null;
  cafeteria: string | null;
  gym: string | null;
  discussion_room: string | null;
  meeting_room: string | null;
  remarks: string | null;
  updated_at: string;
  meta?: Record<string, any>;
}

interface VisitPhoto {
  id: number;
  file_url: string;
  description: string | null;
  created_at: string;
}

interface VisitCommentDocument {
  id: number;
  document: string;
  document_name: string;
}

interface VisitComment {
  id: number;
  user: {
    full_name: string;
    profile_picture: string | null;
  };
  content: string;
  documents: VisitCommentDocument[];
  created_at: string;
  updated_at: string;
}

interface Visit {
  id: number;
  site: SiteInfo;
  status: 'pending' | 'scout_completed' | 'admin_completed' | 'cancelled';
  comments: VisitComment[];
  photos: VisitPhoto[];
  assigned_by: { full_name: string };
  created_at: string;
  updated_at: string;
  scout_completed_at: string | null;
  is_visible_to_scout: boolean;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

const beautifyName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return colors.warning;
    case 'scout_completed': return colors.info;
    case 'admin_completed': return colors.success;
    case 'cancelled': return colors.error;
    default: return colors.textSecondary;
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'pending': return '⏳';
    case 'scout_completed': return '✓';
    case 'admin_completed': return '✓✓';
    case 'cancelled': return '✗';
    default: return '•';
  }
};

const ScoutBoy: React.FC<ScoutBoyProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'visits-list' | 'visit-detail'>('visits-list');
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSite, setEditedSite] = useState<Partial<SiteInfo> | null>(null);
  const [updatingDetails, setUpdatingDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

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
    if (token) {
      fetchVisits(1);
    }
  }, [token]);

  const fetchVisits = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const response = await fetch(`${BACKEND_URL}/employee/getAssignedVisits`, {
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
      
      if (data.visits && Array.isArray(data.visits)) {
        if (append) {
          setVisits(prevVisits => [...prevVisits, ...data.visits]);
        } else {
          setVisits(data.visits);
        }
        setPagination(data.pagination || null);
      } else {
        Alert.alert('Error', 'Invalid data format received');
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
      Alert.alert('Error', 'Failed to fetch visits. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const searchVisits = async (query: string): Promise<void> => {
    if (!query.trim()) {
      fetchVisits(1);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/employee/searchVisits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          query: query
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setVisits(data.visits || []);
      setPagination(null);
    } catch (error) {
      console.error('Error searching visits:', error);
      Alert.alert('Error', 'Failed to search visits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateVisitDetails = async (): Promise<boolean> => {
    try {
      if (!token || !selectedVisit || !editedSite) return false;
      
      setUpdatingDetails(true);
      const updatePayload: any = {
        token: token,
        visit_id: selectedVisit.id,
      };

      // Define editable fields
      const editableFields = [
        'floor_condition', 'area_per_floor', 'total_area', 'availble_floors',
        'car_parking_charges', 'car_parking_ratio', 'car_parking_slots',
        'building_status', 'rent', 'cam', 'cam_deposit', 'oc', 'rental_escalation',
        'security_deposit', 'two_wheeler_slots', 'two_wheeler_charges', 'efficiency',
        'notice_period', 'lease_term', 'lock_in_period', 'will_developer_do_fitouts',
        'contact_person_name', 'contact_person_designation', 'contact_person_number',
        'contact_person_email', 'power', 'power_backup', 'number_of_cabins',
        'number_of_workstations', 'size_of_workstation', 'server_room', 'training_room',
        'pantry', 'electrical_ups_room', 'cafeteria', 'gym', 'discussion_room',
        'meeting_room', 'remarks', 'total_floors', 'number_of_basements'
      ];

      const originalSite = selectedVisit.site;
      let hasChanges = false;

      editableFields.forEach(field => {
        if (editedSite[field as keyof SiteInfo] !== originalSite[field as keyof SiteInfo]) {
          updatePayload[field] = editedSite[field as keyof SiteInfo];
          hasChanges = true;
        }
      });

      if (!hasChanges) {
        Alert.alert('Info', 'No changes to update');
        return false;
      }

      const response = await fetch(`${BACKEND_URL}/employee/updateVisitDetails`, {
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
      
      // Update selected visit with new site data
      const updatedVisit: Visit = {
        ...selectedVisit,
        site: { ...selectedVisit.site, ...data.visit.site }
      };
      
      setSelectedVisit(updatedVisit);
      setVisits(prevVisits =>
        prevVisits.map(visit =>
          visit.id === selectedVisit.id ? updatedVisit : visit
        )
      );

      Alert.alert('Success', 'Site details updated successfully!');
      setIsEditMode(false);
      return true;
    } catch (error) {
      console.error('Error updating visit details:', error);
      Alert.alert('Error', 'Failed to update details. Please try again.');
      return false;
    } finally {
      setUpdatingDetails(false);
    }
  };

  const addCommentToVisit = async (): Promise<boolean> => {
    try {
      if (!token || !selectedVisit || !newComment.trim()) {
        Alert.alert('Error', 'Please enter a comment');
        return false;
      }

      setAddingComment(true);
      const formData = new FormData();
      formData.append('token', token);
      formData.append('visit_id', selectedVisit.id.toString());
      formData.append('comment', newComment.trim());

      if (selectedDocuments && selectedDocuments.length > 0) {
        selectedDocuments.forEach((doc) => {
          formData.append('documents', {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name,
          } as any);
        });
      }

      const response = await fetch(`${BACKEND_URL}/employee/addVisitComment`, {
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
      const newCommentObj: VisitComment = data.comment;

      // Update selected visit
      const updatedVisit: Visit = {
        ...selectedVisit,
        comments: [newCommentObj, ...selectedVisit.comments]
      };

      setSelectedVisit(updatedVisit);
      setVisits(prevVisits =>
        prevVisits.map(visit =>
          visit.id === selectedVisit.id ? updatedVisit : visit
        )
      );

      setNewComment('');
      setSelectedDocuments([]);
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

  const fetchVisitComments = async (): Promise<void> => {
    try {
      if (!token || !selectedVisit) return;

      setLoadingComments(true);
      const response = await fetch(`${BACKEND_URL}/employee/getVisitComments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          visit_id: selectedVisit.id,
          page: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const updatedVisit: Visit = {
        ...selectedVisit,
        comments: data.comments || []
      };

      setSelectedVisit(updatedVisit);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const markVisitComplete = async (): Promise<boolean> => {
    try {
      if (!token || !selectedVisit) return false;

      setMarkingComplete(true);
      const response = await fetch(`${BACKEND_URL}/employee/markVisitCompleted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          visit_id: selectedVisit.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update selected visit
      const updatedVisit: Visit = {
        ...selectedVisit,
        status: 'scout_completed',
        scout_completed_at: data.visit.scout_completed_at
      };

      setSelectedVisit(updatedVisit);
      setVisits(prevVisits =>
        prevVisits.map(visit =>
          visit.id === selectedVisit.id ? updatedVisit : visit
        )
      );

      Alert.alert(
        'Visit Completed',
        'Your visit has been marked as complete. Admin will review and finalize it.'
      );
      return true;
    } catch (error) {
      console.error('Error marking visit as complete:', error);
      Alert.alert('Error', 'Failed to mark visit as complete. Please try again.');
      return false;
    } finally {
      setMarkingComplete(false);
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

  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  const handleVisitPress = (visit: Visit) => {
    setSelectedVisit(visit);
    setEditedSite({ ...visit.site });
    setViewMode('visit-detail');
    setIsEditMode(false);
    // Load comments when opening visit
    setTimeout(() => fetchVisitComments(), 300);
  };

  const handleBackToList = () => {
    setViewMode('visits-list');
    setSelectedVisit(null);
    setEditedSite(null);
    setIsEditMode(false);
    setNewComment('');
    setSelectedDocuments([]);
  };

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !searchQuery) {
      fetchVisits(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, searchQuery]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const handleSearchSubmit = () => {
    searchVisits(searchQuery);
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  // VISIT DETAIL VIEW
  if (viewMode === 'visit-detail' && selectedVisit) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visit Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          style={styles.detailScrollView}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* SITE HEADER CARD */}
          <View style={styles.detailCard}>
            <View style={styles.siteHeaderRow}>
              <View style={styles.siteHeaderInfo}>
                <Text style={styles.siteName}>{selectedVisit.site.building_name}</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusIcon}>{getStatusIcon(selectedVisit.status)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVisit.status) }]}>
                    <Text style={styles.statusBadgeText}>{beautifyName(selectedVisit.status)}</Text>
                  </View>
                </View>
              </View>
            </View>
            {selectedVisit.site.location && (
              <Text style={styles.locationText}>📍 {selectedVisit.site.location}</Text>
            )}
            <View style={styles.metaInfo}>
              <Text style={styles.metaLabel}>Assigned by:</Text>
              <Text style={styles.metaValue}>{selectedVisit.assigned_by.full_name}</Text>
            </View>
            <View style={styles.metaInfo}>
              <Text style={styles.metaLabel}>Site Updated:</Text>
              <Text style={styles.metaValue}>{formatDateTime(selectedVisit.site.updated_at)}</Text>
            </View>
            {selectedVisit.scout_completed_at && (
              <View style={styles.metaInfo}>
                <Text style={styles.metaLabel}>You Completed:</Text>
                <Text style={styles.metaValue}>{formatDateTime(selectedVisit.scout_completed_at)}</Text>
              </View>
            )}
          </View>

          {/* EDIT MODE BUTTON */}
          {selectedVisit.status === 'pending' && (
            <View style={styles.detailCard}>
              <TouchableOpacity
                style={[styles.editButton, isEditMode && styles.editButtonActive]}
                onPress={() => setIsEditMode(!isEditMode)}
              >
                <Text style={styles.editButtonText}>
                  {isEditMode ? '✓ Done Editing' : '✎ Edit Details'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* KEY DETAILS CARD */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Key Details</Text>
            
            {/* Building Status */}
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Building Status</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.building_status || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, building_status: val })}
                    placeholder="Enter status"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.building_status || '-'}</Text>
                )}
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Total Area (sq ft)</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.total_area || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, total_area: val })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.total_area || '-'}</Text>
                )}
              </View>
            </View>

            {/* Rent & Parking */}
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Monthly Rent (₹)</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.rent || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, rent: val })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.rent ? `₹${selectedVisit.site.rent}` : '-'}</Text>
                )}
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Car Parking Ratio</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.car_parking_ratio || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, car_parking_ratio: val })}
                    placeholder="e.g., 1:100"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.car_parking_ratio || '-'}</Text>
                )}
              </View>
            </View>

            {/* Floors & Area Per Floor */}
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Available Floors</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.availble_floors || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, availble_floors: val })}
                    placeholder="e.g., 1,2,3"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.availble_floors || '-'}</Text>
                )}
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Area Per Floor</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.area_per_floor || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, area_per_floor: val })}
                    placeholder="sq ft"
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.area_per_floor || '-'}</Text>
                )}
              </View>
            </View>

            {/* Total Floors & Basements */}
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Total Floors</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.total_floors?.toString() || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, total_floors: parseInt(val) || null })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.total_floors || '-'}</Text>
                )}
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Basements</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.number_of_basements?.toString() || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, number_of_basements: parseInt(val) || null })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.number_of_basements || '-'}</Text>
                )}
              </View>
            </View>

            {/* Amenities - CAM, OC, Security Deposit */}
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>CAM (₹/sq ft)</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.cam || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, cam: val })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.cam || '-'}</Text>
                )}
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>OC</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.oc || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, oc: val })}
                    placeholder="e.g., Yes/No"
                  />
                ) : (
                  <Text style={styles.detailValue}>{selectedVisit.site.oc || '-'}</Text>
                )}
              </View>
            </View>

            {/* Update Details Button */}
            {isEditMode && (
              <TouchableOpacity
                style={[styles.submitButton, updatingDetails && styles.submitButtonDisabled]}
                onPress={updateVisitDetails}
                disabled={updatingDetails}
              >
                {updatingDetails ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>💾 Save Changes</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* CONTACT INFORMATION */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {selectedVisit.site.contact_person_name && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Person:</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.contact_person_name || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, contact_person_name: val })}
                    placeholder="Name"
                  />
                ) : (
                  <Text style={styles.contactValue}>{selectedVisit.site.contact_person_name}</Text>
                )}
              </View>
            )}
            
            {selectedVisit.site.contact_person_designation && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Designation:</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.contact_person_designation || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, contact_person_designation: val })}
                    placeholder="Designation"
                  />
                ) : (
                  <Text style={styles.contactValue}>{selectedVisit.site.contact_person_designation}</Text>
                )}
              </View>
            )}

            {selectedVisit.site.contact_person_number && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Phone:</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.contact_person_number || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, contact_person_number: val })}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <TouchableOpacity>
                    <Text style={[styles.contactValue, styles.phoneLink]}>
                      📞 {selectedVisit.site.contact_person_number}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {selectedVisit.site.contact_person_email && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Email:</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedSite?.contact_person_email || ''}
                    onChangeText={(val) => setEditedSite({ ...editedSite, contact_person_email: val })}
                    placeholder="Email"
                    keyboardType="email-address"
                  />
                ) : (
                  <Text style={styles.contactValue}>{selectedVisit.site.contact_person_email}</Text>
                )}
              </View>
            )}
          </View>

          {/* FACILITIES SECTION */}
          {(selectedVisit.site.number_of_cabins || selectedVisit.site.pantry || selectedVisit.site.cafeteria || selectedVisit.site.gym || isEditMode) && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Facilities</Text>
              
              <View style={styles.detailRow}>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Cabins</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.number_of_cabins || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, number_of_cabins: val })}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.number_of_cabins || '-'}</Text>
                  )}
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Workstations</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.number_of_workstations || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, number_of_workstations: val })}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.number_of_workstations || '-'}</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Pantry</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.pantry || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, pantry: val })}
                      placeholder="Yes/No"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.pantry ? '✓' : '-'}</Text>
                  )}
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Cafeteria</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.cafeteria || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, cafeteria: val })}
                      placeholder="Yes/No"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.cafeteria ? '✓' : '-'}</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Gym</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.gym || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, gym: val })}
                      placeholder="Yes/No"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.gym ? '✓' : '-'}</Text>
                  )}
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Meeting Room</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.meeting_room || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, meeting_room: val })}
                      placeholder="Yes/No"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.meeting_room ? '✓' : '-'}</Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Training Room</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.training_room || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, training_room: val })}
                      placeholder="Yes/No"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.training_room ? '✓' : '-'}</Text>
                  )}
                </View>
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Discussion Room</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedSite?.discussion_room || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, discussion_room: val })}
                      placeholder="Yes/No"
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.discussion_room ? '✓' : '-'}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* PHOTOS SECTION */}
          {selectedVisit.photos && selectedVisit.photos.length > 0 && (
            <View style={styles.detailCard}>
              <Text style={styles.sectionTitle}>Photos ({selectedVisit.photos.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoScroll}
              >
                {selectedVisit.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.photoThumbnail}
                    onPress={() => {
                      setSelectedPhotoIndex(index);
                      setSelectedPhotoUrl(photo.file_url);
                      setShowPhotoModal(true);
                    }}
                  >
                    <Image
                      source={{ uri: photo.file_url }}
                      style={styles.photoImage}
                    />
                    <Text style={styles.photoNumber}>{index + 1}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* COMMENTS SECTION */}
          <View style={styles.detailCard}>
            <View style={styles.commentsHeader}>
              <Text style={styles.sectionTitle}>
                Comments ({selectedVisit.comments.length})
              </Text>
              {loadingComments && <ActivityIndicator color={colors.primary} size="small" />}
            </View>

            {selectedVisit.comments.length > 0 ? (
              <>
                {selectedVisit.comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.user.full_name}</Text>
                      <Text style={styles.commentDate}>{formatDateTime(comment.created_at)}</Text>
                    </View>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                    {comment.documents && comment.documents.length > 0 && (
                      <View style={styles.documentsSection}>
                        <Text style={styles.documentsLabel}>Attachments:</Text>
                        {comment.documents.map((doc) => (
                          <TouchableOpacity key={doc.id} style={styles.documentLink}>
                            <Text style={styles.documentLinkText}>📎 {doc.document_name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No comments yet</Text>
              </View>
            )}

            {/* ADD COMMENT FORM */}
            <View style={styles.addCommentForm}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add your observations..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.commentFormActions}>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={handleAttachDocuments}
                >
                  <Text style={styles.attachButtonText}>📎 Attach ({selectedDocuments.length})</Text>
                </TouchableOpacity>
              </View>

              {selectedDocuments.length > 0 && (
                <View style={styles.documentsPreview}>
                  <Text style={styles.documentsPreviewTitle}>Selected Files:</Text>
                  {selectedDocuments.map((doc, index) => (
                    <View key={index} style={styles.documentPreviewItem}>
                      <Text style={styles.documentPreviewName} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                        <Text style={styles.removeButton}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, addingComment && styles.submitButtonDisabled]}
                onPress={addCommentToVisit}
                disabled={addingComment}
              >
                {addingComment ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Post Comment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* COMPLETE VISIT SECTION */}
          {selectedVisit.status === 'pending' && (
            <View style={styles.detailCard}>
              <TouchableOpacity
                style={[styles.completeButton, markingComplete && styles.completeButtonDisabled]}
                onPress={() => {
                  Alert.alert(
                    'Mark Visit Complete?',
                    'Once you mark this visit as complete, it will be sent to admin for final verification.',
                    [
                      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                      {
                        text: 'Mark Complete',
                        onPress: markVisitComplete,
                        style: 'default',
                      },
                    ]
                  );
                }}
                disabled={markingComplete}
              >
                {markingComplete ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.completeButtonText}>✓ Mark Visit as Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {selectedVisit.status === 'scout_completed' && (
            <View style={[styles.detailCard, styles.pendingReviewCard]}>
              <View style={styles.pendingReviewContent}>
                <Text style={styles.pendingReviewIcon}>⏳</Text>
                <Text style={styles.pendingReviewText}>
                  Waiting for admin to finalize this visit
                </Text>
                <Text style={styles.pendingReviewSubtext}>
                  You completed this visit on {formatDateTime(selectedVisit.scout_completed_at)}
                </Text>
              </View>
            </View>
          )}

          {selectedVisit.status === 'admin_completed' && (
            <View style={[styles.detailCard, styles.completedCard]}>
              <View style={styles.completedContent}>
                <Text style={styles.completedIcon}>✓✓</Text>
                <Text style={styles.completedText}>
                  This visit has been finalized by admin
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* PHOTO MODAL */}
        <Modal
          visible={showPhotoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhotoModal(false)}
        >
          <View style={styles.photoModalOverlay}>
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.photoModalCloseText}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: selectedPhotoUrl }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
            <View style={styles.photoModalCounter}>
              <Text style={styles.photoModalCounterText}>
                {selectedPhotoIndex + 1} / {selectedVisit.photos.length}
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // VISITS LIST VIEW
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Visits</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search visits..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchVisits(1); }}>
            <Text style={styles.clearSearchButton}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {searchQuery && (
        <View style={styles.searchIndicator}>
          <Text style={styles.searchIndicatorText}>
            Searching for: "{searchQuery}"
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchVisits(1);
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assigned Visits ({visits.length})</Text>
            {pagination && !searchQuery && (
              <Text style={styles.paginationInfo}>
                of {pagination.total_items}
              </Text>
            )}
          </View>

          {loading && visits.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your visits...</Text>
            </View>
          ) : visits.length > 0 ? (
            <>
              {visits.map((visit) => (
                <TouchableOpacity
                  key={visit.id}
                  style={styles.visitCard}
                  onPress={() => handleVisitPress(visit)}
                  activeOpacity={0.7}
                >
                  <View style={styles.visitCardInner}>
                    <View style={styles.visitCardLeft}>
                      <View style={[styles.visitStatusIndicator, { backgroundColor: getStatusColor(visit.status) }]} />
                    </View>
                    <View style={styles.visitCardContent}>
                      <View style={styles.visitCardTop}>
                        <Text style={styles.visitCardTitle} numberOfLines={2}>
                          {visit.site.building_name}
                        </Text>
                        <View style={[styles.visitCardBadge, { backgroundColor: getStatusColor(visit.status) }]}>
                          <Text style={styles.visitCardBadgeText}>
                            {getStatusIcon(visit.status)} {beautifyName(visit.status)}
                          </Text>
                        </View>
                      </View>
                      {visit.site.location && (
                        <Text style={styles.visitCardLocation} numberOfLines={1}>
                          📍 {visit.site.location}
                        </Text>
                      )}
                      <View style={styles.visitCardMeta}>
                        {visit.site.rent && (
                          <View style={styles.metaTag}>
                            <Text style={styles.metaTagText}>₹{visit.site.rent}/mo</Text>
                          </View>
                        )}
                        {visit.photos.length > 0 && (
                          <View style={styles.metaTag}>
                            <Text style={styles.metaTagText}>📷 {visit.photos.length}</Text>
                          </View>
                        )}
                        {visit.comments.length > 0 && (
                          <View style={styles.metaTag}>
                            <Text style={styles.metaTagText}>💬 {visit.comments.length}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.visitCardFooter}>
                        <Text style={styles.visitCardDate}>
                          {formatDate(visit.created_at)}
                        </Text>
                        <Text style={styles.visitCardArrow}>→</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {loadingMore && (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingMoreText}>Loading more visits...</Text>
                </View>
              )}
              {pagination && !pagination.has_next && !searchQuery && visits.length > 0 && (
                <View style={styles.endOfListMessage}>
                  <Text style={styles.endOfListText}>✓ You've seen all your visits</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No visits found' : 'No visits assigned yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Your assigned visits will appear here'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  backIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  searchIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  clearSearchButton: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    padding: spacing.xs,
  },
  searchIndicator: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.info + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    borderRadius: borderRadius.md,
  },
  searchIndicatorText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
  listContent: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  paginationInfo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  visitCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  visitCardInner: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  visitCardLeft: {
    width: 4,
    backgroundColor: colors.primary,
  },
  visitCardContent: {
    flex: 1,
    padding: spacing.md,
  },
  visitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  visitCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  visitCardBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  visitCardBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
  },
  visitCardLocation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  visitCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  metaTag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  metaTagText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  visitCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  visitCardDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  visitCardArrow: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '700',
  },
  visitStatusIndicator: {
    width: 4,
    height: '100%',
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  loadingMoreText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  endOfListMessage: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  endOfListText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // DETAIL VIEW STYLES
  detailScrollView: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  detailCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  siteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  siteHeaderInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  statusBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  locationText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  editButtonActive: {
    backgroundColor: colors.warning,
  },
  editButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  contactItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  contactValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  phoneLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  photoScroll: {
    marginVertical: spacing.md,
  },
  photoThumbnail: {
    marginRight: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  photoImage: {
    width: 120,
    height: 120,
    backgroundColor: colors.backgroundSecondary,
  },
  photoNumber: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.primary + 'CC',
    color: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCloseText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  photoModalImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
  },
  photoModalCounter: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  photoModalCounterText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  commentItem: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  commentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  commentContent: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  documentsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  documentsLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  documentLink: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  documentLinkText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  addCommentForm: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.sm,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  commentFormActions: {
    marginBottom: spacing.md,
  },
  attachButton: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  documentsPreview: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentsPreviewTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  documentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  documentPreviewName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  removeButton: {
    fontSize: fontSize.lg,
    color: colors.error,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  completeButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  completeButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  completeButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  pendingReviewCard: {
    backgroundColor: colors.warning + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  pendingReviewContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  pendingReviewIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  pendingReviewText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pendingReviewSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  completedCard: {
    backgroundColor: colors.success + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  completedContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  completedIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  completedText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.success,
  },
});

export default ScoutBoy;