import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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

interface SiteDetailedInfoProps {
  visible: boolean;
  onClose: () => void;
  siteData: SiteData | null;
}

const SiteDetailedInfo: React.FC<SiteDetailedInfoProps> = ({
  visible,
  onClose,
  siteData,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

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

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
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
    if (siteData?.location_link){
      const url = siteData.location_link;
      Linking.openURL(url).catch(err =>
        console.error('Failed to open Google Maps:', err)
      );
    }
  };

  // Function to extract other amenities from meta field
  const getOtherAmenities = () => {
    if (!siteData?.meta) return [];
    
    const amenities: Array<{ key: string; value: string }> = [];
    
    // Extract other_amenity_* fields from meta
    Object.keys(siteData.meta).forEach(key => {
      // Match pattern: other_amenity_1_key, other_amenity_2_key, etc.
      const keyMatch = key.match(/^other_amenity_(\d+)_key$/);
      if (keyMatch) {
        const index = keyMatch[1];
        const valueKey = `other_amenity_${index}_value`;
        
        if (siteData?.meta[valueKey]) {
          amenities.push({
            key: siteData.meta[key],
            value: siteData.meta[valueKey]
          });
        }
      }
    });
    
    // Sort by index to maintain order
    amenities.sort((a, b) => {
      const aIndex = parseInt(Object.keys(siteData?.meta || {}).find(k => k.match(/^other_amenity_(\d+)_key$/) && siteData?.meta[k] === a.key)?.match(/^other_amenity_(\d+)_key$/)?.[1] || '0');
      const bIndex = parseInt(Object.keys(siteData?.meta || {}).find(k => k.match(/^other_amenity_(\d+)_key$/) && siteData?.meta[k] === b.key)?.match(/^other_amenity_(\d+)_key$/)?.[1] || '0');
      return aIndex - bIndex;
    });
    
    return amenities;
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

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.siteInfoContainer}>
          <View style={styles.siteAvatarSection}>
            <View style={styles.siteAvatar}>
              <Text style={styles.siteAvatarText}>
                {getInitials(siteData?.building_name || 'S')}
              </Text>
            </View>
          </View>
          <View style={styles.siteHeaderSection}>
            <Text style={styles.siteNameText}>{siteData?.building_name}</Text>
            {siteData?.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {siteData.location}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statusBadgesContainer}>
          {renderPropertyType()}
          <View style={[styles.statusBadgeBox, { backgroundColor: WHATSAPP_COLORS.primary + '15', borderColor: WHATSAPP_COLORS.primary + '30' }]}>
            <Text style={[styles.stepLabel, { color: WHATSAPP_COLORS.primary }]}>
              Status: {beautifyName(siteData?.building_status || '')}
            </Text>
          </View>
        </View>

        {/* ADDED: Nearest Metro Station */}
        {siteData?.nearest_metro_station && (
          <View style={styles.metroStationContainer}>
            <View style={styles.metroStationHeader}>
              <Ionicons name="train" size={16} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.metroStationTitle}>Nearest Metro Station</Text>
            </View>
            <View style={styles.metroStationContent}>
              <Text style={styles.metroStationName}>{siteData.nearest_metro_station.name}</Text>
              {siteData.nearest_metro_station.city && (
                <Text style={styles.metroStationCity}>{siteData.nearest_metro_station.city}</Text>
              )}
            </View>
          </View>
        )}

        {siteData?.location_link && (
          <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.mapButton} onPress={openGoogleMaps}>
                <Ionicons name="map" size={16} color={WHATSAPP_COLORS.white} />
                <Text style={styles.mapButtonText}>View on Map</Text>
              </TouchableOpacity>
          </View>
        )}

        <View style={styles.metadataSection}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Created By</Text>
            <Text style={styles.metadataValue}>
              {siteData?.created_by?.first_name} {siteData?.created_by?.last_name}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Created On</Text>
            <Text style={styles.metadataValue}>{formatDate(siteData?.created_at || '')}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Site ID</Text>
            <Text style={styles.metadataValue}>{siteData?.id}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="business" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Basic Information</Text>
        </View>
        <View style={styles.containerContent}>
          {[
            { label: 'Building Status', value: beautifyName(siteData?.building_status || '') },
            { label: 'Floor Condition', value: beautifyName(siteData?.floor_condition || '') },
            { label: 'Total Floors', value: siteData?.total_floors || '-' },
            { label: 'Basements', value: siteData?.number_of_basements || '-' },
            { label: 'Total Area', value: siteData?.total_area ? `${siteData.total_area} sq ft` : '-' },
            { label: 'Area per Floor', value: siteData?.area_per_floor ? `${siteData.area_per_floor} sq ft` : '-' },
            { label: 'Available Floors', value: siteData?.availble_floors || '-' },
            { label: 'Efficiency', value: siteData?.efficiency ? `${siteData.efficiency}%` : '-' },
          ].map((field, idx) => (
            <View key={idx} style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{field.label}</Text>
              <View style={styles.infoItemBox}>
                <Text style={styles.infoItemValue}>{field.value || '-'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="attach-money" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Financial Details</Text>
        </View>
        <View style={styles.containerContent}>
          {[
            { label: 'Monthly Rent', value: formatCurrency(siteData?.rent || '') },
            { label: 'Rent per Seat', value: formatCurrency(siteData?.rent_per_seat || '') },
            { label: 'CAM', value: formatCurrency(siteData?.cam || '') },
            { label: 'CAM Deposit', value: siteData?.cam_deposit || '-' },
            { label: 'Maintenance Rate', value: siteData?.maintenance_rate || '-' },
            { label: 'Security Deposit', value: siteData?.security_deposit ? `${siteData.security_deposit} months` : '-' },
            { label: 'Rental Escalation', value: siteData?.rental_escalation || '-' },
          ].map((field, idx) => (
            <View key={idx} style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{field.label}</Text>
              <View style={styles.infoItemBox}>
                <Text style={styles.infoItemValue}>{field.value || '-'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="contact-phone" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Contact Information</Text>
        </View>
        <View style={styles.containerContent}>
          {[
            { label: 'Building Owner', value: siteData?.building_owner_name || '-' },
            { label: 'Owner Contact', value: siteData?.building_owner_contact || '-' },
            { label: 'Contact Person', value: siteData?.contact_person_name || '-' },
            { label: 'Designation', value: siteData?.contact_person_designation || '-' },
            { label: 'Phone', value: siteData?.contact_person_number || '-' },
            { label: 'Email', value: siteData?.contact_person_email || '-' },
          ].map((field, idx) => (
            <View key={idx} style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{field.label}</Text>
              <View style={styles.infoItemBox}>
                <Text style={styles.infoItemValue}>{field.value || '-'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="directions-car" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Parking & Utilities</Text>
        </View>
        <View style={styles.containerContent}>
          {[
            { label: 'Car Parking Slots', value: siteData?.car_parking_slots || '-' },
            { label: 'Car Parking Charges', value: formatCurrency(siteData?.car_parking_charges || '') },
            { label: 'Car Parking Ratio', value: siteData?.car_parking_ratio || '-' },
            { label: 'Two-Wheeler Slots', value: siteData?.two_wheeler_slots || '-' },
            { label: 'Two-Wheeler Charges', value: formatCurrency(siteData?.two_wheeler_charges || '') },
            { label: 'Power', value: siteData?.power || '-' },
            { label: 'Power Backup', value: siteData?.power_backup || '-' },
          ].map((field, idx) => (
            <View key={idx} style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{field.label}</Text>
              <View style={styles.infoItemBox}>
                <Text style={styles.infoItemValue}>{field.value || '-'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => {
    const otherAmenities = getOtherAmenities();
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.containerBox}>
          <View style={styles.containerHeader}>
            <MaterialIcons name="meeting-room" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.containerTitle}>Workspace Amenities</Text>
          </View>
          <View style={styles.containerContent}>
            {[
              { label: 'Number of Cabins', value: siteData?.number_of_cabins || '-' },
              { label: 'Number of Workstations', value: siteData?.number_of_workstations || '-' },
              { label: 'Size of Workstation', value: siteData?.size_of_workstation || '-' },
              { label: 'Server Room', value: siteData?.server_room || '-' },
              { label: 'Training Room', value: siteData?.training_room || '-' },
              { label: 'Pantry', value: siteData?.pantry || '-' },
              { label: 'Electrical UPS Room', value: siteData?.electrical_ups_room || '-' },
              { label: 'Cafeteria', value: siteData?.cafeteria || '-' },
              { label: 'Gym', value: siteData?.gym || '-' },
              { label: 'Discussion Room', value: siteData?.discussion_room || '-' },
              { label: 'Meeting Room', value: siteData?.meeting_room || '-' },
            ].map((field, idx) => (
              <View key={idx} style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>{field.label}</Text>
                <View style={styles.infoItemBox}>
                  <Text style={styles.infoItemValue}>{field.value || '-'}</Text>
                </View>
              </View>
            ))}
            
            {/* ADDED: Other Amenities from Meta */}
            {otherAmenities.length > 0 && (
              <View style={styles.otherAmenitiesSection}>
                <Text style={styles.otherAmenitiesTitle}>Other Amenities</Text>
                {otherAmenities.map((amenity, index) => (
                  <View key={index} style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>{amenity.key}</Text>
                    <View style={styles.infoItemBox}>
                      <Text style={styles.infoItemValue}>{amenity.value || '-'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="description" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Additional Information</Text>
        </View>
        <View style={styles.containerContent}>
          {[
            { label: 'Business Hours', value: siteData?.business_hours_of_operation || '-' },
            { label: 'Premises Access', value: siteData?.premises_access || '-' },
            { label: 'Total Seats', value: siteData?.total_seats || '-' },
            { label: 'Seats Available', value: siteData?.seats_available || '-' },
            { label: 'Number of Units', value: siteData?.number_of_units || '-' },
            { label: 'Seats per Unit', value: siteData?.number_of_seats_per_unit || '-' },
            { label: 'Notice Period', value: siteData?.notice_period || '-' },
            { label: 'Lease Term', value: siteData?.lease_term || '-' },
            { label: 'Lock-in Period', value: siteData?.lock_in_period || '-' },
            { label: 'Will Developer Do Fitouts', value: siteData?.will_developer_do_fitouts ? 'Yes' : 'No' },
            { label: 'OC Available', value: siteData?.oc ? 'Yes' : 'No' },
          ].map((field, idx) => (
            <View key={idx} style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{field.label}</Text>
              <View style={styles.infoItemBox}>
                <Text style={styles.infoItemValue}>{field.value || '-'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {siteData?.building_photos && siteData.building_photos.length > 0 && (
        <View style={[styles.containerBox, { marginTop: 12 }]}>
          <View style={styles.containerHeader}>
            <MaterialIcons name="photo-library" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.containerTitle}>Building Photos ({siteData.building_photos.length})</Text>
          </View>
          <View style={styles.photosGridContainer}>
            {siteData.building_photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoGridItem}>
                <Image
                  source={{ uri: photo.file_url }}
                  style={styles.gridThumbnailImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3, 4, 5, 6].map((step, index) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep >= step && styles.stepNumberActive
            ]}>
              {step + 1}
            </Text>
          </View>
          {index < 6 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const stepTitles = [
    'Site Overview',
    'Basic Information',
    'Financial Details',
    'Contact Information',
    'Parking & Utilities',
    'Workspace Amenities',
    'Additional Details'
  ];

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

  const handleNextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!siteData) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalBackButton}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Site Details</Text>
        </View>
      </SafeAreaView>

      <View style={styles.contentContainer}>
        {renderStepIndicator()}
        
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>{stepTitles[currentStep]}</Text>
          <Text style={styles.stepDescription}>
            Step {currentStep + 1} of {stepTitles.length}
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.navButton, { flex: currentStep < 6 ? 1 : 0 }]}
              onPress={handlePrevStep}
            >
              <Ionicons name="arrow-back" size={18} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 6 ? (
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.navButtonPrimary,
                { flex: currentStep === 0 ? 1 : 1 }
              ]}
              onPress={handleNextStep}
            >
              <Text style={styles.navButtonTextPrimary}>Next</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
    marginTop:50,
  },
  modalBackButton: {
    padding: 8,
    marginRight: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1
  },
  contentContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
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
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textSecondary,
  },
  stepNumberActive: {
    color: WHATSAPP_COLORS.white,
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: WHATSAPP_COLORS.border,
  },
  stepLineActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  stepTitleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  stepContent: {
    padding: 16,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
  },
  // Container Box Styles
  containerBox: {
    backgroundColor: WHATSAPP_COLORS.surface,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    overflow: 'hidden'
  },
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
  // Site Info Styles
  siteInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 16
  },
  siteAvatarSection: {
    alignItems: 'center'
  },
  siteAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: WHATSAPP_COLORS.primary
  },
  siteAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF'
  },
  siteHeaderSection: {
    flex: 1,
    justifyContent: 'center'
  },
  siteNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10
  },
  statusBadgeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
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
  // Metro Station Styles
  metroStationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  metroStationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metroStationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
  },
  metroStationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metroStationName: {
  fontSize: 15,
  fontWeight: '600',
  color: WHATSAPP_COLORS.textPrimary,
  flex: 1, 
  flexWrap: 'wrap',  
},
  metroStationCity: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    backgroundColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  metadataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
  },
  metadataValue: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  // Info Item Styles
  infoItem: {
    marginBottom: 12
  },
  infoItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 6
  },
  infoItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border
  },
  infoItemValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1
  },
  // Other Amenities Styles
  otherAmenitiesSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  otherAmenitiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginBottom: 12,
  },
  // Photo Grid
  photosGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  photoGridItem: {
    width: (screenWidth - 48) / 3,
    height: (screenWidth - 48) / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  // Navigation Buttons
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
  navButtonPrimary: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHATSAPP_COLORS.primary,
  },
  navButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: WHATSAPP_COLORS.white,
    marginLeft: 8,
  },
});

export default SiteDetailedInfo;