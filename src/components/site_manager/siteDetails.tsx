import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Modal,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface SiteDetailsProps {
  siteId: number;
  onBack: () => void;
  onEdit: () => void;
  token: string | null;
}

interface SiteData {
  id: number;
  building_name: string;
  location: string;
  location_link: string;
  landmark: string;
  building_status: string;
  floor_condition: string;
  total_floors: string;
  number_of_basements: string;
  total_area: string;
  area_per_floor: string;
  availble_floors: string;
  area_offered: string;
  rent: string;
  rent_per_seat: string;
  cam: string;
  cam_deposit: string;
  oc: boolean;
  security_deposit: string;
  two_wheeler_slots: string;
  two_wheeler_charges: string;
  efficiency: string;
  notice_period: string;
  lease_term: string;
  lock_in_period: string;
  will_developer_do_fitouts: boolean;
  contact_person_name: string;
  contact_person_designation: string;
  contact_person_number: string;
  contact_person_email: string;
  power: string;
  power_backup: string;
  number_of_cabins: string;
  number_of_workstations: string;
  size_of_workstation: string;
  server_room: string;
  training_room: string;
  pantry: string;
  electrical_ups_room: string;
  cafeteria: string;
  gym: string;
  discussion_room: string;
  meeting_room: string;
  remarks: string;
  building_owner_name: string;
  building_owner_contact: string;
  maintenance_rate: string;
  managed_property: boolean;
  conventional_property: boolean;
  business_hours_of_operation: string;
  premises_access: string;
  total_seats: string;
  seats_available: string;
  number_of_units: string;
  number_of_seats_per_unit: string;
  latitude: number;
  longitude: number;
  created_by: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  created_at: string;
  building_photos: Array<{
    id: number;
    file_url: string;
    description: string;
  }>;
  nearest_metro_station: {
    id: number;
    name: string;
    city: string;
  } | null;
  car_parking_charges: string;
  car_parking_ratio: string;
  car_parking_slots: string;
  rental_escalation: string;
  meta: Record<string, any>;
}

interface RecentVisit {
  id: number;
  assigned_to: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  status: string;
  created_at: string;
}

