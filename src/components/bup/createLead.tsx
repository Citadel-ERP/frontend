import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, FilterOption } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// WhatsApp Color Scheme
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

interface CreateLeadProps {
  onBack: () => void;
  onCreate: () => void;
  selectedCity: string;
  token: string | null;
  theme: ThemeColors;
  fetchSubphases: (phase: string) => Promise<void>;
}

const CreateLead: React.FC<CreateLeadProps> = ({
  onBack,
  onCreate,
  selectedCity,
  token,
  theme,
  fetchSubphases,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    status: 'active' as const,
    phase: 'initial_phase',
    subphase: 'without_contact_details'
  });
  const [editingEmails, setEditingEmails] = useState<string[]>([]);
  const [editingPhones, setEditingPhones] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no_requirement', label: 'No Requirement' },
    { value: 'transaction_complete', label: 'Transaction Complete' },
    { value: 'non_responsive', label: 'Non Responsive' }
  ];

  useEffect(() => {
    fetchPhases();
    if (formData.phase) {
      fetchSubphasesForPhase(formData.phase);
    }
  }, []);

  const fetchPhases = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllPhases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const beautifyName = (name: string): string => {
        return name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };
      setAllPhases(data.phases.map((phase: string) => ({ value: phase, label: beautifyName(phase) })));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  };

  const fetchSubphasesForPhase = async (phase: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const beautifyName = (name: string): string => {
        return name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };
      setAllSubphases(data.subphases.map((subphase: string) => ({ value: subphase, label: beautifyName(subphase) })));
    } catch (error) {
      console.error('Error fetching subphases:', error);
      setAllSubphases([]);
    }
  };

  const beautifyName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim();
    
    if (!trimmedEmail) {
      setEmailError('Please enter an email address');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (editingEmails.includes(trimmedEmail)) {
      setEmailError('This email already exists');
      return;
    }
    
    setEditingEmails([...editingEmails, trimmedEmail]);
    setNewEmail('');
    setEmailError(null);
  };

  const handleRemoveEmail = (index: number) => {
    setEditingEmails(editingEmails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    const trimmedPhone = newPhone.trim();
    
    if (!trimmedPhone) {
      setPhoneError('Please enter a phone number');
      return;
    }
    
    if (!validatePhone(trimmedPhone)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    
    if (editingPhones.includes(trimmedPhone)) {
      setPhoneError('This phone number already exists');
      return;
    }
    
    setEditingPhones([...editingPhones, trimmedPhone]);
    setNewPhone('');
    setPhoneError(null);
  };

  const handleRemovePhone = (index: number) => {
    setEditingPhones(editingPhones.filter((_, i) => i !== index));
  };

  const handlePhaseSelection = async (phase: string) => {
    setFormData({...formData, phase: phase, subphase: ''});
    await fetchSubphases(phase);
    await fetchSubphasesForPhase(phase);
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'phase': choices = allPhases; break;
      case 'subphase': choices = allSubphases; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  const handleCreate = async () => {
    try {
      if (!token || !selectedCity) {
        Alert.alert('Error', 'Token or city not found');
        return;
      }
      
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Lead name is required');
        return;
      }

      setLoading(true);

      const createPayload: any = {
        token: token,
        name: formData.name.trim(),
        city: selectedCity,
        status: formData.status,
        phase: formData.phase,
        subphase: formData.subphase
      };

      if (formData.company.trim()) {
        createPayload.company = formData.company.trim();
      }

      if (editingEmails.length > 0) {
        createPayload.emails = editingEmails;
      }

      if (editingPhones.length > 0) {
        createPayload.phone_numbers = editingPhones;
      }

      const response = await fetch(`${BACKEND_URL}/manager/createLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      Alert.alert('Success', 'Lead created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        company: '',
        status: 'active',
        phase: 'initial_phase',
        subphase: 'without_contact_details'
      });
      setEditingEmails([]);
      setEditingPhones([]);
      
      // Call onCreate callback to refresh leads list
      onCreate();
      
    } catch (error: any) {
      console.error('Error creating lead:', error);
      Alert.alert('Error', error.message || 'Failed to create lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.detailScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Basic Information */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lead Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="Enter lead name"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company</Text>
            <TextInput
              style={styles.input}
              value={formData.company}
              onChangeText={(text) => setFormData({...formData, company: text})}
              placeholder="Enter company name (optional)"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            <View style={styles.readOnlyField}>
              <Ionicons name="location" size={16} color={WHATSAPP_COLORS.textTertiary} style={styles.fieldIcon} />
              <Text style={styles.readOnlyText}>{selectedCity}</Text>
            </View>
          </View>
        </View>

        {/* Email Addresses */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="email" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Email Addresses ({editingEmails.length})</Text>
          </View>
          
          {editingEmails.length > 0 ? editingEmails.map((email, index) => (
            <View key={index} style={styles.contactItemContainer}>
              <View style={styles.contactItemContent}>
                <Ionicons name="mail" size={16} color={WHATSAPP_COLORS.primaryLight} style={styles.contactIcon} />
                <Text style={styles.contactItemText}>{email}</Text>
              </View>
              <TouchableOpacity 
                style={styles.removeContactButton}
                onPress={() => handleRemoveEmail(index)}
              >
                <Ionicons name="close-circle" size={22} color={WHATSAPP_COLORS.danger} />
              </TouchableOpacity>
            </View>
          )) : (
            <View style={styles.emptyContactContainer}>
              <Ionicons name="mail-outline" size={24} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.emptyContactText}>No emails added yet</Text>
            </View>
          )}

          <View style={styles.addContactContainer}>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              value={newEmail}
              onChangeText={(text) => {
                setNewEmail(text);
                setEmailError(null);
              }}
              placeholder="Add email address..."
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
              <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.primary} />
            </TouchableOpacity>
          </View>
          {emailError && <Text style={styles.errorText}>{emailError}</Text>}
        </View>

        {/* Phone Numbers */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="phone" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Phone Numbers ({editingPhones.length})</Text>
          </View>
          
          {editingPhones.length > 0 ? editingPhones.map((phone, index) => (
            <View key={index} style={styles.contactItemContainer}>
              <View style={styles.contactItemContent}>
                <Ionicons name="call" size={16} color={WHATSAPP_COLORS.primaryLight} style={styles.contactIcon} />
                <Text style={styles.contactItemText}>{phone}</Text>
              </View>
              <TouchableOpacity 
                style={styles.removeContactButton}
                onPress={() => handleRemovePhone(index)}
              >
                <Ionicons name="close-circle" size={22} color={WHATSAPP_COLORS.danger} />
              </TouchableOpacity>
            </View>
          )) : (
            <View style={styles.emptyContactContainer}>
              <Ionicons name="call-outline" size={24} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.emptyContactText}>No phone numbers added yet</Text>
            </View>
          )}

          <View style={styles.addContactContainer}>
            <TextInput
              style={[styles.input, phoneError && styles.inputError]}
              value={newPhone}
              onChangeText={(text) => {
                setNewPhone(text);
                setPhoneError(null);
              }}
              placeholder="Add phone number..."
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddPhone}>
              <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.primary} />
            </TouchableOpacity>
          </View>
          {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
        </View>

        {/* Lead Management */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Lead Management</Text>
          </View>
          
          <View style={styles.managementRow}>
            <View style={styles.managementItem}>
              <Text style={styles.inputLabel}>Status</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setActiveDropdown('status')}
              >
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {getFilterLabel('status', formData.status)}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={WHATSAPP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.managementItem}>
              <Text style={styles.inputLabel}>Phase</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setActiveDropdown('phase')}
              >
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {getFilterLabel('phase', formData.phase)}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={WHATSAPP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subphase</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setActiveDropdown('subphase')}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {getFilterLabel('subphase', formData.subphase)}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Button */}
        <View style={styles.detailCard}>
          <TouchableOpacity 
            style={[styles.createButton, loading && styles.buttonDisabled]} 
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color={WHATSAPP_COLORS.white} />
                <Text style={styles.createButtonText}>Create Lead</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setFormData({...formData, status: value as any})}
        title="Select Status"
        theme={{
          ...theme,
          primary: WHATSAPP_COLORS.primary,
          background: WHATSAPP_COLORS.background,
          cardBg: WHATSAPP_COLORS.surface,
          text: WHATSAPP_COLORS.textPrimary,
          border: WHATSAPP_COLORS.border,
        }}
      />
      <DropdownModal
        visible={activeDropdown === 'phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelection}
        title="Select Phase"
        theme={{
          ...theme,
          primary: WHATSAPP_COLORS.primary,
          background: WHATSAPP_COLORS.background,
          cardBg: WHATSAPP_COLORS.surface,
          text: WHATSAPP_COLORS.textPrimary,
          border: WHATSAPP_COLORS.border,
        }}
      />
      <DropdownModal
        visible={activeDropdown === 'subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => setFormData({...formData, subphase: value})}
        title="Select Subphase"
        theme={{
          ...theme,
          primary: WHATSAPP_COLORS.primary,
          background: WHATSAPP_COLORS.background,
          cardBg: WHATSAPP_COLORS.surface,
          text: WHATSAPP_COLORS.textPrimary,
          border: WHATSAPP_COLORS.border,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  
  // Scroll View
  detailScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  
  // Detail Cards
  detailCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  
  // Input Groups
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  inputError: {
    borderColor: WHATSAPP_COLORS.danger,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  fieldIcon: {
    marginRight: 8,
  },
  readOnlyText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
  },
  
  // Contact Items
  contactItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: WHATSAPP_COLORS.background,
    borderLeftWidth: 3,
    borderLeftColor: WHATSAPP_COLORS.primary,
  },
  contactItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    marginRight: 8,
  },
  contactItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  removeContactButton: {
    padding: 4,
  },
  
  // Empty Contact
  emptyContactContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    flexDirection: 'row',
    gap: 8,
  },
  emptyContactText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
  },
  
  // Add Contact
  addContactContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
  },
  
  // Error Text
  errorText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  
  // Management
  managementRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  managementItem: {
    flex: 1,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
  },
  dropdownText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  
  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
  },
  
  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});

export default CreateLead;