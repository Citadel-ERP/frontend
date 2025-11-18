import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, RefreshControl, PanResponder, Animated
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Design tokens
const colors = {
  primary: '#161b34',
  primaryLight: '#2a3150',
  secondary: '#4A5568',
  accent: '#3B82F6',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  white: '#FFFFFF',
  black: '#000000',
  text: '#1a202c',
  textSecondary: '#718096',
  textLight: '#A0AEC0',
  background: '#FFFFFF',
  backgroundSecondary: '#F7FAFC',
  border: '#E2E8F0',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
  </View>
);

const ScoutBoy = ({ onBack }) => {
  const [viewMode, setViewMode] = useState('visits-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [visitsError, setVisitsError] = useState(null);
  const [selectedVisitIndex, setSelectedVisitIndex] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // Photo modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Mark complete state
  const [markingComplete, setMarkingComplete] = useState(false);

  // Swipe animation
  const translateX = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mock data for demo
  useEffect(() => {
    const mockVisits = [
      {
        id: 1,
        site: {
          building_name: 'Tech Tower Plaza',
          location: 'Sector 62, Noida, Uttar Pradesh',
          landmark: 'Near Metro Station',
          building_status: 'Completed',
          floor_condition: 'Excellent',
          total_floors: '10',
          number_of_basements: '2',
          availble_floors: '5, 6, 7',
          total_area: '50000',
          area_per_floor: '5000',
          efficiency: '85%',
          oc: 'Yes',
          will_developer_do_fitouts: 'Yes',
          rent: '150000',
          cam: '25000',
          cam_deposit: '50000',
          security_deposit: '450000',
          lease_term: '3 years',
          lock_in_period: '1 year',
          notice_period: '3 months',
          rental_escalation: '10% yearly',
          car_parking_ratio: '1:1000',
          car_parking_slots: '50',
          car_parking_charges: '5000',
          two_wheeler_slots: '100',
          two_wheeler_charges: '1000',
          power: '24x7',
          power_backup: '100%',
          number_of_cabins: '15',
          number_of_workstations: '200',
          size_of_workstation: '60 sq ft',
          meeting_room: 'Yes',
          discussion_room: 'Yes',
          server_room: 'Yes',
          training_room: 'Yes',
          pantry: 'Yes',
          cafeteria: 'Yes',
          electrical_ups_room: 'Yes',
          gym: 'Yes',
          building_owner_name: 'Mr. Sharma',
          building_owner_contact: '9876543210',
          contact_person_name: 'Rajesh Kumar',
          contact_person_number: '9876543211',
          contact_person_email: 'rajesh@techplaza.com',
          contact_person_designation: 'Property Manager',
          remarks: 'Premium commercial property with excellent connectivity and amenities.',
          updated_at: '2025-01-15T10:30:00Z'
        },
        status: 'pending',
        assigned_by: { full_name: 'Admin User' },
        created_at: '2025-01-10T09:00:00Z',
        updated_at: '2025-01-15T10:30:00Z',
        scout_completed_at: null,
        building_photos: [
          { id: 1, file_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400' },
          { id: 2, file_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' },
        ],
        photos: [
          { id: 1, file_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400' },
          { id: 2, file_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' },
        ],
      },
      {
        id: 2,
        site: {
          building_name: 'Business Park Avenue',
          location: 'Sector 18, Gurgaon, Haryana',
          landmark: 'Near Cyber Hub',
          building_status: 'Under Construction',
          floor_condition: 'Good',
          total_floors: '15',
          number_of_basements: '3',
          availble_floors: '8, 9, 10',
          total_area: '75000',
          area_per_floor: '5000',
          efficiency: '80%',
          oc: 'Pending',
          will_developer_do_fitouts: 'No',
          rent: '200000',
          cam: '30000',
          cam_deposit: '60000',
          security_deposit: '600000',
          lease_term: '5 years',
          lock_in_period: '2 years',
          notice_period: '6 months',
          rental_escalation: '12% yearly',
          building_owner_name: 'Mrs. Patel',
          building_owner_contact: '9876543220',
          contact_person_name: 'Amit Singh',
          contact_person_number: '9876543221',
          contact_person_email: 'amit@businesspark.com',
          contact_person_designation: 'Leasing Manager',
          remarks: 'Modern business park with great amenities.',
          updated_at: '2025-01-14T14:20:00Z'
        },
        status: 'scout_completed',
        assigned_by: { full_name: 'Admin User' },
        created_at: '2025-01-08T11:00:00Z',
        updated_at: '2025-01-14T14:20:00Z',
        scout_completed_at: '2025-01-14T14:20:00Z',
        building_photos: [
          { id: 3, file_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400' },
        ],
        photos: [
          { id: 3, file_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400' },
        ],
      },
      {
        id: 3,
        site: {
          building_name: 'Corporate Heights',
          location: 'Connaught Place, New Delhi',
          landmark: 'Central Delhi',
          building_status: 'Completed',
          floor_condition: 'Excellent',
          total_floors: '12',
          number_of_basements: '2',
          availble_floors: '3, 4, 5, 6',
          total_area: '60000',
          area_per_floor: '5000',
          efficiency: '90%',
          oc: 'Yes',
          will_developer_do_fitouts: 'Yes',
          rent: '300000',
          cam: '40000',
          cam_deposit: '80000',
          security_deposit: '900000',
          lease_term: '3 years',
          lock_in_period: '1 year',
          notice_period: '3 months',
          rental_escalation: '10% yearly',
          building_owner_name: 'Mr. Gupta',
          building_owner_contact: '9876543230',
          contact_person_name: 'Priya Sharma',
          contact_person_number: '9876543231',
          contact_person_email: 'priya@corporateheights.com',
          contact_person_designation: 'Senior Manager',
          remarks: 'Prime location in heart of Delhi.',
          updated_at: '2025-01-16T16:45:00Z'
        },
        status: 'admin_completed',
        assigned_by: { full_name: 'Admin User' },
        created_at: '2025-01-05T08:30:00Z',
        updated_at: '2025-01-16T16:45:00Z',
        scout_completed_at: '2025-01-12T10:00:00Z',
        building_photos: [],
        photos: [],
      },
    ];
    setVisits(mockVisits);
    setLoadingVisits(false);
  }, []);

  // Utility functions
  const beautifyName = (name) => {
    if (!name) return '-';
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString) => {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'scout_completed': return '#ffcc92ff';
      case 'admin_completed': return '#28A745';
      case 'cancelled': return '#DC3545';
      default: return '#6C7293';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'scout_completed': return '✓';
      case 'admin_completed': return '✓✓';
      case 'cancelled': return '✗';
      default: return '•';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleVisitPress = (visit, index) => {
    setSelectedVisitIndex(index);
    setViewMode('visit-detail');
  };

  const handleBackToList = () => {
    setViewMode('visits-list');
    translateX.setValue(0);
  };

  const handleCreateSiteClick = () => {
    setViewMode('create-site');
  };

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
    setTimeout(() => {
      const updatedVisits = [...visits];
      updatedVisits[selectedVisitIndex].status = 'scout_completed';
      setVisits(updatedVisits);
      setMarkingComplete(false);
    }, 1000);
  };

  // Swipe handlers
  const navigateToVisit = (direction) => {
    if (isTransitioning) return;

    const newIndex = selectedVisitIndex + direction;
    if (newIndex < 0 || newIndex >= visits.length) return;

    setIsTransitioning(true);
    
    Animated.timing(translateX, {
      toValue: -direction * screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setSelectedVisitIndex(newIndex);
      translateX.setValue(0);
      setIsTransitioning(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isTransitioning) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isTransitioning) return;

        if (Math.abs(gestureState.dx) > screenWidth * 0.3) {
          const direction = gestureState.dx > 0 ? -1 : 1;
          navigateToVisit(direction);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Visit Detail View
  if (viewMode === 'visit-detail' && visits[selectedVisitIndex]) {
    const selectedVisit = visits[selectedVisitIndex];
    const site = selectedVisit.site;
    
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Visit {selectedVisitIndex + 1} of {visits.length}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.swipeIndicators}>
          {selectedVisitIndex > 0 && (
            <TouchableOpacity 
              style={[styles.swipeButton, styles.swipeButtonLeft]}
              onPress={() => navigateToVisit(-1)}
            >
              <Text style={styles.swipeButtonText}>‹</Text>
            </TouchableOpacity>
          )}
          {selectedVisitIndex < visits.length - 1 && (
            <TouchableOpacity 
              style={[styles.swipeButton, styles.swipeButtonRight]}
              onPress={() => navigateToVisit(1)}
            >
              <Text style={styles.swipeButtonText}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ translateX }] }
          ]}
          {...panResponder.panHandlers}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.detailContainer}>
              <View style={styles.card}>
                <View style={styles.siteHeader}>
                  <View style={styles.siteHeaderContent}>
                    <Text style={styles.siteName}>{site.building_name}</Text>
                    <View style={styles.statusBadgeContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVisit.status) }]}>
                        <Text style={styles.statusBadgeText}>
                          {getStatusIcon(selectedVisit.status)} {beautifyName(selectedVisit.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {site.location && (
                  <View style={styles.locationContainer}>
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.locationText}>{site.location}</Text>
                  </View>
                )}

                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Assigned by</Text>
                    <Text style={styles.metaValue}>{selectedVisit.assigned_by.full_name}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Site Updated</Text>
                    <Text style={styles.metaValue}>{formatDate(site.updated_at)}</Text>
                  </View>
                </View>
              </View>

              {selectedVisit.building_photos && selectedVisit.building_photos.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Photos ({selectedVisit.building_photos.length})</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoScroll}
                  >
                    {selectedVisit.building_photos.map((photo, index) => (
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
              ) : (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Photos</Text>
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>📷</Text>
                    <Text style={styles.emptyStateText}>No photos available</Text>
                  </View>
                </View>
              )}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Property Details</Text>
                <DetailSection title="📋 Basic Information" site={site} />
                <DetailSection title="💰 Commercial Details" site={site} />
                <DetailSection title="👤 Contact Information" site={site} />

                {site.remarks && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>📝 Remarks</Text>
                    <Text style={styles.remarksText}>{site.remarks}</Text>
                  </View>
                )}
              </View>

              {selectedVisit.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.markCompleteButton, markingComplete && styles.markCompleteButtonDisabled]}
                  onPress={handleMarkComplete}
                  disabled={markingComplete}
                >
                  {markingComplete ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.markCompleteButtonText}>✓ Mark Visit as Completed</Text>
                  )}
                </TouchableOpacity>
              )}

              <View style={{ height: 24 }} />
            </View>
          </ScrollView>
        </Animated.View>

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
          </View>
        </Modal>
      </View>
    );
  }

  // Create Site View
  if (viewMode === 'create-site') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('visits-list')}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Site</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.emptyListTitle}>Create Site Form</Text>
          <Text style={styles.emptyListSubtitle}>Form implementation goes here</Text>
        </View>
      </View>
    );
  }

  // Default view: Visits List
  return (
    <View style={styles.container}>
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
            onPress={handleCreateSiteClick}
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
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {loadingVisits ? (
            <View style={styles.emptyListContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyListSubtitle}>Loading visits...</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Assigned Visits</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{visits.length}</Text>
                </View>
              </View>

              {visits.length > 0 ? (
                visits.map((visit, index) => (
                  <TouchableOpacity
                    key={visit.id}
                    style={styles.visitCard}
                    onPress={() => handleVisitPress(visit, index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.visitCardImage}>
                      {visit.building_photos && visit.building_photos.length > 0 ? (
                        <Image
                          source={{ uri: visit.building_photos[0].file_url }}
                          style={styles.visitImage}
                        />
                      ) : (
                        <View style={styles.visitImagePlaceholder}>
                          <Text style={styles.visitImagePlaceholderIcon}>🏢</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.visitCardContent}>
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
                        {visit.photos && visit.photos.length > 0 && (
                          <View style={styles.visitMetaItem}>
                            <Text style={styles.visitMetaText}>📷 {visit.photos.length}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.visitCardFooter}>
                        <Text style={styles.visitDate}>{formatDate(visit.created_at)}</Text>
                        <Text style={styles.visitArrow}>→</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListIcon}>📋</Text>
                  <Text style={styles.emptyListTitle}>No visits assigned yet</Text>
                  <Text style={styles.emptyListSubtitle}>Your assigned visits will appear here</Text>
                </View>
              )}
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </View>
  );
};

// Helper component for detail sections
const DetailSection = ({ title, site }) => {
  const getDetailItems = () => {
    switch (title) {
      case '📋 Basic Information':
        return [
          { label: 'Landmark', value: site.landmark },
          { label: 'Building Status', value: site.building_status },
          { label: 'Floor Condition', value: site.floor_condition },
          { label: 'Total Floors', value: site.total_floors },
          { label: 'Basements', value: site.number_of_basements },
          { label: 'Available Floors', value: site.availble_floors },
          { label: 'Total Area', value: site.total_area ? `${site.total_area} sq ft` : '-' },
          { label: 'Area per Floor', value: site.area_per_floor ? `${site.area_per_floor} sq ft` : '-' },
          { label: 'Efficiency', value: site.efficiency },
          { label: 'OC Available', value: site.oc },
          { label: 'Developer Fitouts', value: site.will_developer_do_fitouts },
        ];
      case '💰 Commercial Details':
        return [
          { label: 'Monthly Rent', value: site.rent ? `₹${site.rent}` : '-' },
          { label: 'CAM', value: site.cam ? `₹${site.cam}` : '-' },
          { label: 'CAM Deposit', value: site.cam_deposit ? `₹${site.cam_deposit}` : '-' },
          { label: 'Security Deposit', value: site.security_deposit ? `₹${site.security_deposit}` : '-' },
          { label: 'Lease Term', value: site.lease_term },
          { label: 'Lock-in Period', value: site.lock_in_period },
          { label: 'Notice Period', value: site.notice_period },
          { label: 'Rental Escalation', value: site.rental_escalation },
        ];
      case '👤 Contact Information':
        return [
          { label: 'Building Owner', value: site.building_owner_name },
          { label: 'Owner Contact', value: site.building_owner_contact },
          { label: 'Contact Person', value: site.contact_person_name },
          { label: 'Phone', value: site.contact_person_number },
          { label: 'Email', value: site.contact_person_email },
          { label: 'Designation', value: site.contact_person_designation },
        ];
      default:
        return [];
    }
  };

  const items = getDetailItems();
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      <View style={styles.detailGrid}>
        {items.map((item, idx) => (
          item.value && (
            <View key={idx} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value || '-'}</Text>
            </View>
          )
        ))}
      </View>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.xs,
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
    width: 32,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 0,
    paddingTop: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
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
    marginBottom: spacing.md,
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
  visitCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.md,
  },
  visitCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.backgroundSecondary,
  },
  visitImage: {
    width: '100%',
    height: '100%',
  },
  visitImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  visitImagePlaceholderIcon: {
    fontSize: 48,
  },
  visitCardContent: {
    padding: spacing.md,
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
  swipeIndicators: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    pointerEvents: 'box-none',
  },
  swipeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  swipeButtonLeft: {
    marginLeft: spacing.xs,
  },
  swipeButtonRight: {
    marginRight: spacing.xs,
  },
  swipeButtonText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.backgroundSecondary,
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  remarksText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
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
  markCompleteButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  markCompleteButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  markCompleteButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingMoreText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});

export default ScoutBoy;