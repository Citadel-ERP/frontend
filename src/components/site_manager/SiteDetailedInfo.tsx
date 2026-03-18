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
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

// ─── Theme ────────────────────────────────────────────────────────────────────

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

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
  floor_wise_area: string;
  micro_market: string;
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

// ─── BulletList ───────────────────────────────────────────────────────────────
//
// Pure display component for newline-separated string data.
// Splits on '\n', renders each non-empty line as a read-only bullet row.
// No touch handlers, no TextInput — completely inert.

const BulletList: React.FC<{ raw: string }> = ({ raw }) => {
  const lines = raw ? raw.split('\n').filter((l) => l.trim()) : [];

  if (lines.length === 0) {
    return (
      <View style={blStyles.wrapper}>
        <Text style={blStyles.emptyText}>-</Text>
      </View>
    );
  }

  return (
    <View style={blStyles.wrapper}>
      {lines.map((line, idx) => (
        <View
          key={idx}
          style={[blStyles.row, idx < lines.length - 1 && blStyles.rowDivider]}
        >
          <View style={blStyles.dot} />
          <Text style={blStyles.lineText}>{line}</Text>
        </View>
      ))}
    </View>
  );
};

const blStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WHATSAPP_COLORS.primary,
    marginRight: 10,
    flexShrink: 0,
  },
  lineText: {
    flex: 1,
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

// ─── SiteDetailedInfo ─────────────────────────────────────────────────────────

const SiteDetailedInfo: React.FC<SiteDetailedInfoProps> = ({
  visible,
  onClose,
  siteData,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatCurrency = (value: string): string => {
    if (!value || value.trim() === '') return '-';
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    // If the value contains non-numeric text (e.g. "Inclusive"), return it as-is.
    if (isNaN(num)) return value;
    return '₹' + num.toLocaleString('en-IN');
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0].charAt(0).toUpperCase()
      : (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const openGoogleMaps = () => {
    if (siteData?.location_link) {
      Linking.openURL(siteData.location_link).catch((err) =>
        console.error('Failed to open Maps:', err),
      );
    }
  };

  const getOtherAmenities = (): Array<{ key: string; value: string }> => {
    if (!siteData?.meta) return [];
    const amenities: Array<{ key: string; value: string }> = [];
    Object.keys(siteData.meta).forEach((key) => {
      const match = key.match(/^other_amenity_(\d+)_key$/);
      if (match) {
        const valueKey = `other_amenity_${match[1]}_value`;
        if (siteData.meta[valueKey]) {
          amenities.push({ key: siteData.meta[key], value: siteData.meta[valueKey] });
        }
      }
    });
    amenities.sort((a, b) => {
      const getIdx = (name: string) =>
        parseInt(
          Object.keys(siteData.meta)
            .find(
              (k) =>
                k.match(/^other_amenity_(\d+)_key$/) && siteData.meta[k] === name,
            )
            ?.match(/^other_amenity_(\d+)_key$/)?.[1] ?? '0',
        );
      return getIdx(a.key) - getIdx(b.key);
    });
    return amenities;
  };

  // ── Shared display atoms ───────────────────────────────────────────────────
  //
  // renderRow    — label above a plain grey box containing a Text node.
  // renderBullet — label above a BulletList (for multi-line / newline data).
  //
  // Neither contains any interactive element. React Native's <Text> is not
  // focusable and does not open the keyboard.

  const renderRow = (label: string, value: string) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoItemLabel}>{label}</Text>
      <View style={styles.infoItemBox}>
        <Text style={styles.infoItemValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  const renderBullet = (label: string, raw: string) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoItemLabel}>{label}</Text>
      <BulletList raw={raw} />
    </View>
  );

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
    }
    if (siteData?.conventional_property) {
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

  // ─── Step 0: Site Overview ────────────────────────────────────────────────

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        {/* Avatar + name */}
        <View style={styles.siteInfoContainer}>
          <View style={styles.siteAvatarSection}>
            <View style={styles.siteAvatar}>
              <Text style={styles.siteAvatarText}>
                {getInitials(siteData?.building_name ?? 'S')}
              </Text>
            </View>
          </View>
          <View style={styles.siteHeaderSection}>
            <Text style={styles.siteNameText}>{siteData?.building_name}</Text>
            {siteData?.location ? (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {siteData.location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Badges */}
        <View style={styles.statusBadgesContainer}>
          {renderPropertyType()}
          <View
            style={[
              styles.statusBadgeBox,
              {
                backgroundColor: WHATSAPP_COLORS.primary + '15',
                borderColor: WHATSAPP_COLORS.primary + '30',
              },
            ]}
          >
            <Text style={[styles.stepLabel, { color: WHATSAPP_COLORS.primary }]}>
              Status: {beautifyName(siteData?.building_status ?? '')}
            </Text>
          </View>
          {siteData?.micro_market ? (
            <View
              style={[
                styles.statusBadgeBox,
                {
                  backgroundColor: WHATSAPP_COLORS.info + '15',
                  borderColor: WHATSAPP_COLORS.info + '30',
                },
              ]}
            >
              <Ionicons
                name="map"
                size={13}
                color={WHATSAPP_COLORS.info}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.stepLabel, { color: WHATSAPP_COLORS.info }]}>
                {siteData.micro_market}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Map CTA — intentionally interactive: opens external Maps app */}
        {siteData?.location_link ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.mapButton} onPress={openGoogleMaps}>
              <Ionicons name="map" size={16} color={WHATSAPP_COLORS.white} />
              <Text style={styles.mapButtonText}>View on Map</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Metadata */}
        <View style={styles.metadataSection}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Created By</Text>
            <Text style={styles.metadataValue}>
              {siteData?.created_by?.first_name} {siteData?.created_by?.last_name}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Created On</Text>
            <Text style={styles.metadataValue}>
              {formatDate(siteData?.created_at ?? '')}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Site ID</Text>
            <Text style={styles.metadataValue}>{siteData?.id}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ─── Step 1: Basic Information ────────────────────────────────────────────
  // Nearest Metro Station moved here from Step 0.
  // area_offered and floor_wise_area rendered as BulletList.

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="business" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Basic Information</Text>
        </View>
        <View style={styles.containerContent}>
          {renderRow('Building Status', beautifyName(siteData?.building_status ?? ''))}
          {renderRow('Floor Condition', beautifyName(siteData?.floor_condition ?? ''))}
          {renderRow('Total Floors', siteData?.total_floors ?? '')}
          {renderRow('Basements', siteData?.number_of_basements ?? '')}
          {renderRow(
            'Total Area',
            siteData?.total_area ? `${siteData.total_area} sq ft` : '-',
          )}
          {renderRow(
            'Efficiency',
            siteData?.efficiency ? `${siteData.efficiency}%` : '-',
          )}
          {renderRow('Available Floors', siteData?.availble_floors ?? '')}

          {/* Total Available Area — bullet list */}
          {renderBullet('Total Available Area', siteData?.area_offered ?? '')}

          {renderRow(
            'Area Per Floor — Typical Floor Plate',
            siteData?.area_per_floor ? `${siteData.area_per_floor} sq ft` : '-',
          )}

          {/* Floor-wise Availability — bullet list */}
          {renderBullet('Floor-wise Availability', siteData?.floor_wise_area ?? '')}

          {/* Micro Market */}
          {siteData?.micro_market ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>Micro Market</Text>
              <View style={[styles.infoItemBox, styles.microMarketBox]}>
                <Ionicons
                  name="map"
                  size={14}
                  color={WHATSAPP_COLORS.info}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.infoItemValue,
                    { color: WHATSAPP_COLORS.info, fontWeight: '600' },
                  ]}
                >
                  {siteData.micro_market}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Nearest Metro Station */}
          {siteData?.nearest_metro_station ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>Nearest Metro Station</Text>
              <View style={[styles.infoItemBox, styles.metroInlineBox]}>
                <Ionicons
                  name="train"
                  size={16}
                  color={WHATSAPP_COLORS.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.infoItemValue, { fontWeight: '600' }]}>
                  {siteData.nearest_metro_station.name}
                </Text>
                {siteData.nearest_metro_station.city ? (
                  <Text style={styles.metroInlineCity}>
                    {siteData.nearest_metro_station.city}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  // ─── Step 2: Financial Details ────────────────────────────────────────────
  // CAM displayed as plain text — supports alphanumeric stored values.

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="attach-money" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Financial Details</Text>
        </View>
        <View style={styles.containerContent}>
          {renderRow('Monthly Rent', formatCurrency(siteData?.rent ?? ''))}
          {renderRow('Rent per Seat', formatCurrency(siteData?.rent_per_seat ?? ''))}
          {renderRow('CAM', siteData?.cam || '-')}
          {renderRow('CAM Deposit', siteData?.cam_deposit ?? '')}
          {renderRow('Maintenance Rate', siteData?.maintenance_rate ?? '')}
          {renderRow(
            'Security Deposit',
            siteData?.security_deposit
              ? `${siteData.security_deposit} months`
              : '-',
          )}
          {renderRow('Rental Escalation', siteData?.rental_escalation ?? '')}
        </View>
      </View>
    </View>
  );

  // ─── Step 3: Contact Information ─────────────────────────────────────────

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="contact-phone" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Contact Information</Text>
        </View>
        <View style={styles.containerContent}>
          {renderRow('Building Owner', siteData?.building_owner_name ?? '')}
          {renderRow('Owner Contact', siteData?.building_owner_contact ?? '')}
          {renderRow('Contact Person', siteData?.contact_person_name ?? '')}
          {renderRow('Designation', siteData?.contact_person_designation ?? '')}
          {renderRow('Phone', siteData?.contact_person_number ?? '')}
          {renderRow('Email', siteData?.contact_person_email ?? '')}
        </View>
      </View>
    </View>
  );

  // ─── Step 4: Parking & Utilities ─────────────────────────────────────────

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="directions-car" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Parking & Utilities</Text>
        </View>
        <View style={styles.containerContent}>
          {renderRow('Car Parking Slots', siteData?.car_parking_slots ?? '')}
          {renderRow('Car Parking Charges', formatCurrency(siteData?.car_parking_charges ?? ''))}
          {renderRow('Car Parking Ratio', siteData?.car_parking_ratio ?? '')}
          {renderRow('Two-Wheeler Slots', siteData?.two_wheeler_slots ?? '')}
          {renderRow('Two-Wheeler Charges', formatCurrency(siteData?.two_wheeler_charges ?? ''))}
          {renderRow('Power', siteData?.power ?? '')}
          {renderRow('Power Backup', siteData?.power_backup ?? '')}
        </View>
      </View>
    </View>
  );

  // ─── Step 5: Workspace Amenities ─────────────────────────────────────────

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
            {renderRow('Number of Cabins', siteData?.number_of_cabins ?? '')}
            {renderRow('Number of Workstations', siteData?.number_of_workstations ?? '')}
            {renderRow('Size of Workstation', siteData?.size_of_workstation ?? '')}
            {renderRow('Server Room', siteData?.server_room ?? '')}
            {renderRow('Training Room', siteData?.training_room ?? '')}
            {renderRow('Pantry', siteData?.pantry ?? '')}
            {renderRow('Electrical UPS Room', siteData?.electrical_ups_room ?? '')}
            {renderRow('Cafeteria', siteData?.cafeteria ?? '')}
            {renderRow('Gym', siteData?.gym ?? '')}
            {renderRow('Discussion Room', siteData?.discussion_room ?? '')}
            {renderRow('Meeting Room', siteData?.meeting_room ?? '')}
            {otherAmenities.length > 0 ? (
              <View style={styles.otherAmenitiesSection}>
                <Text style={styles.otherAmenitiesTitle}>Other Amenities</Text>
                {otherAmenities.map((a, idx) => renderRow(a.key, a.value))}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  // ─── Step 6: Additional Details ───────────────────────────────────────────
  // Number of Units and Seats per Unit use BulletList when managed_property
  // is true, plain text otherwise.

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <View style={styles.containerBox}>
        <View style={styles.containerHeader}>
          <MaterialIcons name="description" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.containerTitle}>Additional Information</Text>
        </View>
        <View style={styles.containerContent}>
          {renderRow('Business Hours', siteData?.business_hours_of_operation ?? '')}
          {renderRow('Premises Access', siteData?.premises_access ?? '')}
          {renderRow('Total Seats', siteData?.total_seats ?? '')}
          {renderRow('Seats Available', siteData?.seats_available ?? '')}

          {siteData?.managed_property
            ? renderBullet('Number of Units', siteData.number_of_units ?? '')
            : renderRow('Number of Units', siteData?.number_of_units ?? '')}

          {siteData?.managed_property
            ? renderBullet('Seats per Unit', siteData.number_of_seats_per_unit ?? '')
            : renderRow('Seats per Unit', siteData?.number_of_seats_per_unit ?? '')}

          {renderRow('Notice Period', siteData?.notice_period ?? '')}
          {renderRow('Lease Term', siteData?.lease_term ?? '')}
          {renderRow('Lock-in Period', siteData?.lock_in_period ?? '')}
          {renderRow(
            'Will Developer Do Fitouts',
            siteData?.will_developer_do_fitouts ? 'Yes' : 'No',
          )}
          {renderRow('OC Available', siteData?.oc ? 'Yes' : 'No')}
          {siteData?.remarks ? renderRow('Remarks', siteData.remarks) : null}
        </View>
      </View>

      {siteData?.building_photos && siteData.building_photos.length > 0 ? (
        <View style={[styles.containerBox, { marginTop: 12 }]}>
          <View style={styles.containerHeader}>
            <MaterialIcons name="photo-library" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.containerTitle}>
              Building Photos ({siteData.building_photos.length})
            </Text>
          </View>
          <View style={styles.photosGridContainer}>
            {siteData.building_photos.map((photo) => (
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
      ) : null}
    </View>
  );

  // ─── Step Indicator ───────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3, 4, 5, 6].map((step, index) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text
              style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}
            >
              {step + 1}
            </Text>
          </View>
          {index < 6 ? (
            <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />
          ) : null}
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
    'Additional Details',
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
          <TouchableOpacity onPress={onClose} style={styles.modalBackButton}>
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
          keyboardShouldPersistTaps="never"
        >
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.navigationButtons}>
          {currentStep > 0 ? (
            <TouchableOpacity
              style={[styles.navButton, { flex: currentStep < 6 ? 1 : 0 }]}
              onPress={() => setCurrentStep((s) => s - 1)}
            >
              <Ionicons name="arrow-back" size={18} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : null}
          {currentStep < 6 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary, { flex: 1 }]}
              onPress={() => setCurrentStep((s) => s + 1)}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { backgroundColor: WHATSAPP_COLORS.primary, paddingTop:0 },
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
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
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  stepDescription: { fontSize: 14, color: WHATSAPP_COLORS.textSecondary },

  scrollContainer: { flex: 1 },
  scrollContentContainer: { paddingBottom: 20 },
  stepContent: { padding: 16 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: WHATSAPP_COLORS.textSecondary },

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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: WHATSAPP_COLORS.primary,
  },
  siteAvatarText: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  siteHeaderSection: { flex: 1, justifyContent: 'center' },
  siteNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  locationContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
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
    gap: 10,
  },
  statusBadgeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  typeText: { fontSize: 12, fontWeight: '600' },

  actionButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
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
  infoItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 6,
  },
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

  microMarketBox: {
    backgroundColor: WHATSAPP_COLORS.info + '10',
    borderColor: WHATSAPP_COLORS.info + '40',
  },
  metroInlineBox: {
    backgroundColor: WHATSAPP_COLORS.primary + '08',
    borderColor: WHATSAPP_COLORS.primary + '30',
  },
  metroInlineCity: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    backgroundColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },

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
  navButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: WHATSAPP_COLORS.white,
    marginLeft: 8,
  },
});

export default SiteDetailedInfo;