import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  Linking,
  StatusBar,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Visit, Comment } from './types';
import VisitComment from './visitComment';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  chat: '#4d4d4d',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
};

interface VisitDetailsProps {
  visit: Visit;
  currentIndex: number;
  totalVisits: number;
  onBack: () => void;
  onEdit: () => void;
  onMarkComplete: () => void;
  onPhotoPress: (url: string, index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  token: string | null;
  theme: ThemeColors;
  currentUserId?: string;
}

const VisitDetails: React.FC<VisitDetailsProps> = ({
  visit,
  currentIndex,
  totalVisits,
  onBack,
  onEdit,
  onMarkComplete,
  onPhotoPress,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  token,
  theme,
  currentUserId,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const shouldScrollToBottomRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const paginationTriggeredAt = useRef(0);
  const PAGINATION_COOLDOWN = 800;
  const SCROLL_THRESHOLD = 50;

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setCurrentUserEmployeeId(parsedData.employee_id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchComments = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!token || !visit.id) return;

    try {
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getVisitComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, visit_id: visit.id, page })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const formattedComments: Comment[] = data.comments.map((item: any) => ({
        id: item.id,
        user: item.user,
        content: item.content,
        documents: item.documents || [],
        created_at: item.created_at,
        employeeId: item.user?.employee_id,
      }));

      if (append) {
        // When loading more (older messages), prepend them to the beginning
        setComments(prev => [...formattedComments, ...prev]);
      } else {
        // Initial load - just set the comments
        setComments(formattedComments);
        setInitialLoadDone(true);
        shouldScrollToBottomRef.current = true;
      }

      if (data.pagination) {
        setHasMoreComments(data.pagination.has_next);
        setCurrentPage(data.pagination.current_page);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  }, [token, visit.id]);

  useEffect(() => {
    setInitialLoadDone(false);
    setComments([]);
    setCurrentPage(1);
    setHasMoreComments(true);
    fetchComments(1, false);
  }, [visit.id]);

  const fetchMoreComments = async () => {
    const now = Date.now();
    if (now - paginationTriggeredAt.current < PAGINATION_COOLDOWN) {
      return;
    }

    if (!token || !visit.id || !hasMoreComments || isLoadingMoreRef.current || loadingMoreComments) {
      return;
    }

    isLoadingMoreRef.current = true;
    paginationTriggeredAt.current = now;

    const nextPage = currentPage + 1;
    await fetchComments(nextPage, true);
    
    isLoadingMoreRef.current = false;
    shouldScrollToBottomRef.current = false;
  };

  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    const currentY = contentOffset.y;

