import React, { useState, useEffect, useRef } from 'react';
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
import { ThemeColors, FilterOption, AssignedTo } from './types';
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
  leadInfoBg: '#F0F9FF',
  leadInfoBorder: '#0EA5E9',
  customFieldBg: '#F5F3FF',
  customFieldBorder: '#8B5CF6',
};

interface CreateLeadProps {
  onBack: () => void;
  onCreate: () => void;
  selectedCity: string;
  token: string | null;
  theme: ThemeColors;
  fetchSubphases: (phase: string) => Promise<void>;
}

interface CustomField {
  id: string;
  key: string;
  value: string;
}

// Debounce hook for search optimization
const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

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
    subphase: 'without_contact_details',
    assigned_to: null as AssignedTo | null,
  });

  const [editingEmails, setEditingEmails] = useState<string[]>([]);
  const [editingPhones, setEditingPhones] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'assigned' | 'officeType' | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Lead Specific Information States
  const [areaRequirements, setAreaRequirements] = useState('');
  const [officeType, setOfficeType] = useState('');
  const [location, setLocation] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldErrors, setCustomFieldErrors] = useState<{[key: string]: string}>({});

  // Assigned person states
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [assignedToResults, setAssignedToResults] = useState<AssignedTo[]>([]);
  const [assignedToLoading, setAssignedToLoading] = useState(false);

  const debouncedAssignedSearch = useDebounce(assignedToSearch, 300);

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no_requirement', label: 'No Requirement' },
    { value: 'transaction_complete', label: 'Transaction Complete' },
    { value: 'non_responsive', label: 'Non Responsive' }
  ];

  const OFFICE_TYPE_CHOICES: FilterOption[] = [
    { value: 'conventional_office', label: 'Conventional Office' },
    { value: 'managed_office', label: 'Managed Office' },
    { value: 'conventional_and_managed_office', label: 'Conventional and Managed Office' }
  ];

  useEffect(() => {
    fetchPhases();
    if (formData.phase) {
      fetchSubphasesForPhase(formData.phase);
    }
  }, []);

  useEffect(() => {
    if (activeDropdown === 'assigned') {
      searchAssignedToUsers(debouncedAssignedSearch);
    }
  }, [debouncedAssignedSearch, activeDropdown]);

  const fetchPhases = async (): Promise<void> => {
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

      setAllPhases(data.phases.map((phase: string) => ({ 
        value: phase, 
        label: beautifyName(phase) 
      })));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  };

  const fetchSubphasesForPhase = async (phase: string): Promise<void> => {
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

      setAllSubphases(data.subphases.map((subphase: string) => ({ 
        value: subphase, 
        label: beautifyName(subphase) 
      })));
    } catch (error) {
      console.error('Error fetching subphases:', error);
      setAllSubphases([]);
    }
  };

  const searchAssignedToUsers = async (query: string): Promise<void> => {
    try {
      if (!token) {
        setAssignedToResults([]);
        return;
      }

      setAssignedToLoading(true);

      // If query is empty, fetch all users
      if (query.length === 0) {
        const response = await fetch(`${BACKEND_URL}/manager/getUsers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAssignedToResults(data.users || []);
        return;
      }

      // If query has at least 2 characters, search
      if (query.length >= 2) {
        const response = await fetch(
          `${BACKEND_URL}/manager/getPotentialCollaborators?query=${encodeURIComponent(query)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAssignedToResults(data.potential_collaborators);
      } else {
        setAssignedToResults([]);
      }
    } catch (error) {
      console.error('Error searching assignable users:', error);
      setAssignedToResults([]);
    } finally {
      setAssignedToLoading(false);
    }
  };

  const handleAssignToUser = (user: AssignedTo): void => {
    setFormData({ ...formData, assigned_to: user });
    setActiveDropdown(null);
    setAssignedToSearch('');
    setAssignedToResults([]);
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

  const handleAddEmail = (): void => {
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

  const handleRemoveEmail = (index: number): void => {
    setEditingEmails(editingEmails.filter((_, i) => i !== index));
  };

  const handleAddPhone = (): void => {
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

  const handleRemovePhone = (index: number): void => {
    setEditingPhones(editingPhones.filter((_, i) => i !== index));
  };

  const handleAddCustomField = (): void => {
    const newId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCustomFields([...customFields, { id: newId, key: '', value: '' }]);
  };

  const handleRemoveCustomField = (id: string): void => {
    setCustomFields(customFields.filter(field => field.id !== id));
    const newErrors = {...customFieldErrors};
    delete newErrors[id];
    setCustomFieldErrors(newErrors);
  };

  const handleCustomFieldChange = (id: string, field: 'key' | 'value', text: string): void => {
    setCustomFields(customFields.map(fieldItem => 
      fieldItem.id === id ? { ...fieldItem, [field]: text } : fieldItem
    ));
    
    if (customFieldErrors[id]) {
      const newErrors = {...customFieldErrors};
      delete newErrors[id];
      setCustomFieldErrors(newErrors);
    }
  };

  const validateCustomFields = (): boolean => {
    const errors: {[key: string]: string} = {};
    let isValid = true;

    customFields.forEach(field => {
      if (field.key.trim() === '' && field.value.trim() !== '') {
        errors[field.id] = 'Key is required when value is provided';
        isValid = false;
      }
    });

    setCustomFieldErrors(errors);
    return isValid;
  };

  const handlePhaseSelection = async (phase: string): Promise<void> => {
    setFormData({ ...formData, phase: phase, subphase: '' });
    await fetchSubphases(phase);
    await fetchSubphasesForPhase(phase);
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': 
        choices = STATUS_CHOICES; 
        break;
      case 'phase': 
        choices = allPhases; 
        break;
      case 'subphase': 
        choices = allSubphases; 
        break;
      case 'officeType': 
        choices = OFFICE_TYPE_CHOICES; 
        break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  const getAssignedToLabel = (): string => {
    if (!formData.assigned_to) return 'Unassigned';
    return formData.assigned_to.full_name || 
           `${formData.assigned_to.first_name} ${formData.assigned_to.last_name}`;
  };

  const getOfficeTypeLabel = (): string => {
    const option = OFFICE_TYPE_CHOICES.find(choice => choice.value === officeType);
    return option ? option.label : 'Select office type...';
  };

  const handleCreate = async (): Promise<void> => {
    try {
      if (!token || !selectedCity) {
        Alert.alert('Error', 'Token or city not found');
        return;
      }
      
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Lead name is required');
        return;
      }

      if (!validateCustomFields()) {
        Alert.alert('Validation Error', 'Please check your custom fields. Key is required when value is provided.');
        return;
      }

      setLoading(true);

      // Build meta object
      const meta: {[key: string]: any} = {};
      
      // Add lead specific information
      if (areaRequirements.trim()) meta.area_requirements = areaRequirements.trim();
      if (officeType) meta.office_type = officeType;
      if (location.trim()) meta.location = location.trim();
      
      // Add custom fields
      customFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          meta[field.key.trim()] = field.value.trim();
        }
      });

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

      // Add assigned_to if selected
      if (formData.assigned_to) {
        createPayload.assigned_to = formData.assigned_to.email;
      }

      // Add meta if it has data
      if (Object.keys(meta).length > 0) {
        createPayload.meta = meta;
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
        subphase: 'without_contact_details',
        assigned_to: null,
      });
      setEditingEmails([]);
      setEditingPhones([]);
      setAreaRequirements('');
      setOfficeType('');
      setLocation('');
      setCustomFields([]);
      setCustomFieldErrors({});
      
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
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter lead name"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company</Text>
            <TextInput
              style={styles.input}
              value={formData.company}
              onChangeText={(text) => setFormData({ ...formData, company: text })}
              placeholder="Enter company name (optional)"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            <View style={styles.readOnlyField}>
              <Ionicons name="location" size={16} color={WHATSAPP_COLORS.primaryDark} style={styles.fieldIcon} />
              <Text style={styles.readOnlyText}>{selectedCity}</Text>
            </View>
          </View>

          {/* Assigned To Section */}
          <View style={styles.inputGroup}>
            <View style={styles.assignedToHeader}>
              <Text style={styles.inputLabel}>Assigned To</Text>
              {formData.assigned_to && (
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, assigned_to: null })}
                  style={styles.clearAssignmentButton}
                >
                  <Text style={styles.clearAssignmentText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setActiveDropdown('assigned')}
            >
              <View style={styles.assignedToContent}>
                {formData.assigned_to ? (
                  <>
                    <Ionicons name="person" size={18} color={WHATSAPP_COLORS.primary} />
                    <Text style={styles.assignedToText} numberOfLines={1}>
                      {getAssignedToLabel()}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.dropdownPlaceholder} numberOfLines={1}>
                    Select assignee (optional)
                  </Text>
                )}
              </View>
              <MaterialIcons name="arrow-drop-down" size={24} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Lead Specific Information */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="business" size={20} color={WHATSAPP_COLORS.leadInfoBorder} />
            <Text style={styles.sectionTitle}>Lead Specific Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Area Requirements</Text>
            <TextInput
              style={styles.input}
              value={areaRequirements}
              onChangeText={setAreaRequirements}
              placeholder="e.g., 1000 sq ft, 5 desks, etc."
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Office Type</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setActiveDropdown('officeType')}
            >
              <View style={styles.assignedToContent}>
                <Ionicons name="business" size={18} color={WHATSAPP_COLORS.leadInfoBorder} />
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {getOfficeTypeLabel()}
                </Text>
              </View>
              <MaterialIcons name="arrow-drop-down" size={24} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location Preference</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Downtown, Business District, etc."
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <View style={styles.customFieldsSection}>
              <Text style={[styles.inputLabel, {marginBottom: 12}]}>Additional Information</Text>
              {customFields.map((field) => (
                <View key={field.id} style={styles.customFieldRow}>
                  <View style={styles.customFieldInputs}>
                    <TextInput
                      style={[styles.customFieldInput, customFieldErrors[field.id] && styles.inputError]}
                      value={field.key}
                      onChangeText={(text) => handleCustomFieldChange(field.id, 'key', text)}
                      placeholder="Field name"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                    />
                    <TextInput
                      style={[styles.customFieldInput, customFieldErrors[field.id] && styles.inputError]}
                      value={field.value}
                      onChangeText={(text) => handleCustomFieldChange(field.id, 'value', text)}
                      placeholder="Value"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                    />
                  </View>
                  <TouchableOpacity 
                    style={styles.removeCustomFieldButton}
                    onPress={() => handleRemoveCustomField(field.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={WHATSAPP_COLORS.danger} />
                  </TouchableOpacity>
                  {customFieldErrors[field.id] && (
                    <Text style={styles.errorText}>{customFieldErrors[field.id]}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={styles.addCustomFieldButton}
            onPress={handleAddCustomField}
          >
            <Ionicons name="add-circle-outline" size={20} color={WHATSAPP_COLORS.leadInfoBorder} />
            <Text style={styles.addCustomFieldText}>Add Custom Field</Text>
          </TouchableOpacity>
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
              style={[styles.input, emailError && styles.inputError, { width: '83%' }]}
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
              style={[styles.input, phoneError && styles.inputError, { width: "85%" }]}
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
        onSelect={(value) => setFormData({ ...formData, status: value as any })}
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
        onSelect={(value) => setFormData({ ...formData, subphase: value })}
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

      <DropdownModal
        visible={activeDropdown === 'officeType'}
        onClose={() => setActiveDropdown(null)}
        options={OFFICE_TYPE_CHOICES}
        onSelect={(value) => setOfficeType(value)}
        title="Select Office Type"
        theme={{
          ...theme,
          primary: WHATSAPP_COLORS.primary,
          background: WHATSAPP_COLORS.background,
          cardBg: WHATSAPP_COLORS.surface,
          text: WHATSAPP_COLORS.textPrimary,
          border: WHATSAPP_COLORS.border,
        }}
      />

      {/* Assigned To Dropdown Modal */}
      {activeDropdown === 'assigned' && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Lead To</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                value={assignedToSearch}
                onChangeText={setAssignedToSearch}
                placeholder="Search employees..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {assignedToLoading && (
                <ActivityIndicator 
                  size="small" 
                  color={WHATSAPP_COLORS.primary} 
                  style={styles.searchLoading} 
                />
              )}
            </View>
            
            <ScrollView style={styles.modalScrollView}>              
              {/* Search results */}
              {assignedToResults.length > 0 ? (
                assignedToResults.map((user) => (
                  <TouchableOpacity
                    key={user.email}
                    style={[
                      styles.searchResultItem,
                      formData.assigned_to?.email === user.email && styles.selectedItem,
                      { backgroundColor: "#fff" },
                    ]}
                    onPress={() => handleAssignToUser(user)}
                  >
                    <View style={styles.searchResultContent}>
                      <Ionicons 
                        name="person" 
                        size={18} 
                        color={formData.assigned_to?.email === user.email 
                          ? WHATSAPP_COLORS.success 
                          : WHATSAPP_COLORS.primary
                        } 
                      />
                      <View style={styles.assignedToUserInfo}>
                        <Text style={styles.searchResultText} numberOfLines={1}>
                          {user.full_name || `${user.first_name} ${user.last_name}`}
                        </Text>
                        <Text style={styles.assignedToEmail} numberOfLines={1}>
                          {user.email}
                        </Text>
                      </View>
                    </View>
                    {formData.assigned_to?.email === user.email && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={22} 
                        color={WHATSAPP_COLORS.success} 
                      />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                !assignedToLoading && assignedToResults.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No users found</Text>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      )}
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
    backgroundColor: "#fff",
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
  
  // Assigned To Section
  assignedToHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearAssignmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.danger + '15',
  },
  clearAssignmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.danger,
  },
  assignedToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  assignedToText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textTertiary,
    flex: 1,
  },
  assignedToUserInfo: {
    flex: 1,
    marginLeft: 8,
  },
  assignedToEmail: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 2,
  },
  selectedItem: {
    backgroundColor: WHATSAPP_COLORS.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: WHATSAPP_COLORS.primary,
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
    backgroundColor: "#fff",
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
  
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  
  // Search Input
  searchInputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: '#fff',
    paddingRight: 40,
  },
  searchLoading: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  
  // Search Results
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: WHATSAPP_COLORS.accent,
  },
  searchResultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchResultText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  
  // Empty State
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
    textAlign: 'center',
  },

  // Lead Specific Information Styles
  customFieldsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  customFieldRow: {
    marginBottom: 12,
  },
  customFieldInputs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customFieldInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.customFieldBg,
  },
  removeCustomFieldButton: {
    padding: 8,
    marginLeft: 8,
  },
  addCustomFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.leadInfoBg,
    marginTop: 12,
  },
  addCustomFieldText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.leadInfoBorder,
  },
});

export default CreateLead;