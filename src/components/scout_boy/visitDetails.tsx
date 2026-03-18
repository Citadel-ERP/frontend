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
  Animated,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Visit, Comment } from './types';

const { width: screenWidth } = Dimensions.get('window');

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

interface ChatMessage {
  id: string;
  type: 'comment' | 'dateSeparator';
  data?: Comment;
  date?: string;
}

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

// ─── VisitDetailedInfo ────────────────────────────────────────────────────────
// Inline stepped modal — mirrors SiteDetailedInfo exactly.

interface VisitDetailedInfoProps {
  visible: boolean;
  onClose: () => void;
  visit: Visit;
}

const VisitDetailedInfo: React.FC<VisitDetailedInfoProps> = ({ visible, onClose, visit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const site = visit?.site;

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formatCurrency = (value: string): string => {
    if (!value || value.trim() === '') return '-';
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return value;
    return '₹' + num.toLocaleString('en-IN');
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return WHATSAPP_COLORS.warning;
      case 'scout_completed': return '#ffcc92';
      case 'admin_completed': return WHATSAPP_COLORS.success;
      case 'cancelled': return WHATSAPP_COLORS.danger;
      default: return WHATSAPP_COLORS.textSecondary;
    }
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0].charAt(0).toUpperCase()
      : (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // ── Shared display atoms ───────────────────────────────────────────────────
  const renderRow = (label: string, value: string) => (
    <View style={dStyles.infoItem}>
      <Text style={dStyles.infoItemLabel}>{label}</Text>
      <View style={dStyles.infoItemBox}>
        <Text style={dStyles.infoItemValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  const renderBoolRow = (label: string, value?: boolean) =>
    renderRow(label, value === true ? 'Yes' : value === false ? 'No' : '-');

  // ── Step 0: Visit Overview ─────────────────────────────────────────────────
  const renderStep0 = () => (
    <View style={dStyles.stepContent}>
      <View style={dStyles.containerBox}>
        {/* Avatar + building name */}
        <View style={dStyles.siteInfoContainer}>
          <View style={dStyles.siteAvatarSection}>
            <View style={dStyles.siteAvatar}>
              <Text style={dStyles.siteAvatarText}>
                {getInitials(site?.building_name ?? 'V')}
              </Text>
            </View>
          </View>
          <View style={dStyles.siteHeaderSection}>
            <Text style={dStyles.siteNameText}>{site?.building_name || 'Visit'}</Text>
            {site?.location ? (
              <View style={dStyles.locationContainer}>
                <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={dStyles.locationText} numberOfLines={2}>{site.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Badges */}
        <View style={dStyles.statusBadgesContainer}>
          <View style={[dStyles.statusBadgeBox, {
            backgroundColor: getStatusColor(visit.status) + '15',
            borderColor: getStatusColor(visit.status) + '60',
          }]}>
            <View style={[dStyles.statusDot, { backgroundColor: getStatusColor(visit.status) }]} />
            <Text style={[dStyles.stepLabel, { color: getStatusColor(visit.status) }]}>
              {beautifyName(visit.status)}
            </Text>
          </View>

          {site?.managed_property ? (
            <View style={[dStyles.statusBadgeBox, {
              backgroundColor: WHATSAPP_COLORS.accent + '15',
              borderColor: WHATSAPP_COLORS.accent + '40',
            }]}>
              <Ionicons name="business" size={13} color={WHATSAPP_COLORS.accent} style={{ marginRight: 4 }} />
              <Text style={[dStyles.stepLabel, { color: WHATSAPP_COLORS.accent }]}>Managed</Text>
            </View>
          ) : (
            <View style={[dStyles.statusBadgeBox, {
              backgroundColor: WHATSAPP_COLORS.info + '15',
              borderColor: WHATSAPP_COLORS.info + '40',
            }]}>
              <Ionicons name="home" size={13} color={WHATSAPP_COLORS.info} style={{ marginRight: 4 }} />
              <Text style={[dStyles.stepLabel, { color: WHATSAPP_COLORS.info }]}>Conventional</Text>
            </View>
          )}

          {site?.micro_market ? (
            <View style={[dStyles.statusBadgeBox, {
              backgroundColor: WHATSAPP_COLORS.info + '15',
              borderColor: WHATSAPP_COLORS.info + '30',
            }]}>
              <Ionicons name="map" size={13} color={WHATSAPP_COLORS.info} style={{ marginRight: 4 }} />
              <Text style={[dStyles.stepLabel, { color: WHATSAPP_COLORS.info }]}>{site.micro_market}</Text>
            </View>
          ) : null}
        </View>

        {/* Map CTA */}
        {site?.location_link ? (
          <View style={dStyles.actionButtons}>
            <TouchableOpacity
              style={dStyles.mapButton}
              onPress={() => Linking.openURL(site.location_link).catch(console.error)}
            >
              <Ionicons name="map" size={16} color={WHATSAPP_COLORS.white} />
              <Text style={dStyles.mapButtonText}>View on Map</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Visit metadata */}
        <View style={dStyles.metadataSection}>
          <View style={dStyles.metadataItem}>
            <Text style={dStyles.metadataLabel}>Assigned To</Text>
            <Text style={dStyles.metadataValue}>
              {visit.assigned_to
                ? `${visit.assigned_to.first_name || ''} ${visit.assigned_to.last_name || ''}`.trim()
                : '-'}
            </Text>
          </View>
          <View style={dStyles.metadataItem}>
            <Text style={dStyles.metadataLabel}>Assign Date</Text>
            <Text style={dStyles.metadataValue}>{formatDate(visit.assign_date)}</Text>
          </View>
          <View style={dStyles.metadataItem}>
            <Text style={dStyles.metadataLabel}>Created On</Text>
            <Text style={dStyles.metadataValue}>{formatDate(visit.created_at)}</Text>
          </View>
          <View style={dStyles.metadataItem}>
            <Text style={dStyles.metadataLabel}>Visit ID</Text>
            <Text style={dStyles.metadataValue}>#{visit.id}</Text>
          </View>
        </View>
      </View>

      {/* Visit photos (horizontal scroll) */}
      {visit.photos && visit.photos.length > 0 ? (
        <View style={[dStyles.containerBox, { marginTop: 12 }]}>
          <View style={dStyles.containerHeader}>
            <MaterialIcons name="photo-library" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={dStyles.containerTitle}>Building Photos ({visit.photos.length})</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, gap: 10 }}
          >
            {visit.photos.map((photo: any, index: number) => (
              <View key={photo.id || index} style={dStyles.photoCard}>
                <Image source={{ uri: photo.file_url }} style={dStyles.photoCardImage} resizeMode="cover" />
                <View style={dStyles.photoIndexBadge}>
                  <Text style={dStyles.photoIndexText}>{index + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  // ── Step 1: Basic Information ──────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={dStyles.stepContent}>
      <View style={dStyles.containerBox}>
        <View style={dStyles.containerHeader}>
          <MaterialIcons name="business" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={dStyles.containerTitle}>Basic Information</Text>
        </View>
        <View style={dStyles.containerContent}>
          {renderRow('Building Status', beautifyName(site?.building_status ?? ''))}
          {renderRow('Floor Condition', beautifyName(site?.floor_condition ?? ''))}
          {renderRow('Landmark', site?.landmark ?? '')}
          {renderRow('Total Floors', site?.total_floors ?? '')}
          {renderRow('Basements', site?.number_of_basements ?? '')}
          {renderRow('Total Area', site?.total_area ? `${site.total_area} sq ft` : '-')}
          {renderRow('Area Per Floor', site?.area_per_floor ? `${site.area_per_floor} sq ft` : '-')}
          {renderRow('Available Floors', site?.availble_floors ?? '')}
          {renderRow('Efficiency', site?.efficiency ? `${site.efficiency}%` : '-')}

          {site?.micro_market ? (
            <View style={dStyles.infoItem}>
              <Text style={dStyles.infoItemLabel}>Micro Market</Text>
              <View style={[dStyles.infoItemBox, {
                backgroundColor: WHATSAPP_COLORS.info + '10',
                borderColor: WHATSAPP_COLORS.info + '40',
              }]}>
                <Ionicons name="map" size={14} color={WHATSAPP_COLORS.info} style={{ marginRight: 6 }} />
                <Text style={[dStyles.infoItemValue, { color: WHATSAPP_COLORS.info, fontWeight: '600' }]}>
                  {site.micro_market}
                </Text>
              </View>
            </View>
          ) : null}

          {site?.nearest_metro_station ? (
            <View style={dStyles.infoItem}>
              <Text style={dStyles.infoItemLabel}>Nearest Metro Station</Text>
              <View style={[dStyles.infoItemBox, {
                backgroundColor: WHATSAPP_COLORS.primary + '08',
                borderColor: WHATSAPP_COLORS.primary + '30',
              }]}>
                <Ionicons name="train" size={16} color={WHATSAPP_COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={[dStyles.infoItemValue, { fontWeight: '600' }]}>
                  {site.nearest_metro_station.name}
                </Text>
                {site.nearest_metro_station.city ? (
                  <Text style={dStyles.metroInlineCity}>{site.nearest_metro_station.city}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {site?.managed_property ? (
            <>
              {renderRow('Total Seats', site?.total_seats ?? '')}
              {renderRow('Seats Available', site?.seats_available ?? '')}
              {renderRow('Number of Units', site?.number_of_units ?? '')}
              {renderRow('Seats Per Unit', site?.number_of_seats_per_unit ?? '')}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );

  // ── Step 2: Financial Details ──────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={dStyles.stepContent}>
      <View style={dStyles.containerBox}>
        <View style={dStyles.containerHeader}>
          <MaterialIcons name="attach-money" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={dStyles.containerTitle}>Financial Details</Text>
        </View>
        <View style={dStyles.containerContent}>
          {site?.managed_property ? (
            <>
              {renderRow('Rent Per Seat', formatCurrency(site?.rent_per_seat ?? ''))}
              {renderRow('Security Deposit', site?.security_deposit ? `${site.security_deposit} months` : '-')}
              {renderRow('Rental Escalation', site?.rental_escalation ? `${site.rental_escalation}%` : '-')}
            </>
          ) : (
            <>
              {renderRow('Monthly Rent', formatCurrency(site?.rent ?? ''))}
              {renderRow('Maintenance Rate', site?.maintenance_rate ?? '')}
              {renderRow('Security Deposit', site?.security_deposit ? `${site.security_deposit} months` : '-')}
              {renderRow('CAM', site?.cam || '-')}
              {renderRow('CAM Deposit', site?.cam_deposit ?? '')}
              {renderRow('Rental Escalation', site?.rental_escalation ?? '')}
            </>
          )}
          {renderRow('Lease Term', site?.lease_term ?? '')}
          {renderRow('Lock-in Period', site?.lock_in_period ?? '')}
          {renderRow('Notice Period', site?.notice_period ?? '')}
          {renderBoolRow('OC Available', site?.oc)}
          {renderBoolRow('Will Developer Do Fitouts', site?.will_developer_do_fitouts)}
        </View>
      </View>
    </View>
  );

  // ── Step 3: Contact Information ────────────────────────────────────────────
  const renderStep3 = () => (
    <View style={dStyles.stepContent}>
      <View style={dStyles.containerBox}>
        <View style={dStyles.containerHeader}>
          <MaterialIcons name="contact-phone" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={dStyles.containerTitle}>Contact Information</Text>
        </View>
        <View style={dStyles.containerContent}>
          {renderRow('Building Owner', site?.building_owner_name ?? '')}
          {renderRow('Owner Contact', site?.building_owner_contact ?? '')}
          {renderRow('Contact Person', site?.contact_person_name ?? '')}
          {renderRow('Designation', site?.contact_person_designation ?? '')}
          {renderRow('Phone', site?.contact_person_number ?? '')}
          {renderRow('Email', site?.contact_person_email ?? '')}
        </View>
      </View>
    </View>
  );

  // ── Step 4: Parking & Utilities ────────────────────────────────────────────
  const renderStep4 = () => (
    <View style={dStyles.stepContent}>
      <View style={dStyles.containerBox}>
        <View style={dStyles.containerHeader}>
          <MaterialIcons name="directions-car" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={dStyles.containerTitle}>Parking & Utilities</Text>
        </View>
        <View style={dStyles.containerContent}>
          {renderRow('Car Parking Slots', site?.car_parking_slots ?? '')}
          {renderRow('Car Parking Charges', formatCurrency(site?.car_parking_charges ?? ''))}
          {renderRow('Car Parking Ratio', site?.car_parking_ratio ?? '')}
          {renderRow('Two-Wheeler Slots', site?.two_wheeler_slots ?? '')}
          {renderRow('Two-Wheeler Charges', formatCurrency(site?.two_wheeler_charges ?? ''))}
          {renderRow('Power', site?.power ?? '')}
          {renderRow('Power Backup', site?.power_backup ?? '')}
        </View>
      </View>
    </View>
  );

  // ── Step 5: Workspace Amenities ────────────────────────────────────────────
  const renderStep5 = () => (
    <View style={dStyles.stepContent}>
      <View style={dStyles.containerBox}>
        <View style={dStyles.containerHeader}>
          <MaterialIcons name="meeting-room" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={dStyles.containerTitle}>Workspace Amenities</Text>
        </View>
        <View style={dStyles.containerContent}>
          {renderRow('Number of Cabins', site?.number_of_cabins ?? '')}
          {renderRow('Number of Workstations', site?.number_of_workstations ?? '')}
          {renderRow('Size of Workstation', site?.size_of_workstation ?? '')}
          {renderRow('Server Room', site?.server_room ?? '')}
          {renderRow('Training Room', site?.training_room ?? '')}
          {renderRow('Pantry', site?.pantry ?? '')}
          {renderRow('Electrical UPS Room', site?.electrical_ups_room ?? '')}
          {renderRow('Cafeteria', site?.cafeteria ?? '')}
          {renderRow('Gym', site?.gym ?? '')}
          {renderRow('Discussion Room', site?.discussion_room ?? '')}
          {renderRow('Meeting Room', site?.meeting_room ?? '')}
          {renderRow('Business Hours', site?.business_hours_of_operation ?? '')}
          {renderRow('Premises Access', site?.premises_access ?? '')}
        </View>
      </View>
    </View>
  );

  // ── Step 6: Additional Details & Building Photos ───────────────────────────
  const renderStep6 = () => (
    <View style={dStyles.stepContent}>
      <View style={dStyles.containerBox}>
        <View style={dStyles.containerHeader}>
          <MaterialIcons name="description" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={dStyles.containerTitle}>Additional Information</Text>
        </View>
        <View style={dStyles.containerContent}>
          {renderRow('Remarks', site?.remarks ?? '')}
          {renderRow('Floor-wise Area', site?.floor_wise_area ?? '')}
          {renderRow('Area Offered', site?.area_offered ?? '')}
        </View>
      </View>

      {site?.building_photos && site.building_photos.length > 0 ? (
        <View style={[dStyles.containerBox, { marginTop: 12 }]}>
          <View style={dStyles.containerHeader}>
            <MaterialIcons name="photo-library" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={dStyles.containerTitle}>
              Building Photos ({site.building_photos.length})
            </Text>
          </View>
          <View style={dStyles.photosGridContainer}>
            {site.building_photos.map((photo: any) => (
              <View key={photo.id} style={dStyles.photoGridItem}>
                <Image source={{ uri: photo.file_url }} style={dStyles.gridThumbnailImage} resizeMode="cover" />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  // ── Step indicator & navigation ────────────────────────────────────────────
  const TOTAL_STEPS = 7;
  const stepTitles = [
    'Visit Overview',
    'Basic Information',
    'Financial Details',
    'Contact Information',
    'Parking & Utilities',
    'Workspace Amenities',
    'Additional Details',
  ];

  const renderStepIndicator = () => (
    <View style={dStyles.stepIndicator}>
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <View key={index} style={dStyles.stepIndicatorItem}>
          <View style={[dStyles.stepCircle, currentStep >= index && dStyles.stepCircleActive]}>
            <Text style={[dStyles.stepNumber, currentStep >= index && dStyles.stepNumberActive]}>
              {index + 1}
            </Text>
          </View>
          {index < TOTAL_STEPS - 1 ? (
            <View style={[dStyles.stepLine, currentStep > index && dStyles.stepLineActive]} />
          ) : null}
        </View>
      ))}
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return renderStep0();
    }
  };

  if (!visit) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={dStyles.safeArea} edges={['top']}>
        <View style={dStyles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={dStyles.modalBackButton}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={dStyles.modalTitle}>Visit Details</Text>
        </View>
      </SafeAreaView>

      <View style={dStyles.contentContainer}>
        {renderStepIndicator()}

        <View style={dStyles.stepTitleContainer}>
          <Text style={dStyles.stepTitle}>{stepTitles[currentStep]}</Text>
          <Text style={dStyles.stepDescription}>
            Step {currentStep + 1} of {TOTAL_STEPS}
          </Text>
        </View>

        <ScrollView
          style={dStyles.scrollContainer}
          contentContainerStyle={dStyles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="never"
        >
          {renderCurrentStep()}
        </ScrollView>

        <View style={dStyles.navigationButtons}>
          {currentStep > 0 ? (
            <TouchableOpacity
              style={[dStyles.navButton, { flex: currentStep < TOTAL_STEPS - 1 ? 1 : 0 }]}
              onPress={() => setCurrentStep(s => s - 1)}
            >
              <Ionicons name="arrow-back" size={18} color={WHATSAPP_COLORS.primary} />
              <Text style={dStyles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : null}
          {currentStep < TOTAL_STEPS - 1 ? (
            <TouchableOpacity
              style={[dStyles.navButton, dStyles.navButtonPrimary, { flex: 1 }]}
              onPress={() => setCurrentStep(s => s + 1)}
            >
              <Text style={dStyles.navButtonTextPrimary}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── VisitDetailedInfo Styles ─────────────────────────────────────────────────
const dStyles = StyleSheet.create({
  safeArea: { backgroundColor: WHATSAPP_COLORS.primary, paddingTop: Platform.OS === 'ios' ? 0 : 0 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  modalBackButton: { padding: 8, marginRight: 12 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', flex: 1 },
  contentContainer: { flex: 1, backgroundColor: WHATSAPP_COLORS.background },

  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  stepIndicatorItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: WHATSAPP_COLORS.primary },
  stepNumber: { fontSize: 12, fontWeight: '700', color: WHATSAPP_COLORS.textSecondary },
  stepNumberActive: { color: WHATSAPP_COLORS.white },
  stepLine: { width: 20, height: 2, backgroundColor: WHATSAPP_COLORS.border },
  stepLineActive: { backgroundColor: WHATSAPP_COLORS.primary },

  stepTitleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  stepTitle: { fontSize: 18, fontWeight: '700', color: WHATSAPP_COLORS.textPrimary, marginBottom: 4 },
  stepDescription: { fontSize: 14, color: WHATSAPP_COLORS.textSecondary },

  scrollContainer: { flex: 1 },
  scrollContentContainer: { paddingBottom: 20 },
  stepContent: { padding: 16 },
  stepLabel: { fontSize: 13, fontWeight: '600' },

  containerBox: {
    backgroundColor: WHATSAPP_COLORS.surface,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    overflow: 'hidden',
  },
  containerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: WHATSAPP_COLORS.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 10,
  },
  containerTitle: { fontSize: 16, fontWeight: '600', color: WHATSAPP_COLORS.primary, flex: 1 },
  containerContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },

  siteInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 16,
  },
  siteAvatarSection: { alignItems: 'center' },
  siteAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: WHATSAPP_COLORS.primary,
  },
  siteAvatarText: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  siteHeaderSection: { flex: 1, justifyContent: 'center' },
  siteNameText: { fontSize: 20, fontWeight: '700', color: WHATSAPP_COLORS.textPrimary, marginBottom: 4 },
  locationContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  locationText: { fontSize: 13, color: WHATSAPP_COLORS.textSecondary, flex: 1, lineHeight: 18 },

  statusBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statusBadgeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },

  actionButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  mapButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.accent, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, gap: 8,
  },
  mapButtonText: { color: WHATSAPP_COLORS.white, fontSize: 14, fontWeight: '600' },

  metadataSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metadataLabel: { fontSize: 13, fontWeight: '600', color: WHATSAPP_COLORS.textSecondary },
  metadataValue: { fontSize: 13, color: WHATSAPP_COLORS.textPrimary, fontWeight: '500' },

  infoItem: { marginBottom: 12 },
  infoItemLabel: { fontSize: 13, fontWeight: '600', color: WHATSAPP_COLORS.textSecondary, marginBottom: 6 },
  infoItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  infoItemValue: { fontSize: 14, color: WHATSAPP_COLORS.textPrimary, flex: 1 },
  metroInlineCity: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    backgroundColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },

  photoCard: {
    width: 140, height: 140, borderRadius: 12, overflow: 'hidden',
    marginRight: 4, backgroundColor: WHATSAPP_COLORS.border,
  },
  photoCardImage: { width: '100%', height: '100%' },
  photoIndexBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  photoIndexText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  photosGridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  photoGridItem: {
    width: (screenWidth - 48) / 3,
    height: (screenWidth - 48) / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridThumbnailImage: { width: '100%', height: '100%' },

  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  navButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.primary,
    gap: 4,
  },
  navButtonPrimary: { backgroundColor: WHATSAPP_COLORS.primary },
  navButtonText: { fontSize: 14, fontWeight: '700', color: WHATSAPP_COLORS.primary },
  navButtonTextPrimary: { fontSize: 14, fontWeight: '700', color: WHATSAPP_COLORS.white },
});

// ─── VisitDetails (main component) ───────────────────────────────────────────

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('You');
  const [newComment, setNewComment] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const shouldScrollToBottomRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const paginationTriggeredAt = useRef(0);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');

  const PAGINATION_COOLDOWN = 1000;
  const SCROLL_THRESHOLD = 50;

  // ─── User Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const parsed = JSON.parse(userData);
          setCurrentUserEmployeeId(parsed.employee_id);
          setCurrentUserName(
            `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim() || 'You'
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // ─── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        if (Platform.OS === 'android') {
          Animated.timing(keyboardHeightAnim, {
            toValue: e.endCoordinates.height,
            duration: 250,
            useNativeDriver: false,
          }).start();
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        if (Platform.OS === 'android') {
          Animated.timing(keyboardHeightAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: false,
          }).start();
        }
      }
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // ─── Fetch Comments ─────────────────────────────────────────────────────────
  const fetchComments = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!token || !visit.id) return;
    try {
      append ? setLoadingMore(true) : setLoadingComments(true);
      const response = await fetch(`${BACKEND_URL}/employee/getVisitComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, visit_id: visit.id, page }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const formatted: Comment[] = data.comments.map((item: any) => ({
        id: item.id,
        user: item.user,
        content: item.content,
        documents: item.documents || [],
        created_at: item.created_at,
        employeeId: item.user?.employee_id,
      }));
      if (append) {
        setComments(prev => [...formatted, ...prev]);
        shouldScrollToBottomRef.current = false;
      } else {
        setComments(formatted);
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
      setLoadingMore(false);
    }
  }, [token, visit.id]);

  useEffect(() => {
    setInitialLoadDone(false);
    setComments([]);
    setCurrentPage(1);
    setHasMoreComments(true);
    fetchComments(1, false);
  }, [visit.id]);

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const fetchMoreComments = useCallback(async () => {
    const now = Date.now();
    if (now - paginationTriggeredAt.current < PAGINATION_COOLDOWN) return;
    if (!token || !visit.id || !hasMoreComments || isLoadingMoreRef.current || loadingMore) return;
    isLoadingMoreRef.current = true;
    paginationTriggeredAt.current = now;
    await fetchComments(currentPage + 1, true);
    isLoadingMoreRef.current = false;
  }, [token, visit.id, hasMoreComments, loadingMore, currentPage, fetchComments]);

  const handleScroll = useCallback((event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    scrollDirection.current = currentY > lastScrollY.current ? 'down' : 'up';
    lastScrollY.current = currentY;
    if (
      scrollDirection.current === 'up' &&
      currentY < SCROLL_THRESHOLD &&
      hasMoreComments &&
      !loadingMore &&
      !isLoadingMoreRef.current
    ) {
      fetchMoreComments();
    }
  }, [hasMoreComments, loadingMore, fetchMoreComments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMoreComments(true);
    await fetchComments(1, false);
    setRefreshing(false);
  }, [fetchComments]);

  // ─── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialLoadDone && shouldScrollToBottomRef.current && comments.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        shouldScrollToBottomRef.current = false;
      }, 150);
    }
  }, [comments, initialLoadDone]);

  // ─── Send Comment ────────────────────────────────────────────────────────────
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() && selectedDocuments.length === 0) {
      Alert.alert('Error', 'Please enter a message or attach a file');
      return;
    }
    if (!token || !visit.id) return;
    try {
      setAddingComment(true);
      const formData = new FormData();
      formData.append('token', token);
      formData.append('visit_id', visit.id.toString());
      formData.append('content', newComment.trim());
      selectedDocuments.forEach((doc) => {
        const file: any = { uri: doc.uri, type: doc.mimeType || 'application/octet-stream', name: doc.name || 'document' };
        formData.append('documents', file);
      });
      const response = await fetch(`${BACKEND_URL}/employee/addVisitComment`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add comment');
      const newCommentData: Comment = {
        id: data.comment?.id || Date.now(),
        user: {
          id: currentUserEmployeeId ? parseInt(currentUserEmployeeId) : 0,
          full_name: currentUserName,
          employee_id: currentUserEmployeeId || '',
        },
        content: newComment.trim(),
        documents: data.comment?.documents || selectedDocuments.map(d => ({ document: d.uri, document_name: d.name })),
        created_at: new Date().toISOString(),
        employeeId: currentUserEmployeeId || '',
      };
      setComments(prev => [...prev, newCommentData]);
      setNewComment('');
      setSelectedDocuments([]);
      shouldScrollToBottomRef.current = true;
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment. Please try again.');
    } finally {
      setAddingComment(false);
    }
  }, [newComment, selectedDocuments, token, visit.id, currentUserEmployeeId, currentUserName]);

  // ─── Attachment Handlers ─────────────────────────────────────────────────
  const handleTakePhoto = useCallback(async () => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Camera permissions are needed.'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedDocuments(prev => [...prev, { uri: asset.uri, name: `photo_${Date.now()}.jpg`, mimeType: 'image/jpeg', size: asset.fileSize, lastModified: Date.now() }]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch { Alert.alert('Error', 'Failed to take photo.'); }
    finally { setIsPickerActive(false); setShowAttachmentModal(false); }
  }, [isPickerActive]);

  const handleSelectFromGallery = useCallback(async () => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Photo library permissions are needed.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8, selectionLimit: 5 });
      if (!result.canceled && result.assets.length > 0) {
        const files = result.assets.map((asset, i) => {
          const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          return { uri: asset.uri, name: `image_${Date.now()}_${i}.${ext}`, mimeType: `image/${ext === 'png' ? 'png' : 'jpeg'}`, size: asset.fileSize, lastModified: Date.now() };
        });
        setSelectedDocuments(prev => [...prev, ...files]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch { Alert.alert('Error', 'Failed to select images.'); }
    finally { setIsPickerActive(false); setShowAttachmentModal(false); }
  }, [isPickerActive]);

  const handleSelectDocument = useCallback(async () => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets) {
        setSelectedDocuments(prev => [...prev, ...result.assets]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch { Alert.alert('Error', 'Failed to pick documents.'); }
    finally { setIsPickerActive(false); setShowAttachmentModal(false); }
  }, [isPickerActive]);

  const handleRemoveDocument = (index: number) =>
    setSelectedDocuments(prev => prev.filter((_, i) => i !== index));

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatTime = useCallback((dateString?: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  const formatWhatsAppDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const cmp = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (cmp(date) === cmp(today)) return 'Today';
    if (cmp(date) === cmp(yesterday)) return 'Yesterday';
    if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000)
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  const truncateFileName = (name: string, max = 25) =>
    name.length <= max ? name : name.substring(0, max - 3) + '...';

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // ─── Processed Chat Messages ──────────────────────────────────────────────
  const getProcessedComments = useCallback((): ChatMessage[] => {
    if (!comments.length) return [];
    const sorted = [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const result: ChatMessage[] = [];
    let lastDate = '';
    sorted.forEach((comment, index) => {
      const dateLabel = formatWhatsAppDate(comment.created_at);
      if (dateLabel !== lastDate) {
        result.push({ type: 'dateSeparator', id: `date-${dateLabel}-${index}`, date: dateLabel });
        lastDate = dateLabel;
      }
      result.push({ type: 'comment', id: comment.id.toString(), data: comment });
    });
    return result;
  }, [comments, formatWhatsAppDate]);

  const processedComments = useMemo(() => getProcessedComments(), [getProcessedComments]);

  // ─── Render Chat Item ───────────────────────────────────────────────────────
  const renderChatItem = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.type === 'dateSeparator') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View style={styles.dateSeparatorBubble}>
            <Text style={styles.dateSeparatorText}>{item.date}</Text>
          </View>
        </View>
      );
    }
    const comment = item.data;
    if (!comment) return null;
    const isCurrentUser = comment.employeeId === currentUserEmployeeId;
    const time = formatTime(comment.created_at);
    return (
      <View style={[styles.messageRow, isCurrentUser ? styles.messageRowRight : styles.messageRowLeft]}>
        <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
          {!isCurrentUser && (
            <View style={styles.senderHeader}>
              <Text style={styles.senderName}>{comment.user?.full_name || 'Unknown'}</Text>
            </View>
          )}
          {comment.content ? <Text style={styles.messageText}>{comment.content}</Text> : null}
          {comment.documents?.length > 0 && (
            <View style={styles.documentsContainer}>
              {comment.documents.map((doc: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.documentAttachment}
                  onPress={() => doc.document && Linking.openURL(doc.document)}
                >
                  <MaterialIcons name="insert-drive-file" size={20} color={WHATSAPP_COLORS.primary} />
                  <Text style={styles.documentName} numberOfLines={1}>
                    {truncateFileName(doc.document_name || 'file', 25)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>{time}</Text>
            {isCurrentUser && (
              <Ionicons name="checkmark-done" size={14} color={WHATSAPP_COLORS.primary} style={styles.deliveryIcon} />
            )}
          </View>
        </View>
      </View>
    );
  }, [currentUserEmployeeId, formatTime]);

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  );

  // ─── Main Content ─────────────────────────────────────────────────────────
  const MainContent = (
    <>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <BackIcon />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerInfo}
              onPress={() => setShowLeadDetailsModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {visit.site?.building_name || 'Visit'}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {visit.site?.location || 'Tap for details'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onEdit} style={styles.headerActionButton}>
                <MaterialIcons name="edit" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Stepped details modal */}
      <VisitDetailedInfo
        visible={showLeadDetailsModal}
        onClose={() => setShowLeadDetailsModal(false)}
        visit={visit}
      />

      {/* Chat */}
      <View style={styles.chatContainer}>
        {comments.length === 0 ? (
          <View style={styles.emptyChat}>
            {loadingComments ? (
              <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            ) : (
              <>
                <MaterialIcons name="forum" size={64} color={WHATSAPP_COLORS.border} />
                <Text style={styles.emptyChatTitle}>No comments yet</Text>
                <Text style={styles.emptyChatText}>Start by sending a message or attaching files</Text>
              </>
            )}
          </View>
        ) : (
          <>
            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                <Text style={styles.loadingMoreText}>Loading older messages...</Text>
              </View>
            )}
            <FlatList
              ref={flatListRef}
              data={processedComments}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatListContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={400}
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
                  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
              }}
            />
          </>
        )}
      </View>

      {/* Selected files preview */}
      {selectedDocuments.length > 0 && (
        <View style={styles.selectedFilesPreview}>
          <Text style={styles.selectedFilesTitle}>Attachments ({selectedDocuments.length})</Text>
          <FlatList
            horizontal
            data={selectedDocuments}
            renderItem={({ item: doc, index }) => (
              <View style={styles.selectedDocumentItem}>
                <MaterialIcons name="insert-drive-file" size={20} color={WHATSAPP_COLORS.primary} />
                <View style={styles.selectedDocumentInfo}>
                  <Text style={styles.selectedDocumentName} numberOfLines={1}>
                    {truncateFileName(doc.name, 20)}
                  </Text>
                  <Text style={styles.selectedDocumentSize}>{formatFileSize(doc.size)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                  <Ionicons name="close" size={18} color={WHATSAPP_COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(_, idx) => `doc-${idx}`}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Attachment modal */}
      <Modal
        visible={showAttachmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!isPickerActive) setShowAttachmentModal(false); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { if (!isPickerActive) setShowAttachmentModal(false); }}
        >
          <View style={styles.attachmentModalContent}>
            <TouchableOpacity style={styles.attachmentOption} onPress={handleSelectDocument} disabled={isPickerActive}>
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#7F66FF' }]}>
                <MaterialIcons name="insert-drive-file" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Document</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentOption} onPress={handleTakePhoto} disabled={isPickerActive}>
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#FF4D67' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentOption} onPress={handleSelectFromGallery} disabled={isPickerActive}>
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#C861F9' }]}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  // ─── Input Bar ───────────────────────────────────────────────────────────────
  const InputBar = (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={() => setShowAttachmentModal(true)}
            disabled={addingComment || isPickerActive}
          >
            <Ionicons name="attach" size={22} color={WHATSAPP_COLORS.primary} />
            {selectedDocuments.length > 0 && (
              <View style={styles.fileCounterBadge}>
                <Text style={styles.fileCounterText}>{selectedDocuments.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.inputField}>
            <TextInput
              ref={inputRef}
              style={styles.messageInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Type your message..."
              multiline
              maxLength={1000}
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              editable={!addingComment}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, {
              backgroundColor: newComment.trim() || selectedDocuments.length > 0
                ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.border,
            }]}
            onPress={handleAddComment}
            disabled={addingComment || (!newComment.trim() && selectedDocuments.length === 0)}
          >
            {addingComment ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={newComment.trim() || selectedDocuments.length > 0 ? '#FFF' : WHATSAPP_COLORS.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ─── Platform Split ──────────────────────────────────────────────────────────
  if (Platform.OS === 'android') {
    return (
      <View style={styles.mainContainer}>
        {MainContent}
        <Animated.View style={[styles.androidInputContainer, { marginBottom: keyboardHeightAnim }]}>
          <SafeAreaView style={styles.inputSafeArea} edges={['bottom']}>
            {InputBar}
          </SafeAreaView>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.mainContainer} behavior="padding" keyboardVerticalOffset={0}>
      {MainContent}
      <View style={[styles.inputContainerWrapper, { marginBottom: isKeyboardVisible ? 0 : -30 }]}>
        {InputBar}
      </View>
    </KeyboardAvoidingView>
  );
};

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: WHATSAPP_COLORS.chatBg },

  headerSafeArea: { backgroundColor: WHATSAPP_COLORS.primary },
  header: {
    backgroundColor: WHATSAPP_COLORS.primary,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backIcon: { flexDirection: 'row', alignItems: 'center', height: 24, justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12,
    borderLeftWidth: 2, borderTopWidth: 2, borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: { color: '#fff', fontSize: 16, marginLeft: 2 },
  backButton: { padding: 6, marginRight: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 1, marginTop: 10 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerActionButton: { padding: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },

  chatContainer: { flex: 1, backgroundColor: WHATSAPP_COLORS.chatBg },
  chatListContent: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 10, flexGrow: 1 },
  loadingMoreContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, backgroundColor: WHATSAPP_COLORS.chatBg, gap: 8,
  },
  loadingMoreText: { fontSize: 13, color: WHATSAPP_COLORS.textSecondary },

  dateSeparatorContainer: { alignItems: 'center', marginVertical: 10 },
  dateSeparatorBubble: {
    backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10,
  },
  dateSeparatorText: { fontSize: 11, color: '#666', fontWeight: '500' },

  messageRow: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: 6, alignItems: 'flex-start' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%', minWidth: 220, borderRadius: 10, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1,
  },
  currentUserBubble: { backgroundColor: WHATSAPP_COLORS.outgoing, borderBottomRightRadius: 3 },
  otherUserBubble: { backgroundColor: WHATSAPP_COLORS.incoming, borderBottomLeftRadius: 3 },
  senderHeader: { marginBottom: 3 },
  senderName: { fontSize: 11, fontWeight: '600', color: WHATSAPP_COLORS.primary, marginBottom: 1 },
  messageText: { fontSize: 15, color: WHATSAPP_COLORS.textPrimary, lineHeight: 20 },
  documentsContainer: { marginTop: 8, gap: 6 },
  documentAttachment: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 6,
  },
  documentName: { fontSize: 12, color: WHATSAPP_COLORS.textPrimary, flex: 1 },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3, gap: 4 },
  messageTime: { fontSize: 10, color: WHATSAPP_COLORS.textTertiary },
  deliveryIcon: { marginLeft: 3 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyChatTitle: { fontSize: 16, fontWeight: '600', color: WHATSAPP_COLORS.textPrimary },
  emptyChatText: { fontSize: 13, color: WHATSAPP_COLORS.textSecondary, textAlign: 'center', maxWidth: 200 },

  androidInputContainer: {
    borderTopWidth: 1, borderTopColor: WHATSAPP_COLORS.border, backgroundColor: WHATSAPP_COLORS.surface,
  },
  inputSafeArea: { backgroundColor: WHATSAPP_COLORS.surface },
  inputContainerWrapper: {
    borderTopWidth: 1, borderTopColor: WHATSAPP_COLORS.border, backgroundColor: WHATSAPP_COLORS.surface,
  },
  inputContainer: { backgroundColor: WHATSAPP_COLORS.surface },
  inputWrapper: { paddingHorizontal: 12, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  attachmentButton: { padding: 6, marginBottom: 2, position: 'relative' },
  fileCounterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: WHATSAPP_COLORS.danger, borderRadius: 10, width: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  fileCounterText: { fontSize: 10, color: WHATSAPP_COLORS.white, fontWeight: '600' },
  inputField: {
    flex: 1, backgroundColor: WHATSAPP_COLORS.background, borderRadius: 20,
    borderWidth: 1, borderColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 16, paddingVertical: 8, minHeight: 36, maxHeight: 100,
  },
  messageInput: { fontSize: 15, color: WHATSAPP_COLORS.textPrimary, padding: 0, maxHeight: 80 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  selectedFilesPreview: {
    backgroundColor: WHATSAPP_COLORS.surface, borderTopWidth: 1, borderTopColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  selectedFilesTitle: { fontSize: 13, fontWeight: '500', color: WHATSAPP_COLORS.textSecondary, marginBottom: 6 },
  selectedDocumentItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, minWidth: 160, gap: 6, marginRight: 8,
  },
  selectedDocumentInfo: { flex: 1 },
  selectedDocumentName: { fontSize: 12, fontWeight: '500', color: WHATSAPP_COLORS.textPrimary, marginBottom: 2 },
  selectedDocumentSize: { fontSize: 10, color: WHATSAPP_COLORS.textTertiary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  attachmentModalContent: {
    backgroundColor: WHATSAPP_COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingVertical: 30, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  attachmentOption: { alignItems: 'center', gap: 8 },
  attachmentIconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  attachmentOptionText: { fontSize: 14, color: WHATSAPP_COLORS.textPrimary, fontWeight: '500' },
});

export default VisitDetails;