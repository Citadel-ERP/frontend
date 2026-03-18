import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../../config/config';
import { Ionicons } from '@expo/vector-icons';
import MetroStationSelector from './metroStationSelector';

const { width: screenWidth } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditSiteProps {
  site: any;
  token: string | null;
  onBack: () => void;
  onSiteUpdated: () => void;
  theme: any;
}

interface MetroStation {
  id: number;
  name: string;
  city: string;
}

interface OtherAmenity {
  id: string;
  key: string;
  value: string;
}

interface Photo {
  id: number;
  uri: string;
  type: string;
  description?: string;
  isExisting?: boolean;
  existingId?: number;
}

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

const MICRO_MARKET_OPTIONS = [
  { label: 'CBD', value: 'CBD' },
  { label: 'North', value: 'North' },
  { label: 'South', value: 'South' },
  { label: 'East', value: 'East' },
  { label: 'West', value: 'West' },
  { label: 'ORR', value: 'ORR' },
  { label: 'Electronic City / Hosur Road', value: 'Electronic City/Hosur Road' },
  { label: 'HSR', value: 'HSR' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const EditSite: React.FC<EditSiteProps> = ({ site, token, onBack, onSiteUpdated, theme }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [updatingSite, setUpdatingSite] = useState(false);

  // Dropdown visibility
  const [showBuildingStatusDropdown, setShowBuildingStatusDropdown] = useState(false);
  const [showFloorConditionDropdown, setShowFloorConditionDropdown] = useState(false);
  const [showMicroMarketDropdown, setShowMicroMarketDropdown] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showMetroSelector, setShowMetroSelector] = useState(false);

  // Site type & metro
  const [siteType, setSiteType] = useState<'managed' | 'conventional' | 'for_sale' | null>(null);
  const [selectedMetroStation, setSelectedMetroStation] = useState<MetroStation | null>(null);
  const [customMetroStation, setCustomMetroStation] = useState('');

  // Photos & amenities
  const [buildingPhotos, setBuildingPhotos] = useState<Photo[]>([]);
  const [otherAmenities, setOtherAmenities] = useState<OtherAmenity[]>([]);

  // Custom dropdown values
  const [customFloorCondition, setCustomFloorCondition] = useState('');
  const [customBuildingStatus, setCustomBuildingStatus] = useState('');

  // ── CHANGE 1: Total Available Area chips ──────────────────────────────────
  const [totalAreaEntries, setTotalAreaEntries] = useState<string[]>([]);
  const [currentTotalAreaInput, setCurrentTotalAreaInput] = useState('');

  // Floor-wise area chips
  const [floorWiseAreaEntries, setFloorWiseAreaEntries] = useState<string[]>([]);
  const [currentFloorInput, setCurrentFloorInput] = useState('');

  // ── CHANGE 3: Managed office unit/seat chips ──────────────────────────────
  const [numberOfUnitsEntries, setNumberOfUnitsEntries] = useState<string[]>([]);
  const [currentNumberOfUnitsInput, setCurrentNumberOfUnitsInput] = useState('');
  const [seatsPerUnitEntries, setSeatsPerUnitEntries] = useState<string[]>([]);
  const [currentSeatsPerUnitInput, setCurrentSeatsPerUnitInput] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const [initialized, setInitialized] = useState(false);

  // Rental escalation
  const [rentalEscalationPercentage, setRentalEscalationPercentage] = useState('');
  const [rentalEscalationValue, setRentalEscalationValue] = useState('');
  const [rentalEscalationPeriod, setRentalEscalationPeriod] = useState<'year' | 'month'>('year');

  const [editedSite, setEditedSite] = useState({
    building_name: '',
    location_link: '',
    location: '',
    landmark: '',
    micro_market: '',
    total_floors: '',
    number_of_basements: '',
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
    cam: '',          // CHANGE 4: cam is now free text — no formatCurrency
    cam_deposit: '',
    oc: false,
    rental_escalation: '',
    security_deposit: '',
    two_wheeler_slots: '',
    two_wheeler_charges: '',
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
  });

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (site && !initialized) {
      initializeSiteData();
      setInitialized(true);
    }
  }, [site, initialized]);

  const initializeSiteData = () => {
    // Site type
    if (site.managed_property) setSiteType('managed');
    else if (site.conventional_property) setSiteType('conventional');
    else if (site.for_sale_property) setSiteType('for_sale');

    // Metro station
    if (site.nearest_metro_station) {
      if (typeof site.nearest_metro_station === 'object') {
        setSelectedMetroStation(site.nearest_metro_station);
      } else {
        setCustomMetroStation(site.nearest_metro_station);
      }
    }

    // Rental escalation
    if (site.rental_escalation) {
      const parts = site.rental_escalation.split('/');
      if (parts.length === 3) {
        setRentalEscalationPercentage(parts[0].trim().replace('%', ''));
        setRentalEscalationValue(parts[1].trim());
        setRentalEscalationPeriod(
          parts[2].trim().toLowerCase().includes('month') ? 'month' : 'year',
        );
      }
    }

    // Car parking ratio
    if (site.car_parking_ratio) {
      const parts = site.car_parking_ratio.split(':');
      if (parts.length === 2) {
        setEditedSite((prev) => ({
          ...prev,
          car_parking_ratio_left: parts[0].trim(),
          car_parking_ratio_right: parts[1].trim(),
        }));
      }
    }

    // Custom floor condition / building status
    if (site.floor_condition && !FLOOR_CONDITION_OPTIONS.some((o) => o.value === site.floor_condition)) {
      setEditedSite((prev) => ({ ...prev, floor_condition: 'custom' }));
      setCustomFloorCondition(site.floor_condition);
    }
    if (site.building_status && !BUILDING_STATUS_OPTIONS.some((o) => o.value === site.building_status)) {
      setEditedSite((prev) => ({ ...prev, building_status: 'custom' }));
      setCustomBuildingStatus(site.building_status);
    }

    // ── CHANGE 1: Initialise total_area chip entries ────────────────────────
    if (site.total_area !== undefined && site.total_area !== null) {
      const raw = String(site.total_area).trim();
      if (raw) {
        const entries = raw.split('\n').map((e: string) => e.trim()).filter(Boolean);
        setTotalAreaEntries(entries.length > 0 ? entries : [raw]);
      }
    }

    // Floor-wise area → chips
    if (site.floor_wise_area) {
      const entries = site.floor_wise_area.split('\n').filter((e: string) => e.trim());
      setFloorWiseAreaEntries(entries);
    }

    // ── CHANGE 3: Initialise units / seats-per-unit chip entries ───────────
    if (site.number_of_units !== undefined && site.number_of_units !== null) {
      const raw = String(site.number_of_units).trim();
      if (raw) {
        const entries = raw.split('\n').map((e: string) => e.trim()).filter(Boolean);
        setNumberOfUnitsEntries(entries.length > 0 ? entries : [raw]);
      }
    }
    if (site.number_of_seats_per_unit !== undefined && site.number_of_seats_per_unit !== null) {
      const raw = String(site.number_of_seats_per_unit).trim();
      if (raw) {
        const entries = raw.split('\n').map((e: string) => e.trim()).filter(Boolean);
        setSeatsPerUnitEntries(entries.length > 0 ? entries : [raw]);
      }
    }

    // Map all remaining scalar fields
    const mappedSite = { ...editedSite };
    Object.keys(editedSite).forEach((key) => {
      // Skip fields now managed by chip state
      if (['total_area', 'number_of_units', 'number_of_seats_per_unit'].includes(key)) return;

      if (site[key] !== undefined && site[key] !== null) {
        if (typeof site[key] === 'boolean') {
          (mappedSite as any)[key] = site[key];
        } else if (
          key.includes('_area') ||
          key.includes('_charges') ||
          key === 'rent' ||
          key === 'rent_per_seat'
          // NOTE: 'cam' intentionally excluded — CHANGE 4
        ) {
          (mappedSite as any)[key] = formatCurrency(String(site[key]));
        } else if (key === 'cam') {
          // CHANGE 4: cam stored as-is (allows alphabets)
          (mappedSite as any)[key] = String(site[key]);
        } else {
          (mappedSite as any)[key] = String(site[key]);
        }
      }
    });
    setEditedSite(mappedSite);

    // Existing photos
    if (site.building_photos && Array.isArray(site.building_photos)) {
      const existingPhotos: Photo[] = site.building_photos.map((photo: any, index: number) => ({
        id: Date.now() + index,
        uri: photo.file_url || photo.uri,
        type: 'image/jpeg',
        description: photo.description || '',
        isExisting: true,
        existingId: photo.id,
      }));
      setBuildingPhotos(existingPhotos);
    }

    // Other amenities from meta
    if (site.meta && typeof site.meta === 'object') {
      const loadedAmenities: OtherAmenity[] = [];
      Object.keys(site.meta).forEach((key) => {
        const keyMatch = key.match(/^other_amenity_(\d+)_key$/);
        if (keyMatch) {
          const index = keyMatch[1];
          const valueKey = `other_amenity_${index}_value`;
          if (site.meta[valueKey]) {
            loadedAmenities.push({
              id: `existing_${index}_${Date.now()}`,
              key: site.meta[key],
              value: site.meta[valueKey],
            });
          }
        }
      });
      loadedAmenities.sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]));
      setOtherAmenities(loadedAmenities);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatCurrency = (value: string): string => {
    const numStr = value.replace(/[^0-9]/g, '');
    if (!numStr) return '';
    return parseInt(numStr).toLocaleString('en-IN');
  };

  const parseCurrency = (formatted: string): string => formatted.replace(/,/g, '');

  // ─── Generic chip helpers ──────────────────────────────────────────────────

  /**
   * Shared factory for chip-list add/remove handlers.
   * Returns [addFn, removeFn] that operate on the given state setters.
   */
  const makeChipHandlers = (
    currentInput: string,
    setCurrentInput: React.Dispatch<React.SetStateAction<string>>,
    setEntries: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const add = () => {
      const trimmed = currentInput.trim();
      if (trimmed) {
        setEntries((prev) => [...prev, trimmed]);
        setCurrentInput('');
      }
    };
    const remove = (index: number) => {
      setEntries((prev) => prev.filter((_, i) => i !== index));
    };
    return { add, remove };
  };

  // Floor-wise area
  const floorHandlers = makeChipHandlers(
    currentFloorInput, setCurrentFloorInput, setFloorWiseAreaEntries,
  );

  // CHANGE 1 – Total area
  const totalAreaHandlers = makeChipHandlers(
    currentTotalAreaInput, setCurrentTotalAreaInput, setTotalAreaEntries,
  );

  // CHANGE 3 – Number of units
  const unitsHandlers = makeChipHandlers(
    currentNumberOfUnitsInput, setCurrentNumberOfUnitsInput, setNumberOfUnitsEntries,
  );

  // CHANGE 3 – Seats per unit
  const seatsPerUnitHandlers = makeChipHandlers(
    currentSeatsPerUnitInput, setCurrentSeatsPerUnitInput, setSeatsPerUnitEntries,
  );

  // ─── Other amenities ───────────────────────────────────────────────────────

  const addOtherAmenity = () => {
    setOtherAmenities((prev) => [...prev, { id: Date.now().toString(), key: '', value: '' }]);
  };

  const updateOtherAmenity = (id: string, field: 'key' | 'value', text: string) => {
    setOtherAmenities((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: text } : a)));
  };

  const removeOtherAmenity = (id: string) => {
    setOtherAmenities((prev) => prev.filter((a) => a.id !== id));
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    if (step === 0 && !siteType) {
      Alert.alert('Required Field', 'Please select site type');
      return false;
    }
    if (step === 1 && (!editedSite.building_name || !editedSite.location)) {
      Alert.alert('Required Fields', 'Please fill in Building Name and Location');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
      // Scroll to top of form on step change
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // ─── Photos ────────────────────────────────────────────────────────────────

  const pickImageFromCamera = async () => {
    setShowImageSourceModal(false);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const { status: ns } = await ImagePicker.requestCameraPermissionsAsync();
        if (ns !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission required.');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setBuildingPhotos((prev) => [
          ...prev,
          { id: Date.now(), uri: a.uri, type: a.type || 'image/jpeg' },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const pickImageFromGallery = async () => {
    setShowImageSourceModal(false);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const { status: ns } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (ns !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission required.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,   // ← added
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const newPhotos: Photo[] = result.assets.map((a, i) => ({
          id: Date.now() + i,
          uri: a.uri,
          type: a.type || 'image/jpeg',
        }));
        setBuildingPhotos((prev) => [...prev, ...newPhotos]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleUpdateSite = async () => {
    if (!validateStep(currentStep)) return;
    if (!token) {
      Alert.alert('Error', 'Token not found. Please login again.');
      return;
    }

    setUpdatingSite(true);
    try {
      const siteData: any = {
        token,
        site_id: site.id,
        building_name: editedSite.building_name,
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
            body: JSON.stringify({
              token,
              stations: { Custom: [customMetroStation] },
            }),
          });
          if (addRes.ok) {
            const searchRes = await fetch(
              `${BACKEND_URL}/core/getMetroStations?query=${encodeURIComponent(customMetroStation)}`,
            );
            const sd = await searchRes.json();
            if (sd.message === 'Success' && sd.data?.length > 0) {
              const st = sd.data.find((s: MetroStation) => s.name === customMetroStation);
              if (st) siteData.nearest_metro_station = st.id;
            }
          }
        } catch (e) {
          console.error('Metro station error:', e);
        }
      }

      // Floor condition
      siteData.floor_condition =
        editedSite.floor_condition === 'custom' && customFloorCondition
          ? customFloorCondition
          : editedSite.floor_condition;

      // Building status
      siteData.building_status =
        editedSite.building_status === 'custom' && customBuildingStatus
          ? customBuildingStatus
          : editedSite.building_status;

      // Rental escalation
      if (rentalEscalationPercentage && rentalEscalationValue) {
        siteData.rental_escalation = `${rentalEscalationPercentage}% / ${rentalEscalationValue} / ${rentalEscalationPeriod}`;
      }

      // Basic info
      if (editedSite.location) siteData.location = editedSite.location;
      if (editedSite.location_link) siteData.location_link = editedSite.location_link;
      if (editedSite.landmark) siteData.landmark = editedSite.landmark;
      if (editedSite.micro_market) siteData.micro_market = editedSite.micro_market;

      // Property specs
      if (editedSite.total_floors) siteData.total_floors = editedSite.total_floors;
      if (editedSite.number_of_basements) siteData.number_of_basements = editedSite.number_of_basements;

      // area_per_floor = typical floor plate
      if (editedSite.area_per_floor) siteData.area_per_floor = parseCurrency(editedSite.area_per_floor);

      // floor_wise_area chips
      if (floorWiseAreaEntries.length > 0) {
        siteData.floor_wise_area = floorWiseAreaEntries.join('\n');
      } else if (editedSite.floor_wise_area) {
        siteData.floor_wise_area = editedSite.floor_wise_area;
      }

      // CHANGE 1: total_area now uses chip entries (raw text, no parseCurrency)
      if (totalAreaEntries.length > 0) {
        siteData.total_area = totalAreaEntries.join('\n');
      }

      if (editedSite.availble_floors) siteData.availble_floors = editedSite.availble_floors;

      // Financial details
      if (siteType === 'conventional' || siteType === 'for_sale') {
        if (editedSite.rent) siteData.rent = parseCurrency(editedSite.rent);
      } else {
        if (editedSite.rent_per_seat) siteData.rent_per_seat = parseCurrency(editedSite.rent_per_seat);
        if (editedSite.total_seats) siteData.total_seats = parseCurrency(editedSite.total_seats);
        if (editedSite.seats_available) siteData.seats_available = parseCurrency(editedSite.seats_available);

        // CHANGE 3: number_of_units and seats_per_unit now use chip entries
        if (numberOfUnitsEntries.length > 0) {
          siteData.number_of_units = numberOfUnitsEntries.join('\n');
        } else if (editedSite.number_of_units) {
          siteData.number_of_units = editedSite.number_of_units;
        }

        if (seatsPerUnitEntries.length > 0) {
          siteData.number_of_seats_per_unit = seatsPerUnitEntries.join('\n');
        } else if (editedSite.number_of_seats_per_unit) {
          siteData.number_of_seats_per_unit = editedSite.number_of_seats_per_unit;
        }

        if (editedSite.business_hours_of_operation)
          siteData.business_hours_of_operation = editedSite.business_hours_of_operation;
        if (editedSite.premises_access) siteData.premises_access = editedSite.premises_access;
      }

      // Contact
      if (editedSite.contact_person_name) siteData.contact_person_name = editedSite.contact_person_name;
      if (editedSite.contact_person_number) siteData.contact_person_number = editedSite.contact_person_number;
      if (editedSite.contact_person_email) siteData.contact_person_email = editedSite.contact_person_email;
      if (editedSite.contact_person_designation)
        siteData.contact_person_designation = editedSite.contact_person_designation;
      if (editedSite.building_owner_name) siteData.building_owner_name = editedSite.building_owner_name;
      if (editedSite.building_owner_contact)
        siteData.building_owner_contact = editedSite.building_owner_contact;

      // Parking
      if (editedSite.car_parking_charges)
        siteData.car_parking_charges = parseCurrency(editedSite.car_parking_charges);
      if (editedSite.car_parking_slots) siteData.car_parking_slots = editedSite.car_parking_slots;
      if (editedSite.two_wheeler_slots) siteData.two_wheeler_slots = editedSite.two_wheeler_slots;
      if (editedSite.two_wheeler_charges)
        siteData.two_wheeler_charges = parseCurrency(editedSite.two_wheeler_charges);
      if (editedSite.car_parking_ratio_left && editedSite.car_parking_ratio_right) {
        siteData.car_parking_ratio = `${editedSite.car_parking_ratio_left}:${editedSite.car_parking_ratio_right}`;
      }

      // Commercial terms
      // CHANGE 4: cam sent as raw text (supports alphabets)
      if (editedSite.cam) siteData.cam = editedSite.cam;
      if (editedSite.cam_deposit) siteData.cam_deposit = editedSite.cam_deposit;
      if (editedSite.security_deposit) siteData.security_deposit = editedSite.security_deposit;
      siteData.oc = editedSite.oc ? 'True' : 'False';
      siteData.will_developer_do_fitouts = editedSite.will_developer_do_fitouts ? 'True' : 'False';
      if (editedSite.efficiency) siteData.efficiency = editedSite.efficiency;
      if (editedSite.notice_period) siteData.notice_period = editedSite.notice_period;
      if (editedSite.lease_term) siteData.lease_term = editedSite.lease_term;
      if (editedSite.lock_in_period) siteData.lock_in_period = editedSite.lock_in_period;

      // Utilities
      if (editedSite.power) siteData.power = editedSite.power;
      if (editedSite.power_backup) siteData.power_backup = editedSite.power_backup;

      // Workspace amenities
      if (editedSite.number_of_cabins) siteData.number_of_cabins = editedSite.number_of_cabins;
      if (editedSite.number_of_workstations) siteData.number_of_workstations = editedSite.number_of_workstations;
      if (editedSite.size_of_workstation) siteData.size_of_workstation = editedSite.size_of_workstation;
      if (editedSite.server_room) siteData.server_room = editedSite.server_room;
      if (editedSite.training_room) siteData.training_room = editedSite.training_room;
      if (editedSite.pantry) siteData.pantry = editedSite.pantry;
      if (editedSite.electrical_ups_room) siteData.electrical_ups_room = editedSite.electrical_ups_room;
      if (editedSite.cafeteria) siteData.cafeteria = editedSite.cafeteria;
      if (editedSite.gym) siteData.gym = editedSite.gym;
      if (editedSite.discussion_room) siteData.discussion_room = editedSite.discussion_room;
      if (editedSite.meeting_room) siteData.meeting_room = editedSite.meeting_room;

      // Other amenities
      otherAmenities.forEach((amenity, index) => {
        if (amenity.key && amenity.value) {
          siteData[`other_amenity_${index + 1}_key`] = amenity.key;
          siteData[`other_amenity_${index + 1}_value`] = amenity.value;
        }
      });

      if (editedSite.remarks) siteData.remarks = editedSite.remarks;

      const formData = new FormData();
      Object.entries(siteData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });

      // Only new (locally picked) photos
      buildingPhotos
        .filter((p) => !p.isExisting)
        .forEach((photo, idx) => {
          formData.append('photos', {
            uri: photo.uri,
            type: 'image/jpeg',
            name: `photo_${idx + 1}_${photo.id}.jpg`,
          } as any);
        });

      const response = await fetch(`${BACKEND_URL}/manager/updateSite`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid server response');
      }
      if (!response.ok) throw new Error(responseData.message || `HTTP ${response.status}`);
      if (responseData.message !== 'Site updated successfully')
        throw new Error(responseData.message || 'Failed to update site');

      Alert.alert('Success', 'Site updated successfully!');
      onSiteUpdated();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update site');
    } finally {
      setUpdatingSite(false);
    }
  };

  // ─── Reusable chip list renderer ───────────────────────────────────────────

  const renderChipList = (
    label: string,
    hint: string,
    placeholder: string,
    currentInput: string,
    onChangeInput: (v: string) => void,
    entries: string[],
    onAdd: () => void,
    onRemove: (i: number) => void,
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <TextInput
        style={styles.input}
        value={currentInput}
        onChangeText={onChangeInput}
        placeholder={placeholder}
        placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        onSubmitEditing={onAdd}
        returnKeyType="done"
        blurOnSubmit={false}
      />
      {entries.length > 0 && (
        <View style={styles.floorEntriesContainer}>
          {entries.map((entry, index) => (
            <View key={index} style={styles.floorEntryBox}>
              <Text style={styles.floorEntryText}>{entry}</Text>
              <TouchableOpacity
                onPress={() => onRemove(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // ─── Step Indicator ────────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3, 4, 5, 6].map((step, index) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
              {step + 1}
            </Text>
          </View>
          {index < 6 && (
            <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  // ─── Step 0: Site Type ─────────────────────────────────────────────────────
  // CHANGE 2: Metro station removed from here (moved to Step 1)

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Select Site Type</Text>
      <Text style={styles.stepDescription}>Choose the type of office space</Text>

      <View style={styles.siteTypeContainer}>
        {(
          [
            {
              type: 'conventional',
              icon: 'business',
              title: 'Conventional Office',
              desc: 'Traditional office space with area-based pricing',
            },
            {
              type: 'managed',
              icon: 'people',
              title: 'Managed Office',
              desc: 'Flexible workspace with seat-based pricing and amenities',
            },
            {
              type: 'for_sale',
              icon: 'cash',
              title: 'For Sale Office',
              desc: 'Office property available for purchase',
            },
          ] as const
        ).map(({ type, icon, title, desc }) => (
          <TouchableOpacity
            key={type}
            style={[styles.siteTypeCard, siteType === type && styles.siteTypeCardSelected]}
            onPress={() => setSiteType(type)}
          >
            <Ionicons
              name={icon}
              size={32}
              color={siteType === type ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.primary}
            />
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

  // ─── Step 1: Basic Information ─────────────────────────────────────────────
  // CHANGE 2: Nearest Metro Station added here

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Basic Information</Text>
      <Text style={styles.stepDescription}>Essential site details</Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Building Name *</Text>
        <TextInput
          style={styles.input}
          value={editedSite.building_name}
          onChangeText={(v) => setEditedSite({ ...editedSite, building_name: v })}
          placeholder="Enter building name"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Location *</Text>
        <TextInput
          style={styles.input}
          value={editedSite.location}
          onChangeText={(v) => setEditedSite({ ...editedSite, location: v })}
          placeholder="Enter location"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Micro Market</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowMicroMarketDropdown(true)}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              !editedSite.micro_market && { color: WHATSAPP_COLORS.textTertiary },
            ]}
          >
            {editedSite.micro_market || 'Select micro market...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Landmark</Text>
        <TextInput
          style={styles.input}
          value={editedSite.landmark}
          onChangeText={(v) => setEditedSite({ ...editedSite, landmark: v })}
          placeholder="Nearby landmark"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Location Link</Text>
        <TextInput
          style={styles.input}
          value={editedSite.location_link}
          onChangeText={(v) => setEditedSite({ ...editedSite, location_link: v })}
          placeholder="Google Maps link"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      {/* CHANGE 2: Metro station moved here from Step 0 */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          Nearest Metro Station{' '}
          <Text style={styles.optionalText}>(Optional)</Text>
        </Text>
        <TouchableOpacity
          style={styles.metroSelectButton}
          onPress={() => setShowMetroSelector(true)}
        >
          <View style={styles.metroSelectContent}>
            <Ionicons name="train" size={20} color={WHATSAPP_COLORS.primary} />
            <Text
              style={[
                styles.metroSelectText,
                !(selectedMetroStation || customMetroStation) && styles.metroSelectPlaceholder,
              ]}
            >
              {selectedMetroStation
                ? selectedMetroStation.name
                : customMetroStation || 'Select metro station...'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Step 2: Property Specifications ──────────────────────────────────────
  // CHANGE 1: Total Area is chip-based
  // CHANGE 3: Number of Units & Seats Per Unit are chip-based for Managed

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {siteType === 'conventional' || siteType === 'for_sale'
          ? '📐 Property Specifications'
          : '💺 Seat & Unit Details'}
      </Text>
      <Text style={styles.stepDescription}>
        {siteType === 'conventional' || siteType === 'for_sale'
          ? 'Area and floor details'
          : 'Seat and unit configuration'}
      </Text>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Total Floors</Text>
          <TextInput
            style={styles.input}
            value={editedSite.total_floors}
            onChangeText={(v) => setEditedSite({ ...editedSite, total_floors: v })}
            placeholder="10"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Basements</Text>
          <TextInput
            style={styles.input}
            value={editedSite.number_of_basements}
            onChangeText={(v) => setEditedSite({ ...editedSite, number_of_basements: v })}
            placeholder="2"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Floor Condition</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowFloorConditionDropdown(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {editedSite.floor_condition === 'custom'
              ? customFloorCondition || 'Custom'
              : beautifyName(editedSite.floor_condition)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {editedSite.floor_condition === 'custom' && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Custom Floor Condition</Text>
          <TextInput
            style={styles.input}
            value={customFloorCondition}
            onChangeText={setCustomFloorCondition}
            placeholder="Enter custom floor condition"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      )}

      {siteType === 'conventional' || siteType === 'for_sale' ? (
        <>
          {/* CHANGE 1: Total Area as chip-based input */}
          {renderChipList(
            'Total Available Area',
            'Supports numbers and text. Press Enter / Done to add each entry.',
            'e.g., 50,000 sq ft or G+3 – 15,000 sq ft',
            currentTotalAreaInput,
            setCurrentTotalAreaInput,
            totalAreaEntries,
            totalAreaHandlers.add,
            totalAreaHandlers.remove,
          )}

          {/* area_per_floor = typical floor plate */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Area Per Floor — Typical Floor Plate (sq ft)</Text>
            <Text style={styles.fieldHint}>
              The standard floor plate area of the entire building
            </Text>
            <TextInput
              style={styles.input}
              value={editedSite.area_per_floor}
              onChangeText={(v) => setEditedSite({ ...editedSite, area_per_floor: formatCurrency(v) })}
              placeholder="10,000"
              keyboardType="numeric"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          {/* floor_wise_area chips */}
          {renderChipList(
            'Floor-wise Availability',
            'How much area is available on each specific floor. Press Enter / Done to add.',
            'e.g., G – 10,000 sq ft',
            currentFloorInput,
            setCurrentFloorInput,
            floorWiseAreaEntries,
            floorHandlers.add,
            floorHandlers.remove,
          )}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Available Floors</Text>
            <TextInput
              style={styles.input}
              value={editedSite.availble_floors}
              onChangeText={(v) => setEditedSite({ ...editedSite, availble_floors: v })}
              placeholder="G+1 to G+5"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Total Seats</Text>
              <TextInput
                style={styles.input}
                value={editedSite.total_seats}
                onChangeText={(v) => setEditedSite({ ...editedSite, total_seats: formatCurrency(v) })}
                placeholder="500"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Seats Available</Text>
              <TextInput
                style={styles.input}
                value={editedSite.seats_available}
                onChangeText={(v) =>
                  setEditedSite({ ...editedSite, seats_available: formatCurrency(v) })
                }
                placeholder="200"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
          </View>

          {/* CHANGE 3: Number of Units – chip-based */}
          {renderChipList(
            'Number of Units',
            'Supports text and numbers. Press Enter / Done to add each floor entry.',
            'e.g., Ground Floor – 10 units',
            currentNumberOfUnitsInput,
            setCurrentNumberOfUnitsInput,
            numberOfUnitsEntries,
            unitsHandlers.add,
            unitsHandlers.remove,
          )}

          {/* CHANGE 3: Seats Per Unit – chip-based */}
          {renderChipList(
            'Seats Per Unit',
            'Supports text and numbers. Press Enter / Done to add each entry.',
            'e.g., 1st Floor – 8 seats per unit',
            currentSeatsPerUnitInput,
            setCurrentSeatsPerUnitInput,
            seatsPerUnitEntries,
            seatsPerUnitHandlers.add,
            seatsPerUnitHandlers.remove,
          )}
        </>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Efficiency (%)</Text>
        <TextInput
          style={styles.input}
          value={editedSite.efficiency}
          onChangeText={(v) => setEditedSite({ ...editedSite, efficiency: v })}
          placeholder="85"
          keyboardType="numeric"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>
    </View>
  );

  // ─── Step 3: Commercial Details ────────────────────────────────────────────
  // CHANGE 4: CAM allows alphabets – no formatCurrency, no keyboardType="numeric"

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📊 Commercial Details</Text>
      <Text style={styles.stepDescription}>
        {siteType === 'conventional' || siteType === 'for_sale'
          ? 'Commercial terms and pricing'
          : 'Seat pricing and commercial terms'}
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Building Status</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowBuildingStatusDropdown(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {editedSite.building_status === 'custom'
              ? customBuildingStatus || 'Custom'
              : beautifyName(editedSite.building_status)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {editedSite.building_status === 'custom' && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Custom Building Status</Text>
          <TextInput
            style={styles.input}
            value={customBuildingStatus}
            onChangeText={setCustomBuildingStatus}
            placeholder="Enter custom building status"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      )}

      {siteType === 'conventional' || siteType === 'for_sale' ? (
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.formLabel}>Monthly Rent (₹)</Text>
            <TextInput
              style={styles.input}
              value={editedSite.rent}
              onChangeText={(v) => setEditedSite({ ...editedSite, rent: formatCurrency(v) })}
              placeholder="5,00,000"
              keyboardType="numeric"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>
          <View style={styles.halfWidth}>
            {/* CHANGE 4: CAM – free text, no keyboardType numeric, no formatCurrency */}
            <Text style={styles.formLabel}>CAM</Text>
            <TextInput
              style={styles.input}
              value={editedSite.cam}
              onChangeText={(v) => setEditedSite({ ...editedSite, cam: v })}
              placeholder="e.g., 50,000 or Inclusive"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Rent Per Seat (₹)</Text>
            <TextInput
              style={styles.input}
              value={editedSite.rent_per_seat}
              onChangeText={(v) =>
                setEditedSite({ ...editedSite, rent_per_seat: formatCurrency(v) })
              }
              placeholder="8,000"
              keyboardType="numeric"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>
          {/* CHANGE 4: CAM – free text */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>CAM</Text>
            <TextInput
              style={styles.input}
              value={editedSite.cam}
              onChangeText={(v) => setEditedSite({ ...editedSite, cam: v })}
              placeholder="e.g., 50,000 or Inclusive"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Business Hours of Operation</Text>
            <TextInput
              style={styles.input}
              value={editedSite.business_hours_of_operation}
              onChangeText={(v) =>
                setEditedSite({ ...editedSite, business_hours_of_operation: v })
              }
              placeholder="9:00 AM - 6:00 PM, Monday to Friday"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Premises Access</Text>
            <TextInput
              style={styles.input}
              value={editedSite.premises_access}
              onChangeText={(v) => setEditedSite({ ...editedSite, premises_access: v })}
              placeholder="24/7 access with key card"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>
        </>
      )}

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>CAM Deposit (Months)</Text>
          <TextInput
            style={styles.input}
            value={editedSite.cam_deposit}
            onChangeText={(v) => setEditedSite({ ...editedSite, cam_deposit: v })}
            placeholder="3"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Security Deposit (Months)</Text>
          <TextInput
            style={styles.input}
            value={editedSite.security_deposit}
            onChangeText={(v) => setEditedSite({ ...editedSite, security_deposit: v })}
            placeholder="3"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Lease Term</Text>
          <TextInput
            style={styles.input}
            value={editedSite.lease_term}
            onChangeText={(v) => setEditedSite({ ...editedSite, lease_term: v })}
            placeholder="9 years"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Lock-in Period</Text>
          <TextInput
            style={styles.input}
            value={editedSite.lock_in_period}
            onChangeText={(v) => setEditedSite({ ...editedSite, lock_in_period: v })}
            placeholder="3 years"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Rental Escalation</Text>
        <View style={styles.rentalEscalationContainer}>
          <TextInput
            style={[styles.input, styles.rentalEscalationInput]}
            value={rentalEscalationPercentage}
            onChangeText={setRentalEscalationPercentage}
            placeholder="5%"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
          <Text style={styles.rentalEscalationSeparator}>/</Text>
          <TextInput
            style={[styles.input, styles.rentalEscalationInput]}
            value={rentalEscalationValue}
            onChangeText={setRentalEscalationValue}
            placeholder="2"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
          <Text style={styles.rentalEscalationSeparator}>/</Text>
          <View style={styles.rentalEscalationPeriodContainer}>
            {(['year', 'month'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, rentalEscalationPeriod === p && styles.periodButtonActive]}
                onPress={() => setRentalEscalationPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    rentalEscalationPeriod === p && styles.periodButtonTextActive,
                  ]}
                >
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
          <TextInput
            style={styles.input}
            value={editedSite.notice_period}
            onChangeText={(v) => setEditedSite({ ...editedSite, notice_period: v })}
            placeholder="6 months"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setEditedSite({ ...editedSite, oc: !editedSite.oc })}
        >
          <View style={[styles.checkboxBox, editedSite.oc && styles.checkboxBoxChecked]}>
            {editedSite.oc && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkboxLabel}>OC Available</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() =>
            setEditedSite({
              ...editedSite,
              will_developer_do_fitouts: !editedSite.will_developer_do_fitouts,
            })
          }
        >
          <View
            style={[
              styles.checkboxBox,
              editedSite.will_developer_do_fitouts && styles.checkboxBoxChecked,
            ]}
          >
            {editedSite.will_developer_do_fitouts && (
              <Ionicons name="checkmark" size={14} color="#FFF" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>Developer Will Do Fitouts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Step 4: Parking & Utilities ───────────────────────────────────────────

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🚗 Parking & Utilities</Text>
      <Text style={styles.stepDescription}>Parking facilities and power details</Text>

      <Text style={styles.subSectionTitle}>Car Parking</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Car Parking Ratio</Text>
        <View style={styles.ratioContainer}>
          <TextInput
            style={[styles.input, styles.ratioInput]}
            value={editedSite.car_parking_ratio_left}
            onChangeText={(v) => setEditedSite({ ...editedSite, car_parking_ratio_left: v })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
          <Text style={styles.ratioSeparator}>:</Text>
          <TextInput
            style={[styles.input, styles.ratioInput]}
            value={editedSite.car_parking_ratio_right}
            onChangeText={(v) => setEditedSite({ ...editedSite, car_parking_ratio_right: v })}
            placeholder="1000"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Car Slots</Text>
          <TextInput
            style={styles.input}
            value={editedSite.car_parking_slots}
            onChangeText={(v) => setEditedSite({ ...editedSite, car_parking_slots: v })}
            placeholder="11"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Car Charges (₹)</Text>
          <TextInput
            style={styles.input}
            value={editedSite.car_parking_charges}
            onChangeText={(v) =>
              setEditedSite({ ...editedSite, car_parking_charges: formatCurrency(v) })
            }
            placeholder="5,500"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <Text style={styles.subSectionTitle}>Two-Wheeler Parking</Text>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>2-Wheeler Slots</Text>
          <TextInput
            style={styles.input}
            value={editedSite.two_wheeler_slots}
            onChangeText={(v) => setEditedSite({ ...editedSite, two_wheeler_slots: v })}
            placeholder="100"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>2-Wheeler Charges (₹)</Text>
          <TextInput
            style={styles.input}
            value={editedSite.two_wheeler_charges}
            onChangeText={(v) =>
              setEditedSite({ ...editedSite, two_wheeler_charges: formatCurrency(v) })
            }
            placeholder="1,000"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <Text style={styles.subSectionTitle}>Power</Text>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Power</Text>
          <TextInput
            style={styles.input}
            value={editedSite.power}
            onChangeText={(v) => setEditedSite({ ...editedSite, power: v })}
            placeholder="0.8 kva/100 sft"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Power Backup</Text>
          <TextInput
            style={styles.input}
            value={editedSite.power_backup}
            onChangeText={(v) => setEditedSite({ ...editedSite, power_backup: v })}
            placeholder="100%"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>
    </View>
  );

  // ─── Step 5: Workspace & Amenities ────────────────────────────────────────

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Workspace & Amenities</Text>
      <Text style={styles.stepDescription}>Office configuration and facilities</Text>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Cabins</Text>
          <TextInput
            style={styles.input}
            value={editedSite.number_of_cabins}
            onChangeText={(v) => setEditedSite({ ...editedSite, number_of_cabins: v })}
            placeholder="20"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Workstations</Text>
          <TextInput
            style={styles.input}
            value={editedSite.number_of_workstations}
            onChangeText={(v) => setEditedSite({ ...editedSite, number_of_workstations: v })}
            placeholder="200"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Workstation Size</Text>
        <TextInput
          style={styles.input}
          value={editedSite.size_of_workstation}
          onChangeText={(v) => setEditedSite({ ...editedSite, size_of_workstation: v })}
          placeholder="60 sq ft"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Meeting Rooms</Text>
          <TextInput
            style={styles.input}
            value={editedSite.meeting_room}
            onChangeText={(v) => setEditedSite({ ...editedSite, meeting_room: v })}
            placeholder="3"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Discussion Rooms</Text>
          <TextInput
            style={styles.input}
            value={editedSite.discussion_room}
            onChangeText={(v) => setEditedSite({ ...editedSite, discussion_room: v })}
            placeholder="2"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Server Room</Text>
          <TextInput
            style={styles.input}
            value={editedSite.server_room}
            onChangeText={(v) => setEditedSite({ ...editedSite, server_room: v })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Training Room</Text>
          <TextInput
            style={styles.input}
            value={editedSite.training_room}
            onChangeText={(v) => setEditedSite({ ...editedSite, training_room: v })}
            placeholder="2"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Pantry</Text>
          <TextInput
            style={styles.input}
            value={editedSite.pantry}
            onChangeText={(v) => setEditedSite({ ...editedSite, pantry: v })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Cafeteria</Text>
          <TextInput
            style={styles.input}
            value={editedSite.cafeteria}
            onChangeText={(v) => setEditedSite({ ...editedSite, cafeteria: v })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>UPS Room</Text>
          <TextInput
            style={styles.input}
            value={editedSite.electrical_ups_room}
            onChangeText={(v) => setEditedSite({ ...editedSite, electrical_ups_room: v })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Gym</Text>
          <TextInput
            style={styles.input}
            value={editedSite.gym}
            onChangeText={(v) => setEditedSite({ ...editedSite, gym: v })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <Text style={styles.subSectionTitle}>Other Amenities</Text>
      <Text style={styles.stepDescription}>Add custom amenities not listed above</Text>
      {otherAmenities.map((amenity) => (
        <View key={amenity.id} style={styles.otherAmenityContainer}>
          <View style={styles.otherAmenityRow}>
            <View style={styles.otherAmenityInputContainer}>
              <Text style={styles.formLabel}>Amenity Name</Text>
              <TextInput
                style={styles.input}
                value={amenity.key}
                onChangeText={(t) => updateOtherAmenity(amenity.id, 'key', t)}
                placeholder="e.g., Meditation Room"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <View style={styles.otherAmenityInputContainer}>
              <Text style={styles.formLabel}>Details</Text>
              <TextInput
                style={styles.input}
                value={amenity.value}
                onChangeText={(t) => updateOtherAmenity(amenity.id, 'value', t)}
                placeholder="e.g., 1 unit"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <TouchableOpacity
              style={styles.removeAmenityButton}
              onPress={() => removeOtherAmenity(amenity.id)}
            >
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

  // ─── Step 6: Contact & Photos ──────────────────────────────────────────────

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>👤 Contact & Photos</Text>
      <Text style={styles.stepDescription}>Contact details and property images</Text>

      <Text style={styles.subSectionTitle}>Building Owner</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Owner Name</Text>
        <TextInput
          style={styles.input}
          value={editedSite.building_owner_name}
          onChangeText={(v) => setEditedSite({ ...editedSite, building_owner_name: v })}
          placeholder="Enter owner name"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Owner Contact</Text>
        <TextInput
          style={styles.input}
          value={editedSite.building_owner_contact}
          onChangeText={(v) => setEditedSite({ ...editedSite, building_owner_contact: v })}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <Text style={styles.subSectionTitle}>Contact Person</Text>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={editedSite.contact_person_name}
          onChangeText={(v) => setEditedSite({ ...editedSite, contact_person_name: v })}
          placeholder="Enter name"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={editedSite.contact_person_number}
            onChangeText={(v) => setEditedSite({ ...editedSite, contact_person_number: v })}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Designation</Text>
          <TextInput
            style={styles.input}
            value={editedSite.contact_person_designation}
            onChangeText={(v) => setEditedSite({ ...editedSite, contact_person_designation: v })}
            placeholder="Manager"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={editedSite.contact_person_email}
          onChangeText={(v) => setEditedSite({ ...editedSite, contact_person_email: v })}
          placeholder="contact@example.com"
          keyboardType="email-address"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={editedSite.remarks}
          onChangeText={(v) => setEditedSite({ ...editedSite, remarks: v })}
          placeholder="Any additional observations..."
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          multiline
          textAlignVertical="top"
        />
      </View>

      <Text style={styles.subSectionTitle}>Property Photos</Text>
      <TouchableOpacity
        style={styles.addPhotoButton}
        onPress={() => setShowImageSourceModal(true)}
      >
        <Ionicons name="camera" size={20} color="#FFF" />
        <Text style={styles.addPhotoButtonText}>Upload Photo</Text>
      </TouchableOpacity>

      {buildingPhotos.length > 0 && (
        <View style={styles.photoPreviewContainer}>
          <Text style={styles.photoCountText}>
            {buildingPhotos.length} photo(s) uploaded
            {buildingPhotos.some((p) => p.isExisting) && ' (Blue badge = existing photo)'}
          </Text>
          <View style={styles.photoGrid}>
            {buildingPhotos.map((photo, idx) => (
              <View key={photo.id} style={styles.photoGridItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoGridImage} />
                <TouchableOpacity
                  style={styles.photoRemoveButton}
                  onPress={() =>
                    setBuildingPhotos(buildingPhotos.filter((p) => p.id !== photo.id))
                  }
                >
                  <Ionicons name="close-circle" size={24} color={WHATSAPP_COLORS.danger} />
                </TouchableOpacity>
                <View style={styles.photoIndexBadge}>
                  <Text style={styles.photoIndexText}>{idx + 1}</Text>
                </View>
                {photo.isExisting && (
                  <View style={styles.existingPhotoBadge}>
                    <Text style={styles.existingPhotoText}>Existing</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // ─── Modals ────────────────────────────────────────────────────────────────

  const DropdownModal = ({ visible, options, onSelect, onClose, title }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <ScrollView style={styles.dropdownScroll}>
            {options.map((option: any) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ImageSourceModal = () => (
    <Modal
      visible={showImageSourceModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowImageSourceModal(false)}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowImageSourceModal(false)}
      >
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
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowImageSourceModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ─── Metro Selector ────────────────────────────────────────────────────────

  if (showMetroSelector) {
    return (
      <MetroStationSelector
        token={token}
        selectedStation={selectedMetroStation}
        customStation={customMetroStation}
        onSelect={(station, custom) => {
          setSelectedMetroStation(station);
          setCustomMetroStation(custom);
        }}
        onBack={() => setShowMetroSelector(false)}
      />
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  // CHANGE 5: KeyboardAvoidingView wraps the full content area (below the header).
  // This ensures the NavigationButtons are also lifted when the keyboard appears,
  // and the ScrollView shrinks to keep the focused input visible on both iOS & Android.

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      {/* Fixed header – sits outside KeyboardAvoidingView intentionally */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Site</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/*
        CHANGE 5 – keyboard avoidance:
        • iOS:     behavior="padding" adds bottom padding equal to keyboard height,
                   which shrinks the ScrollView and keeps nav buttons above the keyboard.
        • Android: behavior="height" reduces the KAV's own height, achieving the same effect.
                   This is more reliable than relying on windowSoftInputMode="adjustResize"
                   alone, which varies by Expo SDK version and device manufacturer.
      */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.contentContainer}>
          {renderStepIndicator()}

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
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

          {/* Navigation buttons are INSIDE the KAV so they stay above the keyboard */}
          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handlePrevStep}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="arrow-back" size={18} color="#075E54" />
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            {currentStep < 6 ? (
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.navButtonPrimary,
                  currentStep === 0 && styles.navButtonFull,
                ]}
                onPress={handleNextStep}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={styles.navButtonTextPrimary}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.navButtonPrimary,
                  styles.navButtonFull,
                  updatingSite && styles.buttonDisabled,
                ]}
                onPress={handleUpdateSite}
                disabled={updatingSite}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                {updatingSite ? (
                  <View style={styles.buttonLoading}>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={[styles.navButtonTextPrimary, { marginLeft: 8 }]}>
                      Updating...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={[styles.navButtonTextPrimary, { marginLeft: 0 }]}>
                      Update Site
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals rendered outside KAV to avoid layout interference */}
      <DropdownModal
        visible={showBuildingStatusDropdown}
        options={BUILDING_STATUS_OPTIONS}
        onSelect={(v: string) => setEditedSite({ ...editedSite, building_status: v })}
        onClose={() => setShowBuildingStatusDropdown(false)}
        title="Select Building Status"
      />
      <DropdownModal
        visible={showFloorConditionDropdown}
        options={FLOOR_CONDITION_OPTIONS}
        onSelect={(v: string) => setEditedSite({ ...editedSite, floor_condition: v })}
        onClose={() => setShowFloorConditionDropdown(false)}
        title="Select Floor Condition"
      />
      <DropdownModal
        visible={showMicroMarketDropdown}
        options={MICRO_MARKET_OPTIONS}
        onSelect={(v: string) => setEditedSite({ ...editedSite, micro_market: v })}
        onClose={() => setShowMicroMarketDropdown(false)}
        title="Select Micro Market"
      />
      <ImageSourceModal />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#075E54',
  },
  // CHANGE 5: replaces the old contentContainer that wrapped KAV
  keyboardAvoidingWrapper: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#075E54',
  },
  headerSpacer: { width: 32 },
  backButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
  },
  stepIndicatorItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: '#075E54' },
  stepNumber: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLine: { width: 20, height: 2, backgroundColor: '#E5E7EB' },
  stepLineActive: { backgroundColor: '#075E54' },

  // Step content
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  stepDescription: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  fieldHint: { fontSize: 11, color: '#6B7280', marginBottom: 6, fontStyle: 'italic' },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },

  // Form
  formContainer: { padding: 16, flexGrow: 1 },
  formGroup: { marginBottom: 16, width: '100%' },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  optionalText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfWidth: { flex: 1 },

  // Dropdowns
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownButtonText: { fontSize: 14, color: '#1F2937' },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: '90%',
  },
  dropdownTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  dropdownScroll: { maxHeight: 300 },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownOptionText: { fontSize: 14, color: '#1F2937' },

  // Image source modal
  imageSourceContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
  },
  imageSourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
    elevation: 2,
  },
  imageSourceText: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 12 },
  cancelButton: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },

  // Checkboxes
  checkboxContainer: { marginBottom: 16 },
  checkbox: { flexDirection: 'row', alignItems: 'center' },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: { backgroundColor: '#075E54', borderColor: '#075E54' },
  checkboxLabel: { fontSize: 14, color: '#1F2937', flex: 1 },

  // Parking ratio
  ratioContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratioInput: { flex: 1, marginBottom: 0 },
  ratioSeparator: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

  // Rental escalation
  rentalEscalationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rentalEscalationInput: { flex: 1, textAlign: 'center' },
  rentalEscalationSeparator: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  rentalEscalationPeriodContainer: { flexDirection: 'row', gap: 4, flex: 2 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  periodButtonActive: { backgroundColor: '#075E54', borderColor: '#075E54' },
  periodButtonText: { fontSize: 12, color: '#6B7280' },
  periodButtonTextActive: { color: '#FFFFFF', fontWeight: '600' },
  helperText: { fontSize: 11, color: '#6B7280', marginTop: 4 },

  // Chip entries (shared by floor-wise area, total area, units, seats-per-unit)
  floorEntriesContainer: { marginTop: 12, gap: 8 },
  floorEntryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#075E54',
    backgroundColor: 'rgba(7,94,84,0.05)',
  },
  floorEntryText: { fontSize: 14, color: '#1F2937', flex: 1, marginRight: 8 },

  // Site type cards
  siteTypeContainer: { gap: 12 },
  siteTypeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  siteTypeCardSelected: {
    borderColor: '#075E54',
    backgroundColor: 'rgba(7,94,84,0.08)',
  },
  siteTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  siteTypeDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    textAlign: 'center',
  },
  siteTypeCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Metro selector button
  metroSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  metroSelectContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  metroSelectText: { fontSize: 14, color: '#1F2937' },
  metroSelectPlaceholder: { color: '#9CA3AF' },

  // Other amenities
  otherAmenityContainer: { marginBottom: 16 },
  otherAmenityRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  otherAmenityInputContainer: { flex: 1 },
  removeAmenityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  addOtherAmenityButton: {
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  addOtherAmenityText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Photo upload
  addPhotoButton: {
    backgroundColor: '#075E54',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  addPhotoButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  photoPreviewContainer: { marginTop: 8 },
  photoCountText: {
    fontSize: 12,
    color: '#075E54',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoGridItem: {
    width: (screenWidth - 32 - 32 - 12) / 2,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
  },
  photoGridImage: { width: '100%', height: '100%', backgroundColor: '#F5F5F5' },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#075E54',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  photoIndexText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  existingPhotoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingPhotoText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700' },

  // Navigation buttons (inside KAV – stays above keyboard)
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#075E54',
    gap: 4,
  },
  navButtonPrimary: { backgroundColor: '#075E54' },
  navButtonFull: { flex: 1 },
  navButtonText: { fontSize: 14, fontWeight: '700', color: '#075E54' },
  navButtonTextPrimary: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonLoading: { flexDirection: 'row', alignItems: 'center' },
});

export default EditSite;