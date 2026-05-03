/**
 * createSite.tsx  (updated)
 *
 * Changes from previous version:
 *  1. 2-Wheeler slots & charges: now accept free text (e.g., "Free", "Complimentary")
 *     in addition to numbers. Numeric keyboard restriction removed.
 *  2. Micro Market: grouped options with clear visual distinction between
 *     Bengaluru and Hyderabad zones. New Hyderabad options: PBD, SBD, CBD.
 *  3. Property Specifications: added "Stilt" field (next to Basements).
 *     Value is sent to the backend as `stilt`.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, Platform, KeyboardAvoidingView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../../config/config';
import { Ionicons } from '@expo/vector-icons';
import MetroStationSelector from './metroStationSelector';

// ── Draft persistence ─────────────────────────────────────────────────────────
import { useCreateSiteDraft } from './useCreateSiteDraft';
import { SiteDraftData } from './siteDraftManager';

const { width: screenWidth } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

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
  backgroundSecondary: '#F5F5F5',
  error: '#EF4444',
};

const FLOOR_CONDITION_OPTIONS = [
  { label: 'Bareshell', value: 'bareshell' },
  { label: 'Warmshell', value: 'warmshell' },
  { label: 'Extended Warmshell', value: 'extended_warmshell' },
  { label: 'Fully Furnished', value: 'fully_furnished' },
  { label: 'Semi Furnished', value: 'semi_furnished' },
  { label: 'Custom', value: 'custom' },
];

const BUILDING_STATUS_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'Leased Out', value: 'leased_out' },
  { label: 'Readily Available', value: 'readily_available' },
  { label: 'Ready to Move In', value: 'ready_to_move_in' },
  { label: 'Ready for Fitouts', value: 'ready_for_fitouts' },
  { label: 'Custom', value: 'custom' },
];

/**
 * Micro Market options — grouped by city.
 * isHeader items are non-selectable section dividers rendered with distinct styling.
 */
const MICRO_MARKET_OPTIONS: Array<{ label: string; value: string; isHeader?: boolean }> = [
  // ── Bengaluru ───────────────────────────────────────────────────────────────
  { label: '🟢  Bengaluru', value: '__header_blr', isHeader: true },
  { label: 'CBD', value: 'CBD' },
  { label: 'North', value: 'North' },
  { label: 'South', value: 'South' },
  { label: 'East', value: 'East' },
  { label: 'West', value: 'West' },
  { label: 'ORR', value: 'ORR' },
  { label: 'Electronic City / Hosur Road', value: 'Electronic City/Hosur Road' },
  { label: 'HSR', value: 'HSR' },
  // ── Hyderabad ───────────────────────────────────────────────────────────────
  { label: '🔵  Hyderabad', value: '__header_hyd', isHeader: true },
  { label: 'PBD — Peripheral Business District', value: 'HYD_PBD' },
  { label: 'SBD — Secondary Business District', value: 'HYD_SBD' },
  { label: 'CBD — Central Business District', value: 'HYD_CBD' },
];

/**
 * Returns the display label for a given micro_market value.
 * Falls back to the raw value if not found in options.
 */
const getMicroMarketLabel = (value: string): string =>
  MICRO_MARKET_OPTIONS.find((o) => !o.isHeader && o.value === value)?.label ?? value;

/** Initial / empty state for the main form object. */
const INITIAL_NEW_SITE = {
  building_name: '',
  location_link: '',
  location: '',
  landmark: '',
  micro_market: '',
  total_floors: '',
  number_of_basements: '',
  stilt: '',                    // ← NEW
  floor_condition: 'bareshell',
  area_per_floor: '',
  floor_wise_area: '',
  total_area: '',
  availble_floors: '',
  car_parking_charges: '',
  car_parking_ratio_left: '',
  car_parking_ratio_right: '',
  car_parking_slots: '',
  building_status: 'available',
  rent: '',
  cam: '',
  cam_deposit: '',
  oc: false,
  rental_escalation: '',
  security_deposit: '',
  two_wheeler_slots: '',        // free text
  two_wheeler_charges: '',      // free text
  efficiency: '',
  notice_period: '',
  lease_term: '',
  lock_in_period: '',
  will_developer_do_fitouts: false,
  contact_person_name: '',
  contact_person_designation: '',
  contact_person_number: '',
  contact_person_email: '',
  power: '',
  power_backup: '',
  number_of_cabins: '',
  number_of_workstations: '',
  size_of_workstation: '',
  server_room: '',
  training_room: '',
  pantry: '',
  electrical_ups_room: '',
  cafeteria: '',
  gym: '',
  discussion_room: '',
  meeting_room: '',
  remarks: '',
  building_owner_name: '',
  building_owner_contact: '',
  managed_property: false,
  conventional_property: true,
  for_sale_property: false,
  business_hours_of_operation: '',
  premises_access: '',
  total_seats: '',
  rent_per_seat: '',
  seats_available: '',
  number_of_units: '',
  number_of_seats_per_unit: '',
  latitude: '',
  longitude: '',
  scout_id: '',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetroStation { id: number; name: string; city: string; }
interface OtherAmenity { id: string; key: string; value: string; }

interface CreateSiteProps {
  token: string | null;
  onBack: () => void;
  onSiteCreated: () => void;
  theme: any;
}

// ─── DraftBanner ─────────────────────────────────────────────────────────────

interface DraftBannerProps {
  expiresInMs: number;
  onRestore: () => void;
  onDiscard: () => void;
}

const DraftBanner: React.FC<DraftBannerProps> = ({ expiresInMs, onRestore, onDiscard }) => {
  const minutesLeft = Math.ceil(expiresInMs / 60_000);
  const label = minutesLeft >= 60
    ? 'less than 1 hour'
    : `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`;

  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.iconRow}>
        <Ionicons name="document-text" size={18} color={WHATSAPP_COLORS.warning} />
        <Text style={bannerStyles.title}>Unsaved draft found</Text>
      </View>
      <Text style={bannerStyles.subtitle}>Expires in {label}. Continue where you left off?</Text>
      <View style={bannerStyles.actions}>
        <TouchableOpacity style={bannerStyles.discardButton} onPress={onDiscard}>
          <Text style={bannerStyles.discardText}>Start Fresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={bannerStyles.restoreButton} onPress={onRestore}>
          <Ionicons name="refresh" size={14} color={WHATSAPP_COLORS.white} />
          <Text style={bannerStyles.restoreText}>Continue Draft</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  subtitle: { fontSize: 12, color: '#78350F', marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  discardButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  discardText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  restoreButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: WHATSAPP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreText: { fontSize: 12, fontWeight: '700', color: WHATSAPP_COLORS.white },
});

// ─── SavingIndicator ─────────────────────────────────────────────────────────

const SavingIndicator: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <View style={savingStyles.chip}>
      <ActivityIndicator size="small" color={WHATSAPP_COLORS.primaryLight} />
      <Text style={savingStyles.text}>Saving…</Text>
    </View>
  );
};

const savingStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  text: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
});

// ─── CreateSite ───────────────────────────────────────────────────────────────

