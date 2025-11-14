import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, Animated, Platform
} from 'react-native';
import { RefreshControl } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const colors = {
  primary: '#161b34ff',
  primaryLight: '#c1c7f4ff',
  primaryDark: '#1A1D2E',
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  text: '#2F3349',
  textSecondary: '#6C7293',
  textLight: '#8B92B2',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#F1F3F4',
  border: '#E0E4E7',
  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
  info: '#ffcc92ff',
  link: '#007BFF',
  disabled: '#6C757D',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

const BUILDING_STATUS_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'Leased Out', value: 'leased_out' },
  { label: 'Readily Available', value: 'readily_available' },
  { label: 'Ready to Move In', value: 'ready_to_move_in' },
  { label: 'Ready for Fitouts', value: 'ready_for_fitouts' },
];

const FLOOR_CONDITION_OPTIONS = [
  { label: 'Bareshell', value: 'bareshell' },
  { label: 'Warmshell', value: 'warmshell' },
  { label: 'Fully Furnished', value: 'fully_furnished' },
  { label: 'Semi Furnished', value: 'semi_furnished' },
];

const beautifyName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return colors.warning;
    case 'scout_completed': return colors.info;
    case 'admin_completed': return colors.success;
    case 'cancelled': return colors.error;
    default: return colors.textSecondary;
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'pending': return '⏳';
    case 'scout_completed': return '✓';
    case 'admin_completed': return '✓✓';
    case 'cancelled': return '✗';
    default: return '•';
  }
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

