import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';

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
};

interface Site {
  id: number;
  building_name: string;
  location_link: string;
  location: string;
  landmark: string;
  total_floors: string;
  number_of_basements: string;
  floor_condition: string;
  area_per_floor: string;
  total_area: string;
  availble_floors: string;
  car_parking_charges: string;
  car_parking_ratio: string;
  car_parking_slots: string;
  building_status: string;
  rent: string;
  cam: string;
  cam_deposit: string;
  oc: boolean;
  rental_escalation: string;
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
  area_offered: string;
  maintenance_rate: string;
  managed_property: boolean;
  conventional_property: boolean;
  business_hours_of_operation: string;
  premises_access: string;
  total_seats: string;
  rent_per_seat: string;
  seats_available: string;
  number_of_units: string;
  number_of_seats_per_unit: string;
  latitude: string;
  longitude: string;
  nearest_metro_station: any;
  building_photos: Array<{
    id: number;
    file_url: string;
    description: string;
  }>;
  meta: any;
}

interface EditSiteProps {
  site: Site;
  token: string | null;
  onBack: () => void;
  onSiteUpdated: () => void;
  theme: any;
}

interface Photo {
  id: number;
  uri: string;
  type: string;
  description: string;
  isExisting?: boolean;
}

const EditSite: React.FC<EditSiteProps> = ({
  site,
  token,
  onBack,
  onSiteUpdated,
  theme,
}) => {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editedSite, setEditedSite] = useState<Site>(site);
  const [buildingPhotos, setBuildingPhotos] = useState<Photo[]>([]);
  const [photoDescriptions, setPhotoDescriptions] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<Photo[]>([]);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showBuildingStatusDropdown, setShowBuildingStatusDropdown] = useState(false);
  const [showFloorConditionDropdown, setShowFloorConditionDropdown] = useState(false);

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

  useEffect(() => {
    // Load existing photos
    const existingPhotos: Photo[] = site.building_photos.map(photo => ({
      id: photo.id,
      uri: photo.file_url,
      type: 'image/jpeg',
      description: photo.description || '',
      isExisting: true,
    }));
    setBuildingPhotos(existingPhotos);
    setPhotoDescriptions(existingPhotos.map(photo => photo.description));
  }, [site]);

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleFieldChange = useCallback((field: keyof Site, value: any) => {
    setEditedSite(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddPhoto = () => {
    setShowImageSourceModal(true);
  };

  const pickImageFromCamera = async () => {
    setShowImageSourceModal(false);
    
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
        const newPhoto: Photo = {
          id: Date.now(),
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          description: '',
        };
        setNewPhotos(prev => [...prev, newPhoto]);
        setBuildingPhotos(prev => [...prev, newPhoto]);
        setPhotoDescriptions(prev => [...prev, '']);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture image from camera');
    }
  };

  const pickImageFromGallery = async () => {
    setShowImageSourceModal(false);
    
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required to select photos.');
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
        const newPhoto: Photo = {
          id: Date.now(),
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          description: '',
        };
        setNewPhotos(prev => [...prev, newPhoto]);
        setBuildingPhotos(prev => [...prev, newPhoto]);
        setPhotoDescriptions(prev => [...prev, '']);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    const photo = buildingPhotos[index];
    if (photo.isExisting) {
      // Mark existing photo for deletion (you would handle this in backend)
      Alert.alert(
        'Remove Photo',
        'This photo will be removed when you save changes.',
        [{ text: 'OK' }]
      );
    }
    setBuildingPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoDescriptions(prev => prev.filter((_, i) => i !== index));
    setNewPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  const handleUpdatePhotoDescription = (index: number, description: string) => {
    const newDescriptions = [...photoDescriptions];
    newDescriptions[index] = description;
    setPhotoDescriptions(newDescriptions);
  };

  const handleUpdateSite = async () => {
    if (!token) {
      Alert.alert('Error', 'Token not found. Please login again.');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('site_id', editedSite.id.toString());
      
      // Append all updated site data
      Object.entries(editedSite).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          // Skip fields that shouldn't be sent
          if (key === 'id' || key === 'building_photos' || key === 'meta' || key === 'created_by') {
            return;
          }
          formData.append(key, String(value));
        }
      });

      // Append new photos
      newPhotos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}_${index}.jpg`,
        } as any);
        
        const description = photoDescriptions[buildingPhotos.findIndex(p => p.id === photo.id)];
        if (description) {
          formData.append('photo_descriptions', description);
        }
      });

      const response = await fetch(`${BACKEND_URL}/manager/updateSite`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
        throw new Error(responseData.message || `HTTP ${response.status}: Failed to update site`);
      }

      if (responseData.message !== 'Site updated successfully') {
        throw new Error(responseData.message || 'Failed to update site');
      }

      Alert.alert('Success', 'Site updated successfully!');
      onSiteUpdated();
    } catch (error: any) {
      console.error('Site update error:', error);
      Alert.alert('Error', error.message || 'Failed to update site');
    } finally {
      setUpdating(false);
    }
  };

  const renderSection = (title: string, fields: Array<{
    label: string;
    field: keyof Site;
    type: 'text' | 'number' | 'boolean' | 'dropdown';
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
  }>) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {fields.map(({ label, field, type, placeholder, options }) => (
        <View key={field} style={styles.field}>
          <Text style={styles.fieldLabel}>{label}</Text>
          
          {type === 'text' && (
            <TextInput
              style={styles.textInput}
              value={String(editedSite[field] || '')}
              onChangeText={(value) => handleFieldChange(field, value)}
              placeholder={placeholder}
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          )}
          
          {type === 'number' && (
            <TextInput
              style={styles.textInput}
              value={String(editedSite[field] || '')}
              onChangeText={(value) => handleFieldChange(field, value)}
              placeholder={placeholder}
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              keyboardType="numeric"
            />
          )}
          
          {type === 'boolean' && (
            <View style={styles.switchContainer}>
              <Switch
                value={Boolean(editedSite[field])}
                onValueChange={(value) => handleFieldChange(field, value)}
                trackColor={{ false: WHATSAPP_COLORS.border, true: WHATSAPP_COLORS.primary }}
                thumbColor={WHATSAPP_COLORS.white}
              />
              <Text style={styles.switchLabel}>
                {Boolean(editedSite[field]) ? 'Yes' : 'No'}
              </Text>
            </View>
          )}
          
          {type === 'dropdown' && field === 'building_status' && (
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowBuildingStatusDropdown(true)}
            >
              <Text style={styles.dropdownButtonText}>
                {beautifyName(String(editedSite[field] || '')) || 'Select...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          
          {type === 'dropdown' && field === 'floor_condition' && (
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowFloorConditionDropdown(true)}
            >
              <Text style={styles.dropdownButtonText}>
                {beautifyName(String(editedSite[field] || '')) || 'Select...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  const ImageSourceModal = () => (
    <Modal visible={showImageSourceModal} transparent animationType="fade" onRequestClose={() => setShowImageSourceModal(false)}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowImageSourceModal(false)}
      >
        <View style={styles.imageSourceContainer}>
          <Text style={styles.modalTitle}>Add Photo</Text>
          
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

  const DropdownModal = ({ visible, options, onSelect, onClose, title }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dropdownModalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.dropdownOptions}>
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
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
        <Text style={styles.headerTitle}>Edit Site</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleUpdateSite}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Basic Information */}
          {renderSection('🏢 Basic Information', [
            { label: 'Building Name', field: 'building_name', type: 'text', placeholder: 'Enter building name' },
            { label: 'Location', field: 'location', type: 'text', placeholder: 'Enter location' },
            { label: 'Landmark', field: 'landmark', type: 'text', placeholder: 'Enter landmark' },
            { label: 'Location Link', field: 'location_link', type: 'text', placeholder: 'Google Maps link' },
          ])}

          {/* Property Specifications */}
          {renderSection('📐 Property Specifications', [
            { label: 'Total Floors', field: 'total_floors', type: 'number', placeholder: 'Enter total floors' },
            { label: 'Basements', field: 'number_of_basements', type: 'number', placeholder: 'Enter number of basements' },
            { label: 'Floor Condition', field: 'floor_condition', type: 'dropdown', options: FLOOR_CONDITION_OPTIONS },
            { label: 'Total Area (sq ft)', field: 'total_area', type: 'number', placeholder: 'Enter total area' },
            { label: 'Area/Floor (sq ft)', field: 'area_per_floor', type: 'number', placeholder: 'Enter area per floor' },
            { label: 'Available Floors', field: 'availble_floors', type: 'text', placeholder: 'Enter available floors' },
            { label: 'Area Offered', field: 'area_offered', type: 'text', placeholder: 'Enter area offered' },
          ])}

          {/* Financial Details */}
          {renderSection('💰 Financial Details', [
            { label: 'Building Status', field: 'building_status', type: 'dropdown', options: BUILDING_STATUS_OPTIONS },
            { label: 'Monthly Rent (₹)', field: 'rent', type: 'number', placeholder: 'Enter monthly rent' },
            { label: 'CAM (₹)', field: 'cam', type: 'number', placeholder: 'Enter CAM charges' },
            { label: 'CAM Deposit (₹)', field: 'cam_deposit', type: 'number', placeholder: 'Enter CAM deposit' },
            { label: 'Security Deposit (Months)', field: 'security_deposit', type: 'number', placeholder: 'Enter security deposit' },
            { label: 'Lease Term', field: 'lease_term', type: 'text', placeholder: 'Enter lease term' },
            { label: 'Lock-in Period', field: 'lock_in_period', type: 'text', placeholder: 'Enter lock-in period' },
            { label: 'Notice Period', field: 'notice_period', type: 'text', placeholder: 'Enter notice period' },
            { label: 'Rental Escalation (%)', field: 'rental_escalation', type: 'number', placeholder: 'Enter rental escalation' },
            { label: 'Maintenance Rate', field: 'maintenance_rate', type: 'text', placeholder: 'Enter maintenance rate' },
            { label: 'OC Available', field: 'oc', type: 'boolean' },
            { label: 'Developer Will Do Fitouts', field: 'will_developer_do_fitouts', type: 'boolean' },
          ])}

          {/* Parking & Utilities */}
          {renderSection('🚗 Parking & Utilities', [
            { label: 'Car Parking Ratio', field: 'car_parking_ratio', type: 'text', placeholder: 'e.g., 1:1000' },
            { label: 'Car Parking Slots', field: 'car_parking_slots', type: 'number', placeholder: 'Enter car parking slots' },
            { label: 'Car Parking Charges (₹)', field: 'car_parking_charges', type: 'number', placeholder: 'Enter car parking charges' },
            { label: 'Two Wheeler Slots', field: 'two_wheeler_slots', type: 'number', placeholder: 'Enter two wheeler slots' },
            { label: 'Two Wheeler Charges (₹)', field: 'two_wheeler_charges', type: 'number', placeholder: 'Enter two wheeler charges' },
            { label: 'Power', field: 'power', type: 'text', placeholder: 'Enter power details' },
            { label: 'Power Backup', field: 'power_backup', type: 'text', placeholder: 'Enter power backup details' },
          ])}

          {/* Contact Information */}
          {renderSection('👤 Contact Information', [
            { label: 'Building Owner Name', field: 'building_owner_name', type: 'text', placeholder: 'Enter owner name' },
            { label: 'Building Owner Contact', field: 'building_owner_contact', type: 'text', placeholder: 'Enter owner contact' },
            { label: 'Contact Person Name', field: 'contact_person_name', type: 'text', placeholder: 'Enter contact person name' },
            { label: 'Contact Person Designation', field: 'contact_person_designation', type: 'text', placeholder: 'Enter designation' },
            { label: 'Contact Person Number', field: 'contact_person_number', type: 'text', placeholder: 'Enter contact number' },
            { label: 'Contact Person Email', field: 'contact_person_email', type: 'text', placeholder: 'Enter email' },
            { label: 'Remarks', field: 'remarks', type: 'text', placeholder: 'Enter any remarks' },
          ])}

          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Photos</Text>
            <Text style={styles.sectionDescription}>
              Add or update building photos
            </Text>
            
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
            >
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={styles.addPhotoButtonText}>Add Photo</Text>
            </TouchableOpacity>

            {buildingPhotos.length > 0 && (
              <View style={styles.photosContainer}>
                <Text style={styles.photosTitle}>
                  {buildingPhotos.length} photo(s)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {buildingPhotos.map((photo, index) => (
                    <View key={photo.id} style={styles.photoItem}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photoImage}
                      />
                      <TextInput
                        style={styles.photoDescription}
                        value={photoDescriptions[index]}
                        onChangeText={(text) => handleUpdatePhotoDescription(index, text)}
                        placeholder="Description"
                        placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                      />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemovePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={24} color={WHATSAPP_COLORS.danger} />
                      </TouchableOpacity>
                      {photo.isExisting && (
                        <View style={styles.existingBadge}>
                          <Text style={styles.existingBadgeText}>Existing</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ImageSourceModal />
      <DropdownModal
        visible={showBuildingStatusDropdown}
        options={BUILDING_STATUS_OPTIONS}
        onSelect={(value: string) => handleFieldChange('building_status', value)}
        onClose={() => setShowBuildingStatusDropdown(false)}
        title="Select Building Status"
      />
      <DropdownModal
        visible={showFloorConditionDropdown}
        options={FLOOR_CONDITION_OPTIONS}
        onSelect={(value: string) => handleFieldChange('floor_condition', value)}
        onClose={() => setShowFloorConditionDropdown(false)}
        title="Select Floor Condition"
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  formContainer: {
    padding: 20,
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
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  addPhotoButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addPhotoButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  photosContainer: {
    marginTop: 8,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },
  photoItem: {
    marginRight: 12,
    width: 150,
    position: 'relative',
  },
  photoImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
  },
  photoDescription: {
    marginTop: 8,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: WHATSAPP_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: WHATSAPP_COLORS.white,
    borderRadius: 12,
  },
  existingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: WHATSAPP_COLORS.info,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingBadgeText: {
    fontSize: 10,
    color: WHATSAPP_COLORS.white,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageSourceContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  dropdownModalContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  imageSourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    marginBottom: 12,
    gap: 12,
  },
  imageSourceText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '600',
  },
  dropdownOptions: {
    maxHeight: 300,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
  },
});

export default EditSite;