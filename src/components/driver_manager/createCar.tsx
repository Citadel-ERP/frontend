import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import { Document } from './types';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import CrossPlatformDatePicker from '../../services/CrossPlatformDatePicker';


interface CreateCarProps {
  token: string | null;
  city: string;
  onBack: () => void;
  onCarCreated: () => void;
}

interface Office {
  id: number;
  name: string;
  address: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  latitude: number | null;
  longitude: number | null;
}

interface CarFormData {
  make: string;
  model: string;
  year: string;
  license_plate: string;
  color: string;
  seating_capacity: string;
  fuel_type: string;
  status: string;
  vehicle_type: string;
  office_id: string;
  pollution_certificate: Document | null;
  /** YYYY-MM-DD */
  pollution_expiry_date: string;
  insurance_certificate: Document | null;
  /** YYYY-MM-DD */
  insurance_expiry_date: string;
  registration_certificate: Document | null;
  /** YYYY-MM-DD */
  registration_expiry_date: string;
  photos: Document[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetchAllOffices = async (token: string | null): Promise<Office[]> => {
  const response = await fetch(`${BACKEND_URL}/manager/getOffices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token }),
  });

  const text = await response.text();
  if (!text.trim().startsWith('{')) throw new Error('Invalid response');

  const data = JSON.parse(text);
  if (response.ok && data.offices?.length > 0) return data.offices;
  throw new Error('No offices found');
};

// ─── Component ────────────────────────────────────────────────────────────────

const CreateCar: React.FC<CreateCarProps> = ({ token, city, onBack, onCarCreated }) => {
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(true);

  // Dropdown visibility flags
  const [dropdownOpen, setDropdownOpen] = useState(false);             // fuel type
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Upload method modal
  const [uploadMethodModalVisible, setUploadMethodModalVisible] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState<
    'pollution' | 'insurance' | 'registration' | 'photo' | null
  >(null);

  const [formData, setFormData] = useState<CarFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    license_plate: '',
    color: '',
    seating_capacity: '4',
    fuel_type: 'Petrol',
    status: 'available',
    vehicle_type: 'Sedan',
    office_id: '',
    pollution_certificate: null,
    pollution_expiry_date: '',
    insurance_certificate: null,
    insurance_expiry_date: '',
    registration_certificate: null,
    registration_expiry_date: '',
    photos: [],
  });

  const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
  const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'MPV', 'Luxury'];
  const statuses = ['available', 'not_available', 'in_maintenance'];

  // ── Load offices on mount ──────────────────────────────────────────────────

  useEffect(() => {
    const loadOffices = async () => {
      try {
        setLoadingOffices(true);
        const officesData = await fetchAllOffices(token);
        setOffices(officesData);

        if (city && officesData.length > 0) {
          const match = officesData.find(
            (o) =>
              o.address.city.toLowerCase().includes(city.toLowerCase()) ||
              city.toLowerCase().includes(o.address.city.toLowerCase()),
          );
          if (match) {
            setFormData((prev) => ({ ...prev, office_id: match.id.toString() }));
          }
        }
      } catch {
        Alert.alert('Error', 'Failed to load offices. Please try again.');
      } finally {
        setLoadingOffices(false);
      }
    };
    loadOffices();
  }, [token, city]);

  // ── Upload helpers ─────────────────────────────────────────────────────────

  const showUploadMethodModal = (
    type: 'pollution' | 'insurance' | 'registration' | 'photo',
  ) => {
    if (type === 'photo' && formData.photos.length >= 6) {
      Alert.alert('Limit Reached', 'You can only upload up to 6 photos');
      return;
    }
    setCurrentUploadType(type);
    setUploadMethodModalVisible(true);
  };

  const updateFormDataWithDocument = (
    type: 'pollution' | 'insurance' | 'registration' | 'photo',
    docObject: Document,
  ) => {
    setFormData((prev) => {
      switch (type) {
        case 'pollution':
          return { ...prev, pollution_certificate: docObject };
        case 'insurance':
          return { ...prev, insurance_certificate: docObject };
        case 'registration':
          return { ...prev, registration_certificate: docObject };
        case 'photo':
          if (prev.photos.length >= 6) return prev;
          return { ...prev, photos: [...prev.photos, docObject] };
        default:
          return prev;
      }
    });
  };

  const handleGalleryPick = async () => {
    setUploadMethodModalVisible(false);
    if (!currentUploadType) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const image = result.assets[0];
        updateFormDataWithDocument(currentUploadType, {
          uri: image.uri,
          name: image.uri.split('/').pop() || `image_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const handleCameraPick = async () => {
    setUploadMethodModalVisible(false);
    if (!currentUploadType) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets?.length > 0) {
        const image = result.assets[0];
        updateFormDataWithDocument(currentUploadType, {
          uri: image.uri,
          name: `camera_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleFilePick = async () => {
    setUploadMethodModalVisible(false);
    if (!currentUploadType) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const doc = result.assets[0];
        updateFormDataWithDocument(currentUploadType, {
          uri: doc.uri,
          name: doc.name,
          type: doc.mimeType || 'application/octet-stream',
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.make || !formData.model || !formData.license_plate || !formData.color) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!formData.office_id) {
      Alert.alert('Error', 'Please select an office for the vehicle');
      return;
    }
    if (formData.pollution_certificate && !formData.pollution_expiry_date) {
      Alert.alert('Error', 'Please provide expiry date for Pollution Certificate');
      return;
    }
    if (formData.insurance_certificate && !formData.insurance_expiry_date) {
      Alert.alert('Error', 'Please provide expiry date for Insurance Certificate');
      return;
    }
    if (formData.registration_certificate && !formData.registration_expiry_date) {
      Alert.alert('Error', 'Please provide expiry date for Registration Certificate');
      return;
    }
    if (formData.photos.length === 0) {
      Alert.alert('Error', 'At least one photo is required');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('token', token || '');
      fd.append('make', formData.make);
      fd.append('model', formData.model);
      fd.append('year', formData.year);
      fd.append('license_plate', formData.license_plate);
      fd.append('color', formData.color);
      fd.append('seating_capacity', formData.seating_capacity);
      fd.append('fuel_type', formData.fuel_type);
      fd.append('status', formData.status);
      fd.append('vehicle_type', formData.vehicle_type);
      fd.append('office', formData.office_id);

      if (formData.pollution_certificate) {
        fd.append('pollution_certificate', formData.pollution_certificate as any);
        fd.append('pollution_expiry_date', formData.pollution_expiry_date);
      }
      if (formData.insurance_certificate) {
        fd.append('insurance_certificate', formData.insurance_certificate as any);
        fd.append('insurance_expiry_date', formData.insurance_expiry_date);
      }
      if (formData.registration_certificate) {
        fd.append('registration_certificate', formData.registration_certificate as any);
        fd.append('registration_expiry_date', formData.registration_expiry_date);
      }
      formData.photos.forEach((photo) => fd.append('photos', photo as any));

      const response = await fetch(`${BACKEND_URL}/manager/createVehicle`, {
        method: 'POST',
        body: fd,
      });
      const text = await response.text();
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (response.ok) {
          Alert.alert('Success', 'Vehicle created successfully!');
          onCarCreated();
          onBack();
        } else {
          Alert.alert('Error', data.message || 'Failed to create vehicle');
        }
      } else {
        Alert.alert('Error', 'Invalid response from server');
      }
    } catch {
      Alert.alert('Error', 'Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Utilities ──────────────────────────────────────────────────────────────

  const closeAllDropdowns = () => {
    setDropdownOpen(false);
    setVehicleTypeDropdownOpen(false);
    setStatusDropdownOpen(false);
  };

  const formatOfficeAddress = (office: Office) =>
    `${office.address.address}, ${office.address.city}, ${office.address.state}, ${office.address.country} - ${office.address.zip_code}`;

  const today = new Date();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screenContainer}>
      {/* Page header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.detailBackButton} onPress={onBack}>
          <View style={styles.backIcon}>
            <View style={styles.backArrow} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Add New Vehicle</Text>
        <View style={styles.detailHeaderSpacer} />
      </View>

      {/* ── Upload method modal ─────────────────────────────────────────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={uploadMethodModalVisible}
        onRequestClose={() => setUploadMethodModalVisible(false)}
      >
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            <Text style={styles.uploadModalTitle}>
              {currentUploadType === 'photo' ? 'Add Photo' : 'Upload Document'}
            </Text>
            <Text style={styles.uploadModalSubtitle}>Choose how you want to upload</Text>

            <TouchableOpacity style={styles.uploadMethodButton} onPress={handleCameraPick}>
              <MaterialIcons name="camera-alt" size={28} color="#075E54" />
              <View style={styles.uploadMethodTextContainer}>
                <Text style={styles.uploadMethodButtonText}>Take Photo</Text>
                <Text style={styles.uploadMethodButtonSubtext}>Use camera to capture</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadMethodButton} onPress={handleGalleryPick}>
              <MaterialIcons name="photo-library" size={28} color="#075E54" />
              <View style={styles.uploadMethodTextContainer}>
                <Text style={styles.uploadMethodButtonText}>Choose from Gallery</Text>
                <Text style={styles.uploadMethodButtonSubtext}>Select from photo library</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>

            {currentUploadType !== 'photo' && (
              <TouchableOpacity style={styles.uploadMethodButton} onPress={handleFilePick}>
                <MaterialIcons name="insert-drive-file" size={28} color="#075E54" />
                <View style={styles.uploadMethodTextContainer}>
                  <Text style={styles.uploadMethodButtonText}>Browse Files</Text>
                  <Text style={styles.uploadMethodButtonSubtext}>Choose PDF or image file</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.uploadModalCancelButton}
              onPress={() => setUploadMethodModalVisible(false)}
            >
              <Text style={styles.uploadModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Main form ──────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Information */}
          <View style={[styles.formSection, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 15, fontWeight: '400' }]}>
              Basic Information
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Make *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.make}
                onChangeText={(t) => setFormData((p) => ({ ...p, make: t }))}
                placeholder="e.g., Toyota, Honda"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Model *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.model}
                onChangeText={(t) => setFormData((p) => ({ ...p, model: t }))}
                placeholder="e.g., Camry, Civic"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Year</Text>
              <TextInput
                style={styles.formInput}
                value={formData.year}
                onChangeText={(t) => setFormData((p) => ({ ...p, year: t }))}
                placeholder="e.g., 2023"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>License Plate *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.license_plate}
                onChangeText={(t) => setFormData((p) => ({ ...p, license_plate: t }))}
                placeholder="e.g., MH01AB1234"
                autoCapitalize="characters"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Color *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.color}
                onChangeText={(t) => setFormData((p) => ({ ...p, color: t }))}
                placeholder="e.g., White, Black"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Seating Capacity</Text>
              <TextInput
                style={styles.formInput}
                value={formData.seating_capacity}
                onChangeText={(t) => setFormData((p) => ({ ...p, seating_capacity: t }))}
                placeholder="4"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            {/* Fuel Type dropdown */}
            <View style={[styles.formGroup, { zIndex: dropdownOpen ? 3000 : 1 }]}>
              <Text style={[styles.formLabel, { marginBottom: 6 }]}>Fuel Type</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setDropdownOpen((v) => !v);
                    setVehicleTypeDropdownOpen(false);
                    setStatusDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{formData.fuel_type || 'Select Fuel Type'}</Text>
                  <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {dropdownOpen && (
                  <View style={styles.dropdownList}>
                    {fuelTypes.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData((p) => ({ ...p, fuel_type: t }));
                          setDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Vehicle Type dropdown */}
            <View style={[styles.formGroup, { zIndex: vehicleTypeDropdownOpen ? 2000 : 1 }]}>
              <Text style={[styles.formLabel, { marginBottom: 6 }]}>Vehicle Type</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setVehicleTypeDropdownOpen((v) => !v);
                    setDropdownOpen(false);
                    setStatusDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{formData.vehicle_type || 'Select Vehicle Type'}</Text>
                  <Text style={styles.dropdownArrow}>{vehicleTypeDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {vehicleTypeDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {vehicleTypes.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData((p) => ({ ...p, vehicle_type: t }));
                          setVehicleTypeDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Status dropdown */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { marginBottom: 6 }]}>Status</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setStatusDropdownOpen((v) => !v)}
                >
                  <Text style={styles.dropdownText}>
                    {formData.status
                      ? formData.status.replace('_', ' ').toUpperCase()
                      : 'Select Status'}
                  </Text>
                  <Text style={styles.dropdownArrow}>{statusDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {statusDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {statuses.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData((p) => ({ ...p, status: s }));
                          setStatusDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {s.replace('_', ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Office Selection */}
          <View
            style={[
              styles.formSection,
              { zIndex: dropdownOpen || vehicleTypeDropdownOpen || statusDropdownOpen ? -1 : 1 },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 15, fontWeight: '400' }]}>
              Office Selection
            </Text>
            <Text style={styles.formLabel}>Select Office *</Text>

            {loadingOffices ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#075E54" />
                <Text style={styles.loadingText}>Loading offices...</Text>
              </View>
            ) : offices.length === 0 ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={24} color="#FF9500" />
                <Text style={styles.errorText}>No offices found. Please contact administrator.</Text>
              </View>
            ) : (
              <View style={styles.officeListContainer}>
                {offices.map((office) => (
                  <TouchableOpacity
                    key={office.id}
                    style={[
                      styles.officeItem,
                      formData.office_id === office.id.toString() && styles.officeItemSelected,
                    ]}
                    onPress={() => {
                      closeAllDropdowns();
                      setFormData((p) => ({ ...p, office_id: office.id.toString() }));
                    }}
                  >
                    <View style={styles.officeRadio}>
                      <View
                        style={[
                          styles.radioOuter,
                          formData.office_id === office.id.toString() && styles.radioOuterSelected,
                        ]}
                      >
                        {formData.office_id === office.id.toString() && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </View>
                    <View style={styles.officeInfo}>
                      <Text style={styles.officeName}>{office.name || 'Unnamed Office'}</Text>
                      <Text style={styles.officeAddress} numberOfLines={2}>
                        {formatOfficeAddress(office)}
                      </Text>
                      <Text style={styles.officeCity}>
                        {office.address.city}, {office.address.state}
                      </Text>
                    </View>
                    {city &&
                      office.address.city.toLowerCase().includes(city.toLowerCase()) && (
                        <View style={styles.currentCityBadge}>
                          <Text style={styles.currentCityText}>Current City</Text>
                        </View>
                      )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {formData.office_id && (
              <View style={styles.selectedOfficeContainer}>
                <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.selectedOfficeText}>
                  Office Selected:{' '}
                  {offices.find((o) => o.id.toString() === formData.office_id)?.name ||
                    offices.find((o) => o.id.toString() === formData.office_id)?.address.city}
                </Text>
              </View>
            )}
          </View>

          {/* ── Documents ─────────────────────────────────────────────────────
           *
           * Previously: each certificate had its own DateTimePicker + Modal
           * block with pollutionDatePickerOpen / insuranceDatePickerOpen /
           * registrationDatePickerOpen state variables, and the iOS path
           * duplicated a full Modal implementation three times.
           *
           * Now: each expiry field is a single <CrossPlatformDatePicker />.
           * The component owns all picker state internally and emits YYYY-MM-DD
           * strings, matching the backend expectation and eliminating the need
           * for full ISO strings in local state.
           */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 15, fontWeight: '400' }]}>
              Documents
            </Text>

            {/* Pollution Certificate */}
            <View style={styles.documentGroup}>
              <Text style={[styles.formLabel, { marginBottom: 10 }]}>Pollution Certificate</Text>
              {formData.pollution_certificate ? (
                <View style={styles.documentSelected}>
                  <View style={styles.documentIconContainer}>
                    <MaterialIcons name="description" size={28} color="#075E54" />
                  </View>
                  <View style={[styles.documentInfo, { width: 150 }]}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {formData.pollution_certificate.name}
                    </Text>
                    <Text style={styles.documentSize}>
                      {formData.pollution_certificate.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      setFormData((p) => ({
                        ...p,
                        pollution_certificate: null,
                        pollution_expiry_date: '',
                      }))
                    }
                  >
                    <Ionicons name="close-circle" size={28} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={() => showUploadMethodModal('pollution')}
                >
                  <View style={styles.uploadIconContainer}>
                    <MaterialIcons name="cloud-upload" size={28} color="#075E54" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.documentButtonText}>Upload Pollution Certificate</Text>
                    <Text style={styles.documentButtonSubtext}>PDF or Image (Max 5MB)</Text>
                  </View>
                </TouchableOpacity>
              )}

              {formData.pollution_certificate && (
                <View style={styles.expiryDateContainer}>
                  <Text style={[styles.expiryLabel, { marginTop: 8, marginBottom: 6 }]}>
                    Expiry Date *
                  </Text>
                  <CrossPlatformDatePicker
                    value={formData.pollution_expiry_date}
                    onChange={(d) => setFormData((p) => ({ ...p, pollution_expiry_date: d }))}
                    placeholder="Select expiry date"
                    minimumDate={today}
                    accentColor="#075E54"
                    accessibilityLabel="Pollution certificate expiry date"
                  />
                </View>
              )}
            </View>

            {/* Insurance Certificate */}
            <View style={styles.documentGroup}>
              <Text style={[styles.formLabel, { marginBottom: 10 }]}>Insurance Certificate</Text>
              {formData.insurance_certificate ? (
                <View style={styles.documentSelected}>
                  <View style={styles.documentIconContainer}>
                    <MaterialIcons name="description" size={28} color="#075E54" />
                  </View>
                  <View style={[styles.documentInfo, { width: 150 }]}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {formData.insurance_certificate.name}
                    </Text>
                    <Text style={styles.documentSize}>
                      {formData.insurance_certificate.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      setFormData((p) => ({
                        ...p,
                        insurance_certificate: null,
                        insurance_expiry_date: '',
                      }))
                    }
                  >
                    <Ionicons name="close-circle" size={28} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={() => showUploadMethodModal('insurance')}
                >
                  <View style={styles.uploadIconContainer}>
                    <MaterialIcons name="cloud-upload" size={28} color="#075E54" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.documentButtonText}>Upload Insurance Certificate</Text>
                    <Text style={styles.documentButtonSubtext}>PDF or Image (Max 5MB)</Text>
                  </View>
                </TouchableOpacity>
              )}

              {formData.insurance_certificate && (
                <View style={styles.expiryDateContainer}>
                  <Text style={[styles.expiryLabel, { marginTop: 8, marginBottom: 6 }]}>
                    Expiry Date *
                  </Text>
                  <CrossPlatformDatePicker
                    value={formData.insurance_expiry_date}
                    onChange={(d) => setFormData((p) => ({ ...p, insurance_expiry_date: d }))}
                    placeholder="Select expiry date"
                    minimumDate={today}
                    accentColor="#075E54"
                    accessibilityLabel="Insurance certificate expiry date"
                  />
                </View>
              )}
            </View>

            {/* Registration Certificate */}
            <View style={styles.documentGroup}>
              <Text style={[styles.formLabel, { marginBottom: 10 }]}>Registration Certificate</Text>
              {formData.registration_certificate ? (
                <View style={styles.documentSelected}>
                  <View style={styles.documentIconContainer}>
                    <MaterialIcons name="description" size={28} color="#075E54" />
                  </View>
                  <View style={[styles.documentInfo, { width: 150 }]}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {formData.registration_certificate.name}
                    </Text>
                    <Text style={styles.documentSize}>
                      {formData.registration_certificate.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>
                      setFormData((p) => ({
                        ...p,
                        registration_certificate: null,
                        registration_expiry_date: '',
                      }))
                    }
                  >
                    <Ionicons name="close-circle" size={28} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={() => showUploadMethodModal('registration')}
                >
                  <View style={styles.uploadIconContainer}>
                    <MaterialIcons name="cloud-upload" size={28} color="#075E54" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.documentButtonText}>Upload Registration Certificate</Text>
                    <Text style={styles.documentButtonSubtext}>PDF or Image (Max 5MB)</Text>
                  </View>
                </TouchableOpacity>
              )}

              {formData.registration_certificate && (
                <View style={styles.expiryDateContainer}>
                  <Text style={[styles.expiryLabel, { marginTop: 8, marginBottom: 6 }]}>
                    Expiry Date *
                  </Text>
                  <CrossPlatformDatePicker
                    value={formData.registration_expiry_date}
                    onChange={(d) => setFormData((p) => ({ ...p, registration_expiry_date: d }))}
                    placeholder="Select expiry date"
                    minimumDate={today}
                    accentColor="#075E54"
                    accessibilityLabel="Registration certificate expiry date"
                  />
                </View>
              )}
            </View>
          </View>

          {/* Vehicle Photos */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 4, fontWeight: '400' }]}>
                  Vehicle Photos
                </Text>
                <Text style={styles.photoSectionSubtitle}>
                  Add up to 6 photos (minimum 1 required) *
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoScrollContent}
              style={styles.photoScrollContainer}
            >
              {[...Array(6)].map((_, index) => {
                const photo = formData.photos[index];
                const hasPhoto = photo !== undefined;
                const isFirstPhoto = index === 0;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoSlot,
                      isFirstPhoto && styles.firstPhotoSlot,
                      hasPhoto && styles.photoSlotFilled,
                    ]}
                    onPress={() => {
                      if (!hasPhoto && formData.photos.length < 6) {
                        showUploadMethodModal('photo');
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={hasPhoto}
                  >
                    {hasPhoto ? (
                      <>
                        <View style={styles.photoPreviewContainer}>
                          <MaterialIcons name="image" size={48} color="#075E54" />
                          <Text style={styles.photoFileName} numberOfLines={2}>
                            {photo.name}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => {
                            const newPhotos = [...formData.photos];
                            newPhotos.splice(index, 1);
                            setFormData((p) => ({ ...p, photos: newPhotos }));
                          }}
                        >
                          <Ionicons name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.photoIndexBadge}>
                          <Text style={styles.photoIndexText}>{index + 1}</Text>
                        </View>
                        {isFirstPhoto && (
                          <View style={styles.primaryPhotoBadge}>
                            <MaterialIcons name="star" size={12} color="#FFD700" />
                            <Text style={styles.primaryPhotoText}>Primary</Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.emptyPhotoSlot}>
                        <View style={styles.addPhotoIconContainer}>
                          <Ionicons name="add" size={32} color="#075E54" />
                        </View>
                        <Text style={styles.addPhotoText}>Add Photo</Text>
                        <Text style={styles.photoSlotNumber}>{index + 1}</Text>
                        {isFirstPhoto && (
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredBadgeText}>Required</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {formData.photos.length > 0 && (
              <View style={styles.photoCountContainer}>
                <MaterialIcons name="photo" size={16} color="#075E54" />
                <Text style={styles.photoCountText}>
                  {formData.photos.length} of 6 photos added
                </Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || !formData.office_id) && styles.submitButtonDisabled,
              { width: '90%', alignItems: 'center', justifyContent: 'center', marginLeft: 20 },
            ]}
            onPress={handleSubmit}
            disabled={loading || !formData.office_id}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="car" size={24} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Add Vehicle</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default CreateCar;