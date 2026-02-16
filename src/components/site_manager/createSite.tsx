import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../../config/config';
import { Ionicons } from '@expo/vector-icons';
import MetroStationSelector from './metroStationSelector';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CreateSiteProps {
  token: string | null;
  onBack: () => void;
  onSiteCreated: () => void;
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

const CreateSite: React.FC<CreateSiteProps> = ({
  token,
  onBack,
  onSiteCreated,
  theme,
}) => {
  // Use WhatsApp color scheme
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

  const [currentStep, setCurrentStep] = useState(0);
  const [creatingSite, setCreatingSite] = useState(false);
  const [showBuildingStatusDropdown, setShowBuildingStatusDropdown] = useState(false);
  const [showFloorConditionDropdown, setShowFloorConditionDropdown] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [siteType, setSiteType] = useState<'managed' | 'conventional' | 'for_sale' | null>(null);
  const [selectedMetroStation, setSelectedMetroStation] = useState<MetroStation | null>(null);
  const [customMetroStation, setCustomMetroStation] = useState('');
  const [buildingPhotos, setBuildingPhotos] = useState<Array<{ id: number; uri: string; type: string }>>([]);
  const [otherAmenities, setOtherAmenities] = useState<OtherAmenity[]>([]);
  const [customFloorCondition, setCustomFloorCondition] = useState('');
  const [customBuildingStatus, setCustomBuildingStatus] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [showMetroSelector, setShowMetroSelector] = useState(false);

  // Rental escalation state
  const [rentalEscalationPercentage, setRentalEscalationPercentage] = useState('');
  const [rentalEscalationValue, setRentalEscalationValue] = useState('');
  const [rentalEscalationPeriod, setRentalEscalationPeriod] = useState<'year' | 'month'>('year');

  const [newSite, setNewSite] = useState({
    building_name: '',
    location_link: '',
    location: '',
    landmark: '',
    total_floors: '',
    number_of_basements: '',
    floor_condition: 'bareshell',
    area_per_floor: '',
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
    scout_id: ''
  });

  // Extended floor condition options with custom
  const FLOOR_CONDITION_OPTIONS = [
    { label: 'Bareshell', value: 'bareshell' },
    { label: 'Warmshell', value: 'warmshell' },
    { label: 'Extended Warmshell', value: 'extended_warmshell' },
    { label: 'Fully Furnished', value: 'fully_furnished' },
    { label: 'Semi Furnished', value: 'semi_furnished' },
    { label: 'Custom', value: 'custom' },
  ];

  // Building status options with custom
  const BUILDING_STATUS_OPTIONS = [
    { label: 'Available', value: 'available' },
    { label: 'Leased Out', value: 'leased_out' },
    { label: 'Readily Available', value: 'readily_available' },
    { label: 'Ready to Move In', value: 'ready_to_move_in' },
    { label: 'Ready for Fitouts', value: 'ready_for_fitouts' },
    { label: 'Custom', value: 'custom' },
  ];

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatCurrency = (value: string): string => {
    const numStr = value.replace(/[^0-9]/g, '');
    if (!numStr) return '';
    const num = parseInt(numStr);
    return num.toLocaleString('en-IN');
  };

  const parseCurrency = (formatted: string): string => {
    return formatted.replace(/,/g, '');
  };

  const addOtherAmenity = () => {
    const newAmenity: OtherAmenity = {
      id: Date.now().toString(),
      key: '',
      value: ''
    };
    setOtherAmenities(prev => [...prev, newAmenity]);
  };

  const updateOtherAmenity = (id: string, field: 'key' | 'value', text: string) => {
    setOtherAmenities(prev =>
      prev.map(amenity =>
        amenity.id === id ? { ...amenity, [field]: text } : amenity
      )
    );
  };

  const removeOtherAmenity = (id: string) => {
    setOtherAmenities(prev => prev.filter(amenity => amenity.id !== id));
  };

  // const captureLocation = async () => {
  //   try {
  //     const mockLat = 28.6139 + Math.random() * 0.01;
  //     const mockLng = 77.2090 + Math.random() * 0.01;
  //     return {
  //       latitude: mockLat.toFixed(6),
  //       longitude: mockLng.toFixed(6),
  //     };
  //   } catch (error) {
  //     console.error('Location capture error:', error);
  //     return null;
  //   }
  // };

  const validateStep = (step: number): boolean => {
    if (step === 0) {
      if (!siteType) {
        Alert.alert('Required Field', 'Please select site type');
        return false;
      }
    }
    if (step === 1) {
      if (!newSite.building_name || !newSite.location) {
        Alert.alert('Required Fields', 'Please fill in Building Name and Location');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = async () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddPhoto = () => {
    setShowImageSourceModal(true);
  };

  const pickImageFromCamera = async () => {
    setShowImageSourceModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto = {
          id: Date.now(),
          uri: asset.uri,
          type: asset.type || 'image/jpeg'
        };
        setBuildingPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture image from camera');
    }
  };

  const pickImageFromGallery = async () => {
    setShowImageSourceModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required to select photos. Please enable it in Settings.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto = {
          id: Date.now(),
          uri: asset.uri,
          type: asset.type || 'image/jpeg'
        };
        setBuildingPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick image from gallery. Please try again.');
    }
  };

  const handleCreateSite = async () => {
    if (!validateStep(currentStep)) return;
    if (!token) {
      Alert.alert('Error', 'Token not found. Please login again.');
      return;
    }

    setCreatingSite(true);
    try {
      // const locationData = await captureLocation();
      // if (!locationData) {
      //   Alert.alert('Error', 'Failed to capture location. Please try again.');
      //   setCreatingSite(false);
      //   return;
      // }

      const siteData: any = {
        token,
        building_name: newSite.building_name,
        // latitude: parseFloat(locationData.latitude),
        // longitude: parseFloat(locationData.longitude),
        managed_property: siteType === 'managed',
        conventional_property: siteType === 'conventional',
        for_sale_property: siteType === 'for_sale',
      };

      // Handle metro station
      if (selectedMetroStation && selectedMetroStation.id) {
        siteData.nearest_metro_station = selectedMetroStation.id;
      } else if (customMetroStation) {
        try {
          const addResponse = await fetch(`${BACKEND_URL}/core/addMetroStations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: token,
              stations: {
                'Custom': [customMetroStation]
              }
            }),
          });

          if (addResponse.ok) {
            const searchResponse = await fetch(`${BACKEND_URL}/core/getMetroStations?query=${encodeURIComponent(customMetroStation)}`);
            const searchData = await searchResponse.json();

            if (searchData.message === "Success" && searchData.data && searchData.data.length > 0) {
              const newStation = searchData.data.find((s: MetroStation) => s.name === customMetroStation);
              if (newStation) {
                siteData.nearest_metro_station = newStation.id;
              }
            }
          }
        } catch (error) {
          console.error('Error creating custom metro station:', error);
        }
      }

      // Handle floor condition with custom
      if (newSite.floor_condition === 'custom' && customFloorCondition) {
        siteData.floor_condition = customFloorCondition;
      } else {
        siteData.floor_condition = newSite.floor_condition;
      }

      // Handle building status with custom
      if (newSite.building_status === 'custom' && customBuildingStatus) {
        siteData.building_status = customBuildingStatus;
      } else {
        siteData.building_status = newSite.building_status;
      }

      // Handle rental escalation from parts
      if (rentalEscalationPercentage && rentalEscalationValue) {
        siteData.rental_escalation = `${rentalEscalationPercentage}% / ${rentalEscalationValue} / ${rentalEscalationPeriod}`;
      }

      // Basic info
      if (newSite.location) siteData.location = newSite.location;
      if (newSite.location_link) siteData.location_link = newSite.location_link;
      if (newSite.landmark) siteData.landmark = newSite.landmark;

      // Property specs
      if (newSite.total_floors) siteData.total_floors = newSite.total_floors;
      if (newSite.number_of_basements) siteData.number_of_basements = newSite.number_of_basements;
      if (newSite.area_per_floor) siteData.area_per_floor = parseCurrency(newSite.area_per_floor);
      if (newSite.total_area) siteData.total_area = parseCurrency(newSite.total_area);
      if (newSite.availble_floors) siteData.availble_floors = newSite.availble_floors;

      // Financial/Commercial details
      if (siteType === 'conventional' || siteType === 'for_sale') {
        if (newSite.rent) siteData.rent = parseCurrency(newSite.rent);
      } else {
        if (newSite.rent_per_seat) siteData.rent_per_seat = parseCurrency(newSite.rent_per_seat);
        if (newSite.total_seats) siteData.total_seats = parseCurrency(newSite.total_seats);
        if (newSite.number_of_seats_per_unit) siteData.number_of_seats_per_unit = parseCurrency(newSite.number_of_seats_per_unit);
        if (newSite.seats_available) siteData.seats_available = parseCurrency(newSite.seats_available);
        if (newSite.number_of_units) siteData.number_of_units = parseCurrency(newSite.number_of_units);
        if (newSite.business_hours_of_operation) siteData.business_hours_of_operation = newSite.business_hours_of_operation;
        if (newSite.premises_access) siteData.premises_access = newSite.premises_access;
      }

      // Contact info
      if (newSite.contact_person_name) siteData.contact_person_name = newSite.contact_person_name;
      if (newSite.contact_person_number) siteData.contact_person_number = newSite.contact_person_number;
      if (newSite.contact_person_email) siteData.contact_person_email = newSite.contact_person_email;
      if (newSite.contact_person_designation) siteData.contact_person_designation = newSite.contact_person_designation;
      if (newSite.building_owner_name) siteData.building_owner_name = newSite.building_owner_name;
      if (newSite.building_owner_contact) siteData.building_owner_contact = newSite.building_owner_contact;

      // Parking
      if (newSite.car_parking_charges) siteData.car_parking_charges = parseCurrency(newSite.car_parking_charges);
      if (newSite.car_parking_slots) siteData.car_parking_slots = newSite.car_parking_slots;
      if (newSite.two_wheeler_slots) siteData.two_wheeler_slots = newSite.two_wheeler_slots;
      if (newSite.two_wheeler_charges) siteData.two_wheeler_charges = parseCurrency(newSite.two_wheeler_charges);

      if (newSite.car_parking_ratio_left && newSite.car_parking_ratio_right) {
        siteData.car_parking_ratio = `${newSite.car_parking_ratio_left}:${newSite.car_parking_ratio_right}`;
      }

      // Commercial terms
      if (newSite.cam) siteData.cam = parseCurrency(newSite.cam);
      if (newSite.cam_deposit) siteData.cam_deposit = newSite.cam_deposit;
      if (newSite.security_deposit) siteData.security_deposit = newSite.security_deposit;

      if (newSite.oc !== undefined && newSite.oc !== null) {
        siteData.oc = newSite.oc ? 'True' : 'False';
      }
      if (newSite.will_developer_do_fitouts !== undefined && newSite.will_developer_do_fitouts !== null) {
        siteData.will_developer_do_fitouts = newSite.will_developer_do_fitouts ? 'True' : 'False';
      }

      if (newSite.efficiency) siteData.efficiency = newSite.efficiency;
      if (newSite.notice_period) siteData.notice_period = newSite.notice_period;
      if (newSite.lease_term) siteData.lease_term = newSite.lease_term;
      if (newSite.lock_in_period) siteData.lock_in_period = newSite.lock_in_period;

      // Utilities
      if (newSite.power) siteData.power = newSite.power;
      if (newSite.power_backup) siteData.power_backup = newSite.power_backup;

      // Workspace amenities
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

      // Other amenities
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
        const fileName = `photo_${idx + 1}_${photo.id}.jpg`;
        formData.append('photos', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: fileName,
        } as any);
      });

      const response = await fetch(`${BACKEND_URL}/manager/createSite`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it automatically with boundary
    });

      const responseText = await response.text();
      console.log('Response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}: Failed to create site`);
      }

      if (responseData.message !== 'Site created successfully') {
        throw new Error(responseData.message || 'Failed to create site');
      }

      Alert.alert('Success', 'Site created successfully!');
      onSiteCreated();
    } catch (error: any) {
      console.error('Site creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create site');
    } finally {
      setCreatingSite(false);
    }
  };

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

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Select Site Type</Text>
      <Text style={styles.stepDescription}>Choose the type of office space</Text>

      <View style={styles.siteTypeContainer}>
        <TouchableOpacity
          style={[
            styles.siteTypeCard,
            siteType === 'conventional' && styles.siteTypeCardSelected
          ]}
          onPress={() => setSiteType('conventional')}
        >
          <Ionicons name="business" size={32} color={siteType === 'conventional' ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.primary} />
          <Text style={styles.siteTypeTitle}>Conventional Office</Text>
          <Text style={styles.siteTypeDescription}>
            Traditional office space with area-based pricing
          </Text>
          {siteType === 'conventional' && (
            <View style={styles.siteTypeCheckmark}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.siteTypeCard,
            siteType === 'managed' && styles.siteTypeCardSelected
          ]}
          onPress={() => setSiteType('managed')}
        >
          <Ionicons name="people" size={32} color={siteType === 'managed' ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.primary} />
          <Text style={styles.siteTypeTitle}>Managed Office</Text>
          <Text style={styles.siteTypeDescription}>
            Flexible workspace with seat-based pricing and amenities
          </Text>
          {siteType === 'managed' && (
            <View style={styles.siteTypeCheckmark}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.siteTypeCard,
            siteType === 'for_sale' && styles.siteTypeCardSelected
          ]}
          onPress={() => setSiteType('for_sale')}
        >
          <Ionicons name="cash" size={32} color={siteType === 'for_sale' ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.primary} />
          <Text style={styles.siteTypeTitle}>For Sale Office</Text>
          <Text style={styles.siteTypeDescription}>
            Office property available for purchase
          </Text>
          {siteType === 'for_sale' && (
            <View style={styles.siteTypeCheckmark}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.formGroup, { marginTop: 24 }]}>
        <Text style={styles.formLabel}>Nearest Metro Station <Text style={styles.optionalText}>(Optional)</Text></Text>
        <TouchableOpacity
          style={styles.metroSelectButton}
          onPress={() => setShowMetroSelector(true)}
        >
          <View style={styles.metroSelectContent}>
            <Ionicons name="train" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={[
              styles.metroSelectText,
              !(selectedMetroStation || customMetroStation) && styles.metroSelectPlaceholder
            ]}>
              {selectedMetroStation ? selectedMetroStation.name :
                customMetroStation ? customMetroStation :
                  'Select metro station...'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
        
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Basic Information</Text>
      <Text style={styles.stepDescription}>Essential site details</Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Building Name *</Text>
        <TextInput
          style={styles.input}
          value={newSite.building_name}
          onChangeText={(val) => setNewSite({ ...newSite, building_name: val })}
          placeholder="Enter building name"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Location *</Text>
        <TextInput
          style={styles.input}
          value={newSite.location}
          onChangeText={(val) => setNewSite({ ...newSite, location: val })}
          placeholder="Enter location"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Landmark</Text>
        <TextInput
          style={styles.input}
          value={newSite.landmark}
          onChangeText={(val) => setNewSite({ ...newSite, landmark: val })}
          placeholder="Nearby landmark"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Location Link</Text>
        <TextInput
          style={styles.input}
          value={newSite.location_link}
          onChangeText={(val) => setNewSite({ ...newSite, location_link: val })}
          placeholder="Google Maps link"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>
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

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Total Floors</Text>
          <TextInput
            style={styles.input}
            value={newSite.total_floors}
            onChangeText={(val) => setNewSite({ ...newSite, total_floors: val })}
            placeholder="10"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Basements</Text>
          <TextInput
            style={styles.input}
            value={newSite.number_of_basements}
            onChangeText={(val) => setNewSite({ ...newSite, number_of_basements: val })}
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
            {newSite.floor_condition === 'custom'
              ? customFloorCondition || 'Custom'
              : beautifyName(newSite.floor_condition)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {newSite.floor_condition === 'custom' && (
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

      {(siteType === 'conventional' || siteType === 'for_sale') ? (
        <>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Total Area (sq ft)</Text>
              <TextInput
                style={styles.input}
                value={newSite.total_area}
                onChangeText={(val) => setNewSite({ ...newSite, total_area: formatCurrency(val) })}
                placeholder="50,000"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Area/Floor (sq ft)</Text>
              <TextInput
                style={styles.input}
                value={newSite.area_per_floor}
                onChangeText={(val) => setNewSite({ ...newSite, area_per_floor: formatCurrency(val) })}
                placeholder="5,000"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Available Floors</Text>
            <TextInput
              style={styles.input}
              value={newSite.availble_floors}
              onChangeText={(val) => setNewSite({ ...newSite, availble_floors: val })}
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
                value={newSite.total_seats}
                onChangeText={(val) => setNewSite({ ...newSite, total_seats: formatCurrency(val) })}
                placeholder="500"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Seats Available</Text>
              <TextInput
                style={styles.input}
                value={newSite.seats_available}
                onChangeText={(val) => setNewSite({ ...newSite, seats_available: formatCurrency(val) })}
                placeholder="200"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Number of Units</Text>
              <TextInput
                style={styles.input}
                value={newSite.number_of_units}
                onChangeText={(val) => setNewSite({ ...newSite, number_of_units: formatCurrency(val) })}
                placeholder="50"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Seats Per Unit</Text>
              <TextInput
                style={styles.input}
                value={newSite.number_of_seats_per_unit}
                onChangeText={(val) => setNewSite({ ...newSite, number_of_seats_per_unit: formatCurrency(val) })}
                placeholder="10"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Efficiency (%)</Text>
        <TextInput
          style={styles.input}
          value={newSite.efficiency}
          onChangeText={(val) => setNewSite({ ...newSite, efficiency: val })}
          placeholder="85"
          keyboardType="numeric"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>
    </View>
  );

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
            {newSite.building_status === 'custom'
              ? customBuildingStatus || 'Custom'
              : beautifyName(newSite.building_status)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {newSite.building_status === 'custom' && (
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
        <>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>Monthly Rent (₹)</Text>
              <TextInput
                style={styles.input}
                value={newSite.rent}
                onChangeText={(val) => setNewSite({ ...newSite, rent: formatCurrency(val) })}
                placeholder="5,00,000"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>CAM (₹)</Text>
              <TextInput
                style={styles.input}
                value={newSite.cam}
                onChangeText={(val) => setNewSite({ ...newSite, cam: formatCurrency(val) })}
                placeholder="50,000"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Rent Per Seat (₹)</Text>
            <TextInput
              style={styles.input}
              value={newSite.rent_per_seat}
              onChangeText={(val) => setNewSite({ ...newSite, rent_per_seat: formatCurrency(val) })}
              placeholder="8,000"
              keyboardType="numeric"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.formLabel}>CAM (₹)</Text>
              <TextInput
                style={styles.input}
                value={newSite.cam}
                onChangeText={(val) => setNewSite({ ...newSite, cam: formatCurrency(val) })}
                placeholder="50,000"
                keyboardType="numeric"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Business Hours of Operation</Text>
            <TextInput
              style={styles.input}
              value={newSite.business_hours_of_operation}
              onChangeText={(val) => setNewSite({ ...newSite, business_hours_of_operation: val })}
              placeholder="9:00 AM - 6:00 PM, Monday to Friday"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Premises Access</Text>
            <TextInput
              style={styles.input}
              value={newSite.premises_access}
              onChangeText={(val) => setNewSite({ ...newSite, premises_access: val })}
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
            value={newSite.cam_deposit}
            onChangeText={(val) => setNewSite({ ...newSite, cam_deposit: val })}
            placeholder="3"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Security Deposit (Months)</Text>
          <TextInput
            style={styles.input}
            value={newSite.security_deposit}
            onChangeText={(val) => setNewSite({ ...newSite, security_deposit: val })}
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
            value={newSite.lease_term}
            onChangeText={(val) => setNewSite({ ...newSite, lease_term: val })}
            placeholder="9 years"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Lock-in Period</Text>
          <TextInput
            style={styles.input}
            value={newSite.lock_in_period}
            onChangeText={(val) => setNewSite({ ...newSite, lock_in_period: val })}
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
            <TouchableOpacity
              style={[
                styles.periodButton,
                rentalEscalationPeriod === 'year' && styles.periodButtonActive
              ]}
              onPress={() => setRentalEscalationPeriod('year')}
            >
              <Text style={[
                styles.periodButtonText,
                rentalEscalationPeriod === 'year' && styles.periodButtonTextActive
              ]}>Year</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                rentalEscalationPeriod === 'month' && styles.periodButtonActive
              ]}
              onPress={() => setRentalEscalationPeriod('month')}
            >
              <Text style={[
                styles.periodButtonText,
                rentalEscalationPeriod === 'month' && styles.periodButtonTextActive
              ]}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.helperText}>Format: Percentage / Frequency / Period</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Notice Period</Text>
          <TextInput
            style={styles.input}
            value={newSite.notice_period}
            onChangeText={(val) => setNewSite({ ...newSite, notice_period: val })}
            placeholder="6 months"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setNewSite({ ...newSite, oc: !newSite.oc })}
        >
          <View style={[styles.checkboxBox, newSite.oc && styles.checkboxBoxChecked]}>
            {newSite.oc && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkboxLabel}>OC Available</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setNewSite({ ...newSite, will_developer_do_fitouts: !newSite.will_developer_do_fitouts })}
        >
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
          <TextInput
            style={[styles.input, styles.ratioInput]}
            value={newSite.car_parking_ratio_left}
            onChangeText={(val) => setNewSite({ ...newSite, car_parking_ratio_left: val })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
          <Text style={styles.ratioSeparator}>:</Text>
          <TextInput
            style={[styles.input, styles.ratioInput]}
            value={newSite.car_parking_ratio_right}
            onChangeText={(val) => setNewSite({ ...newSite, car_parking_ratio_right: val })}
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
            value={newSite.car_parking_slots}
            onChangeText={(val) => setNewSite({ ...newSite, car_parking_slots: val })}
            placeholder="11"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Car Charges (₹)</Text>
          <TextInput
            style={styles.input}
            value={newSite.car_parking_charges}
            onChangeText={(val) => setNewSite({ ...newSite, car_parking_charges: formatCurrency(val) })}
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
            value={newSite.two_wheeler_slots}
            onChangeText={(val) => setNewSite({ ...newSite, two_wheeler_slots: val })}
            placeholder="100"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>2-Wheeler Charges (₹)</Text>
          <TextInput
            style={styles.input}
            value={newSite.two_wheeler_charges}
            onChangeText={(val) => setNewSite({ ...newSite, two_wheeler_charges: formatCurrency(val) })}
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
            value={newSite.power}
            onChangeText={(val) => setNewSite({ ...newSite, power: val })}
            placeholder="0.8 kva/100 sft"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Power Backup</Text>
          <TextInput
            style={styles.input}
            value={newSite.power_backup}
            onChangeText={(val) => setNewSite({ ...newSite, power_backup: val })}
            placeholder="100%"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
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
          <TextInput
            style={styles.input}
            value={newSite.number_of_cabins}
            onChangeText={(val) => setNewSite({ ...newSite, number_of_cabins: val })}
            placeholder="20"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Workstations</Text>
          <TextInput
            style={styles.input}
            value={newSite.number_of_workstations}
            onChangeText={(val) => setNewSite({ ...newSite, number_of_workstations: val })}
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
          value={newSite.size_of_workstation}
          onChangeText={(val) => setNewSite({ ...newSite, size_of_workstation: val })}
          placeholder="60 sq ft"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Meeting Rooms</Text>
          <TextInput
            style={styles.input}
            value={newSite.meeting_room}
            onChangeText={(val) => setNewSite({ ...newSite, meeting_room: val })}
            placeholder="3"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Discussion Rooms</Text>
          <TextInput
            style={styles.input}
            value={newSite.discussion_room}
            onChangeText={(val) => setNewSite({ ...newSite, discussion_room: val })}
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
            value={newSite.server_room}
            onChangeText={(val) => setNewSite({ ...newSite, server_room: val })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Training Room</Text>
          <TextInput
            style={styles.input}
            value={newSite.training_room}
            onChangeText={(val) => setNewSite({ ...newSite, training_room: val })}
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
            value={newSite.pantry}
            onChangeText={(val) => setNewSite({ ...newSite, pantry: val })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Cafeteria</Text>
          <TextInput
            style={styles.input}
            value={newSite.cafeteria}
            onChangeText={(val) => setNewSite({ ...newSite, cafeteria: val })}
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
            value={newSite.electrical_ups_room}
            onChangeText={(val) => setNewSite({ ...newSite, electrical_ups_room: val })}
            placeholder="1"
            keyboardType="numeric"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Gym</Text>
          <TextInput
            style={styles.input}
            value={newSite.gym}
            onChangeText={(val) => setNewSite({ ...newSite, gym: val })}
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
                onChangeText={(text) => updateOtherAmenity(amenity.id, 'key', text)}
                placeholder="e.g., Meditation Room"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            <View style={styles.otherAmenityInputContainer}>
              <Text style={styles.formLabel}>Details</Text>
              <TextInput
                style={styles.input}
                value={amenity.value}
                onChangeText={(text) => updateOtherAmenity(amenity.id, 'value', text)}
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

      <TouchableOpacity
        style={styles.addOtherAmenityButton}
        onPress={addOtherAmenity}
      >
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
        <TextInput
          style={styles.input}
          value={newSite.building_owner_name}
          onChangeText={(val) => setNewSite({ ...newSite, building_owner_name: val })}
          placeholder="Enter owner name"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Owner Contact</Text>
        <TextInput
          style={styles.input}
          value={newSite.building_owner_contact}
          onChangeText={(val) => setNewSite({ ...newSite, building_owner_contact: val })}
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
          value={newSite.contact_person_name}
          onChangeText={(val) => setNewSite({ ...newSite, contact_person_name: val })}
          placeholder="Enter name"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={newSite.contact_person_number}
            onChangeText={(val) => setNewSite({ ...newSite, contact_person_number: val })}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.formLabel}>Designation</Text>
          <TextInput
            style={styles.input}
            value={newSite.contact_person_designation}
            onChangeText={(val) => setNewSite({ ...newSite, contact_person_designation: val })}
            placeholder="Manager"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={newSite.contact_person_email}
          onChangeText={(val) => setNewSite({ ...newSite, contact_person_email: val })}
          placeholder="contact@example.com"
          keyboardType="email-address"
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={newSite.remarks}
          onChangeText={(val) => setNewSite({ ...newSite, remarks: val })}
          placeholder="Any additional observations..."
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          multiline
          textAlignVertical="top"
        />
      </View>

      <Text style={styles.subSectionTitle}>Property Photos</Text>
      <TouchableOpacity
        style={styles.addPhotoButton}
        onPress={handleAddPhoto}
      >
        <Ionicons name="camera" size={20} color="#FFF" />
        <Text style={styles.addPhotoButtonText}>Upload Photo</Text>
      </TouchableOpacity>

      {buildingPhotos.length > 0 && (
        <View style={styles.photoPreviewContainer}>
          <Text style={styles.photoCountText}>
            {buildingPhotos.length} photo(s) uploaded
          </Text>
          <View style={styles.photoGrid}>
            {buildingPhotos.map((photo, idx) => (
              <View key={photo.id} style={styles.photoGridItem}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photoGridImage}
                />
                <TouchableOpacity
                  style={styles.photoRemoveButton}
                  onPress={() => setBuildingPhotos(buildingPhotos.filter(p => p.id !== photo.id))}
                >
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

  const DropdownModal = ({ visible, options, onSelect, onClose, title }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
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
    <Modal visible={showImageSourceModal} transparent animationType="fade" onRequestClose={() => setShowImageSourceModal(false)}>
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowImageSourceModal(false)}
      >
        <View style={styles.imageSourceContainer}>
          <Text style={styles.dropdownTitle}>Select Image Source</Text>

          <TouchableOpacity
            style={styles.imageSourceOption}
            onPress={pickImageFromCamera}
          >
            <Ionicons name="camera" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.imageSourceText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageSourceOption}
            onPress={pickImageFromGallery}
          >
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

  // Show Metro Selector Screen
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Site</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {renderStepIndicator()}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: 100,
              minHeight: screenHeight - 200
            }}
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
        </KeyboardAvoidingView>

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
              style={[styles.navButton, styles.navButtonPrimary, currentStep === 0 && styles.navButtonFull]}
              onPress={handleNextStep}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Text style={styles.navButtonTextPrimary}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary, styles.navButtonFull, creatingSite && styles.buttonDisabled]}
              onPress={handleCreateSite}
              disabled={creatingSite}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              {creatingSite ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={[styles.navButtonTextPrimary, { marginLeft: 8 }]}>
                    Creating...
                  </Text>
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
      </View>

      <DropdownModal
        visible={showBuildingStatusDropdown}
        options={BUILDING_STATUS_OPTIONS}
        onSelect={(value: string) => setNewSite({ ...newSite, building_status: value })}
        onClose={() => setShowBuildingStatusDropdown(false)}
        title="Select Building Status"
      />

      <DropdownModal
        visible={showFloorConditionDropdown}
        options={FLOOR_CONDITION_OPTIONS}
        onSelect={(value: string) => setNewSite({ ...newSite, floor_condition: value })}
        onClose={() => setShowFloorConditionDropdown(false)}
        title="Select Floor Condition"
      />

      <ImageSourceModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#075E54',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#075E54',
  },
  headerSpacer: {
    width: 32,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 0,
    overflow: 'hidden',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#075E54',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  stepLineActive: {
    backgroundColor: '#075E54',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  formContainer: {
    padding: 16,
    flexGrow: 1,
  },
  formGroup: {
    marginBottom: 16,
    width: '100%',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  optionalText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
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
  dropdownButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: '90%'
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#1F2937',
  },
  imageSourceContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageSourceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  checkboxContainer: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  checkboxBoxChecked: {
    backgroundColor: '#075E54',
    borderColor: '#075E54',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratioInput: {
    flex: 1,
    marginBottom: 0,
  },
  ratioSeparator: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  rentalEscalationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rentalEscalationInput: {
    flex: 1,
    textAlign: 'center',
  },
  rentalEscalationSeparator: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  rentalEscalationPeriodContainer: {
    flexDirection: 'row',
    gap: 4,
    flex: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#075E54',
    borderColor: '#075E54',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  siteTypeContainer: {
    gap: 12,
  },
  siteTypeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // elevation: 2,
    alignItems: 'center',
  },
  siteTypeCardSelected: {
    borderColor: '#075E54',
    backgroundColor: 'rgba(7, 94, 84, 0.3)',
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
  metroSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  metroSelectText: {
    fontSize: 14,
    color: '#1F2937',
  },
  metroSelectPlaceholder: {
    color: '#9CA3AF',
  },
  otherAmenityContainer: {
    marginBottom: 16,
  },
  otherAmenityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  otherAmenityInputContainer: {
    flex: 1,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addOtherAmenityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addPhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  photoPreviewContainer: {
    marginTop: 8,
  },
  photoCountText: {
    fontSize: 12,
    color: '#075E54',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoGridItem: {
    width: (screenWidth - 32 - 32 - 12) / 2,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
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
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
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
  navButtonPrimary: {
    backgroundColor: '#075E54',
  },
  navButtonFull: {
    flex: 1,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#075E54',
  },
  navButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default CreateSite;