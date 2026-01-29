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
  Keyboard,
  ScrollView,
} from 'react-native';
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
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);

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
      }));

      if (append) {
        setComments(prev => [...prev, ...formattedComments]);
      } else {
        setComments(formattedComments);
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
    fetchComments(1, false);
  }, [fetchComments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchComments(1, false);
    setRefreshing(false);
  }, [fetchComments]);

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

  const DetailSection = ({ title, site }: { title: string; site: any }) => {
    const isManagedProperty = site.managed_property === true;
    
    const getDetailItems = () => {
      switch (title) {
        case '📋 Basic Information':
          if (isManagedProperty) {
            return [
              { label: 'Landmark', value: site.landmark },
              { label: 'Building Status', value: site.building_status },
              { label: 'Floor Condition', value: site.floor_condition },
              { label: 'Total Floors', value: site.total_floors },
              { label: 'Basements', value: site.number_of_basements },
              { label: 'Total Seats', value: site.total_seats },
              { label: 'Seats Available', value: site.seats_available },
              { label: 'Number of Units', value: site.number_of_units },
              { label: 'Seats Per Unit', value: site.number_of_seats_per_unit },
              { label: 'Efficiency', value: site.efficiency },
              { label: 'Business Hours', value: site.business_hours_of_operation },
              { label: 'Premises Access', value: site.premises_access },
              { label: 'Developer Fitouts', value: site.will_developer_do_fitouts ? 'Yes' : 'No' },
            ];
          } else {
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
              { label: 'Area Offered', value: site.area_offered },
              { label: 'Developer Fitouts', value: site.will_developer_do_fitouts ? 'Yes' : 'No' },
            ];
          }

        case '💰 Commercial Details':
          if (isManagedProperty) {
            return [
              { label: 'Rent Per Seat', value: site.rent_per_seat ? `₹${site.rent_per_seat}` : '-' },
              { label: 'Total Monthly Rent', value: site.rent_per_seat && site.total_seats ? `₹${(parseFloat(site.rent_per_seat) * parseFloat(site.total_seats)).toLocaleString('en-IN')}` : '-' },
              { label: 'Maintenance Charges', value: site.maintenance_rate ? `₹${site.maintenance_rate}` : '-' },
              { label: 'CAM Deposit', value: site.cam_deposit ? `₹${site.cam_deposit}` : '-' },
              { label: 'Security Deposit', value: site.security_deposit ? `${site.security_deposit} months` : '-' },
              { label: 'Lease Term', value: site.lease_term },
              { label: 'Lock-in Period', value: site.lock_in_period },
              { label: 'Notice Period', value: site.notice_period },
              { label: 'Rental Escalation', value: site.rental_escalation ? `${site.rental_escalation}%` : '-' },
            ];
          } else {
            return [
              { label: 'Monthly Rent', value: site.rent ? `₹${site.rent}` : '-' },
              { label: 'Rent Per SQ/FT', value: site.rent && site.total_area ? `₹${(parseFloat(site.rent) / parseFloat(site.total_area)).toFixed(2)}` : '-' },
              { label: 'Maintenance Charges', value: site.maintenance_rate ? `₹${site.maintenance_rate}` : '-' },
              { label: 'CAM Deposit', value: site.cam_deposit ? `₹${site.cam_deposit}` : '-' },
              { label: 'Security Deposit', value: site.security_deposit ? `${site.security_deposit} months` : '-' },
              { label: 'Lease Term', value: site.lease_term },
              { label: 'Lock-in Period', value: site.lock_in_period },
              { label: 'Notice Period', value: site.notice_period },
              { label: 'Rental Escalation', value: site.rental_escalation ? `${site.rental_escalation}%` : '-' },
            ];
          }

        case '🚗 Vehicle Information':
          return [
            { label: 'Car Parking Charges', value: site.car_parking_charges ? `₹${site.car_parking_charges}` : '-' },
            { label: 'Car Parking Slots', value: site.car_parking_slots },
            { label: 'Car Parking Ratio', value: site.car_parking_ratio },
            { label: 'Two Wheeler Parking', value: site.two_wheeler_charges ? `₹${site.two_wheeler_charges}` : '-' },
            { label: 'Two Wheeler Slots', value: site.two_wheeler_slots },
          ];

        case '👤 Contact Information':
          const contactItems = [
            { label: 'Building Owner', value: site.building_owner_name },
            { label: 'Owner Contact', value: site.building_owner_contact },
            { label: 'Contact Person', value: site.contact_person_name },
            { label: 'Phone', value: site.contact_person_number },
            { label: 'Email', value: site.contact_person_email },
            { label: 'Designation', value: site.contact_person_designation },
          ];
          
          if (site.nearest_metro_station) {
            contactItems.unshift({
              label: '🚇 Nearest Metro',
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
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>
          {title}
          {isManagedProperty && title === '📋 Basic Information' && (
            <Text style={styles.propertyTypeBadge}> • Managed</Text>
          )}
          {!isManagedProperty && title === '📋 Basic Information' && (
            <Text style={styles.propertyTypeBadge}> • Conventional</Text>
          )}
        </Text>
        <View style={styles.detailGrid}>
          {items.map((item, idx) => (
            <View key={`${title}-${idx}`} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value || '-'}</Text>
            </View>
          ))}
        </View>
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
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {currentIndex + 1} of {totalVisits}
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
          <View style={styles.containerBox}>
            <View style={styles.leadInfoContainer}>
              <View style={styles.leadAvatarSection}>
                <View style={styles.leadAvatar}>
                  <Text style={styles.leadAvatarText}>
                    {visit.site?.building_name?.charAt(0)?.toUpperCase() || 'V'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.leadHeaderSection}>
                <Text style={styles.leadNameText}>{visit.site?.building_name || 'Visit'}</Text>
                {site?.location && (
                  <Text style={styles.leadCompanyText}>{site.location}</Text>
                )}
              </View>
            </View>

            <View style={styles.statusBadgesContainer}>
              <View style={[styles.statusBadgeBox, { 
                backgroundColor: getStatusColor(visit.status) + '15',
                borderColor: getStatusColor(visit.status) + '30' 
              }]}>
                <Text style={[styles.statusBadgeBoxText, { color: getStatusColor(visit.status) }]}>
                  {beautifyName(visit.status)}
                </Text>
              </View>
              
              <View style={[styles.statusBadgeBox, { 
                backgroundColor: site?.managed_property ? '#10B98115' : '#3B82F615',
                borderColor: site?.managed_property ? '#10B98130' : '#3B82F630' 
              }]}>
                <Text style={[styles.statusBadgeBoxText, { 
                  color: site?.managed_property ? '#10B981' : '#3B82F6' 
                }]}>
                  {site?.managed_property ? 'Managed' : 'Conventional'}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'photos':
        return visit.photos?.length > 0 ? (
          <View style={styles.containerBox}>
            <View style={styles.containerHeader}>
              <Ionicons name="images" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.containerTitle}>Photos ({visit.photos.length})</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {visit.photos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoThumbnail}
                  onPress={() => onPhotoPress(photo.file_url, index)}
                >
                  <Image source={{ uri: photo.file_url }} style={styles.photoImage} />
                  <View style={styles.photoNumberBadge}>
                    <Text style={styles.photoNumber}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null;

      case 'basic-info':
        return (
          <View style={styles.containerBox}>
            <View style={styles.containerHeader}>
              <Ionicons name="information-circle" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.containerTitle}>Basic Information</Text>
            </View>
            
            <View style={styles.containerContent}>
              <DetailSection title="📋 Basic Information" site={site} />
            </View>
          </View>
        );

      case 'commercial-info':
        return (
          <View style={styles.containerBox}>
            <View style={styles.containerHeader}>
              <Ionicons name="cash" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.containerTitle}>Commercial Details</Text>
            </View>
            
            <View style={styles.containerContent}>
              <DetailSection title="💰 Commercial Details" site={site} />
            </View>
          </View>
        );

      case 'vehicle-info':
        return (
          <View style={styles.containerBox}>
            <View style={styles.containerHeader}>
              <Ionicons name="car" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.containerTitle}>Vehicle Information</Text>
            </View>
            
            <View style={styles.containerContent}>
              <DetailSection title="🚗 Vehicle Information" site={site} />
            </View>
          </View>
        );

      case 'contact-info':
        return (
          <View style={styles.containerBox}>
            <View style={styles.containerHeader}>
              <Ionicons name="people" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.containerTitle}>Contact Information</Text>
            </View>
            
            <View style={styles.containerContent}>
              <DetailSection title="👤 Contact Information" site={site} />
            </View>
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
      <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 15 }]}>
        <TouchableOpacity
          onPress={() => setShowLeadDetailsModal(false)}
          style={styles.modalBackButton}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Visit Details</Text>
      </View>
      <FlatList
        data={modalSections}
        renderItem={renderModalSection}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.modalScrollContent}
        ListFooterComponent={<View style={styles.modalBottomSpacing} />}
      />
    </Modal>
  );

  return (
    <View style={styles.mainContainer}>
      <Header />
      {ContactInfoModal()}

      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={({ item }) => (
            <View style={styles.chatBubbleContainer}>
              <View style={[styles.chatBubble, styles.otherUserBubble]}>
                <Text style={styles.senderName}>{item.user?.full_name || 'Unknown'}</Text>
                {item.content && (
                  <Text style={styles.chatMessage}>{item.content}</Text>
                )}
                <View style={styles.chatTimestamp}>
                  <Text style={styles.chatTimeText}>{formatCommentDate(item.created_at)}</Text>
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          inverted={false}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[WHATSAPP_COLORS.primary]}
              tintColor={WHATSAPP_COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles" size={64} color={WHATSAPP_COLORS.border} />
              <Text style={styles.emptyChatTitle}>No comments yet</Text>
              <Text style={styles.emptyChatText}>
                Start by sending a message or attaching files
              </Text>
            </View>
          }
        />
      </View>

      <VisitComment
        visitId={visit.id}
        token={token}
        onCommentAdded={() => fetchComments(1, false)}
        theme={theme}
      />

      {/* REMOVED: "Mark as completed" button from bottom */}
      {/* REMOVED: Swipe instructions from bottom */}
    </View>
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
  modalContainer: { flex: 1, backgroundColor: WHATSAPP_COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary
  },
  modalBackButton: { padding: 8, marginRight: 12 },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1
  },
  containerBox: {
    backgroundColor: WHATSAPP_COLORS.surface,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    overflow: 'hidden'
  },
  leadInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 16
  },
  leadAvatarSection: { alignItems: 'center' },
  leadAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: WHATSAPP_COLORS.primary
  },
  leadAvatarText: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  leadHeaderSection: { flex: 1, justifyContent: 'center' },
  leadNameText: {
    fontSize: 22,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4
  },
  leadCompanyText: {
    fontSize: 15,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textSecondary
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10
  },
  statusBadgeBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusBadgeBoxText: { fontSize: 13, fontWeight: '600' },
  containerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: WHATSAPP_COLORS.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 10
  },
  containerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    flex: 1
  },
  containerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  photosScroll: { paddingHorizontal: 16, paddingVertical: 12 },
  photoThumbnail: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative'
  },
  photoImage: { width: 120, height: 120, backgroundColor: WHATSAPP_COLORS.backgroundSecondary },
  photoNumberBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  photoNumber: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  modalBottomSpacing: { height: 40 },
  detailSection: { marginBottom: 16 },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginBottom: 12
  },
  propertyTypeBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  detailItem: {
    width: '48%',
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4
  },
  detailValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500'
  },
  chatContainer: { flex: 1, backgroundColor: WHATSAPP_COLORS.chatBg },
  chatListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20
  },
  chatBubbleContainer: { marginVertical: 8, maxWidth: '80%' },
  chatBubble: {
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 120
  },
  otherUserBubble: {
    backgroundColor: WHATSAPP_COLORS.incoming,
    borderBottomLeftRadius: 2
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
    paddingVertical: 100,
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
  }
});

export default VisitDetails;