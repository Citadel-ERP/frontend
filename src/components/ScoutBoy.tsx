import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, Animated
} from 'react-native';
import { RefreshControl } from 'react-native';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const colors = {
  primary: '#161b34ff',
  primaryLight: '#c1c7f4ff',
  primaryDark: '#1A1D2E',
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  text: '#2F3349',
  textSecondary: '#6C7293',
  textLight: '#8B92B2',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#F1F3F4',
  border: '#E0E4E7',
  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
  info: '#ffcc92ff',
  link: '#007BFF',
  disabled: '#6C757D',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

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
  const [viewMode, setViewMode] = useState<'visits-list' | 'visit-detail' | 'create-site'>('visits-list');
  const [token, setToken] = useState<string | null>('mock_token');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([
    {
      id: 1,
      site: {
        id: 1,
        building_name: 'Prestige Tower',
        location: 'MSK Residency 404 floor 5',
        rent: '1232231.22',
        building_status: 'Ready to Move',
        total_area: '5000',
        area_per_floor: '1000',
        availble_floors: '1,2,3,4,5',
        car_parking_ratio: '1:100',
        contact_person_name: 'John Doe',
        contact_person_number: '+91 9876543210',
        contact_person_email: 'john@example.com',
        contact_person_designation: 'Manager',
        latitude: 28.6139,
        longitude: 77.2090,
        total_floors: 10,
        number_of_basements: 2,
        floor_condition: 'Excellent',
        car_parking_charges: '5000',
        car_parking_slots: '50',
        cam: '15',
        cam_deposit: '50000',
        oc: 'Yes',
        rental_escalation: '5%',
        security_deposit: '500000',
        two_wheeler_slots: '100',
        two_wheeler_charges: '1000',
        efficiency: '85%',
        notice_period: '3 months',
        lease_term: '3 years',
        lock_in_period: '1 year',
        will_developer_do_fitouts: 'Yes',
        power: '500 KW',
        power_backup: '100%',
        number_of_cabins: '20',
        number_of_workstations: '200',
        size_of_workstation: '60 sq ft',
        server_room: 'Yes',
        training_room: 'Yes',
        pantry: 'Yes',
        electrical_ups_room: 'Yes',
        cafeteria: 'Yes',
        gym: 'Yes',
        discussion_room: 'Yes',
        meeting_room: 'Yes',
        remarks: 'Prime location with excellent connectivity',
        updated_at: '2025-11-13T10:30:00Z',
      },
      status: 'scout_completed',
      comments: [
        {
          id: 1,
          user: { full_name: 'Jane Smith', profile_picture: null },
          content: 'Great property with excellent facilities. The location is prime and very accessible.',
          documents: [],
          created_at: '2025-11-13T09:00:00Z',
          updated_at: '2025-11-13T09:00:00Z',
        }
      ],
      photos: [
        {
          id: 1,
          file_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
          description: 'Front view',
          created_at: '2025-11-13T08:00:00Z',
        }
      ],
      assigned_by: { full_name: 'Admin User' },
      created_at: '2025-11-13T07:00:00Z',
      updated_at: '2025-11-13T10:30:00Z',
      scout_completed_at: '2025-11-13T10:30:00Z',
      is_visible_to_scout: true,
    }
  ]);
  const [pagination, setPagination] = useState<Pagination | null>({
    current_page: 1,
    total_pages: 1,
    total_items: 1,
    page_size: 10,
    has_next: false,
    has_previous: false,
  });
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSite, setEditedSite] = useState<Partial<SiteInfo> | null>(null);
  const [updatingDetails, setUpdatingDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const [newSite, setNewSite] = useState({
    building_name: '',
    latitude: '',
    longitude: '',
    location: '',
    total_area: '',
    rent: '',
  });
  const [creatingsite, setCreatingSite] = useState(false);

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

  const formatDate = (dateString?: string | null): string => {
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

  const handleVisitPress = (visit: Visit) => {
    setSelectedVisit(visit);
    setEditedSite({ ...visit.site });
    setViewMode('visit-detail');
    setIsEditMode(false);
  };

  const handleBackToList = () => {
    setViewMode('visits-list');
    setSelectedVisit(null);
    setEditedSite(null);
    setIsEditMode(false);
    setNewComment('');
    setSelectedDocuments([]);
  };

  const updateVisitDetails = async (): Promise<boolean> => {
    setUpdatingDetails(true);
    setTimeout(() => {
      Alert.alert('Success', 'Site details updated successfully!');
      setIsEditMode(false);
      setUpdatingDetails(false);
    }, 1000);
    return true;
  };

  const addCommentToVisit = async (): Promise<boolean> => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return false;
    }
    setAddingComment(true);
    setTimeout(() => {
      Alert.alert('Success', 'Comment added successfully!');
      setNewComment('');
      setSelectedDocuments([]);
      setAddingComment(false);
    }, 1000);
    return true;
  };

  const markVisitComplete = async (): Promise<boolean> => {
    setMarkingComplete(true);
    setTimeout(() => {
      setVisits(prevVisits => prevVisits.filter(v => v.id !== selectedVisit?.id));
      setMarkingComplete(false);
      Alert.alert(
        'Visit Completed',
        'Your visit has been marked as complete and removed from your list.',
        [{ text: 'OK', onPress: handleBackToList }]
      );
    }, 1000);
    return true;
  };

  const handleCreateSite = async () => {
    if (!newSite.building_name || !newSite.latitude || !newSite.longitude) {
      Alert.alert('Error', 'Please fill required fields: Building Name, Latitude, Longitude');
      return;
    }
    setCreatingSite(true);
    setTimeout(() => {
      Alert.alert('Success', 'Site created successfully!');
      setViewMode('visits-list');
      setNewSite({
        building_name: '',
        latitude: '',
        longitude: '',
        location: '',
        total_area: '',
        rent: '',
      });
      setCreatingSite(false);
    }, 1000);
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  const EditIcon = ({ size = 18 }: { size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.65,
        height: size * 0.65,
        borderWidth: 1.5,
        borderColor: colors.white,
        transform: [{ rotate: '45deg' }],
        position: 'relative',
      }}>
        <View style={{
          position: 'absolute',
          bottom: -size * 0.15,
          right: -size * 0.15,
          width: size * 0.35,
          height: size * 0.35,
          backgroundColor: colors.white,
          transform: [{ rotate: '-45deg' }],
        }} />
      </View>
    </View>
  );

  if (viewMode === 'create-site') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Site</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Basic Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Building Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.building_name}
                  onChangeText={(val) => setNewSite({ ...newSite, building_name: val })}
                  placeholder="Enter building name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Latitude *</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.latitude}
                    onChangeText={(val) => setNewSite({ ...newSite, latitude: val })}
                    placeholder="0.0000"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Longitude *</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.longitude}
                    onChangeText={(val) => setNewSite({ ...newSite, longitude: val })}
                    placeholder="0.0000"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.location}
                  onChangeText={(val) => setNewSite({ ...newSite, location: val })}
                  placeholder="Enter full address"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Total Area (sq ft)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.total_area}
                    onChangeText={(val) => setNewSite({ ...newSite, total_area: val })}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Monthly Rent (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.rent}
                    onChangeText={(val) => setNewSite({ ...newSite, rent: val })}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, creatingsite && styles.buttonDisabled]}
              onPress={handleCreateSite}
              disabled={creatingsite}
            >
              {creatingsite ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Site</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (viewMode === 'visit-detail' && selectedVisit) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visit Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.detailContainer}>
            <View style={styles.card}>
              <View style={styles.siteHeader}>
                <View style={styles.siteHeaderContent}>
                  <Text style={styles.siteName}>{selectedVisit.site.building_name}</Text>
                  <View style={styles.statusBadgeContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVisit.status) }]}>
                      <Text style={styles.statusBadgeText}>
                        {getStatusIcon(selectedVisit.status)} {beautifyName(selectedVisit.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {selectedVisit.site.location && (
                <View style={styles.locationContainer}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationText}>{selectedVisit.site.location}</Text>
                </View>
              )}

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Assigned by</Text>
                  <Text style={styles.metaValue}>{selectedVisit.assigned_by.full_name}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Site Updated</Text>
                  <Text style={styles.metaValue}>{formatDate(selectedVisit.site.updated_at)}</Text>
                </View>
              </View>

              {selectedVisit.scout_completed_at && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Completed On</Text>
                  <Text style={styles.metaValue}>{formatDate(selectedVisit.scout_completed_at)}</Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Property Details</Text>
                {selectedVisit.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditMode(!isEditMode)}
                  >
                    <EditIcon size={16} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Building Status</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.detailInput}
                      value={editedSite?.building_status || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, building_status: val })}
                      placeholder="Enter status"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.building_status || '-'}</Text>
                  )}
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Area</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.detailInput}
                      value={editedSite?.total_area || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, total_area: val })}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.detailValue}>
                      {selectedVisit.site.total_area ? `${selectedVisit.site.total_area} sq ft` : '-'}
                    </Text>
                  )}
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Monthly Rent</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.detailInput}
                      value={editedSite?.rent || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, rent: val })}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.detailValue}>
                      {selectedVisit.site.rent ? `₹${selectedVisit.site.rent}` : '-'}
                    </Text>
                  )}
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Car Parking Ratio</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.detailInput}
                      value={editedSite?.car_parking_ratio || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, car_parking_ratio: val })}
                      placeholder="1:100"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.car_parking_ratio || '-'}</Text>
                  )}
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Available Floors</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.detailInput}
                      value={editedSite?.availble_floors || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, availble_floors: val })}
                      placeholder="1,2,3"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.detailValue}>{selectedVisit.site.availble_floors || '-'}</Text>
                  )}
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Area Per Floor</Text>
                  {isEditMode ? (
                    <TextInput
                      style={styles.detailInput}
                      value={editedSite?.area_per_floor || ''}
                      onChangeText={(val) => setEditedSite({ ...editedSite, area_per_floor: val })}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.detailValue}>
                      {selectedVisit.site.area_per_floor ? `${selectedVisit.site.area_per_floor} sq ft` : '-'}
                    </Text>
                  )}
                </View>
              </View>

              {isEditMode && (
                <TouchableOpacity
                  style={[styles.primaryButton, updatingDetails && styles.buttonDisabled]}
                  onPress={updateVisitDetails}
                  disabled={updatingDetails}
                >
                  {updatingDetails ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact Information</Text>
              <View style={styles.contactGrid}>
                {selectedVisit.site.contact_person_name && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Name</Text>
                    <Text style={styles.contactValue}>{selectedVisit.site.contact_person_name}</Text>
                  </View>
                )}
                {selectedVisit.site.contact_person_designation && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Designation</Text>
                    <Text style={styles.contactValue}>{selectedVisit.site.contact_person_designation}</Text>
                  </View>
                )}
                {selectedVisit.site.contact_person_number && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={[styles.contactValue, styles.contactLink]}>
                      📞 {selectedVisit.site.contact_person_number}
                    </Text>
                  </View>
                )}
                {selectedVisit.site.contact_person_email && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={[styles.contactValue, styles.contactLink]}>
                      {selectedVisit.site.contact_person_email}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {selectedVisit.photos && selectedVisit.photos.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Photos ({selectedVisit.photos.length})</Text>
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
                      <View style={styles.photoNumberBadge}>
                        <Text style={styles.photoNumber}>{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.commentsHeader}>
                <Text style={styles.cardTitle}>Comments ({selectedVisit.comments.length})</Text>
                {loadingComments && <ActivityIndicator color={colors.primary} size="small" />}
              </View>

              {selectedVisit.comments.length > 0 ? (
                <View style={styles.commentsContainer}>
                  {selectedVisit.comments.map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {comment.user.full_name.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                        <View style={styles.commentHeaderContent}>
                          <Text style={styles.commentAuthor}>{comment.user.full_name}</Text>
                          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                        </View>
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                      {comment.documents && comment.documents.length > 0 && (
                        <View style={styles.documentsSection}>
                          {comment.documents.map((doc) => (
                            <View key={doc.id} style={styles.documentChip}>
                              <Text style={styles.documentIcon}>📎</Text>
                              <Text style={styles.documentName} numberOfLines={1}>{doc.document_name}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>💬</Text>
                  <Text style={styles.emptyStateText}>No comments yet</Text>
                </View>
              )}

              <View style={styles.addCommentSection}>
                <Text style={styles.formLabel}>Add Your Observation</Text>
                <TextInput
                  style={styles.commentInput}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Share your thoughts about this site..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={colors.textSecondary}
                />

                <TouchableOpacity
                  style={[styles.primaryButton, addingComment && styles.buttonDisabled]}
                  onPress={addCommentToVisit}
                  disabled={addingComment}
                >
                  {addingComment ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Post Comment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {selectedVisit.status === 'pending' && (
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={[styles.completeButton, markingComplete && styles.buttonDisabled]}
                  onPress={() => {
                    Alert.alert(
                      'Mark Visit Complete?',
                      'Once you mark this visit as complete, it will be removed from your list and sent to admin for final verification.',
                      [
                        { text: 'Cancel', style: 'cancel' },
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
              <View style={[styles.card, styles.statusCard, { backgroundColor: colors.info + '15' }]}>
                <View style={styles.statusCardContent}>
                  <Text style={styles.statusCardIcon}>⏳</Text>
                  <Text style={styles.statusCardText}>Waiting for admin to finalize this visit</Text>
                  <Text style={styles.statusCardSubtext}>
                    Completed on {formatDate(selectedVisit.scout_completed_at)}
                  </Text>
                </View>
              </View>
            )}

            {selectedVisit.status === 'admin_completed' && (
              <View style={[styles.card, styles.statusCard, { backgroundColor: colors.success + '15' }]}>
                <View style={styles.statusCardContent}>
                  <Text style={styles.statusCardIcon}>✓✓</Text>
                  <Text style={[styles.statusCardText, { color: colors.success }]}>
                    This visit has been finalized by admin
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </View>
        </ScrollView>

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Visits</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search visits..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchButton}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.createButtonWrapper}>
          <TouchableOpacity
            style={styles.createSiteButton}
            onPress={() => setViewMode('create-site')}
          >
            <Text style={styles.createSiteButtonText}>+ Create New Site</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.listScrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 1000);
              }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Assigned Visits</Text>
              {pagination && !searchQuery && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{visits.length} of {pagination.total_items}</Text>
                </View>
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
                    <View style={styles.visitCardHeader}>
                      <Text style={styles.visitCardTitle} numberOfLines={1}>
                        {visit.site.building_name}
                      </Text>
                      <View style={[styles.visitStatusBadge, { backgroundColor: getStatusColor(visit.status) }]}>
                        <Text style={styles.visitStatusText}>
                          {getStatusIcon(visit.status)} {beautifyName(visit.status)}
                        </Text>
                      </View>
                    </View>
                    
                    {visit.site.location && (
                      <View style={styles.visitLocationRow}>
                        <Text style={styles.visitLocationIcon}>📍</Text>
                        <Text style={styles.visitLocationText} numberOfLines={1}>
                          {visit.site.location}
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.visitMetaRow}>
                      {visit.site.rent && (
                        <View style={styles.visitMetaItem}>
                          <Text style={styles.visitMetaText}>₹{visit.site.rent}/mo</Text>
                        </View>
                      )}
                      {visit.photos.length > 0 && (
                        <View style={styles.visitMetaItem}>
                          <Text style={styles.visitMetaText}>📷 {visit.photos.length}</Text>
                        </View>
                      )}
                      {visit.comments.length > 0 && (
                        <View style={styles.visitMetaItem}>
                          <Text style={styles.visitMetaText}>💬 {visit.comments.length}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.visitCardFooter}>
                      <Text style={styles.visitDate}>{formatDate(visit.created_at)}</Text>
                      <Text style={styles.visitArrow}>→</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListIcon}>📋</Text>
                <Text style={styles.emptyListTitle}>
                  {searchQuery ? 'No visits found' : 'No visits assigned yet'}
                </Text>
                <Text style={styles.emptyListSubtitle}>
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Your assigned visits will appear here'}
                </Text>
              </View>
            )}
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
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
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
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
    paddingVertical: spacing.md,
  },
  clearSearchButton: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    padding: spacing.xs,
  },
  createButtonWrapper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  createSiteButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  createSiteButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  listScrollView: {
    flex: 1,
    marginTop: spacing.md,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  visitCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    ...shadows.md,
  },
  visitCardHeader: {
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
  visitStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  visitStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
  },
  visitLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  visitLocationIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  visitLocationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  visitMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  visitMetaItem: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  visitMetaText: {
    fontSize: fontSize.xs,
    color: colors.text,
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
  visitDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  visitArrow: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyListIcon: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyListTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyListSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  formContainer: {
    padding: spacing.lg,
  },
  detailContainer: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    fontSize: fontSize.md,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  siteHeader: {
    marginBottom: spacing.md,
  },
  siteHeaderContent: {
    flex: 1,
  },
  siteName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  locationIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundSecondary,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  metaLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  detailsGrid: {
    gap: spacing.sm,
  },
  detailItem: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  detailInput: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.xs,
  },
  contactGrid: {
    gap: spacing.sm,
  },
  contactItem: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  contactLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  contactValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  contactLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  photoScroll: {
    marginTop: spacing.sm,
  },
  photoThumbnail: {
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  photoImage: {
    width: 120,
    height: 120,
    backgroundColor: colors.backgroundSecondary,
  },
  photoNumberBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  photoNumber: {
    color: colors.white,
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
    top: 60,
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
    bottom: 60,
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
  commentsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  commentAvatarText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  commentHeaderContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  commentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  documentsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  documentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '40',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    maxWidth: '100%',
  },
  documentIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  documentName: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  addCommentSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.sm,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: spacing.xl,
  },
  actionContainer: {
    marginBottom: spacing.xxl,
  },
  completeButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
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
  statusCard: {
    borderLeftWidth: 4,
  },
  statusCardContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statusCardIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  statusCardText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statusCardSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ScoutBoy;