const CreateSite: React.FC<CreateSiteProps> = ({ token, onBack, onSiteCreated, theme }) => {
  // ── Core form state ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [creatingSite, setCreatingSite] = useState(false);

  // Dropdown visibility
  const [showBuildingStatusDropdown, setShowBuildingStatusDropdown] = useState(false);
  const [showFloorConditionDropdown, setShowFloorConditionDropdown] = useState(false);
  const [showMicroMarketDropdown, setShowMicroMarketDropdown] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);

  // Chip-list fields
  const [floorWiseAreaEntries, setFloorWiseAreaEntries] = useState<string[]>([]);
  const [currentFloorInput, setCurrentFloorInput] = useState('');
  const [totalAreaEntries, setTotalAreaEntries] = useState<string[]>([]);
  const [currentTotalAreaInput, setCurrentTotalAreaInput] = useState('');
  const [numberOfUnitsEntries, setNumberOfUnitsEntries] = useState<string[]>([]);
  const [currentNumberOfUnitsInput, setCurrentNumberOfUnitsInput] = useState('');
  const [seatsPerUnitEntries, setSeatsPerUnitEntries] = useState<string[]>([]);
  const [currentSeatsPerUnitInput, setCurrentSeatsPerUnitInput] = useState('');

  // Chip-list fields for Rent and Area Per Floor
  const [rentEntries, setRentEntries] = useState<string[]>([]);
  const [currentRentInput, setCurrentRentInput] = useState('');
  const [areaPerFloorEntries, setAreaPerFloorEntries] = useState<string[]>([]);
  const [currentAreaPerFloorInput, setCurrentAreaPerFloorInput] = useState('');

  // Site type & metro
  const [siteType, setSiteType] = useState<'managed' | 'conventional' | 'for_sale' | null>(null);
  const [selectedMetroStation, setSelectedMetroStation] = useState<MetroStation | null>(null);
  const [customMetroStation, setCustomMetroStation] = useState('');
  const [distanceFromMetro, setDistanceFromMetro] = useState('');
  const [showMetroSelector, setShowMetroSelector] = useState(false);

  // Photos & amenities
  const [buildingPhotos, setBuildingPhotos] = useState<Array<{ id: number; uri: string; type: string }>>([]);
  const [otherAmenities, setOtherAmenities] = useState<OtherAmenity[]>([]);

  // Custom dropdown values
  const [customFloorCondition, setCustomFloorCondition] = useState('');
  const [customBuildingStatus, setCustomBuildingStatus] = useState('');

  // Rental escalation
  const [rentalEscalationPercentage, setRentalEscalationPercentage] = useState('');
  const [rentalEscalationValue, setRentalEscalationValue] = useState('');
  const [rentalEscalationPeriod, setRentalEscalationPeriod] = useState<'year' | 'month'>('year');

  const [newSite, setNewSite] = useState({ ...INITIAL_NEW_SITE });

  const scrollViewRef = useRef<ScrollView>(null);

  // ── Draft persistence ─────────────────────────────────────────────────────────

  const currentDraftData: SiteDraftData = useMemo(() => ({
    siteType,
    newSite,
    floorWiseAreaEntries,
    totalAreaEntries,
    numberOfUnitsEntries,
    seatsPerUnitEntries,
    rentEntries,
    areaPerFloorEntries,
    customFloorCondition,
    customBuildingStatus,
    rentalEscalationPercentage,
    rentalEscalationValue,
    rentalEscalationPeriod,
    selectedMetroStation,
    distanceFromMetro,
    customMetroStation,
    otherAmenities,
    currentStep,
  }), [
    siteType, newSite,
    floorWiseAreaEntries, totalAreaEntries, numberOfUnitsEntries, seatsPerUnitEntries,
    rentEntries, areaPerFloorEntries,
    customFloorCondition, customBuildingStatus,
    rentalEscalationPercentage, rentalEscalationValue, rentalEscalationPeriod,
    selectedMetroStation, distanceFromMetro, customMetroStation,
    otherAmenities, currentStep,
  ]);

  const {
    isSaving,
    draftDetected,
    draftExpiresInMs,
    restoreDraft,
    discardDraft,
    onSiteCreated: clearDraftOnSuccess,
    saveNow,
  } = useCreateSiteDraft(currentDraftData, { debounceMs: 500 });

  const hydrateFromDraft = useCallback((draft: SiteDraftData) => {
    if (draft.siteType !== undefined) setSiteType(draft.siteType);
    if (draft.newSite) setNewSite({ ...INITIAL_NEW_SITE, ...draft.newSite });
    if (draft.floorWiseAreaEntries) setFloorWiseAreaEntries(draft.floorWiseAreaEntries);
    if (draft.totalAreaEntries) setTotalAreaEntries(draft.totalAreaEntries);
    if (draft.numberOfUnitsEntries) setNumberOfUnitsEntries(draft.numberOfUnitsEntries);
    if (draft.seatsPerUnitEntries) setSeatsPerUnitEntries(draft.seatsPerUnitEntries);
    if (draft.rentEntries) setRentEntries(draft.rentEntries);
    if (draft.areaPerFloorEntries) setAreaPerFloorEntries(draft.areaPerFloorEntries);
    if (draft.customFloorCondition !== undefined) setCustomFloorCondition(draft.customFloorCondition);
    if (draft.customBuildingStatus !== undefined) setCustomBuildingStatus(draft.customBuildingStatus);
    if (draft.rentalEscalationPercentage !== undefined) setRentalEscalationPercentage(draft.rentalEscalationPercentage);
    if (draft.rentalEscalationValue !== undefined) setRentalEscalationValue(draft.rentalEscalationValue);
    if (draft.rentalEscalationPeriod !== undefined) setRentalEscalationPeriod(draft.rentalEscalationPeriod);
    if (draft.selectedMetroStation !== undefined) setSelectedMetroStation(draft.selectedMetroStation);
    if (draft.distanceFromMetro !== undefined) setDistanceFromMetro(draft.distanceFromMetro);
    if (draft.customMetroStation !== undefined) setCustomMetroStation(draft.customMetroStation);
    if (draft.otherAmenities) setOtherAmenities(draft.otherAmenities);
    if (typeof draft.currentStep === 'number') setCurrentStep(draft.currentStep);
  }, []);

  const handleRestoreDraft = useCallback(() => {
    const draft = restoreDraft();
    if (draft) hydrateFromDraft(draft);
  }, [restoreDraft, hydrateFromDraft]);

  const handleBack = useCallback(async () => {
    await saveNow(currentDraftData);
    onBack();
  }, [saveNow, currentDraftData, onBack]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formatCurrency = (value: string): string => {
    const numStr = value.replace(/[^0-9]/g, '');
    if (!numStr) return '';
    return parseInt(numStr).toLocaleString('en-IN');
  };

  const parseCurrency = (formatted: string): string => formatted.replace(/,/g, '');

  // ─── Chip handlers ────────────────────────────────────────────────────────────

  const addFloorWiseArea = () => {
    if (currentFloorInput.trim()) {
      setFloorWiseAreaEntries((p) => [...p, currentFloorInput.trim()]);
      setCurrentFloorInput('');
    }
  };

  const addTotalAreaEntry = () => {
    if (currentTotalAreaInput.trim()) {
      setTotalAreaEntries((p) => [...p, currentTotalAreaInput.trim()]);
      setCurrentTotalAreaInput('');
    }
  };

  const addNumberOfUnitsEntry = () => {
    if (currentNumberOfUnitsInput.trim()) {
      setNumberOfUnitsEntries((p) => [...p, currentNumberOfUnitsInput.trim()]);
      setCurrentNumberOfUnitsInput('');
    }
  };

  const addSeatsPerUnitEntry = () => {
    if (currentSeatsPerUnitInput.trim()) {
      setSeatsPerUnitEntries((p) => [...p, currentSeatsPerUnitInput.trim()]);
      setCurrentSeatsPerUnitInput('');
    }
  };

  const addRentEntry = () => {
    if (currentRentInput.trim()) {
      setRentEntries((p) => [...p, currentRentInput.trim()]);
      setCurrentRentInput('');
    }
  };

  const addAreaPerFloorEntry = () => {
    if (currentAreaPerFloorInput.trim()) {
      setAreaPerFloorEntries((p) => [...p, currentAreaPerFloorInput.trim()]);
      setCurrentAreaPerFloorInput('');
    }
  };

  // ─── Other amenities ──────────────────────────────────────────────────────────

  const addOtherAmenity = () =>
    setOtherAmenities((p) => [...p, { id: Date.now().toString(), key: '', value: '' }]);

  const updateOtherAmenity = (id: string, field: 'key' | 'value', text: string) =>
    setOtherAmenities((p) => p.map((a) => (a.id === id ? { ...a, [field]: text } : a)));

  const removeOtherAmenity = (id: string) =>
    setOtherAmenities((p) => p.filter((a) => a.id !== id));

  // ─── Navigation ───────────────────────────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    if (step === 0 && !siteType) {
      Alert.alert('Required Field', 'Please select site type');
      return false;
    }
    if (step === 1 && (!newSite.building_name || !newSite.location)) {
      Alert.alert('Required Fields', 'Please fill in Building Name and Location');
      return false;
    }
    return true;
  };

  const handleNextStep = () => { if (validateStep(currentStep)) setCurrentStep((s) => s + 1); };
  const handlePrevStep = () => { if (currentStep > 0) setCurrentStep((s) => s - 1); };

  // ─── Photos ───────────────────────────────────────────────────────────────────

  const pickImageFromCamera = async () => {
    setShowImageSourceModal(false);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const { status: ns } = await ImagePicker.requestCameraPermissionsAsync();
        if (ns !== 'granted') { Alert.alert('Permission Denied', 'Camera permission required.'); return; }
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setBuildingPhotos((p) => [...p, { id: Date.now(), uri: a.uri, type: a.type || 'image/jpeg' }]);
      }
    } catch { Alert.alert('Error', 'Failed to capture image'); }
  };

  const pickImageFromGallery = async () => {
    setShowImageSourceModal(false);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const { status: ns } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (ns !== 'granted') { Alert.alert('Permission Denied', 'Gallery permission required.'); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, allowsEditing: false, quality: 0.8 });
      if (!result.canceled && result.assets?.length) {
        const newPhotos = result.assets.map((a, i) => ({ id: Date.now() + i, uri: a.uri, type: a.type || 'image/jpeg' }));
        setBuildingPhotos((p) => [...p, ...newPhotos]);
      }
    } catch { Alert.alert('Error', 'Failed to pick images'); }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const handleCreateSite = async () => {
    if (!validateStep(currentStep)) return;
    if (!token) { Alert.alert('Error', 'Token not found. Please login again.'); return; }

    setCreatingSite(true);
    try {
      const siteData: any = {
        token,
        building_name: newSite.building_name,
        managed_property: siteType === 'managed',
        conventional_property: siteType === 'conventional',
        for_sale_property: siteType === 'for_sale',
      };

      // Metro station
      if (selectedMetroStation?.id) {
        siteData.nearest_metro_station = selectedMetroStation.id;
      } else if (customMetroStation) {
        try {
          const addRes = await fetch(`${BACKEND_URL}/core/addMetroStations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, stations: { 'Custom': [customMetroStation] } }),
          });
          if (addRes.ok) {
            const searchRes = await fetch(`${BACKEND_URL}/core/getMetroStations?query=${encodeURIComponent(customMetroStation)}`);
            const sd = await searchRes.json();
            if (sd.message === 'Success' && sd.data?.length > 0) {
              const st = sd.data.find((s: MetroStation) => s.name === customMetroStation);
              if (st) siteData.nearest_metro_station = st.id;
            }
          }
        } catch (e) { console.error('Metro station error:', e); }
      }

      siteData.floor_condition = newSite.floor_condition === 'custom' && customFloorCondition
        ? customFloorCondition : newSite.floor_condition;
      siteData.building_status = newSite.building_status === 'custom' && customBuildingStatus
        ? customBuildingStatus : newSite.building_status;

      if (rentalEscalationPercentage && rentalEscalationValue) {
        siteData.rental_escalation = `${rentalEscalationPercentage}% / ${rentalEscalationValue} / ${rentalEscalationPeriod}`;
      }

      if (newSite.location) siteData.location = newSite.location;
      if (newSite.location_link) siteData.location_link = newSite.location_link;
      if (newSite.landmark) siteData.landmark = newSite.landmark;
      if (newSite.micro_market) siteData.micro_market = newSite.micro_market;
      if (newSite.total_floors) siteData.total_floors = newSite.total_floors;
      if (newSite.number_of_basements) siteData.number_of_basements = newSite.number_of_basements;
      if (newSite.stilt) siteData.stilt = newSite.stilt;          // ← NEW
      if (distanceFromMetro) siteData.distance_from_metro_station = distanceFromMetro;

      if (areaPerFloorEntries.length > 0) {
        siteData.area_per_floor = areaPerFloorEntries.join('\n');
      } else if (newSite.area_per_floor) {
        siteData.area_per_floor = parseCurrency(newSite.area_per_floor);
      }

      if (floorWiseAreaEntries.length > 0) siteData.floor_wise_area = floorWiseAreaEntries.join('\n');
      else if (newSite.floor_wise_area) siteData.floor_wise_area = newSite.floor_wise_area;

      if (totalAreaEntries.length > 0) siteData.total_area = totalAreaEntries.join('\n');
      else if (newSite.total_area) siteData.total_area = newSite.total_area;

      if (newSite.availble_floors) siteData.availble_floors = newSite.availble_floors;

      if (siteType === 'conventional' || siteType === 'for_sale') {
        if (rentEntries.length > 0) {
          siteData.rent = rentEntries.join('\n');
        } else if (newSite.rent) {
          siteData.rent = parseCurrency(newSite.rent);
        }
      } else {
        if (newSite.rent_per_seat) siteData.rent_per_seat = parseCurrency(newSite.rent_per_seat);
        if (newSite.total_seats) siteData.total_seats = parseCurrency(newSite.total_seats);
        if (newSite.seats_available) siteData.seats_available = parseCurrency(newSite.seats_available);
        if (newSite.business_hours_of_operation) siteData.business_hours_of_operation = newSite.business_hours_of_operation;
        if (newSite.premises_access) siteData.premises_access = newSite.premises_access;

        if (numberOfUnitsEntries.length > 0) siteData.number_of_units = numberOfUnitsEntries.join('\n');
        else if (newSite.number_of_units) siteData.number_of_units = newSite.number_of_units;

        if (seatsPerUnitEntries.length > 0) siteData.number_of_seats_per_unit = seatsPerUnitEntries.join('\n');
        else if (newSite.number_of_seats_per_unit) siteData.number_of_seats_per_unit = newSite.number_of_seats_per_unit;
      }

      if (newSite.contact_person_name) siteData.contact_person_name = newSite.contact_person_name;
      if (newSite.contact_person_number) siteData.contact_person_number = newSite.contact_person_number;
      if (newSite.contact_person_email) siteData.contact_person_email = newSite.contact_person_email;
      if (newSite.contact_person_designation) siteData.contact_person_designation = newSite.contact_person_designation;
      if (newSite.building_owner_name) siteData.building_owner_name = newSite.building_owner_name;
      if (newSite.building_owner_contact) siteData.building_owner_contact = newSite.building_owner_contact;

      if (newSite.car_parking_charges) siteData.car_parking_charges = parseCurrency(newSite.car_parking_charges);
      if (newSite.car_parking_slots) siteData.car_parking_slots = newSite.car_parking_slots;

      // ── 2-Wheeler: now free text — send as-is without numeric coercion ────────
      if (newSite.two_wheeler_slots) siteData.two_wheeler_slots = newSite.two_wheeler_slots;
      if (newSite.two_wheeler_charges) siteData.two_wheeler_charges = newSite.two_wheeler_charges;

      if (newSite.car_parking_ratio_left && newSite.car_parking_ratio_right) {
        siteData.car_parking_ratio = `${newSite.car_parking_ratio_left}:${newSite.car_parking_ratio_right}`;
      }

      if (newSite.cam) siteData.cam = newSite.cam;
      if (newSite.cam_deposit) siteData.cam_deposit = newSite.cam_deposit;
      if (newSite.security_deposit) siteData.security_deposit = newSite.security_deposit;
      siteData.oc = newSite.oc ? 'True' : 'False';
      siteData.will_developer_do_fitouts = newSite.will_developer_do_fitouts ? 'True' : 'False';
      if (newSite.efficiency) siteData.efficiency = newSite.efficiency;
      if (newSite.notice_period) siteData.notice_period = newSite.notice_period;
      if (newSite.lease_term) siteData.lease_term = newSite.lease_term;
      if (newSite.lock_in_period) siteData.lock_in_period = newSite.lock_in_period;
      if (newSite.power) siteData.power = newSite.power;
      if (newSite.power_backup) siteData.power_backup = newSite.power_backup;
      if (newSite.number_of_cabins) siteData.number_of_cabins = newSite.number_of_cabins;
      if (newSite.number_of_workstations) siteData.number_of_workstations = newSite.number_of_workstations;
      if (newSite.size_of_workstation) siteData.size_of_workstation = newSite.size_of_workstation;
      if (newSite.server_room) siteData.server_room = newSite.server_room;
      if (newSite.training_room) siteData.training_room = newSite.training_room;
      if (newSite.pantry) siteData.pantry = newSite.pantry;
      if (newSite.electrical_ups_room) siteData.electrical_ups_room = newSite.electrical_ups_room;
      if (newSite.cafeteria) siteData.cafeteria = newSite.cafeteria;
      if (newSite.gym) siteData.gym = newSite.gym;
      if (newSite.discussion_room) siteData.discussion_room = newSite.discussion_room;
      if (newSite.meeting_room) siteData.meeting_room = newSite.meeting_room;

      otherAmenities.forEach((amenity, index) => {
        if (amenity.key && amenity.value) {
          siteData[`other_amenity_${index + 1}_key`] = amenity.key;
          siteData[`other_amenity_${index + 1}_value`] = amenity.value;
        }
      });

      if (newSite.remarks) siteData.remarks = newSite.remarks;

      const formData = new FormData();
      Object.entries(siteData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });

      buildingPhotos.forEach((photo, idx) => {
        formData.append('photos', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${idx + 1}_${photo.id}.jpg`,
        } as any);
      });

      const response = await fetch(`${BACKEND_URL}/manager/createSite`, { method: 'POST', body: formData });
      const responseText = await response.text();
      let responseData: any;
      try { responseData = JSON.parse(responseText); } catch { throw new Error('Invalid server response'); }
      if (!response.ok) throw new Error(responseData.message || `HTTP ${response.status}`);
      if (responseData.message !== 'Site created successfully') throw new Error(responseData.message || 'Failed to create site');

      await clearDraftOnSuccess();

      Alert.alert('Success', 'Site created successfully!');
      onSiteCreated();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create site');
    } finally {
      setCreatingSite(false);
    }
  };

  // ─── Step indicator ───────────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3, 4, 5, 6].map((step, index) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>{step + 1}</Text>
          </View>
          {index < 6 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  // ─── Reusable chip input ──────────────────────────────────────────────────────

  const renderChipInput = ({
    label, hint, placeholder, currentValue, onChangeText, onSubmit, onKeyPress, entries, onRemove,
  }: {
    label: string; hint?: string; placeholder: string; currentValue: string;
    onChangeText: (v: string) => void; onSubmit: () => void; onKeyPress: (e: any) => void;
    entries: string[]; onRemove: (index: number) => void;
  }) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TextInput
        style={styles.input} value={currentValue} onChangeText={onChangeText}
        onKeyPress={onKeyPress} placeholder={placeholder}
        placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        onSubmitEditing={onSubmit} returnKeyType="done"
      />
      {entries.length > 0 && (
        <View style={styles.floorEntriesContainer}>
          {entries.map((entry, index) => (
            <View key={index} style={styles.floorEntryBox}>
              <Text style={styles.floorEntryText}>{entry}</Text>
              <TouchableOpacity onPress={() => onRemove(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // ─── Step renders ─────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Select Site Type</Text>
      <Text style={styles.stepDescription}>Choose the type of office space</Text>
      <View style={styles.siteTypeContainer}>
        {([
          { type: 'conventional', icon: 'business', title: 'Conventional Office', desc: 'Traditional office space with area-based pricing' },
          { type: 'managed', icon: 'people', title: 'Managed Office', desc: 'Flexible workspace with seat-based pricing and amenities' },
          { type: 'for_sale', icon: 'cash', title: 'For Sale Office', desc: 'Office property available for purchase' },
        ] as const).map(({ type, icon, title, desc }) => (
          <TouchableOpacity
            key={type}
            style={[styles.siteTypeCard, siteType === type && styles.siteTypeCardSelected]}
            onPress={() => setSiteType(type)}
          >
            <Ionicons name={icon} size={32} color={siteType === type ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.primary} />
            <Text style={styles.siteTypeTitle}>{title}</Text>
            <Text style={styles.siteTypeDescription}>{desc}</Text>
            {siteType === type && (
              <View style={styles.siteTypeCheckmark}>
                <Ionicons name="checkmark" size={16} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Basic Information</Text>
      <Text style={styles.stepDescription}>Essential site details</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Building Name *</Text>
        <TextInput style={styles.input} value={newSite.building_name}
          onChangeText={(v) => setNewSite({ ...newSite, building_name: v })}
          placeholder="Enter building name" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Location *</Text>
        <TextInput style={styles.input} value={newSite.location}
          onChangeText={(v) => setNewSite({ ...newSite, location: v })}
          placeholder="Enter location" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Micro Market</Text>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowMicroMarketDropdown(true)}>
          <Text style={[styles.dropdownButtonText, !newSite.micro_market && { color: WHATSAPP_COLORS.textTertiary }]}>
            {newSite.micro_market ? getMicroMarketLabel(newSite.micro_market) : 'Select micro market...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Landmark</Text>
        <TextInput style={styles.input} value={newSite.landmark}
          onChangeText={(v) => setNewSite({ ...newSite, landmark: v })}
          placeholder="Nearby landmark" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Location Link</Text>
        <TextInput style={styles.input} value={newSite.location_link}
          onChangeText={(v) => setNewSite({ ...newSite, location_link: v })}
          placeholder="Google Maps link" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Nearest Metro Station <Text style={styles.optionalText}>(Optional)</Text></Text>
        <TouchableOpacity style={styles.metroSelectButton} onPress={() => setShowMetroSelector(true)}>
          <View style={styles.metroSelectContent}>
            <Ionicons name="train" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={[styles.metroSelectText, !(selectedMetroStation || customMetroStation) && styles.metroSelectPlaceholder]}>
              {selectedMetroStation ? selectedMetroStation.name : customMetroStation || 'Select metro station...'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      {(selectedMetroStation || customMetroStation) && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            Distance from Metro Station <Text style={styles.optionalText}>(Optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={distanceFromMetro}
            onChangeText={setDistanceFromMetro}
            placeholder="e.g., 500m, 1.2 km, 5 min walk"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {siteType === 'conventional' || siteType === 'for_sale' ? '📐 Property Specifications' : '💺 Seat & Unit Details'}
      </Text>
      <Text style={styles.stepDescription}>
        {siteType === 'conventional' || siteType === 'for_sale' ? 'Area and floor details' : 'Seat and unit configuration'}
      </Text>

      {/* ── Total Floors | Basements | Stilt (3-column row) ── */}
      <View style={styles.row}>
        <View style={styles.thirdWidth}>
          <Text style={styles.formLabel}>Total Floors</Text>
          <TextInput style={styles.input} value={newSite.total_floors}
            onChangeText={(v) => setNewSite({ ...newSite, total_floors: v })}
            placeholder="10" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.thirdWidth}>
          <Text style={styles.formLabel}>Basements</Text>
          <TextInput style={styles.input} value={newSite.number_of_basements}
            onChangeText={(v) => setNewSite({ ...newSite, number_of_basements: v })}
            placeholder="2" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        {/* ── NEW: Stilt field ── */}
        <View style={styles.thirdWidth}>
          <Text style={styles.formLabel}>Stilt</Text>
          <TextInput style={styles.input} value={newSite.stilt}
            onChangeText={(v) => setNewSite({ ...newSite, stilt: v })}
            placeholder="e.g., 1" keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Floor Condition</Text>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowFloorConditionDropdown(true)}>
          <Text style={styles.dropdownButtonText}>
            {newSite.floor_condition === 'custom' ? customFloorCondition || 'Custom' : beautifyName(newSite.floor_condition)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      {newSite.floor_condition === 'custom' && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Custom Floor Condition</Text>
          <TextInput style={styles.input} value={customFloorCondition} onChangeText={setCustomFloorCondition}
            placeholder="Enter custom floor condition" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      )}
      {(siteType === 'conventional' || siteType === 'for_sale') ? (
        <>
          {renderChipInput({
            label: 'Total Available Area',
            hint: 'Enter available area per entry (supports text and numbers)',
            placeholder: 'e.g., 50,000 sq ft  (press Enter to add)',
            currentValue: currentTotalAreaInput,
            onChangeText: setCurrentTotalAreaInput,
            onSubmit: addTotalAreaEntry,
            onKeyPress: (e) => { if (e.nativeEvent.key === 'Enter') { e.preventDefault(); addTotalAreaEntry(); } },
            entries: totalAreaEntries,
            onRemove: (i) => setTotalAreaEntries((p) => p.filter((_, idx) => idx !== i)),
          })}

          {renderChipInput({
            label: 'Area Per Floor — Typical Floor Plate (sq ft)',
            hint: 'The standard floor plate area of the entire building',
            placeholder: 'e.g., 10,000 sq ft  (press Enter to add)',
            currentValue: currentAreaPerFloorInput,
            onChangeText: setCurrentAreaPerFloorInput,
            onSubmit: addAreaPerFloorEntry,
            onKeyPress: (e) => { if (e.nativeEvent.key === 'Enter') { e.preventDefault(); addAreaPerFloorEntry(); } },
            entries: areaPerFloorEntries,
            onRemove: (i) => setAreaPerFloorEntries((p) => p.filter((_, idx) => idx !== i)),
          })}

          {renderChipInput({
            label: 'Floor-wise Availability',
            hint: 'How much area is available on each specific floor',
            placeholder: 'e.g., G- 10000 sq/ft  (press Enter to add)',
            currentValue: currentFloorInput,
            onChangeText: setCurrentFloorInput,
            onSubmit: addFloorWiseArea,
            onKeyPress: (e) => { if (e.nativeEvent.key === 'Enter') { e.preventDefault(); addFloorWiseArea(); } },
            entries: floorWiseAreaEntries,
            onRemove: (i) => setFloorWiseAreaEntries((p) => p.filter((_, idx) => idx !== i)),
          })}
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Total Seats</Text>
              <TextInput style={styles.input} value={newSite.total_seats}
                onChangeText={(v) => setNewSite({ ...newSite, total_seats: formatCurrency(v) })}
                placeholder="500" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Seats Available</Text>
              <TextInput style={styles.input} value={newSite.seats_available}
                onChangeText={(v) => setNewSite({ ...newSite, seats_available: formatCurrency(v) })}
                placeholder="200" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
            </View>
          </View>
          {renderChipInput({
            label: 'Number of Units',
            hint: 'Enter units per floor (supports text and numbers)',
            placeholder: 'e.g., Ground Floor – 10 units  (press Enter to add)',
            currentValue: currentNumberOfUnitsInput,
            onChangeText: setCurrentNumberOfUnitsInput,
            onSubmit: addNumberOfUnitsEntry,
            onKeyPress: (e) => { if (e.nativeEvent.key === 'Enter') { e.preventDefault(); addNumberOfUnitsEntry(); } },
            entries: numberOfUnitsEntries,
            onRemove: (i) => setNumberOfUnitsEntries((p) => p.filter((_, idx) => idx !== i)),
          })}
          {renderChipInput({
            label: 'Seats Per Unit',
            hint: 'Enter seats per unit per floor (supports text and numbers)',
            placeholder: 'e.g., 1st Floor – 8 seats  (press Enter to add)',
            currentValue: currentSeatsPerUnitInput,
            onChangeText: setCurrentSeatsPerUnitInput,
            onSubmit: addSeatsPerUnitEntry,
            onKeyPress: (e) => { if (e.nativeEvent.key === 'Enter') { e.preventDefault(); addSeatsPerUnitEntry(); } },
            entries: seatsPerUnitEntries,
            onRemove: (i) => setSeatsPerUnitEntries((p) => p.filter((_, idx) => idx !== i)),
          })}
        </>
      )}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Efficiency (%)</Text>
        <TextInput style={styles.input} value={newSite.efficiency}
          onChangeText={(v) => setNewSite({ ...newSite, efficiency: v })}
          placeholder="85" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📊 Commercial Details</Text>
      <Text style={styles.stepDescription}>
        {siteType === 'conventional' || siteType === 'for_sale' ? 'Commercial terms and pricing' : 'Seat pricing and commercial terms'}
      </Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Building Status</Text>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowBuildingStatusDropdown(true)}>
          <Text style={styles.dropdownButtonText}>
            {newSite.building_status === 'custom' ? customBuildingStatus || 'Custom' : beautifyName(newSite.building_status)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      {newSite.building_status === 'custom' && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Custom Building Status</Text>
          <TextInput style={styles.input} value={customBuildingStatus} onChangeText={setCustomBuildingStatus}
            placeholder="Enter custom building status" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      )}
      {siteType === 'conventional' || siteType === 'for_sale' ? (
        <>
          {renderChipInput({
            label: 'Monthly Rent Per sqft (₹)',
            hint: 'Enter rent per entry — supports text and numbers',
            placeholder: 'e.g., 120/sqft  (press Enter to add)',
            currentValue: currentRentInput,
            onChangeText: setCurrentRentInput,
            onSubmit: addRentEntry,
            onKeyPress: (e) => { if (e.nativeEvent.key === 'Enter') { e.preventDefault(); addRentEntry(); } },
            entries: rentEntries,
            onRemove: (i) => setRentEntries((p) => p.filter((_, idx) => idx !== i)),
          })}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>CAM</Text>
            <TextInput style={styles.input} value={newSite.cam}
              onChangeText={(v) => setNewSite({ ...newSite, cam: v })}
              placeholder="e.g., 50,000 or Included" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Rent Per Seat (₹)</Text>
            <TextInput style={styles.input} value={newSite.rent_per_seat}
              onChangeText={(v) => setNewSite({ ...newSite, rent_per_seat: formatCurrency(v) })}
              placeholder="8,000" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>CAM</Text>
            <TextInput style={styles.input} value={newSite.cam}
              onChangeText={(v) => setNewSite({ ...newSite, cam: v })}
              placeholder="e.g., 50,000 or Included" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Business Hours of Operation</Text>
            <TextInput style={styles.input} value={newSite.business_hours_of_operation}
              onChangeText={(v) => setNewSite({ ...newSite, business_hours_of_operation: v })}
              placeholder="9:00 AM - 6:00 PM, Monday to Friday" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Premises Access</Text>
            <TextInput style={styles.input} value={newSite.premises_access}
              onChangeText={(v) => setNewSite({ ...newSite, premises_access: v })}
              placeholder="24/7 access with key card" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          </View>
        </>
      )}
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>CAM Deposit (Months)</Text>
          <TextInput style={styles.input} value={newSite.cam_deposit}
            onChangeText={(v) => setNewSite({ ...newSite, cam_deposit: v })}
            placeholder="3" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Security Deposit (Months)</Text>
          <TextInput style={styles.input} value={newSite.security_deposit}
            onChangeText={(v) => setNewSite({ ...newSite, security_deposit: v })}
            placeholder="3" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Lease Term</Text>
          <TextInput style={styles.input} value={newSite.lease_term}
            onChangeText={(v) => setNewSite({ ...newSite, lease_term: v })}
            placeholder="9 years" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Lock-in Period</Text>
          <TextInput style={styles.input} value={newSite.lock_in_period}
            onChangeText={(v) => setNewSite({ ...newSite, lock_in_period: v })}
            placeholder="3 years" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Rental Escalation</Text>
        <View style={styles.rentalEscalationContainer}>
          <TextInput style={[styles.input, styles.rentalEscalationInput]} value={rentalEscalationPercentage}
            onChangeText={setRentalEscalationPercentage} placeholder="5%" keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          <Text style={styles.rentalEscalationSeparator}>/</Text>
          <TextInput style={[styles.input, styles.rentalEscalationInput]} value={rentalEscalationValue}
            onChangeText={setRentalEscalationValue} placeholder="2" keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          <Text style={styles.rentalEscalationSeparator}>/</Text>
          <View style={styles.rentalEscalationPeriodContainer}>
            {(['year', 'month'] as const).map((p) => (
              <TouchableOpacity key={p}
                style={[styles.periodButton, rentalEscalationPeriod === p && styles.periodButtonActive]}
                onPress={() => setRentalEscalationPeriod(p)}>
                <Text style={[styles.periodButtonText, rentalEscalationPeriod === p && styles.periodButtonTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.helperText}>Format: Percentage / Frequency / Period</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Notice Period</Text>
          <TextInput style={styles.input} value={newSite.notice_period}
            onChangeText={(v) => setNewSite({ ...newSite, notice_period: v })}
            placeholder="6 months" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.checkboxContainer}>
        <TouchableOpacity style={styles.checkbox} onPress={() => setNewSite({ ...newSite, oc: !newSite.oc })}>
          <View style={[styles.checkboxBox, newSite.oc && styles.checkboxBoxChecked]}>
            {newSite.oc && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkboxLabel}>OC Available</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.checkboxContainer}>
        <TouchableOpacity style={styles.checkbox}
          onPress={() => setNewSite({ ...newSite, will_developer_do_fitouts: !newSite.will_developer_do_fitouts })}>
          <View style={[styles.checkboxBox, newSite.will_developer_do_fitouts && styles.checkboxBoxChecked]}>
            {newSite.will_developer_do_fitouts && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkboxLabel}>Developer Will Do Fitouts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🚗 Parking & Utilities</Text>
      <Text style={styles.stepDescription}>Parking facilities and power details</Text>
      <Text style={styles.subSectionTitle}>Car Parking</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Car Parking Ratio</Text>
        <View style={styles.ratioContainer}>
          <TextInput style={[styles.input, styles.ratioInput]} value={newSite.car_parking_ratio_left}
            onChangeText={(v) => setNewSite({ ...newSite, car_parking_ratio_left: v })}
            placeholder="1" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
          <Text style={styles.ratioSeparator}>:</Text>
          <TextInput style={[styles.input, styles.ratioInput]} value={newSite.car_parking_ratio_right}
            onChangeText={(v) => setNewSite({ ...newSite, car_parking_ratio_right: v })}
            placeholder="1000" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Car Slots</Text>
          <TextInput style={styles.input} value={newSite.car_parking_slots}
            onChangeText={(v) => setNewSite({ ...newSite, car_parking_slots: v })}
            placeholder="11" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Car Charges (₹)</Text>
          <TextInput style={styles.input} value={newSite.car_parking_charges}
            onChangeText={(v) => setNewSite({ ...newSite, car_parking_charges: formatCurrency(v) })}
            placeholder="5,500" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>

      {/* ── Two-Wheeler: free-text fields (supports numbers AND text like "Free") ── */}
      <Text style={styles.subSectionTitle}>Two-Wheeler Parking</Text>
      <Text style={styles.fieldHint}>Tip: you can enter a number or descriptive text (e.g. "Free", "On request")</Text>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>2-Wheeler Slots</Text>
          <TextInput
            style={styles.input}
            value={newSite.two_wheeler_slots}
            onChangeText={(v) => setNewSite({ ...newSite, two_wheeler_slots: v })}
            placeholder="e.g., 100 or Unlimited"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>2-Wheeler Charges</Text>
          <TextInput
            style={styles.input}
            value={newSite.two_wheeler_charges}
            onChangeText={(v) => setNewSite({ ...newSite, two_wheeler_charges: v })}
            placeholder="e.g., ₹500 or Free"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <Text style={styles.subSectionTitle}>Power</Text>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Power</Text>
          <TextInput style={styles.input} value={newSite.power}
            onChangeText={(v) => setNewSite({ ...newSite, power: v })}
            placeholder="0.8 kva/100 sft" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Power Backup</Text>
          <TextInput style={styles.input} value={newSite.power_backup}
            onChangeText={(v) => setNewSite({ ...newSite, power_backup: v })}
            placeholder="100%" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Workspace & Amenities</Text>
      <Text style={styles.stepDescription}>Office configuration and facilities</Text>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Cabins</Text>
          <TextInput style={styles.input} value={newSite.number_of_cabins}
            onChangeText={(v) => setNewSite({ ...newSite, number_of_cabins: v })}
            placeholder="20" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Workstations</Text>
          <TextInput style={styles.input} value={newSite.number_of_workstations}
            onChangeText={(v) => setNewSite({ ...newSite, number_of_workstations: v })}
            placeholder="200" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Workstation Size</Text>
        <TextInput style={styles.input} value={newSite.size_of_workstation}
          onChangeText={(v) => setNewSite({ ...newSite, size_of_workstation: v })}
          placeholder="60 sq ft" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Meeting Rooms</Text>
          <TextInput style={styles.input} value={newSite.meeting_room}
            onChangeText={(v) => setNewSite({ ...newSite, meeting_room: v })}
            placeholder="3" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Discussion Rooms</Text>
          <TextInput style={styles.input} value={newSite.discussion_room}
            onChangeText={(v) => setNewSite({ ...newSite, discussion_room: v })}
            placeholder="2" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Server Room</Text>
          <TextInput style={styles.input} value={newSite.server_room}
            onChangeText={(v) => setNewSite({ ...newSite, server_room: v })}
            placeholder="1" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Training Room</Text>
          <TextInput style={styles.input} value={newSite.training_room}
            onChangeText={(v) => setNewSite({ ...newSite, training_room: v })}
            placeholder="2" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Pantry</Text>
          <TextInput style={styles.input} value={newSite.pantry}
            onChangeText={(v) => setNewSite({ ...newSite, pantry: v })}
            placeholder="1" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Cafeteria</Text>
          <TextInput style={styles.input} value={newSite.cafeteria}
            onChangeText={(v) => setNewSite({ ...newSite, cafeteria: v })}
            placeholder="1" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>UPS Room</Text>
          <TextInput style={styles.input} value={newSite.electrical_ups_room}
            onChangeText={(v) => setNewSite({ ...newSite, electrical_ups_room: v })}
            placeholder="1" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Gym</Text>
          <TextInput style={styles.input} value={newSite.gym}
            onChangeText={(v) => setNewSite({ ...newSite, gym: v })}
            placeholder="1" keyboardType="numeric" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <Text style={styles.subSectionTitle}>Other Amenities</Text>
      <Text style={styles.stepDescription}>Add custom amenities not listed above</Text>
      {otherAmenities.map((amenity) => (
        <View key={amenity.id} style={styles.otherAmenityContainer}>
          <View style={styles.otherAmenityRow}>
            <View style={styles.otherAmenityInputContainer}>
              <Text style={styles.formLabel}>Amenity Name</Text>
              <TextInput style={styles.input} value={amenity.key}
                onChangeText={(t) => updateOtherAmenity(amenity.id, 'key', t)}
                placeholder="e.g., Meditation Room" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
            </View>
            <View style={styles.otherAmenityInputContainer}>
              <Text style={styles.formLabel}>Details</Text>
              <TextInput style={styles.input} value={amenity.value}
                onChangeText={(t) => updateOtherAmenity(amenity.id, 'value', t)}
                placeholder="e.g., 1 unit" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
            </View>
            <TouchableOpacity style={styles.removeAmenityButton} onPress={() => removeOtherAmenity(amenity.id)}>
              <Ionicons name="close-circle" size={24} color={WHATSAPP_COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.addOtherAmenityButton} onPress={addOtherAmenity}>
        <Ionicons name="add-circle" size={20} color={WHATSAPP_COLORS.white} />
        <Text style={styles.addOtherAmenityText}>Add Other Amenity</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>👤 Contact & Photos</Text>
      <Text style={styles.stepDescription}>Contact details and property images</Text>
      <Text style={styles.subSectionTitle}>Building Owner</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Owner Name</Text>
        <TextInput style={styles.input} value={newSite.building_owner_name}
          onChangeText={(v) => setNewSite({ ...newSite, building_owner_name: v })}
          placeholder="Enter owner name" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Owner Contact</Text>
        <TextInput style={styles.input} value={newSite.building_owner_contact}
          onChangeText={(v) => setNewSite({ ...newSite, building_owner_contact: v })}
          placeholder="+91 9876543210" keyboardType="phone-pad" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <Text style={styles.subSectionTitle}>Contact Person</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Name</Text>
        <TextInput style={styles.input} value={newSite.contact_person_name}
          onChangeText={(v) => setNewSite({ ...newSite, contact_person_name: v })}
          placeholder="Enter name" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Phone</Text>
          <TextInput style={styles.input} value={newSite.contact_person_number}
            onChangeText={(v) => setNewSite({ ...newSite, contact_person_number: v })}
            placeholder="+91 9876543210" keyboardType="phone-pad" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Designation</Text>
          <TextInput style={styles.input} value={newSite.contact_person_designation}
            onChangeText={(v) => setNewSite({ ...newSite, contact_person_designation: v })}
            placeholder="Manager" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Email</Text>
        <TextInput style={styles.input} value={newSite.contact_person_email}
          onChangeText={(v) => setNewSite({ ...newSite, contact_person_email: v })}
          placeholder="contact@example.com" keyboardType="email-address" placeholderTextColor={WHATSAPP_COLORS.textTertiary} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Additional Notes</Text>
        <TextInput style={[styles.input, styles.textArea]} value={newSite.remarks}
          onChangeText={(v) => setNewSite({ ...newSite, remarks: v })}
          placeholder="Any additional observations..." placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          multiline textAlignVertical="top" />
      </View>
      <Text style={styles.subSectionTitle}>Property Photos</Text>
      <Text style={styles.stepDescription}>📸 Photos are not saved to draft (re-upload required after restore)</Text>
      <TouchableOpacity style={styles.addPhotoButton} onPress={() => setShowImageSourceModal(true)}>
        <Ionicons name="camera" size={20} color="#FFF" />
        <Text style={styles.addPhotoButtonText}>Upload Photo</Text>
      </TouchableOpacity>
      {buildingPhotos.length > 0 && (
        <View style={styles.photoPreviewContainer}>
          <Text style={styles.photoCountText}>{buildingPhotos.length} photo(s) uploaded</Text>
          <View style={styles.photoGrid}>
            {buildingPhotos.map((photo, idx) => (
              <View key={photo.id} style={styles.photoGridItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoGridImage} />
                <TouchableOpacity style={styles.photoRemoveButton}
                  onPress={() => setBuildingPhotos(buildingPhotos.filter((p) => p.id !== photo.id))}>
                  <Ionicons name="close-circle" size={24} color={WHATSAPP_COLORS.danger} />
                </TouchableOpacity>
                <View style={styles.photoIndexBadge}>
                  <Text style={styles.photoIndexText}>{idx + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // ─── Modals ───────────────────────────────────────────────────────────────────

  /**
   * Generic dropdown modal.
   * Supports grouped options via `isHeader` flag — headers are non-interactive
   * and rendered with a distinct city-header style.
   */
  const DropdownModal = ({ visible, options, onSelect, onClose, title }: {
    visible: boolean;
    options: Array<{ label: string; value: string; isHeader?: boolean }>;
    onSelect: (value: string) => void;
    onClose: () => void;
    title: string;
  }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <ScrollView style={styles.dropdownScroll}>
            {options.map((option) =>
              option.isHeader ? (
                // City section header — not tappable
                <View key={option.value} style={styles.dropdownSectionHeader}>
                  <Text style={styles.dropdownSectionHeaderText}>{option.label}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(option.value); onClose(); }}
                >
                  <Text style={styles.dropdownOptionText}>{option.label}</Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ImageSourceModal = () => (
    <Modal visible={showImageSourceModal} transparent animationType="fade"
      onRequestClose={() => setShowImageSourceModal(false)}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowImageSourceModal(false)}>
        <View style={styles.imageSourceContainer}>
          <Text style={styles.dropdownTitle}>Select Image Source</Text>
          <TouchableOpacity style={styles.imageSourceOption} onPress={pickImageFromCamera}>
            <Ionicons name="camera" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.imageSourceText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageSourceOption} onPress={pickImageFromGallery}>
            <Ionicons name="image" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.imageSourceText}>Choose from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowImageSourceModal(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ─── Metro selector (full-screen sub-view) ────────────────────────────────────

  if (showMetroSelector) {
    return (
      <MetroStationSelector
        token={token}
        selectedStation={selectedMetroStation}
        customStation={customMetroStation}
        onSelect={(station, custom) => { setSelectedMetroStation(station); setCustomMetroStation(custom); }}
        onBack={() => setShowMetroSelector(false)}
      />
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Site</Text>
        <SavingIndicator visible={isSaving} />
      </View>

      <View style={styles.contentContainer}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
        >
          {renderStepIndicator()}

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {draftDetected && (
              <DraftBanner
                expiresInMs={draftExpiresInMs}
                onRestore={handleRestoreDraft}
                onDiscard={discardDraft}
              />
            )}

            <View style={styles.formContainer}>
              {currentStep === 0 && renderStep0()}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
              {currentStep === 6 && renderStep6()}
            </View>
          </ScrollView>

          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.navButton} onPress={handlePrevStep}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons name="arrow-back" size={18} color="#075E54" />
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            {currentStep < 6 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary, currentStep === 0 && styles.navButtonFull]}
                onPress={handleNextStep} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Text style={styles.navButtonTextPrimary}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary, styles.navButtonFull, creatingSite && styles.buttonDisabled]}
                onPress={handleCreateSite} disabled={creatingSite}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                {creatingSite ? (
                  <View style={styles.buttonLoading}>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={[styles.navButtonTextPrimary, { marginLeft: 8 }]}>Creating...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={[styles.navButtonTextPrimary, { marginLeft: 0 }]}>Create Site</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>

      <DropdownModal visible={showBuildingStatusDropdown} options={BUILDING_STATUS_OPTIONS}
        onSelect={(v) => setNewSite({ ...newSite, building_status: v })}
        onClose={() => setShowBuildingStatusDropdown(false)} title="Select Building Status" />

      <DropdownModal visible={showFloorConditionDropdown} options={FLOOR_CONDITION_OPTIONS}
        onSelect={(v) => setNewSite({ ...newSite, floor_condition: v })}
        onClose={() => setShowFloorConditionDropdown(false)} title="Select Floor Condition" />

      <DropdownModal visible={showMicroMarketDropdown} options={MICRO_MARKET_OPTIONS}
        onSelect={(v) => setNewSite({ ...newSite, micro_market: v })}
        onClose={() => setShowMicroMarketDropdown(false)} title="Select Micro Market" />

      <ImageSourceModal />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#075E54' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#075E54' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  contentContainer: { flex: 1, backgroundColor: '#F5F5F5', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  keyboardAvoidingView: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { paddingBottom: 16 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, backgroundColor: '#F5F5F5' },
  stepIndicatorItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#075E54' },
  stepNumber: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLine: { width: 20, height: 2, backgroundColor: '#E5E7EB' },
  stepLineActive: { backgroundColor: '#075E54' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  stepDescription: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  fieldHint: { fontSize: 11, color: '#6B7280', marginBottom: 6, fontStyle: 'italic' },
  subSectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginTop: 16, marginBottom: 12 },
  formContainer: { padding: 16, flexGrow: 1 },
  formGroup: { marginBottom: 16, width: '100%' },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  optionalText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  input: { paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF', fontSize: 14, color: '#1F2937' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfWidth: { flex: 1 },
  // ── NEW: thirdWidth for 3-column rows (e.g., Total Floors | Basements | Stilt) ──
  thirdWidth: { flex: 1 },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  dropdownButtonText: { fontSize: 14, color: '#1F2937' },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16, width: '100%' },
  dropdownContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, width: '90%' },
  dropdownTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  dropdownScroll: { maxHeight: 300 },
  dropdownOption: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dropdownOptionText: { fontSize: 14, color: '#1F2937' },
  // ── NEW: city group header styles inside dropdown ──
  dropdownSectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
    marginTop: 4,
  },
  dropdownSectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  imageSourceContainer: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  imageSourceOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F5F5F5', marginBottom: 12, elevation: 2 },
  imageSourceText: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 12 },
  cancelButton: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  checkboxContainer: { marginBottom: 16 },
  checkbox: { flexDirection: 'row', alignItems: 'center' },
  checkboxBox: { width: 24, height: 24, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 4, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  checkboxBoxChecked: { backgroundColor: '#075E54', borderColor: '#075E54' },
  checkboxLabel: { fontSize: 14, color: '#1F2937', flex: 1 },
  ratioContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratioInput: { flex: 1, marginBottom: 0 },
  ratioSeparator: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  rentalEscalationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rentalEscalationInput: { flex: 1, textAlign: 'center' },
  rentalEscalationSeparator: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  rentalEscalationPeriodContainer: { flexDirection: 'row', gap: 4, flex: 2 },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6 },
  periodButtonActive: { backgroundColor: '#075E54', borderColor: '#075E54' },
  periodButtonText: { fontSize: 12, color: '#6B7280' },
  periodButtonTextActive: { color: '#FFFFFF', fontWeight: '600' },
  helperText: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  floorEntriesContainer: { marginTop: 12, gap: 8 },
  floorEntryBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  floorEntryText: { fontSize: 14, color: '#1F2937', flex: 1 },
  siteTypeContainer: { gap: 12 },
  siteTypeCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center' },
  siteTypeCardSelected: { borderColor: '#075E54', backgroundColor: 'rgba(7,94,84,0.3)' },
  siteTypeTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginTop: 8, marginBottom: 4 },
  siteTypeDescription: { fontSize: 12, color: '#6B7280', lineHeight: 16, textAlign: 'center' },
  siteTypeCheckmark: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center' },
  metroSelectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF' },
  metroSelectContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  metroSelectText: { fontSize: 14, color: '#1F2937' },
  metroSelectPlaceholder: { color: '#9CA3AF' },
  otherAmenityContainer: { marginBottom: 16 },
  otherAmenityRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  otherAmenityInputContainer: { flex: 1 },
  removeAmenityButton: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  addOtherAmenityButton: { backgroundColor: '#25D366', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: 4 },
  addOtherAmenityText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  addPhotoButton: { backgroundColor: '#075E54', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: 4 },
  addPhotoButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  photoPreviewContainer: { marginTop: 8 },
  photoCountText: { fontSize: 12, color: '#075E54', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoGridItem: { width: (screenWidth - 32 - 32 - 12) / 2, height: 120, borderRadius: 8, overflow: 'hidden', position: 'relative', elevation: 2 },
  photoGridImage: { width: '100%', height: '100%', backgroundColor: '#F5F5F5' },
  photoRemoveButton: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  photoIndexBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#075E54', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  photoIndexText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  navigationButtons: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#F5F5F5', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  navButton: { flex: 1, flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#075E54', gap: 4 },
  navButtonPrimary: { backgroundColor: '#075E54' },
  navButtonFull: { flex: 1 },
  navButtonText: { fontSize: 14, fontWeight: '700', color: '#075E54' },
  navButtonTextPrimary: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonLoading: { flexDirection: 'row', alignItems: 'center' },
});

export default CreateSite;