const ScoutBoy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'visits-list' | 'visit-detail' | 'create-site'>('visits-list');
  const [token, setToken] = useState<string | null>('mock_token');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState([
    {
      id: 1,
      site: {
        id: 1,
        building_name: 'Prestige Tower',
        location: 'MSK Residency 404 floor 5',
        rent: '1232231.22',
        building_status: 'Ready to Move',
        total_area: '5000',
        area_per_floor: '1000',
        availble_floors: '1,2,3,4,5',
        car_parking_ratio: '1:100',
        contact_person_name: 'John Doe',
        contact_person_number: '+91 9876543210',
        contact_person_email: 'john@example.com',
        contact_person_designation: 'Manager',
        latitude: 28.6139,
        longitude: 77.2090,
        total_floors: 10,
        number_of_basements: 2,
        floor_condition: 'Excellent',
        car_parking_charges: '5000',
        car_parking_slots: '50',
        cam: '15',
        cam_deposit: '50000',
        oc: 'Yes',
        rental_escalation: '5%',
        security_deposit: '500000',
        two_wheeler_slots: '100',
        two_wheeler_charges: '1000',
        efficiency: '85%',
        notice_period: '3 months',
        lease_term: '3 years',
        lock_in_period: '1 year',
        will_developer_do_fitouts: 'Yes',
        power: '500 KW',
        power_backup: '100%',
        number_of_cabins: '20',
        number_of_workstations: '200',
        size_of_workstation: '60 sq ft',
        server_room: 'Yes',
        training_room: 'Yes',
        pantry: 'Yes',
        electrical_ups_room: 'Yes',
        cafeteria: 'Yes',
        gym: 'Yes',
        discussion_room: 'Yes',
        meeting_room: 'Yes',
        remarks: 'Prime location with excellent connectivity',
        updated_at: '2025-11-13T10:30:00Z',
      },
      status: 'scout_completed',
      comments: [
        {
          id: 1,
          user: { full_name: 'Jane Smith', profile_picture: null },
          content: 'Great property with excellent facilities. The location is prime and very accessible.',
          documents: [],
          created_at: '2025-11-13T09:00:00Z',
          updated_at: '2025-11-13T09:00:00Z',
        }
      ],
      photos: [
        {
          id: 1,
          file_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
          description: 'Front view',
          created_at: '2025-11-13T08:00:00Z',
        }
      ],
      assigned_by: { full_name: 'Admin User' },
      created_at: '2025-11-13T07:00:00Z',
      updated_at: '2025-11-13T10:30:00Z',
      scout_completed_at: '2025-11-13T10:30:00Z',
      is_visible_to_scout: true,
    }
  ]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSite, setEditedSite] = useState(null);
  const [updatingDetails, setUpdatingDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [markingComplete, setMarkingComplete] = useState(false);

  // Create Site States
  const [newSite, setNewSite] = useState({
    building_name: '',
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
    visit_date: '',
    visit_completed: false,
    purpose: '',
    proof: '',
    building_owner_name: '',
    building_owner_contact: '',
  });
  const [buildingPhotos, setBuildingPhotos] = useState([]);
  const [showBuildingStatusDropdown, setShowBuildingStatusDropdown] = useState(false);
  const [showFloorConditionDropdown, setShowFloorConditionDropdown] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const [customFields, setCustomFields] = useState([]);

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const formatDate = (dateString?: string | null): string => {
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

  const handleVisitPress = (visit) => {
    setSelectedVisit(visit);
    setEditedSite({ ...visit.site });
    setViewMode('visit-detail');
    setIsEditMode(false);
  };

  const handleBackToList = () => {
    setViewMode('visits-list');
    setSelectedVisit(null);
    setEditedSite(null);
    setIsEditMode(false);
    setNewComment('');
  };

  const captureLocation = async (): Promise<{ latitude: string; longitude: string } | null> => {
    try {
      // Simulate location capture - in real app, use navigator.geolocation or React Native's Geolocation
      const mockLat = 28.6139 + Math.random() * 0.01;
      const mockLng = 77.2090 + Math.random() * 0.01;
      return {
        latitude: mockLat.toFixed(6),
        longitude: mockLng.toFixed(6),
      };
    } catch (error) {
      console.error('Location capture error:', error);
      return null;
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: string, val: string) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [field]: val };
    setCustomFields(updated);
  };

  const handleAddPhoto = () => {
    // Simulate adding a photo - in real app, use image picker
    const newPhoto = {
      id: Date.now(),
      uri: `https://images.unsplash.com/photo-${Date.now()}?w=800`,
      type: 'image/jpeg',
    };
    setBuildingPhotos([...buildingPhotos, newPhoto]);
    Alert.alert('Success', 'Photo added successfully!');
  };

  const removePhoto = (photoId: number) => {
    setBuildingPhotos(buildingPhotos.filter(p => p.id !== photoId));
  };

  const handleCreateSite = async () => {
    if (!newSite.building_name || !newSite.location) {
      Alert.alert('Error', 'Please fill in Building Name and Location');
      return;
    }

    // Validate custom fields
    for (let field of customFields) {
      if (field.key && !field.value) {
        Alert.alert('Error', `Please provide value for ${field.key}`);
        return;
      }
      if (!field.key && field.value) {
        Alert.alert('Error', 'Please provide key for custom field');
        return;
      }
    }

    setCreatingSite(true);

    try {
      // Capture location automatically
      const locationData = await captureLocation();
      
      if (!locationData) {
        Alert.alert('Error', 'Failed to capture location. Please try again.');
        setCreatingSite(false);
        return;
      }

      const payload = {
        token: token,
        building_name: newSite.building_name,
        location: newSite.location,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        landmark: newSite.landmark,
        total_floors: newSite.total_floors,
        number_of_basements: newSite.number_of_basements,
        floor_condition: newSite.floor_condition,
        area_per_floor: parseCurrency(newSite.area_per_floor),
        total_area: parseCurrency(newSite.total_area),
        availble_floors: newSite.availble_floors,
        car_parking_charges: parseCurrency(newSite.car_parking_charges),
        car_parking_ratio: newSite.car_parking_ratio_left && newSite.car_parking_ratio_right 
          ? `${newSite.car_parking_ratio_left}:${newSite.car_parking_ratio_right}`
          : '',
        car_parking_slots: newSite.car_parking_slots,
        building_status: newSite.building_status,
        rent: parseCurrency(newSite.rent),
        cam: parseCurrency(newSite.cam),
        cam_deposit: parseCurrency(newSite.cam_deposit),
        oc: newSite.oc,
        rental_escalation: newSite.rental_escalation,
        security_deposit: parseCurrency(newSite.security_deposit),
        two_wheeler_slots: newSite.two_wheeler_slots,
        two_wheeler_charges: parseCurrency(newSite.two_wheeler_charges),
        efficiency: newSite.efficiency,
        notice_period: newSite.notice_period,
        lease_term: newSite.lease_term,
        lock_in_period: newSite.lock_in_period,
        will_developer_do_fitouts: newSite.will_developer_do_fitouts,
        contact_person_name: newSite.contact_person_name,
        contact_person_designation: newSite.contact_person_designation,
        contact_person_number: newSite.contact_person_number,
        contact_person_email: newSite.contact_person_email,
        power: newSite.power,
        power_backup: newSite.power_backup,
        number_of_cabins: newSite.number_of_cabins,
        number_of_workstations: newSite.number_of_workstations,
        size_of_workstation: newSite.size_of_workstation,
        server_room: newSite.server_room,
        training_room: newSite.training_room,
        pantry: newSite.pantry,
        electrical_ups_room: newSite.electrical_ups_room,
        cafeteria: newSite.cafeteria,
        gym: newSite.gym,
        discussion_room: newSite.discussion_room,
        meeting_room: newSite.meeting_room,
        remarks: newSite.remarks,
        visit_date: newSite.visit_date,
        visit_completed: newSite.visit_completed,
        purpose: newSite.purpose,
        proof: newSite.proof,
        building_owner_name: newSite.building_owner_name,
        building_owner_contact: newSite.building_owner_contact,
        photos: buildingPhotos,
      };

      // Add custom fields to payload
      customFields.forEach(field => {
        if (field.key) {
          payload[field.key] = field.value;
        }
      });

      // Simulate API call
      setTimeout(() => {
        Alert.alert('Success', `Site created successfully!\nLocation captured: ${locationData.latitude}, ${locationData.longitude}`);
        setViewMode('visits-list');
        // Reset form
        setNewSite({
          building_name: '',
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
          visit_date: '',
          visit_completed: false,
          purpose: '',
          proof: '',
          building_owner_name: '',
          building_owner_contact: '',
        });
        setBuildingPhotos([]);
        setCustomFields([]);
        setCreatingSite(false);
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to create site');
      setCreatingSite(false);
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  const DropdownModal = ({ visible, options, onSelect, onClose, title }) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <ScrollView style={styles.dropdownScroll}>
            {options.map((option) => (
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

  if (viewMode === 'create-site') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('visits-list')}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Site</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            {/* Basic Information */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Text style={styles.sectionSubtitle}>Essential details about the property</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Building Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.building_name}
                  onChangeText={(val) => setNewSite({ ...newSite, building_name: val })}
                  placeholder="e.g., Prestige Tower"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newSite.location}
                  onChangeText={(val) => setNewSite({ ...newSite, location: val })}
                  placeholder="Enter full address"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Landmark</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.landmark}
                  onChangeText={(val) => setNewSite({ ...newSite, landmark: val })}
                  placeholder="e.g., Near City Mall"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxIcon}>📍</Text>
                <Text style={styles.infoBoxText}>
                  Location will be captured automatically when you create the site
                </Text>
              </View>
            </View>

            {/* Building Status & Condition */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Building Status & Condition</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Building Status</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowBuildingStatusDropdown(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {BUILDING_STATUS_OPTIONS.find(o => o.value === newSite.building_status)?.label || 'Select Status'}
                  </Text>
                  <Text style={styles.dropdownButtonIcon}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Floor Condition</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowFloorConditionDropdown(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {FLOOR_CONDITION_OPTIONS.find(o => o.value === newSite.floor_condition)?.label || 'Select Condition'}
                  </Text>
                  <Text style={styles.dropdownButtonIcon}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Total Floors</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.total_floors}
                    onChangeText={(val) => setNewSite({ ...newSite, total_floors: val })}
                    placeholder="10"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
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
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Available Floors</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.availble_floors}
                  onChangeText={(val) => setNewSite({ ...newSite, availble_floors: val })}
                  placeholder="e.g., 2nd Floor, B+G+3"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setNewSite({ ...newSite, oc: !newSite.oc })}
                >
                  <View style={[styles.checkboxBox, newSite.oc && styles.checkboxBoxChecked]}>
                    {newSite.oc && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Occupancy Certificate (OC) Available</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setNewSite({ ...newSite, will_developer_do_fitouts: !newSite.will_developer_do_fitouts })}
                >
                  <View style={[styles.checkboxBox, newSite.will_developer_do_fitouts && styles.checkboxBoxChecked]}>
                    {newSite.will_developer_do_fitouts && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Developer will do Fitouts</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Area Details */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Area Details</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Total Area (sq ft)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.total_area}
                    onChangeText={(val) => setNewSite({ ...newSite, total_area: formatCurrency(val) })}
                    placeholder="41,000"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Area per Floor (sq ft)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.area_per_floor}
                    onChangeText={(val) => setNewSite({ ...newSite, area_per_floor: formatCurrency(val) })}
                    placeholder="11,400"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Efficiency (%)</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.efficiency}
                  onChangeText={(val) => setNewSite({ ...newSite, efficiency: val })}
                  placeholder="80"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Financial Details */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Financial Details</Text>
              <Text style={styles.sectionSubtitle}>All amounts in INR</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Monthly Rent (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.rent}
                  onChangeText={(val) => setNewSite({ ...newSite, rent: formatCurrency(val) })}
                  placeholder="12,54,000"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>CAM (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.cam}
                    onChangeText={(val) => setNewSite({ ...newSite, cam: formatCurrency(val) })}
                    placeholder="12"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>CAM Deposit (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.cam_deposit}
                    onChangeText={(val) => setNewSite({ ...newSite, cam_deposit: formatCurrency(val) })}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Security Deposit (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.security_deposit}
                  onChangeText={(val) => setNewSite({ ...newSite, security_deposit: formatCurrency(val) })}
                  placeholder="1,50,48,000"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rental Escalation (%)</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.rental_escalation}
                  onChangeText={(val) => setNewSite({ ...newSite, rental_escalation: val })}
                  placeholder="5"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Lease Terms */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Lease Terms</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Lease Term</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.lease_term}
                    onChangeText={(val) => setNewSite({ ...newSite, lease_term: val })}
                    placeholder="5 + 5 years"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Lock-in Period</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.lock_in_period}
                    onChangeText={(val) => setNewSite({ ...newSite, lock_in_period: val })}
                    placeholder="5 years"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notice Period</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.notice_period}
                  onChangeText={(val) => setNewSite({ ...newSite, notice_period: val })}
                  placeholder="6 months post lock-in"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Parking Details */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Parking Details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Car Parking Ratio</Text>
                <View style={styles.ratioContainer}>
                  <TextInput
                    style={[styles.input, styles.ratioInput]}
                    value={newSite.car_parking_ratio_left}
                    onChangeText={(val) => setNewSite({ ...newSite, car_parking_ratio_left: val })}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Text style={styles.ratioSeparator}>:</Text>
                  <TextInput
                    style={[styles.input, styles.ratioInput]}
                    value={newSite.car_parking_ratio_right}
                    onChangeText={(val) => setNewSite({ ...newSite, car_parking_ratio_right: val })}
                    placeholder="1000"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Car Parking Slots</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.car_parking_slots}
                    onChangeText={(val) => setNewSite({ ...newSite, car_parking_slots: val })}
                    placeholder="11"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Car Parking Charges (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.car_parking_charges}
                    onChangeText={(val) => setNewSite({ ...newSite, car_parking_charges: formatCurrency(val) })}
                    placeholder="5,500"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Two Wheeler Slots</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.two_wheeler_slots}
                    onChangeText={(val) => setNewSite({ ...newSite, two_wheeler_slots: val })}
                    placeholder="100"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Two Wheeler Charges (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.two_wheeler_charges}
                    onChangeText={(val) => setNewSite({ ...newSite, two_wheeler_charges: formatCurrency(val) })}
                    placeholder="1,000"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Utilities & Infrastructure */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Utilities & Infrastructure</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Power</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.power}
                    onChangeText={(val) => setNewSite({ ...newSite, power: val })}
                    placeholder="0.8 kva per 100 sft"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Power Backup</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.power_backup}
                    onChangeText={(val) => setNewSite({ ...newSite, power_backup: val })}
                    placeholder="100%"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Workspace Configuration */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Workspace Configuration</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Number of Cabins</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.number_of_cabins}
                    onChangeText={(val) => setNewSite({ ...newSite, number_of_cabins: val })}
                    placeholder="20"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Number of Workstations</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.number_of_workstations}
                    onChangeText={(val) => setNewSite({ ...newSite, number_of_workstations: val })}
                    placeholder="200"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Amenities & Facilities */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Amenities & Facilities</Text>
              <Text style={styles.sectionSubtitle}>Enter number of rooms/facilities</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Server Room</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.server_room}
                    onChangeText={(val) => setNewSite({ ...newSite, server_room: val })}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
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
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Meeting Room</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.meeting_room}
                    onChangeText={(val) => setNewSite({ ...newSite, meeting_room: val })}
                    placeholder="3"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Discussion Room</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.discussion_room}
                    onChangeText={(val) => setNewSite({ ...newSite, discussion_room: val })}
                    placeholder="2"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
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
                    placeholderTextColor={colors.textSecondary}
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
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Electrical/UPS Room</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.electrical_ups_room}
                    onChangeText={(val) => setNewSite({ ...newSite, electrical_ups_room: val })}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
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
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Building Owner Information */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Building Owner Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Owner Name</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.building_owner_name}
                  onChangeText={(val) => setNewSite({ ...newSite, building_owner_name: val })}
                  placeholder="Enter owner name"
                  placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Contact Person Information */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact Person Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Person Name</Text>
                <TextInput
                  style={styles.input}
                  value={newSite.contact_person_name}
                  onChangeText={(val) => setNewSite({ ...newSite, contact_person_name: val })}
                  placeholder="Enter name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.contact_person_number}
                    onChangeText={(val) => setNewSite({ ...newSite, contact_person_number: val })}
                    placeholder="+91 9876543210"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.formLabel}>Designation</Text>
                  <TextInput
                    style={styles.input}
                    value={newSite.contact_person_designation}
                    onChangeText={(val) => setNewSite({ ...newSite, contact_person_designation: val })}
                    placeholder="Manager"
                    placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Building Photos */}
            <View style={styles.card}>
              <View style={styles.customFieldsHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Building Photos</Text>
                  <Text style={styles.sectionSubtitle}>Upload photos of the property</Text>
                </View>
                <TouchableOpacity
                  style={styles.addFieldButton}
                  onPress={handleAddPhoto}
                >
                  <Text style={styles.addFieldButtonText}>📷 Add</Text>
                </TouchableOpacity>
              </View>

              {buildingPhotos.length === 0 ? (
                <View style={styles.emptyCustomFields}>
                  <Text style={styles.emptyCustomFieldsText}>No photos added yet</Text>
                </View>
              ) : (
                <View style={styles.photoGrid}>
                  {buildingPhotos.map((photo, index) => (
                    <View key={photo.id} style={styles.photoGridItem}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photoGridImage}
                      />
                      <TouchableOpacity
                        style={styles.photoRemoveButton}
                        onPress={() => removePhoto(photo.id)}
                      >
                        <Text style={styles.photoRemoveButtonText}>×</Text>
                      </TouchableOpacity>
                      <View style={styles.photoIndexBadge}>
                        <Text style={styles.photoIndexText}>{index + 1}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Remarks */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Remarks</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newSite.remarks}
                  onChangeText={(val) => setNewSite({ ...newSite, remarks: val })}
                  placeholder="Any additional information or observations..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Custom Fields Section */}
            <View style={styles.card}>
              <View style={styles.customFieldsHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Custom Fields</Text>
                  <Text style={styles.sectionSubtitle}>Add any additional information</Text>
                </View>
                <TouchableOpacity
                  style={styles.addFieldButton}
                  onPress={addCustomField}
                >
                  <Text style={styles.addFieldButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {customFields.length === 0 ? (
                <View style={styles.emptyCustomFields}>
                  <Text style={styles.emptyCustomFieldsText}>No custom fields yet</Text>
                </View>
              ) : (
                customFields.map((field, index) => (
                  <View key={index} style={styles.customFieldRow}>
                    <View style={styles.customFieldInputContainer}>
                      <TextInput
                        style={[styles.input, styles.customFieldKeyInput]}
                        value={field.key}
                        onChangeText={(val) => updateCustomField(index, 'key', val)}
                        placeholder="Field name"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <TextInput
                        style={[styles.input, styles.customFieldValueInput]}
                        value={field.value}
                        onChangeText={(val) => updateCustomField(index, 'value', val)}
                        placeholder="Value"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.removeFieldButton}
                      onPress={() => removeCustomField(index)}
                    >
                      <Text style={styles.removeFieldButtonText}>−</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.primaryButton, creatingSite && styles.buttonDisabled]}
              onPress={handleCreateSite}
              disabled={creatingSite}
            >
              {creatingSite ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator color={colors.white} size="small" />
                  <Text style={[styles.primaryButtonText, { marginLeft: spacing.sm }]}>
                    Capturing location & creating site...
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Create Site</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </View>
        </ScrollView>

        <DropdownModal
          visible={showBuildingStatusDropdown}
          options={BUILDING_STATUS_OPTIONS}
          onSelect={(value) => setNewSite({ ...newSite, building_status: value })}
          onClose={() => setShowBuildingStatusDropdown(false)}
          title="Select Building Status"
        />

        <DropdownModal
          visible={showFloorConditionDropdown}
          options={FLOOR_CONDITION_OPTIONS}
          onSelect={(value) => setNewSite({ ...newSite, floor_condition: value })}
          onClose={() => setShowFloorConditionDropdown(false)}
          title="Select Floor Condition"
        />
      </SafeAreaView>
    );
  }

  if (viewMode === 'visit-detail' && selectedVisit) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visit Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.detailContainer}>
            <View style={styles.card}>
              <View style={styles.siteHeader}>
                <View style={styles.siteHeaderContent}>
                  <Text style={styles.siteName}>{selectedVisit.site.building_name}</Text>
                  <View style={styles.statusBadgeContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVisit.status) }]}>
                      <Text style={styles.statusBadgeText}>
                        {getStatusIcon(selectedVisit.status)} {beautifyName(selectedVisit.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {selectedVisit.site.location && (
                <View style={styles.locationContainer}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationText}>{selectedVisit.site.location}</Text>
                </View>
              )}

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Assigned by</Text>
                  <Text style={styles.metaValue}>{selectedVisit.assigned_by.full_name}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Site Updated</Text>
                  <Text style={styles.metaValue}>{formatDate(selectedVisit.site.updated_at)}</Text>
                </View>
              </View>
            </View>

            {selectedVisit.photos && selectedVisit.photos.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Photos ({selectedVisit.photos.length})</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoScroll}
                >
                  {selectedVisit.photos.map((photo, index) => (
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
            )}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Comments ({selectedVisit.comments.length})</Text>
              {selectedVisit.comments.length > 0 ? (
                <View style={styles.commentsContainer}>
                  {selectedVisit.comments.map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {comment.user.full_name.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                        <View style={styles.commentHeaderContent}>
                          <Text style={styles.commentAuthor}>{comment.user.full_name}</Text>
                          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                        </View>
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>💬</Text>
                  <Text style={styles.emptyStateText}>No comments yet</Text>
                </View>
              )}
            </View>

            <View style={{ height: 24 }} />
          </View>
        </ScrollView>

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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            returnKeyType="search"
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
            onPress={() => setViewMode('create-site')}
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
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 1000);
              }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Assigned Visits</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{visits.length}</Text>
              </View>
            </View>

            {visits.length > 0 ? (
              <>
                {visits.map((visit) => (
                  <TouchableOpacity
                    key={visit.id}
                    style={styles.visitCard}
                    onPress={() => handleVisitPress(visit)}
                    activeOpacity={0.7}
                  >
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
                      {visit.photos.length > 0 && (
                        <View style={styles.visitMetaItem}>
                          <Text style={styles.visitMetaText}>📷 {visit.photos.length}</Text>
                        </View>
                      )}
                      {visit.comments.length > 0 && (
                        <View style={styles.visitMetaItem}>
                          <Text style={styles.visitMetaText}>💬 {visit.comments.length}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.visitCardFooter}>
                      <Text style={styles.visitDate}>{formatDate(visit.created_at)}</Text>
                      <Text style={styles.visitArrow}>→</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListIcon}>📋</Text>
                <Text style={styles.emptyListTitle}>No visits assigned yet</Text>
                <Text style={styles.emptyListSubtitle}>Your assigned visits will appear here</Text>
              </View>
            )}
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
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
    width: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
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
    marginTop: spacing.md,
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
    padding: spacing.md,
    ...shadows.md,
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
  scrollView: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  formContainer: {
    padding: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  infoBoxIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  dropdownButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  dropdownButtonIcon: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: 400,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  dropdownTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  checkboxContainer: {
    marginBottom: spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheck: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratioInput: {
    flex: 1,
    marginBottom: 0,
  },
  ratioSeparator: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customFieldsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  addFieldButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addFieldButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  emptyCustomFields: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  emptyCustomFieldsText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  customFieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  customFieldInputContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  customFieldKeyInput: {
    marginBottom: 0,
  },
  customFieldValueInput: {
    marginBottom: 0,
  },
  removeFieldButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  removeFieldButtonText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '700',
    lineHeight: 24,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  photoGridItem: {
    width: (screenWidth - spacing.lg * 2 - spacing.lg * 2 - spacing.md) / 2,
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
    lineHeight: 20,
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  photoIndexText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
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
  commentsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  commentAvatarText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  commentHeaderContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  commentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
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
});

export default ScoutBoy;