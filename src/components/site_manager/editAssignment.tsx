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
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

interface EditAssignmentProps {
  visitId: number;
  onBack: () => void;
  onUpdate?: () => void;
  token: string | null;
}

interface VisitData {
  id: number;
  site: {
    building_name: string;
    location: string;
  };
  assigned_to: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  status: string;
  is_visible_to_scout: boolean;
  created_at: string;
}

const EditAssignment: React.FC<EditAssignmentProps> = ({
  visitId,
  onBack,
  onUpdate,
  token,
}) => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [apiToken, setApiToken] = useState<string | null>(token);
  const [scouts, setScouts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScout, setSelectedScout] = useState<any>(null);

  const [formData, setFormData] = useState({
    status: '',
    reassign_to: '',
    is_visible_to_scout: true,
  });

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
    if (apiToken && visitId) {
      fetchVisitDetails();
      fetchScouts();
    }
  }, [apiToken, visitId]);

  const fetchVisitDetails = async () => {
    if (!apiToken) return;

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/core/getSiteVisitDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiToken,
          visit_id: visitId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message === 'Site visit details fetched successfully') {
        setVisitData(data.visit);
        setFormData({
          status: data.visit.status,
          reassign_to: '',
          is_visible_to_scout: data.visit.is_visible_to_scout,
        });
        setSelectedScout(data.visit.assigned_to);
      } else {
        throw new Error(data.message || 'Failed to fetch visit details');
      }
    } catch (error) {
      console.error('Error fetching visit details:', error);
      Alert.alert('Error', 'Failed to fetch visit details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchScouts = async () => {
    if (!apiToken) return;

    try {
      const response = await fetch(`${BACKEND_URL}/core/getScouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message === 'Scouts fetched successfully') {
          setScouts(data.scouts || []);
        }
      }
    } catch (error) {
      console.error('Error fetching scouts:', error);
    }
  };

  const STATUS_OPTIONS = [
    { label: 'Pending', value: 'pending' },
    { label: 'Scout Completed', value: 'scout_completed' },
    { label: 'Admin Completed', value: 'admin_completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const getStatusLabel = (value: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const handleUpdate = async () => {
    if (!apiToken || !visitId) return;

    const updateData: any = {
      token: apiToken,
      visit_id: visitId,
    };

    if (formData.status !== visitData?.status) {
      updateData.status = formData.status;
    }

    if (formData.reassign_to) {
      updateData.reassign_to = formData.reassign_to;
    }

    if (formData.is_visible_to_scout !== visitData?.is_visible_to_scout) {
      updateData.is_visible_to_scout = formData.is_visible_to_scout;
    }

    // If no changes, return
    if (Object.keys(updateData).length <= 2) {
      Alert.alert('Info', 'No changes to update');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`${BACKEND_URL}/core/updateSiteVisit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message.includes('successfully')) {
        Alert.alert('Success', 'Assignment updated successfully');
        if (onUpdate) onUpdate();
        onBack();
      } else {
        throw new Error(data.message || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update assignment');
    } finally {
      setUpdating(false);
    }
  };

  const filteredScouts = scouts.filter(scout =>
    `${scout.first_name} ${scout.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scout.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Text style={styles.loadingText}>Loading assignment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!visitData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Assignment</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={WHATSAPP_COLORS.danger} />
          <Text style={styles.errorText}>Assignment not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchVisitDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Assignment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Assignment Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Assignment Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Site:</Text>
              <Text style={styles.infoValue}>{visitData.site.building_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{visitData.site.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Currently Assigned to:</Text>
              <Text style={styles.infoValue}>
                {visitData.assigned_to.first_name} {visitData.assigned_to.last_name}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>
                {new Date(visitData.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Status Update */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Update Status</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Current Status</Text>
              <View style={styles.currentStatus}>
                <Text style={[styles.currentStatusText, { color: WHATSAPP_COLORS.primary }]}>
                  {getStatusLabel(visitData.status)}
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
                  {getStatusLabel(formData.status)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Reassign Scout */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Reassign Scout</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Current Scout</Text>
              <View style={styles.currentScout}>
                <Ionicons name="person" size={16} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.currentScoutText}>
                  {visitData.assigned_to.first_name} {visitData.assigned_to.last_name}
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reassign to (Optional)</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowReassignDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedScout && selectedScout !== visitData.assigned_to
                    ? `${selectedScout.first_name} ${selectedScout.last_name}`
                    : 'Select scout...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Visibility Settings */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Visibility Settings</Text>
            
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setFormData(prev => ({
                ...prev,
                is_visible_to_scout: !prev.is_visible_to_scout
              }))}
            >
              <View style={[styles.checkbox, formData.is_visible_to_scout && styles.checkboxChecked]}>
                {formData.is_visible_to_scout && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Visible to Scout</Text>
            </TouchableOpacity>
            
            <Text style={styles.visibilityHelp}>
              When disabled, the scout will not be able to see this assignment
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onBack}
              disabled={updating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.updateButton, updating && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.updateButtonText}>Update Assignment</Text>
                </>
              )}
            </TouchableOpacity>
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
              {STATUS_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    formData.status === option.value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, status: option.value }));
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    formData.status === option.value && styles.dropdownOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {formData.status === option.value && (
                    <Ionicons name="checkmark" size={16} color={WHATSAPP_COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reassign Dropdown Modal */}
      <Modal
        visible={showReassignDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReassignDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReassignDropdown(false)}
        >
          <View style={[styles.dropdownContainer, { height: 400 }]}>
            <Text style={styles.dropdownTitle}>Select Scout</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={WHATSAPP_COLORS.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search scouts..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>
            
            <ScrollView style={styles.dropdownScroll}>
              {filteredScouts.map(scout => (
                <TouchableOpacity
                  key={scout.employee_id}
                  style={[
                    styles.dropdownOption,
                    selectedScout?.employee_id === scout.employee_id && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedScout(scout);
                    setFormData(prev => ({ ...prev, reassign_to: scout.employee_id }));
                    setShowReassignDropdown(false);
                    setSearchQuery('');
                  }}
                >
                  <View style={styles.scoutInfo}>
                    <View style={styles.scoutAvatar}>
                      <Text style={styles.scoutAvatarText}>
                        {scout.first_name.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.scoutName}>
                        {scout.first_name} {scout.last_name}
                      </Text>
                      <Text style={styles.scoutId}>
                        ID: {scout.employee_id}
                      </Text>
                    </View>
                  </View>
                  {selectedScout?.employee_id === scout.employee_id && (
                    <Ionicons name="checkmark" size={16} color={WHATSAPP_COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
              
              {filteredScouts.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No scouts found</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.cancelButtonModal}
              onPress={() => {
                setShowReassignDropdown(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.cancelButtonModalText}>Cancel</Text>
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
  headerSpacer: {
    width: 32,
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
  infoCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  formSection: {
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
    marginBottom: 16,
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
  currentStatus: {
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
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
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },
  currentScout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    gap: 8,
  },
  currentScoutText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderColor: WHATSAPP_COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  visibilityHelp: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  updateButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: WHATSAPP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  updateButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: 400,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  dropdownOptionSelected: {
    backgroundColor: WHATSAPP_COLORS.primary + '08',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  dropdownOptionTextSelected: {
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 10,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  scoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scoutAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHATSAPP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoutAvatarText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  scoutId: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  cancelButtonModal: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  cancelButtonModalText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
  },
});

export default EditAssignment;