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
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, FilterOption, AssignedTo } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const THEME_COLORS = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  secondary: '#10B981',
  accent: '#A7F3D0',
  background: '#F9FAFB',
  card: '#FFFFFF',
  surface: '#F8FAFC',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  emailBg: '#F0F9FF',
  emailBorder: '#0EA5E9',
  phoneBg: '#FEF3C7',
  phoneBorder: '#F59E0B',
  collabBg: '#F0FDF4',
  collabBorder: '#10B981',
  leadInfoBg: '#F0F9FF',
  leadInfoBorder: '#06B6D4',
  customFieldBg: '#FAF5FF',
  customFieldBorder: '#8B5CF6',
  managementBg: '#FFFBEB',
  managementBorder: '#F59E0B',
  hover: '#ECFDF5',
  active: '#D1FAE5',
  disabled: '#F3F4F6',
  white: '#FFFFFF',
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
  const [areaRequirements, setAreaRequirements] = useState('');
  const [officeType, setOfficeType] = useState('');
  const [location, setLocation] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldErrors, setCustomFieldErrors] = useState<{[key: string]: string}>({});
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

      const meta: {[key: string]: any} = {};
      
      if (areaRequirements.trim()) meta.area_requirements = areaRequirements.trim();
      if (officeType) meta.office_type = officeType;
      if (location.trim()) meta.location = location.trim();
      
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

      if (formData.assigned_to) {
        createPayload.assigned_to = formData.assigned_to.email;
      }

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
      
      onCreate();
      
    } catch (error: any) {
      console.error('Error creating lead:', error);
      Alert.alert('Error', error.message || 'Failed to create lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      

      <ScrollView 
        style={s.scrollView} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={s.scrollContent}
      >
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.primary + '15' }]}>
              <Ionicons name="person-outline" size={20} color={THEME_COLORS.primary} />
            </View>
            <Text style={s.cardTitle}>Basic Information</Text>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Lead Name *</Text>
            <TextInput
              style={s.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter lead name"
              placeholderTextColor={THEME_COLORS.textTertiary}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Company</Text>
            <TextInput
              style={s.input}
              value={formData.company}
              onChangeText={(text) => setFormData({ ...formData, company: text })}
              placeholder="Enter company name (optional)"
              placeholderTextColor={THEME_COLORS.textTertiary}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>City</Text>
            <View style={s.readOnlyField}>
              <Ionicons name="location" size={16} color={THEME_COLORS.primary} style={s.fieldIcon} />
              <Text style={s.readOnlyText}>{selectedCity}</Text>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Assigned To</Text>
            <TouchableOpacity 
              style={s.selector} 
              onPress={() => setActiveDropdown('assigned')}
              activeOpacity={0.7}
            >
              <View style={s.selectorContent}>
                {formData.assigned_to ? (
                  <>
                    <View style={[s.iconCircleSmall, { backgroundColor: THEME_COLORS.accent }]}>
                      <Ionicons name="person" size={14} color={THEME_COLORS.primary} />
                    </View>
                    <Text style={s.selectorText} numberOfLines={1}>{getAssignedToLabel()}</Text>
                  </>
                ) : (
                  <Text style={s.selectorPlaceholder}>Select assignee (optional)</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.leadInfoBg }]}>
              <Ionicons name="business-outline" size={20} color={THEME_COLORS.leadInfoBorder} />
            </View>
            <Text style={s.cardTitle}>Lead Specific Information</Text>
          </View>
          
          <View style={s.field}>
            <Text style={s.label}>Area Requirements</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={areaRequirements}
              onChangeText={setAreaRequirements}
              placeholder="e.g., 1000 sq ft, 5 desks, etc."
              placeholderTextColor={THEME_COLORS.textTertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Office Type</Text>
            <TouchableOpacity 
              style={s.selector} 
              onPress={() => setActiveDropdown('officeType')}
              activeOpacity={0.7}
            >
              <View style={s.selectorContent}>
                <View style={[s.iconCircleSmall, { backgroundColor: THEME_COLORS.leadInfoBg }]}>
                  <Ionicons name="business" size={14} color={THEME_COLORS.leadInfoBorder} />
                </View>
                <Text style={s.selectorText} numberOfLines={1}>
                  {getOfficeTypeLabel()}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Location Preference</Text>
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Downtown, Business District, etc."
              placeholderTextColor={THEME_COLORS.textTertiary}
            />
          </View>

          {customFields.length > 0 && (
            <View style={s.customFieldsSection}>
              <Text style={[s.label, {marginBottom: 12}]}>Additional Information</Text>
              {customFields.map((field) => (
                <View key={field.id} style={s.customFieldRow}>
                  <View style={s.customFieldInputs}>
                    <TextInput
                      style={[s.customFieldInput, customFieldErrors[field.id] && s.inputError]}
                      value={field.key}
                      onChangeText={(text) => handleCustomFieldChange(field.id, 'key', text)}
                      placeholder="Field name"
                      placeholderTextColor={THEME_COLORS.textTertiary}
                    />
                    <TextInput
                      style={[s.customFieldInput, customFieldErrors[field.id] && s.inputError]}
                      value={field.value}
                      onChangeText={(text) => handleCustomFieldChange(field.id, 'value', text)}
                      placeholder="Value"
                      placeholderTextColor={THEME_COLORS.textTertiary}
                    />
                    <TouchableOpacity
                      style={s.removeCustomFieldBtn}
                      onPress={() => handleRemoveCustomField(field.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={THEME_COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                  {customFieldErrors[field.id] && (
                    <Text style={s.error}>{customFieldErrors[field.id]}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={s.addCustomFieldBtn}
            onPress={handleAddCustomField}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={THEME_COLORS.primary} />
            <Text style={s.addCustomFieldText}>Add Custom Field</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.emailBg }]}>
              <Ionicons name="mail-outline" size={20} color={THEME_COLORS.emailBorder} />
            </View>
            <Text style={s.cardTitle}>Email Addresses ({editingEmails.length})</Text>
          </View>
          
          {editingEmails.length > 0 ? editingEmails.map((email, index) => (
            <View key={index} style={s.listItem}>
              <View style={s.listItemContent}>
                <Ionicons name="mail" size={16} color={THEME_COLORS.emailBorder} />
                <Text style={s.listItemText}>{email}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleRemoveEmail(index)} 
                style={s.deleteBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="close-circle" size={20} color={THEME_COLORS.danger} />
              </TouchableOpacity>
            </View>
          )) : (
            <View style={s.emptyContactContainer}>
              <Ionicons name="mail-outline" size={24} color={THEME_COLORS.textTertiary} />
              <Text style={s.emptyContactText}>No emails added yet</Text>
            </View>
          )}

          <View style={s.addRow}>
            <TextInput
              style={[s.input, emailError && s.inputError, { flex: 1 }]}
              value={newEmail}
              onChangeText={(text) => {
                setNewEmail(text);
                setEmailError(null);
              }}
              placeholder="Add email address..."
              placeholderTextColor={THEME_COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={s.addBtn} 
              onPress={handleAddEmail}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={24} color={THEME_COLORS.primary} />
            </TouchableOpacity>
          </View>
          {emailError && <Text style={s.error}>{emailError}</Text>}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.phoneBg }]}>
              <Ionicons name="call-outline" size={20} color={THEME_COLORS.phoneBorder} />
            </View>
            <Text style={s.cardTitle}>Phone Numbers ({editingPhones.length})</Text>
          </View>
          
          {editingPhones.length > 0 ? editingPhones.map((phone, index) => (
            <View key={index} style={s.listItem}>
              <View style={s.listItemContent}>
                <Ionicons name="call" size={16} color={THEME_COLORS.phoneBorder} />
                <Text style={s.listItemText}>{phone}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleRemovePhone(index)} 
                style={s.deleteBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="close-circle" size={20} color={THEME_COLORS.danger} />
              </TouchableOpacity>
            </View>
          )) : (
            <View style={s.emptyContactContainer}>
              <Ionicons name="call-outline" size={24} color={THEME_COLORS.textTertiary} />
              <Text style={s.emptyContactText}>No phone numbers added yet</Text>
            </View>
          )}

          <View style={s.addRow}>
            <TextInput
              style={[s.input, phoneError && s.inputError, { flex: 1 }]}
              value={newPhone}
              onChangeText={(text) => {
                setNewPhone(text);
                setPhoneError(null);
              }}
              placeholder="Add phone number..."
              placeholderTextColor={THEME_COLORS.textTertiary}
              keyboardType="phone-pad"
            />
            <TouchableOpacity 
              style={s.addBtn} 
              onPress={handleAddPhone}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={24} color={THEME_COLORS.primary} />
            </TouchableOpacity>
          </View>
          {phoneError && <Text style={s.error}>{phoneError}</Text>}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.managementBg }]}>
              <Ionicons name="settings-outline" size={20} color={THEME_COLORS.managementBorder} />
            </View>
            <Text style={s.cardTitle}>Lead Management</Text>
          </View>
          
          <View style={s.row}>
            <View style={s.halfField}>
              <Text style={s.label}>Status</Text>
              <TouchableOpacity 
                style={s.selector} 
                onPress={() => setActiveDropdown('status')}
                activeOpacity={0.7}
              >
                <Text style={s.selectorText} numberOfLines={1}>
                  {getFilterLabel('status', formData.status)}
                </Text>
                <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={s.halfField}>
              <Text style={s.label}>Phase</Text>
              <TouchableOpacity 
                style={s.selector} 
                onPress={() => setActiveDropdown('phase')}
                activeOpacity={0.7}
              >
                <Text style={s.selectorText} numberOfLines={1}>
                  {getFilterLabel('phase', formData.phase)}
                </Text>
                <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Subphase</Text>
            <TouchableOpacity 
              style={s.selector} 
              onPress={() => setActiveDropdown('subphase')}
              activeOpacity={0.7}
            >
              <Text style={s.selectorText} numberOfLines={1}>
                {getFilterLabel('subphase', formData.subphase)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[s.saveBtn, loading && s.saveBtnDisabled]} 
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={THEME_COLORS.white} size="small" />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color={THEME_COLORS.white} />
              <Text style={s.saveBtnText}>Create Lead</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.bottomSpacer} />
      </ScrollView>

      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setFormData({ ...formData, status: value as any })}
        title="Select Status"
        theme={{
          ...theme,
          primary: THEME_COLORS.primary,
          background: THEME_COLORS.background,
          cardBg: THEME_COLORS.card,
          text: THEME_COLORS.textPrimary,
          border: THEME_COLORS.border,
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
          primary: THEME_COLORS.primary,
          background: THEME_COLORS.background,
          cardBg: THEME_COLORS.card,
          text: THEME_COLORS.textPrimary,
          border: THEME_COLORS.border,
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
          primary: THEME_COLORS.primary,
          background: THEME_COLORS.background,
          cardBg: THEME_COLORS.card,
          text: THEME_COLORS.textPrimary,
          border: THEME_COLORS.border,
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
          primary: THEME_COLORS.primary,
          background: THEME_COLORS.background,
          cardBg: THEME_COLORS.card,
          text: THEME_COLORS.textPrimary,
          border: THEME_COLORS.border,
        }}
      />

      {activeDropdown === 'assigned' && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Assign Lead To</Text>
              <TouchableOpacity 
                onPress={() => setActiveDropdown(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={THEME_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={s.searchContainer}>
              <TextInput
                style={s.searchInput}
                value={assignedToSearch}
                onChangeText={setAssignedToSearch}
                placeholder="Search employees..."
                placeholderTextColor={THEME_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {assignedToLoading && <ActivityIndicator size="small" color={THEME_COLORS.primary} style={s.searchLoader} />}
            </View>
            
            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>              
              {assignedToResults.length > 0 ? (
                assignedToResults.map((user) => (
                  <TouchableOpacity
                    key={user.email}
                    style={[s.modalItem, formData.assigned_to?.email === user.email && s.modalItemSelected]}
                    onPress={() => handleAssignToUser(user)}
                    activeOpacity={0.7}
                  >
                    <View style={s.modalItemContent}>
                      <Ionicons 
                        name="person" 
                        size={18} 
                        color={formData.assigned_to?.email === user.email 
                          ? THEME_COLORS.primary 
                          : THEME_COLORS.textSecondary
                        } 
                      />
                      <View style={s.modalItemInfo}>
                        <Text style={s.modalItemName} numberOfLines={1}>
                          {user.full_name || `${user.first_name} ${user.last_name}`}
                        </Text>
                        <Text style={s.modalItemEmail} numberOfLines={1}>
                          {user.email}
                        </Text>
                      </View>
                    </View>
                    {formData.assigned_to?.email === user.email && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={20} 
                        color={THEME_COLORS.primary} 
                      />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                !assignedToLoading && assignedToResults.length === 0 && (
                  <View style={s.emptyState}>
                    <Text style={s.emptyText}>No users found</Text>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
  },
  
  // header: { 
  //   backgroundColor: '#075E54', 
  //   borderBottomWidth: 1, 
  //   borderBottomColor: '#128C7E', 
  //   shadowColor: '#000', 
  //   shadowOffset: { width: 0, height: 2 }, 
  //   shadowOpacity: 0.1, 
  //   shadowRadius: 3, 
  //   elevation: 3, 
  //   paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  // },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    height: 60 
  },
  backButton: { 
    padding: 8, 
    marginRight: 8 
  },
  headerTextContainer: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#FFFFFF', 
    marginBottom: 2 
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: 'rgba(255, 255, 255, 0.8)' 
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  saveHeaderButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: '#25D366', 
    borderRadius: 20 
  },
  saveHeaderText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#FFFFFF' 
  },
  
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    paddingTop: 16, 
    paddingBottom: 32 
  },
  
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: THEME_COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME_COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
    backgroundColor: THEME_COLORS.surface,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: THEME_COLORS.danger,
    backgroundColor: '#FEF2F2',
  },
  
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME_COLORS.divider,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: THEME_COLORS.surface,
  },
  fieldIcon: {
    marginRight: 10,
  },
  readOnlyText: {
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
    fontWeight: '500',
  },
  
  selector: {
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.surface,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectorText: {
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: THEME_COLORS.textTertiary,
    fontStyle: 'italic',
  },
  
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  listItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME_COLORS.textPrimary,
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
  
  addRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: THEME_COLORS.divider,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.hover,
  },
  
  error: {
    fontSize: 12,
    color: THEME_COLORS.danger,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  searchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
    backgroundColor: THEME_COLORS.surface,
    paddingRight: 40,
  },
  searchLoader: {
    position: 'absolute',
    right: 14,
    top: 12,
  },
  
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  
  iconCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  customFieldsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  customFieldRow: {
    marginBottom: 12,
  },
  customFieldInputs: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  customFieldInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: THEME_COLORS.textPrimary,
    backgroundColor: THEME_COLORS.customFieldBg,
  },
  removeCustomFieldBtn: {
    padding: 10,
  },
  addCustomFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: THEME_COLORS.hover,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
    borderStyle: 'dashed',
  },
  addCustomFieldText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.primary,
  },
  
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: THEME_COLORS.primary,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: THEME_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME_COLORS.white,
    letterSpacing: 0.3,
  },
  
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
    maxHeight: '70%',
    backgroundColor: THEME_COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: THEME_COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME_COLORS.textPrimary,
  },
  modalScroll: {
    maxHeight: 350,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
  },
  modalItemSelected: {
    backgroundColor: THEME_COLORS.accent,
    borderLeftWidth: 4,
    borderLeftColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  modalItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME_COLORS.textPrimary,
  },
  modalItemEmail: {
    fontSize: 12,
    color: THEME_COLORS.textTertiary,
    marginTop: 2,
  },
  
  emptyContactContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.background,
    flexDirection: 'row',
    gap: 8,
  },
  emptyContactText: {
    fontSize: 14,
    color: THEME_COLORS.textTertiary,
  },
  
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: THEME_COLORS.textTertiary,
    fontStyle: 'italic',
  },
  
  bottomSpacer: {
    height: 30,
  },
});

export default CreateLead;