const SiteDetails: React.FC<SiteDetailsProps> = ({
  siteId,
  onBack,
  onEdit,
  token,
}) => {
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [showFullImage, setShowFullImage] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [apiToken, setApiToken] = useState<string | null>(token);

  useEffect(() => {
    const getToken = async () => {
      if (!token) {
        const storedToken = await AsyncStorage.getItem('token_2');
        setApiToken(storedToken);
      }
    };
    getToken();
  }, [token]);

  useEffect(() => {
    if (apiToken && siteId) {
      fetchSiteDetails();
    }
  }, [apiToken, siteId]);

  const fetchSiteDetails = async () => {
    if (!apiToken) return;

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/core/getSiteDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiToken,
          site_id: siteId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message === 'Site details fetched successfully') {
        setSiteData(data.site);
        setRecentVisits(data.recent_visits || []);
      } else {
        throw new Error(data.message || 'Failed to fetch site details');
      }
    } catch (error) {
      console.error('Error fetching site details:', error);
      Alert.alert('Error', 'Failed to fetch site details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatCurrency = (value: string): string => {
    if (!value || value.trim() === '') return '-';
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return value;
    return '₹' + num.toLocaleString('en-IN');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return WHATSAPP_COLORS.warning;
      case 'scout_completed': return WHATSAPP_COLORS.accent;
      case 'admin_completed': return WHATSAPP_COLORS.success;
      case 'cancelled': return WHATSAPP_COLORS.danger;
      default: return WHATSAPP_COLORS.textSecondary;
    }
  };

  const openLocationLink = () => {
    if (siteData?.location_link) {
      Linking.openURL(siteData.location_link).catch(err =>
        console.error('Failed to open location link:', err)
      );
    }
  };

  const openGoogleMaps = () => {
    if (siteData?.latitude && siteData?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${siteData.latitude},${siteData.longitude}`;
      Linking.openURL(url).catch(err =>
        console.error('Failed to open Google Maps:', err)
      );
    }
  };

  const renderImageGallery = () => {
    if (!siteData?.building_photos?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📸 Building Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {siteData.building_photos.map((photo, index) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoThumbnail}
              onPress={() => {
                setSelectedImageIndex(index);
                setShowFullImage(true);
              }}
            >
              <Image
                source={{ uri: photo.file_url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
              {photo.description && (
                <Text style={styles.photoDescription} numberOfLines={1}>
                  {photo.description}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRecentVisits = () => {
    if (!recentVisits.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 Recent Visits</Text>
        {recentVisits.map(visit => (
          <View key={visit.id} style={styles.visitItem}>
            <View style={styles.visitHeader}>
              <Text style={styles.visitScoutName}>
                {visit.assigned_to.first_name} {visit.assigned_to.last_name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>
                  {beautifyName(visit.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.visitDate}>
              Assigned on: {formatDate(visit.created_at)}
            </Text>
            <Text style={styles.visitId}>
              Visit ID: {visit.id}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderPropertyType = () => {
    if (siteData?.managed_property) {
      return (
        <View style={[styles.typeBadge, { backgroundColor: WHATSAPP_COLORS.accent + '20' }]}>
          <Ionicons name="business" size={14} color={WHATSAPP_COLORS.accent} />
          <Text style={[styles.typeText, { color: WHATSAPP_COLORS.accent }]}>
            Managed Property
          </Text>
        </View>
      );
    } else if (siteData?.conventional_property) {
      return (
        <View style={[styles.typeBadge, { backgroundColor: WHATSAPP_COLORS.primary + '20' }]}>
          <Ionicons name="home" size={14} color={WHATSAPP_COLORS.primary} />
          <Text style={[styles.typeText, { color: WHATSAPP_COLORS.primary }]}>
            Conventional Property
          </Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading site details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!siteData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Site Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={WHATSAPP_COLORS.danger} />
          <Text style={styles.errorText}>Site not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSiteDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sections = [
    {
      title: '🏢 Basic Information',
      fields: [
        { label: 'Building Name', value: siteData.building_name },
        { label: 'Location', value: siteData.location },
        { label: 'Landmark', value: siteData.landmark },
        { label: 'Building Status', value: beautifyName(siteData.building_status) },
        { label: 'Floor Condition', value: beautifyName(siteData.floor_condition) },
        { label: 'Total Floors', value: siteData.total_floors },
        { label: 'Basements', value: siteData.number_of_basements },
        { label: 'Total Area', value: siteData.total_area ? `${siteData.total_area} sq ft` : '-' },
        { label: 'Area per Floor', value: siteData.area_per_floor ? `${siteData.area_per_floor} sq ft` : '-' },
        { label: 'Available Floors', value: siteData.availble_floors },
        { label: 'Area Offered', value: siteData.area_offered },
        { label: 'Efficiency', value: siteData.efficiency ? `${siteData.efficiency}%` : '-' },
      ],
    },
    {
      title: '💰 Financial Details',
      fields: [
        { label: 'Monthly Rent', value: formatCurrency(siteData.rent) },
        { label: 'Rent per Seat', value: formatCurrency(siteData.rent_per_seat) },
        { label: 'CAM', value: formatCurrency(siteData.cam) },
        { label: 'CAM Deposit', value: formatCurrency(siteData.cam_deposit) },
        { label: 'Maintenance Rate', value: siteData.maintenance_rate },
        { label: 'Security Deposit', value: siteData.security_deposit ? `${siteData.security_deposit} months` : '-' },
        { label: 'Rental Escalation', value: siteData.rental_escalation ? `${siteData.rental_escalation}%` : '-' },
      ],
    },
    {
      title: '🚗 Parking Information',
      fields: [
        { label: 'Car Parking Charges', value: formatCurrency(siteData.car_parking_charges) },
        { label: 'Car Parking Ratio', value: siteData.car_parking_ratio },
        { label: 'Car Parking Slots', value: siteData.car_parking_slots },
        { label: 'Two Wheeler Slots', value: siteData.two_wheeler_slots },
        { label: 'Two Wheeler Charges', value: formatCurrency(siteData.two_wheeler_charges) },
      ],
    },
    {
      title: '⚡ Power & Utilities',
      fields: [
        { label: 'Power', value: siteData.power },
        { label: 'Power Backup', value: siteData.power_backup },
      ],
    },
    {
      title: '🏢 Workspace Details',
      fields: [
        { label: 'Number of Cabins', value: siteData.number_of_cabins },
        { label: 'Number of Workstations', value: siteData.number_of_workstations },
        { label: 'Workstation Size', value: siteData.size_of_workstation },
        { label: 'Server Room', value: siteData.server_room },
        { label: 'Training Room', value: siteData.training_room },
        { label: 'Pantry', value: siteData.pantry },
        { label: 'UPS Room', value: siteData.electrical_ups_room },
        { label: 'Cafeteria', value: siteData.cafeteria },
        { label: 'Gym', value: siteData.gym },
        { label: 'Discussion Room', value: siteData.discussion_room },
        { label: 'Meeting Room', value: siteData.meeting_room },
      ],
    },
    {
      title: '📋 Additional Information',
      fields: [
        { label: 'Lease Term', value: siteData.lease_term },
        { label: 'Lock-in Period', value: siteData.lock_in_period },
        { label: 'Notice Period', value: siteData.notice_period },
        { label: 'Developer Fitouts', value: siteData.will_developer_do_fitouts ? 'Yes' : 'No' },
        { label: 'OC Available', value: siteData.oc ? 'Yes' : 'No' },
        { label: 'Business Hours', value: siteData.business_hours_of_operation },
        { label: 'Premises Access', value: siteData.premises_access },
      ],
    },
    {
      title: '👤 Contact Information',
      fields: [
        { label: 'Building Owner', value: siteData.building_owner_name },
        { label: 'Owner Contact', value: siteData.building_owner_contact },
        { label: 'Contact Person', value: siteData.contact_person_name },
        { label: 'Designation', value: siteData.contact_person_designation },
        { label: 'Phone', value: siteData.contact_person_number },
        { label: 'Email', value: siteData.contact_person_email },
        { label: 'Nearest Metro', value: siteData.nearest_metro_station?.name || '-' },
        { label: 'Remarks', value: siteData.remarks },
      ],
    },
    {
      title: '📊 Managed Office Details',
      show: siteData.managed_property,
      fields: [
        { label: 'Total Seats', value: siteData.total_seats },
        { label: 'Seats Available', value: siteData.seats_available },
        { label: 'Number of Units', value: siteData.number_of_units },
        { label: 'Seats per Unit', value: siteData.number_of_seats_per_unit },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Details</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Ionicons name="pencil" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Site Header */}
          <View style={styles.siteHeader}>
            <View style={styles.siteTitleContainer}>
              <Text style={styles.siteName}>{siteData.building_name}</Text>
              {renderPropertyType()}
            </View>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color={WHATSAPP_COLORS.textSecondary} />
              <Text style={styles.locationText} numberOfLines={2}>
                {siteData.location || 'No location specified'}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              {siteData.location_link && (
                <TouchableOpacity style={styles.locationButton} onPress={openLocationLink}>
                  <Ionicons name="link" size={16} color={WHATSAPP_COLORS.white} />
                  <Text style={styles.locationButtonText}>Open Link</Text>
                </TouchableOpacity>
              )}
              {siteData.latitude && siteData.longitude && (
                <TouchableOpacity style={styles.mapButton} onPress={openGoogleMaps}>
                  <Ionicons name="map" size={16} color={WHATSAPP_COLORS.white} />
                  <Text style={styles.mapButtonText}>View on Map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Creation Info */}
          <View style={styles.creationInfo}>
            <Text style={styles.creationText}>
              Created by: {siteData.created_by?.first_name} {siteData.created_by?.last_name}
            </Text>
            <Text style={styles.creationText}>
              Created on: {formatDate(siteData.created_at)}
            </Text>
            <Text style={styles.creationText}>
              ID: {siteData.id}
            </Text>
          </View>

          {/* Photos */}
          {renderImageGallery()}

          {/* Sections */}
          {sections.map((section, index) => {
            if (section.show === false) return null;
            return (
              <View key={index} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionContent}>
                  {section.fields.map((field, fieldIndex) => (
                    <View key={fieldIndex} style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{field.label}:</Text>
                      <Text style={styles.fieldValue}>{field.value || '-'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Recent Visits */}
          {renderRecentVisits()}

          {/* Meta Data */}
          {siteData.meta && Object.keys(siteData.meta).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Additional Data</Text>
              <View style={styles.sectionContent}>
                {Object.entries(siteData.meta).map(([key, value], index) => (
                  <View key={index} style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{beautifyName(key)}:</Text>
                    <Text style={styles.fieldValue}>{String(value) || '-'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Full Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <View style={styles.fullImageModal}>
          <TouchableOpacity
            style={styles.closeImageButton}
            onPress={() => setShowFullImage(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {siteData.building_photos[selectedImageIndex] && (
            <Image
              source={{ uri: siteData.building_photos[selectedImageIndex].file_url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
          {siteData.building_photos[selectedImageIndex]?.description && (
            <View style={styles.fullImageDescription}>
              <Text style={styles.fullImageDescriptionText}>
                {siteData.building_photos[selectedImageIndex].description}
              </Text>
            </View>
          )}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {selectedImageIndex + 1} / {siteData.building_photos.length}
            </Text>
          </View>
          {siteData.building_photos.length > 1 && (
            <>
              {selectedImageIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={() => setSelectedImageIndex(prev => prev - 1)}
                >
                  <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
              )}
              {selectedImageIndex < siteData.building_photos.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={() => setSelectedImageIndex(prev => prev + 1)}
                >
                  <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  backButton: {
    padding: 4,
  },
  editButton: {
    padding: 8,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  siteHeader: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  siteTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  siteName: {
    fontSize: 22,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  locationButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  mapButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  creationInfo: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  creationText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4,
  },
  section: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },
  sectionContent: {
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  photoThumbnail: {
    width: 120,
    marginRight: 12,
  },
  thumbnailImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
  },
  photoDescription: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  visitItem: {
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitScoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitDate: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4,
  },
  visitId: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textTertiary,
  },
  bottomSpacing: {
    height: 20,
  },
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  fullImage: {
    width: screenWidth,
    height: screenWidth,
  },
  fullImageDescription: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  fullImageDescriptionText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    textAlign: 'center',
  },
  imageCounter: {
    position: 'absolute',
    top: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
});

export default SiteDetails;