    // Load more when scrolling UP (to see older messages)
    if (currentY < SCROLL_THRESHOLD && hasMoreComments && !loadingMoreComments && !isLoadingMoreRef.current) {
      fetchMoreComments();
    }
  }, [hasMoreComments, loadingMoreComments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMoreComments(true);
    await fetchComments(1, false);
    setRefreshing(false);
  }, [fetchComments]);

  const handleCommentAdded = useCallback((newComment: {
    content: string;
    documents: any[];
  }) => {
    const optimisticComment: Comment = {
      id: Date.now(),
      user: {
        id: currentUserEmployeeId ? parseInt(currentUserEmployeeId) : 0,
        full_name: 'You',
        employee_id: currentUserEmployeeId || '',
      },
      content: newComment.content,
      documents: newComment.documents,
      created_at: new Date().toISOString(),
      employeeId: currentUserEmployeeId || '',
    };

    // Add new comment to the END (bottom) of the array
    setComments(prev => [...prev, optimisticComment]);
    shouldScrollToBottomRef.current = true;

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Refresh to get the real comment from backend
    setTimeout(() => {
      setCurrentPage(1);
      setHasMoreComments(true);
      fetchComments(1, false);
    }, 1000);
  }, [currentUserEmployeeId, fetchComments]);

  const beautifyName = useCallback((name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const formatDate = useCallback((dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status) {
      case 'pending': return WHATSAPP_COLORS.warning;
      case 'scout_completed': return '#ffcc92';
      case 'admin_completed': return WHATSAPP_COLORS.success;
      case 'cancelled': return WHATSAPP_COLORS.danger;
      default: return WHATSAPP_COLORS.textSecondary;
    }
  }, []);

  const formatCommentDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      if (diff < 24) {
        return date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch {
      return '-';
    }
  }, []);

  useEffect(() => {
    if (initialLoadDone && shouldScrollToBottomRef.current && comments.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        shouldScrollToBottomRef.current = false;
      }, 150);
    }
  }, [comments, initialLoadDone]);

  const DetailRow = ({ icon, label, value }: { icon?: string; label: string; value: string | number | boolean }) => {
    const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || '-');
    
    return (
      <View style={styles.detailRow}>
        <View style={styles.detailRowLeft}>
          {icon && <Ionicons name={icon as any} size={16} color={WHATSAPP_COLORS.primary} style={styles.detailRowIcon} />}
          <Text style={styles.detailRowLabel}>{label}</Text>
        </View>
        <Text style={styles.detailRowValue}>{displayValue}</Text>
      </View>
    );
  };

  const DetailSection = ({ title, site }: { title: string; site: any }) => {
    const isManagedProperty = site.managed_property === true;
    
    const getDetailItems = () => {
      switch (title) {
        case 'Basic Information':
          if (isManagedProperty) {
            return [
              { icon: 'location', label: 'Landmark', value: site.landmark },
              { icon: 'business', label: 'Building Status', value: site.building_status },
              { icon: 'layers', label: 'Floor Condition', value: site.floor_condition },
              { icon: 'trending-up', label: 'Total Floors', value: site.total_floors },
              { icon: 'arrow-down', label: 'Basements', value: site.number_of_basements },
              { icon: 'people', label: 'Total Seats', value: site.total_seats },
              { icon: 'checkmark-circle', label: 'Seats Available', value: site.seats_available },
              { icon: 'grid', label: 'Number of Units', value: site.number_of_units },
              { icon: 'calculator', label: 'Seats Per Unit', value: site.number_of_seats_per_unit },
              { icon: 'speedometer', label: 'Efficiency', value: site.efficiency },
              { icon: 'time', label: 'Business Hours', value: site.business_hours_of_operation },
              { icon: 'key', label: 'Premises Access', value: site.premises_access },
              { icon: 'construct', label: 'Developer Fitouts', value: site.will_developer_do_fitouts },
            ];
          } else {
            return [
              { icon: 'location', label: 'Landmark', value: site.landmark },
              { icon: 'business', label: 'Building Status', value: site.building_status },
              { icon: 'layers', label: 'Floor Condition', value: site.floor_condition },
              { icon: 'trending-up', label: 'Total Floors', value: site.total_floors },
              { icon: 'arrow-down', label: 'Basements', value: site.number_of_basements },
              { icon: 'resize', label: 'Available Floors', value: site.availble_floors },
              { icon: 'expand', label: 'Total Area', value: site.total_area ? `${site.total_area} sq ft` : '-' },
              { icon: 'apps', label: 'Area per Floor', value: site.area_per_floor ? `${site.area_per_floor} sq ft` : '-' },
              { icon: 'speedometer', label: 'Efficiency', value: site.efficiency },
              { icon: 'cube', label: 'Area Offered', value: site.area_offered },
              { icon: 'construct', label: 'Developer Fitouts', value: site.will_developer_do_fitouts },
            ];
          }
        case 'Commercial Details':
          if (isManagedProperty) {
            return [
              { icon: 'cash', label: 'Rent Per Seat', value: site.rent_per_seat ? `₹${site.rent_per_seat}` : '-' },
              { icon: 'wallet', label: 'Total Monthly Rent', value: site.rent_per_seat && site.total_seats ? `₹${(parseFloat(site.rent_per_seat) * parseFloat(site.total_seats)).toLocaleString('en-IN')}` : '-' },
              { icon: 'settings', label: 'Maintenance Charges', value: site.maintenance_rate ? `₹${site.maintenance_rate}` : '-' },
              { icon: 'card', label: 'CAM Deposit', value: site.cam_deposit ? `₹${site.cam_deposit}` : '-' },
              { icon: 'shield', label: 'Security Deposit', value: site.security_deposit ? `${site.security_deposit} months` : '-' },
              { icon: 'calendar', label: 'Lease Term', value: site.lease_term },
              { icon: 'lock-closed', label: 'Lock-in Period', value: site.lock_in_period },
              { icon: 'notifications', label: 'Notice Period', value: site.notice_period },
              { icon: 'trending-up', label: 'Rental Escalation', value: site.rental_escalation ? `${site.rental_escalation}%` : '-' },
            ];
          } else {
            return [
              { icon: 'cash', label: 'Monthly Rent', value: site.rent ? `₹${site.rent}` : '-' },
              { icon: 'calculator', label: 'Rent Per SQ/FT', value: site.rent && site.total_area ? `₹${(parseFloat(site.rent) / parseFloat(site.total_area)).toFixed(2)}` : '-' },
              { icon: 'settings', label: 'Maintenance Charges', value: site.maintenance_rate ? `₹${site.maintenance_rate}` : '-' },
              { icon: 'card', label: 'CAM Deposit', value: site.cam_deposit ? `₹${site.cam_deposit}` : '-' },
              { icon: 'shield', label: 'Security Deposit', value: site.security_deposit ? `${site.security_deposit} months` : '-' },
              { icon: 'calendar', label: 'Lease Term', value: site.lease_term },
              { icon: 'lock-closed', label: 'Lock-in Period', value: site.lock_in_period },
              { icon: 'notifications', label: 'Notice Period', value: site.notice_period },
              { icon: 'trending-up', label: 'Rental Escalation', value: site.rental_escalation ? `${site.rental_escalation}%` : '-' },
            ];
          }
        case 'Vehicle Information':
          return [
            { icon: 'car', label: 'Car Parking Charges', value: site.car_parking_charges ? `₹${site.car_parking_charges}` : '-' },
            { icon: 'square', label: 'Car Parking Slots', value: site.car_parking_slots },
            { icon: 'analytics', label: 'Car Parking Ratio', value: site.car_parking_ratio },
            { icon: 'bicycle', label: 'Two Wheeler Parking', value: site.two_wheeler_charges ? `₹${site.two_wheeler_charges}` : '-' },
            { icon: 'grid', label: 'Two Wheeler Slots', value: site.two_wheeler_slots },
          ];
        case 'Contact Information':
          const contactItems = [
            { icon: 'person', label: 'Building Owner', value: site.building_owner_name },
            { icon: 'call', label: 'Owner Contact', value: site.building_owner_contact },
            { icon: 'people', label: 'Contact Person', value: site.contact_person_name },
            { icon: 'phone-portrait', label: 'Phone', value: site.contact_person_number },
            { icon: 'mail', label: 'Email', value: site.contact_person_email },
            { icon: 'briefcase', label: 'Designation', value: site.contact_person_designation },
          ];
          
          if (site.nearest_metro_station) {
            contactItems.unshift({
              icon: 'train',
              label: 'Nearest Metro',
              value: site.nearest_metro_station.name
            });
          }
          
          return contactItems;
        default:
          return [];
      }
    };

    const items = getDetailItems();

    return (
      <View style={styles.detailSectionContainer}>
        {items.map((item, idx) => (
          <DetailRow 
            key={`${title}-${idx}`} 
            icon={item.icon}
            label={item.label} 
            value={item.value} 
          />
        ))}
      </View>
    );
  };

  const Header = () => (
    <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
      <View style={styles.header}>
        <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerInfo}
            onPress={() => setShowLeadDetailsModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {visit.site?.building_name?.charAt(0)?.toUpperCase() || 'V'}
                </Text>
              </View>
              <View style={[styles.onlineIndicator, { backgroundColor: getStatusColor(visit.status) }]} />
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {visit.site?.building_name || 'Visit'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onEdit} style={styles.headerActionButton}>
              <Ionicons name="create-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderModalSection = ({ item }: { item: string }) => {
    const site = visit.site;
    
    switch (item) {
      case 'building-info':
        return (
          <View style={styles.modalCard}>
            <View style={styles.leadProfileHeader}>
              <View style={styles.leadAvatarLarge}>
                <Text style={styles.leadAvatarLargeText}>
                  {visit.site?.building_name?.charAt(0)?.toUpperCase() || 'V'}
                </Text>
              </View>
              
              <Text style={styles.leadBuildingName}>{visit.site?.building_name || 'Visit'}</Text>
              
              {site?.location && (
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={14} color={WHATSAPP_COLORS.primary} />
                  <Text style={styles.locationText}>{site.location}</Text>
                </View>
              )}

              <View style={styles.statusBadgesRow}>
                <View style={[styles.statusPill, { 
                  backgroundColor: getStatusColor(visit.status) + '15',
                  borderColor: getStatusColor(visit.status)
                }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(visit.status) }]} />
                  <Text style={[styles.statusPillText, { color: getStatusColor(visit.status) }]}>
                    {beautifyName(visit.status)}
                  </Text>
                </View>
                
                <View style={[styles.statusPill, { 
                  backgroundColor: site?.managed_property ? WHATSAPP_COLORS.accent + '15' : WHATSAPP_COLORS.info + '15',
                  borderColor: site?.managed_property ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.info
                }]}>
                  <Ionicons 
                    name={site?.managed_property ? "business" : "home"} 
                    size={12} 
                    color={site?.managed_property ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.info} 
                  />
                  <Text style={[styles.statusPillText, { 
                    color: site?.managed_property ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.info
                  }]}>
                    {site?.managed_property ? 'Managed' : 'Conventional'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'photos':
        return visit.photos?.length > 0 ? (
          <View style={styles.modalCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="images" size={18} color={WHATSAPP_COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Photos</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{visit.photos.length}</Text>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.photosScrollView}
              contentContainerStyle={styles.photosScrollContent}
            >
              {visit.photos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoCard}
                  onPress={() => onPhotoPress(photo.file_url, index)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo.file_url }} style={styles.photoCardImage} />
                  <View style={styles.photoCardOverlay}>
                    <View style={styles.photoIndexBadge}>
                      <Text style={styles.photoIndexText}>{index + 1}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null;

      case 'basic-info':
        return (
          <View style={styles.modalCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="information-circle" size={18} color={WHATSAPP_COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
              {site.managed_property !== undefined && (
                <View style={[styles.propertyTypeBadgeSmall, {
                  backgroundColor: site.managed_property ? WHATSAPP_COLORS.accent + '15' : WHATSAPP_COLORS.info + '15'
                }]}>
                  <Text style={[styles.propertyTypeBadgeSmallText, {
                    color: site.managed_property ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.info
                  }]}>
                    {site.managed_property ? 'Managed' : 'Conventional'}
                  </Text>
                </View>
              )}
            </View>
            
            <DetailSection title="Basic Information" site={site} />
          </View>
        );

      case 'commercial-info':
        return (
          <View style={styles.modalCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="cash" size={18} color={WHATSAPP_COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Commercial Details</Text>
              </View>
            </View>
            
            <DetailSection title="Commercial Details" site={site} />
          </View>
        );

      case 'vehicle-info':
        return (
          <View style={styles.modalCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="car" size={18} color={WHATSAPP_COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Vehicle Information</Text>
              </View>
            </View>
            
            <DetailSection title="Vehicle Information" site={site} />
          </View>
        );

      case 'contact-info':
        return (
          <View style={styles.modalCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="people" size={18} color={WHATSAPP_COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Contact Information</Text>
              </View>
            </View>
            
            <DetailSection title="Contact Information" site={site} />
          </View>
        );

      default:
        return null;
    }
  };

  const modalSections = ['building-info', 'photos', 'basic-info', 'commercial-info', 'vehicle-info', 'contact-info'];

  const ContactInfoModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showLeadDetailsModal}
      onRequestClose={() => setShowLeadDetailsModal(false)}
    >
      <View style={styles.modalMainContainer}>
        <View style={[styles.modalHeaderBar, { paddingTop: Platform.OS === 'ios' ? 50 : 15 }]}>
          <TouchableOpacity
            onPress={() => setShowLeadDetailsModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.modalHeaderTitle}>Visit Details</Text>
          <View style={styles.modalHeaderPlaceholder} />
        </View>
        
        <FlatList
          data={modalSections}
          renderItem={renderModalSection}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalContent}
          ListFooterComponent={<View style={styles.modalFooterSpace} />}
        />
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.mainContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Header />
      {ContactInfoModal()}

      <View style={styles.chatContainer}>
        {loadingMoreComments && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingMoreText}>Loading older messages...</Text>
          </View>
        )}
        
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={({ item }) => {
            const isCurrentUser = item.employeeId === currentUserEmployeeId;
            
            return (
              <View 
                style={[
                  styles.chatBubbleContainer,
                  isCurrentUser ? styles.ownMessageContainer : styles.otherMessageContainer
                ]}
              >
                <View 
                  style={[
                    styles.chatBubble,
                    isCurrentUser ? styles.ownUserBubble : styles.otherUserBubble
                  ]}
                >
                  {!isCurrentUser && (
                    <Text style={styles.senderName}>{item.user?.full_name || 'Unknown'}</Text>
                  )}
                  {item.content && (
                    <Text style={styles.chatMessage}>{item.content}</Text>
                  )}
                  <View style={styles.chatTimestamp}>
                    <Text style={styles.chatTimeText}>{formatCommentDate(item.created_at)}</Text>
                  </View>
                </View>
              </View>
            );
          }}
          keyExtractor={(item) => item.id.toString()}
          inverted={false}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[WHATSAPP_COLORS.primary]}
              tintColor={WHATSAPP_COLORS.primary}
            />
          }
          onContentSizeChange={() => {
            if (shouldScrollToBottomRef.current) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
          ListEmptyComponent={
            loadingComments ? (
              <View style={styles.emptyChat}>
                <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
              </View>
            ) : (
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles" size={64} color={WHATSAPP_COLORS.chat} />
                <Text style={styles.emptyChatTitle}>No comments yet</Text>
                <Text style={styles.emptyChatText}>
                  Start by sending a message or attaching files
                </Text>
              </View>
            )
          }
        />
      </View>

      <SafeAreaView style={styles.inputSafeArea} edges={['bottom']}>
        <VisitComment
          visitId={visit.id}
          token={token}
          onCommentAdded={handleCommentAdded}
          theme={theme}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: WHATSAPP_COLORS.chatBg },
  headerSafeArea: { backgroundColor: WHATSAPP_COLORS.primary },
  header: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.primaryDark
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60
  },
  backButton: { padding: 8, marginRight: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { marginRight: 12, position: 'relative' },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.primaryDark
  },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.primary
  },
  headerTextContainer: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2
  },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerActionButton: { padding: 8 },
  
  modalMainContainer: { 
    flex: 1, 
    backgroundColor: '#F5F5F5',
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalCloseButton: { 
    padding: 8,
    width: 40,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  modalHeaderPlaceholder: {
    width: 40,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalFooterSpace: { height: 24 },
  
  modalCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  
  leadProfileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  leadAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: WHATSAPP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  leadAvatarLargeText: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#FFF' 
  },
  leadBuildingName: {
    fontSize: 22,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: WHATSAPP_COLORS.primary + '10',
    borderRadius: 20,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },
  statusBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: { 
    fontSize: 13, 
    fontWeight: '600',
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  propertyTypeBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  propertyTypeBadgeSmallText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  photosScrollView: {
    paddingVertical: 12,
  },
  photosScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  photoCard: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: WHATSAPP_COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoCardImage: { 
    width: '100%', 
    height: '100%',
  },
  photoCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoIndexText: { 
    color: '#FFF', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  
  detailSectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border + '40',
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  detailRowIcon: {
    marginRight: 10,
  },
  detailRowLabel: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailRowValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '50%',
  },
  
  chatContainer: { flex: 1, backgroundColor: WHATSAPP_COLORS.chatBg },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: WHATSAPP_COLORS.chatBg,
    gap: 6,
  },
  loadingMoreText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  chatBubbleContainer: { 
    marginVertical: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  chatBubble: {
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 120,
    maxWidth: '75%',
  },
  ownUserBubble: {
    backgroundColor: WHATSAPP_COLORS.outgoing,
    borderBottomRightRadius: 2,
  },
  otherUserBubble: {
    backgroundColor: WHATSAPP_COLORS.incoming,
    borderBottomLeftRadius: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginBottom: 4
  },
  chatMessage: { fontSize: 15, color: WHATSAPP_COLORS.textPrimary, lineHeight: 20 },
  chatTimestamp: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4
  },
  chatTimeText: { fontSize: 10, color: WHATSAPP_COLORS.textTertiary },
  
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 60,
    gap: 16
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary
  },
  emptyChatText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 200
  },
  
  inputSafeArea: {
    backgroundColor: WHATSAPP_COLORS.surface,
  },
});

export default VisitDetails;