import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Visit } from './types';

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

type StatusType = 'pending' | 'scout_completed' | 'admin_completed' | 'cancelled';

interface EditableFieldType {
  [key: string]: string;
}

interface EditSiteVisitProps {
  visit: Visit;
  onBack: () => void;
  onUpdate?: () => void;
  token: string | null;
  theme: ThemeColors;
}

const EditSiteVisit: React.FC<EditSiteVisitProps> = ({ visit, onBack, onUpdate, token, theme }) => {
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editedVisit, setEditedVisit] = useState<Visit>(visit);
  const [editableFields, setEditableFields] = useState<EditableFieldType>({});
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const STATUS_OPTIONS: Array<{ label: string; value: StatusType }> = [
    { label: 'Pending', value: 'pending' },
    { label: 'Scout Completed', value: 'scout_completed' },
    { label: 'Admin Completed', value: 'admin_completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const EDITABLE_FIELDS = [
    'building_name',
    'location',
    'landmark',
    'building_status',
    'floor_condition',
    'total_floors',
    'number_of_basements',
    'total_seats',
    'seats_available',
    'number_of_units',
    'number_of_seats_per_unit',
    'business_hours_of_operation',
    'premises_access',
    'total_area',
    'area_per_floor',
    'availble_floors',
    'area_offered',
    'rent',
    'rent_per_seat',
    'maintenance_rate',
    'cam_deposit',
    'security_deposit',
    'lease_term',
    'lock_in_period',
    'notice_period',
    'rental_escalation',
    'car_parking_charges',
    'car_parking_slots',
    'car_parking_ratio',
    'two_wheeler_charges',
    'two_wheeler_slots',
    'building_owner_name',
    'building_owner_contact',
    'contact_person_name',
    'contact_person_number',
    'contact_person_email',
    'contact_person_designation',
    'remarks',
  ];

  useEffect(() => {
    // Initialize editable fields with current values
    const initialFields: EditableFieldType = {};
    if (visit.site) {
      EDITABLE_FIELDS.forEach(field => {
        const value = (visit.site as any)?.[field];
        initialFields[field] = value ? String(value) : '';
      });
    }
    setEditableFields(initialFields);
  }, [visit]);

  const beautifyName = (name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getStatusLabel = (status: string): string => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.label : beautifyName(status);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditableFields(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleUpdateVisit = async () => {
    if (!token) {
      Alert.alert('Error', 'Token not found. Please login again.');
      return;
    }

    setUpdating(true);
    try {
      // Build update payload for updateVisitDetails endpoint
      const updatePayload: any = {
        token,
        visit_id: visit.id,
      };

      // Add all editable fields to payload
      EDITABLE_FIELDS.forEach(field => {
        if (editableFields[field] !== undefined && editableFields[field] !== '') {
          const value = editableFields[field];
          // Convert numeric fields appropriately
          updatePayload[field] = isNaN(Number(value)) ? value : Number(value);
        }
      });

      // Add status if it has changed
      if (editedVisit.status !== visit.status) {
        updatePayload.status = editedVisit.status;
      }

      console.log('Update payload:', updatePayload);

      // Update visit details (handles both details and status)
      const response = await fetch(`${BACKEND_URL}/employee/updateVisitDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Update response:', data);
      
      if (!data.message || !data.message.includes('successfully')) {
        throw new Error(data.message || 'Failed to update visit details');
      }

      Alert.alert('Success', 'Visit updated successfully!');
      setIsEditing(false);
      
      // Call the onUpdate callback to refresh parent component
      if (onUpdate) {
        onUpdate();
      }
      
      // Delay before going back to ensure data is refreshed
      setTimeout(() => {
        onBack();
      }, 500);
    } catch (error) {
      console.error('Error updating visit:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update visit');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!token) {
      Alert.alert('Error', 'Token not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/markVisitCompleted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, visit_id: visit.id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Mark complete response:', data);
      
      if (!data.message || !data.message.includes('successfully')) {
        throw new Error(data.message || 'Failed to mark visit as complete');
      }

      Alert.alert('Success', 'Visit marked as completed!');
      
      // Call the onUpdate callback to refresh parent component
      if (onUpdate) {
        onUpdate();
      }
      
      // Delay before going back to ensure data is refreshed
      setTimeout(() => {
        onBack();
      }, 500);
    } catch (error) {
      console.error('Error marking visit complete:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to mark visit as complete');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset editable fields to original values
    const initialFields: EditableFieldType = {};
    if (visit.site) {
      EDITABLE_FIELDS.forEach(field => {
        const value = (visit.site as any)?.[field];
        initialFields[field] = value ? String(value) : '';
      });
    }
    setEditableFields(initialFields);
    setEditedVisit(visit);
    setIsEditing(false);
  };

  const renderEditableField = (label: string, fieldName: string, placeholder: string = '') => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={styles.textInput}
          value={editableFields[fieldName] || ''}
          onChangeText={(value) => handleFieldChange(fieldName, value)}
          placeholder={placeholder}
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        />
      ) : (
        <View style={styles.displayField}>
          <Text style={styles.displayFieldText}>
            {editableFields[fieldName] || '-'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderDetailSection = (title: string, details: Array<{ label: string; fieldName: string }>) => (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      <View style={styles.detailGrid}>
        {details.map((item, idx) => (
          <View 
            key={`${title}-${idx}`} 
            style={[
              styles.detailItemContainer,
              isEditing ? styles.detailItemContainerEdit : styles.detailItemContainerView
            ]}
          >
            <Text style={styles.detailLabel}>{item.label}</Text>
            {isEditing ? (
              <TextInput
                style={styles.detailInputEdit}
                value={editableFields[item.fieldName] || ''}
                onChangeText={(value) => handleFieldChange(item.fieldName, value)}
                placeholder="Enter value"
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            ) : (
              <Text style={styles.detailValue}>{editableFields[item.fieldName] || '-'}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const getVisitDetails = () => {
    const site = visit.site;
    const isManaged = site?.managed_property === true;

    const basicInfo = [
      { label: 'Building Name', fieldName: 'building_name' },
      { label: 'Location', fieldName: 'location' },
      { label: 'Landmark', fieldName: 'landmark' },
      { label: 'Building Status', fieldName: 'building_status' },
      { label: 'Floor Condition', fieldName: 'floor_condition' },
      { label: 'Total Floors', fieldName: 'total_floors' },
      { label: 'Basements', fieldName: 'number_of_basements' },
    ];

    const additionalBasicInfo = isManaged
      ? [
          { label: 'Total Seats', fieldName: 'total_seats' },
          { label: 'Seats Available', fieldName: 'seats_available' },
          { label: 'Number of Units', fieldName: 'number_of_units' },
          { label: 'Seats Per Unit', fieldName: 'number_of_seats_per_unit' },
          { label: 'Business Hours', fieldName: 'business_hours_of_operation' },
          { label: 'Premises Access', fieldName: 'premises_access' },
        ]
      : [
          { label: 'Total Area', fieldName: 'total_area' },
          { label: 'Area per Floor', fieldName: 'area_per_floor' },
          { label: 'Available Floors', fieldName: 'availble_floors' },
          { label: 'Area Offered', fieldName: 'area_offered' },
        ];

    const financialInfo = [
      { label: 'Rent', fieldName: 'rent' },
      { label: 'Rent Per Seat', fieldName: 'rent_per_seat' },
      { label: 'Maintenance Rate', fieldName: 'maintenance_rate' },
      { label: 'CAM Deposit', fieldName: 'cam_deposit' },
      { label: 'Security Deposit', fieldName: 'security_deposit' },
      { label: 'Lease Term', fieldName: 'lease_term' },
      { label: 'Lock-in Period', fieldName: 'lock_in_period' },
      { label: 'Notice Period', fieldName: 'notice_period' },
      { label: 'Rental Escalation', fieldName: 'rental_escalation' },
    ];

    const parkingInfo = [
      { label: 'Car Parking Charges', fieldName: 'car_parking_charges' },
      { label: 'Car Parking Slots', fieldName: 'car_parking_slots' },
      { label: 'Car Parking Ratio', fieldName: 'car_parking_ratio' },
      { label: 'Two Wheeler Charges', fieldName: 'two_wheeler_charges' },
      { label: 'Two Wheeler Slots', fieldName: 'two_wheeler_slots' },
    ];

    const contactInfo = [
      { label: 'Building Owner', fieldName: 'building_owner_name' },
      { label: 'Owner Contact', fieldName: 'building_owner_contact' },
      { label: 'Contact Person', fieldName: 'contact_person_name' },
      { label: 'Phone', fieldName: 'contact_person_number' },
      { label: 'Email', fieldName: 'contact_person_email' },
      { label: 'Designation', fieldName: 'contact_person_designation' },
      { label: 'Remarks', fieldName: 'remarks' },
    ];

    return {
      basicInfo: [...basicInfo, ...additionalBasicInfo],
      financialInfo,
      parkingInfo,
      contactInfo,
    };
  };

  const details = getVisitDetails();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={isEditing ? handleCancel : onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Visit</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isEditing ? 'close' : 'pencil'}
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Status Update Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Status</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Current Status</Text>
              <View style={styles.currentStatusContainer}>
                <Text style={[styles.currentStatusText, { color: WHATSAPP_COLORS.success }]}>
                  {getStatusLabel(String(visit.status))}
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Change Status</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowStatusDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {getStatusLabel(String(editedVisit.status))}
                </Text>
                <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.updateButton, updating && styles.buttonDisabled]}
              onPress={handleUpdateVisit}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.updateButtonText}>Update Status</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Mark as Completed Button */}
          {String(visit.status) === 'pending' && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.completeButton, loading && styles.buttonDisabled]}
                onPress={handleMarkComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.completeButtonText}>Mark Visit as Completed</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Visit Details Sections */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithEdit}>
              <Text style={styles.sectionTitle}>Visit Details</Text>
              {isEditing && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateVisit}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {renderDetailSection('Basic Information', details.basicInfo)}
            {renderDetailSection('Financial Details', details.financialInfo)}
            {renderDetailSection('Parking Information', details.parkingInfo)}
            {renderDetailSection('Contact Information', details.contactInfo)}
          </View>
        </View>
      </ScrollView>

      {/* Status Dropdown Modal */}
      <Modal
        visible={showStatusDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Status</Text>
            <ScrollView style={styles.dropdownScroll}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setEditedVisit({ ...editedVisit, status: option.value });
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowStatusDropdown(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    paddingVertical: 14,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  backButton: {
    padding: 4,
  },
  editButton: {
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
    backgroundColor: WHATSAPP_COLORS.background,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  sectionHeaderWithEdit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  currentStatusContainer: {
    backgroundColor: WHATSAPP_COLORS.success + '15',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.success + '30',
  },
  currentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.white,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.white,
  },
  displayField: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
  },
  displayFieldText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },
  updateButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: WHATSAPP_COLORS.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: WHATSAPP_COLORS.success,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItemContainer: {
    width: '48%',
  },
  detailItemContainerView: {
    backgroundColor: 'transparent',
  },
  detailItemContainerEdit: {
    backgroundColor: 'transparent',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 8,
  },
  detailInputEdit: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.textSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.white,
  },
  detailValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  photosContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  photosCount: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: WHATSAPP_COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },
  dropdownScroll: {
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

export default EditSiteVisit;