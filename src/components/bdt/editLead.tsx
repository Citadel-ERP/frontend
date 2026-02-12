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
  Platform,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, FilterOption } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// EXACT SAME COLORS AS THE PREVIOUS FILE
const THEME_COLORS = {
  // Primary Greens
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  
  // Secondary & Accent
  secondary: '#10B981',
  accent: '#A7F3D0',
  
  // Backgrounds
  background: '#F9FAFB',
  card: '#FFFFFF',
  surface: '#F8FAFC',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  white: '#FFFFFF',
  
  // Borders & Dividers
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Category-specific backgrounds with green tints
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
  
  // Interactive States
  hover: '#ECFDF5',
  active: '#D1FAE5',
  disabled: '#F3F4F6',
};

interface EditLeadProps {
  lead: Lead;
  onBack: () => void;
  onSave: (updatedLead: Lead, editingEmails: string[], editingPhones: string[]) => void;
  token: string | null;
  theme: ThemeColors;
  fetchSubphases: (phase: string) => Promise<void>;
}

interface Collaborator {
  id: string | number;
  user: {
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    employee_id?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
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

const EditLead: React.FC<EditLeadProps> = ({
  lead,
  onBack,
  onSave,
  token,
  theme,
  fetchSubphases,
}) => {
  const [editedLead, setEditedLead] = useState<Lead>(lead);
  const [editingEmails, setEditingEmails] = useState<string[]>(
    lead.emails.map(e => e.email)
  );
  const [editingPhones, setEditingPhones] = useState<string[]>(
    lead.phone_numbers.map(p => p.number)
  );
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'collaborator' | 'officeType' | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [allEmployees, setAllEmployees] = useState<FilterOption[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(lead.collaborators || []);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [potentialCollaborators, setPotentialCollaborators] = useState<FilterOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Lead Specific Information States
  const [areaRequirements, setAreaRequirements] = useState(lead.meta?.area_requirements || '');
  const [officeType, setOfficeType] = useState(lead.meta?.office_type || '');
  const [location, setLocation] = useState(lead.meta?.location || '');
  const [contactPersonName, setContactPersonName] = useState<string>(
  (lead.meta && typeof lead.meta === 'object' && lead.meta.contact_person_name)
    ? String(lead.meta.contact_person_name)
    : ''
);
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    const fields: CustomField[] = [];
    if (lead.meta) {
      Object.entries(lead.meta).forEach(([key, value]) => {
        if (!['area_requirements', 'office_type', 'location'].includes(key)) {
          fields.push({
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            key,
            value: String(value)
          });
        }
      });
    }
    return fields;
  });
  const [customFieldErrors, setCustomFieldErrors] = useState<{[key: string]: string}>({});

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Status choices without color property (to match FilterOption type)
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

  // Status color mapping separate from FilterOption
  const STATUS_COLORS: Record<string, string> = {
    'active': THEME_COLORS.success,
    'hold': THEME_COLORS.warning,
    'mandate': THEME_COLORS.info,
    'closed': THEME_COLORS.textSecondary,
    'no_requirement': THEME_COLORS.textTertiary,
    'transaction_complete': THEME_COLORS.success,
    'non_responsive': THEME_COLORS.danger
  };

  useEffect(() => {
    fetchPhases();
    fetchEmployees();
    if (editedLead.phase) {
      fetchSubphasesForPhase(editedLead.phase);
    }
    fetchCollaborators();
  }, []);

  useEffect(() => {
    if (activeDropdown === 'collaborator' && debouncedSearchQuery.length >= 2) {
      searchPotentialCollaborators(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, activeDropdown]);

  const fetchPhases = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getAllPhases`, {
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
      const response = await fetch(`${BACKEND_URL}/employee/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
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

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getPotentialCollaborators?query=`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const employeeOptions = data.potential_collaborators.map((emp: any) => ({
        value: emp.email,
        label: `${emp.first_name} ${emp.last_name} (${emp.email})`,
        employeeData: emp
      }));
      
      setAllEmployees(employeeOptions);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setAllEmployees([]);
    }
  };

  const fetchCollaborators = async () => {
    try {
      if (!token || !lead.id) return;
      
      setLoadingCollaborators(true);
      const response = await fetch(`${BACKEND_URL}/employee/getCollaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          lead_id: lead.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.collaborators) {
        setCollaborators(data.collaborators);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      Alert.alert('Error', 'Failed to fetch collaborators');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const searchPotentialCollaborators = async (query: string) => {
    try {
      if (!token || query.length < 2) {
        setPotentialCollaborators([]);
        return;
      }

      setSearchLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/employee/getPotentialCollaborators?query=${encodeURIComponent(query)}`,
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
      
      const options = data.potential_collaborators.map((user: any) => ({
        value: user.email,
        label: `${user.first_name} ${user.last_name} (${user.email})`,
        userData: user
      }));

      setPotentialCollaborators(options);
    } catch (error) {
      console.error('Error searching collaborators:', error);
      setPotentialCollaborators([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addCollaborator = async (email: string) => {
    try {
      if (!token || !lead.id) {
        Alert.alert('Error', 'Missing required information');
        return;
      }
      
      if (!validateEmail(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }
      
      setLoadingCollaborators(true);
      const response = await fetch(`${BACKEND_URL}/employee/addCollaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          lead_id: lead.id,
          email: email
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add collaborator');
      }

      await fetchCollaborators();
      setSearchQuery('');
      setPotentialCollaborators([]);
      Alert.alert('Success', data.message || 'Collaborator added successfully');
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      Alert.alert('Error', error.message || 'Failed to add collaborator');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const removeCollaborator = async (collaboratorId: string | number) => {
    try {
      if (!token || !lead.id) return;
      
      Alert.alert(
        'Remove Collaborator',
        'Are you sure you want to remove this collaborator?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              setLoadingCollaborators(true);
              const response = await fetch(`${BACKEND_URL}/employee/removeCollaborator`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token,
                  lead_id: lead.id,
                  collaborator_id: collaboratorId
                })
              });
              

              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.message || 'Failed to remove collaborator');
              }

              await fetchCollaborators();
              Alert.alert('Success', data.message || 'Collaborator removed successfully');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', error.message || 'Failed to remove collaborator');
    } finally {
      setLoadingCollaborators(false);
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

  const handleAddCustomField = () => {
    const newId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCustomFields([...customFields, { id: newId, key: '', value: '' }]);
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id));
    const newErrors = {...customFieldErrors};
    delete newErrors[id];
    setCustomFieldErrors(newErrors);
  };

  const handleCustomFieldChange = (id: string, field: 'key' | 'value', text: string) => {
    setCustomFields(customFields.map(fieldItem => 
      fieldItem.id === id ? { ...fieldItem, [field]: text } : fieldItem
    ));
    
    if (customFieldErrors[id]) {
      const newErrors = {...customFieldErrors};
      delete newErrors[id];
      setCustomFieldErrors(newErrors);
    }
  };

  const validateCustomFields = () => {
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

  const handleSave = async () => {
    try {
      if (!validateCustomFields()) {
        Alert.alert('Validation Error', 'Please check your custom fields. Key is required when value is provided.');
        return;
      }

      setLoading(true);
      
      // Build meta object from lead specific information
      const meta: {[key: string]: any} = {};
      
      // Add lead specific information
      if (areaRequirements.trim()) meta.area_requirements = areaRequirements.trim();
      if (officeType) meta.office_type = officeType;
      if (location.trim()) meta.location = location.trim();
      if (formData.contactPersonName.trim()) meta.contact_person_name = formData.contactPersonName.trim();
      // Add custom fields
      customFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          meta[field.key.trim()] = field.value.trim();
        }
      });

      // Update the lead with meta data
      const updatedLeadWithMeta = {
        ...editedLead,
        meta: Object.keys(meta).length > 0 ? meta : undefined
      };
      
      await onSave(updatedLeadWithMeta, editingEmails, editingPhones);
    } catch (error) {
      Alert.alert('Error', 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseSelection = async (phase: string) => {
    setEditedLead({...editedLead, phase: phase});
    await fetchSubphases(phase);
    await fetchSubphasesForPhase(phase);
    
    if (allSubphases.length > 0) {
      setEditedLead(prev => ({...prev, subphase: ''}));
    }
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'phase': choices = allPhases; break;
      case 'subphase': choices = allSubphases; break;
      case 'officeType': choices = OFFICE_TYPE_CHOICES; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  const getOfficeTypeLabel = (): string => {
    const option = OFFICE_TYPE_CHOICES.find(choice => choice.value === officeType);
    return option ? option.label : 'Select office type...';
  };

  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status] || THEME_COLORS.primary;
  };

  // Keep your exact header as requested (unchanged)
  const ModernHeader = () => (
    <View style={[s.header, {paddingTop: Platform.OS === 'ios' ? 10 : 10}]}>
      <View style={s.headerContent}>
        <TouchableOpacity onPress={onBack} style={s.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={s.headerTextContainer}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Edit Lead
          </Text>
          <Text style={s.headerSubtitle} numberOfLines={1}>
            {lead.company || 'Lead Details'}
          </Text>
        </View>
        
        <View style={s.headerActions}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <TouchableOpacity 
              onPress={handleSave}
              style={s.saveHeaderButton}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={s.saveHeaderText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ModernHeader />
      <StatusBar
                barStyle="light-content"
                backgroundColor="#075E54"
                translucent={false}
            />
      <ScrollView 
        style={s.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Lead Specific Information Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.leadInfoBg }]}>
              <Ionicons name="business-outline" size={20} color={THEME_COLORS.leadInfoBorder} />
            </View>
            <Text style={s.cardTitle}>Lead Specific Information</Text>
          </View>
          <View style={s.field}>
          <Text style={s.label}>Contact Person Name</Text>
          <TextInput
            style={s.input}
            value={contactPersonName}
            onChangeText={setContactPersonName}
            placeholder="Enter contact person name"
            placeholderTextColor={THEME_COLORS.textTertiary}
          />
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
          

          {/* Custom Fields */}
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
                      activeOpacity={0.6}
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

        {/* Email Addresses Card */}
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
            <View style={s.emptyContact}>
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
              placeholder="Add new email..."
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


        {/* Phone Numbers Card */}
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
            <View style={s.emptyContact}>
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
              placeholder="Add new phone number..."
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

        {/* Collaborators Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.collabBg }]}>
              <Ionicons name="people-outline" size={20} color={THEME_COLORS.collabBorder} />
            </View>
            <Text style={s.cardTitle}>Colleagues ({collaborators.length})</Text>
            {loadingCollaborators && (
              <ActivityIndicator size="small" color={THEME_COLORS.collabBorder} style={{ marginLeft: 8 }} />
            )}
          </View>
          
          {collaborators.length === 0 ? (
            <View style={s.emptyContact}>
              <Text style={s.emptyContactText}>No colleagues added yet</Text>
            </View>
          ) : (
            collaborators.map((collaborator) => (
              <View key={collaborator.id} style={s.listItem}>
                <View style={s.listItemContent}>
                  <Ionicons name="person" size={16} color={THEME_COLORS.collabBorder} />
                  <Text style={s.listItemText}>
                    {collaborator.user.full_name} 
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => removeCollaborator(collaborator.id)}
                  disabled={loadingCollaborators}
                  style={s.deleteBtn}
                  activeOpacity={0.6}
                >
                  {loadingCollaborators ? (
                    <ActivityIndicator size="small" color={THEME_COLORS.danger} />
                  ) : (
                    <Ionicons name="close-circle" size={20} color={THEME_COLORS.danger} />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={s.addRow}>
            <View style={s.searchContainer}>
              <TextInput
                style={s.searchInput}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
                placeholder="Search colleagues..."
                placeholderTextColor={THEME_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {searchLoading && (
                <ActivityIndicator size="small" color={THEME_COLORS.primary} style={s.searchLoader} />
              )}
            </View>
          </View>

          {/* Browse All Employees Button */}
          {searchQuery.length < 2 && potentialCollaborators.length === 0 && (
            <TouchableOpacity
              style={s.browseButton}
              onPress={() => setActiveDropdown('collaborator')}
              disabled={loadingCollaborators}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={18} color={THEME_COLORS.primary} />
              <Text style={s.browseButtonText}>Browse All Employees</Text>
            </TouchableOpacity>
          )}

          {/* Search Results */}
          {potentialCollaborators.length > 0 && (
            <View style={s.resultsBox}>
              {potentialCollaborators
                .filter(emp => !collaborators.some(collab => collab.user.email === emp.value))
                .map((employee) => (
                  <TouchableOpacity
                    key={employee.value}
                    style={s.resultItem}
                    onPress={() => addCollaborator(employee.value)}
                    disabled={loadingCollaborators}
                    activeOpacity={0.7}
                  >
                    <View style={s.resultContent}>
                      <View style={[s.iconCircleSmall, { backgroundColor: THEME_COLORS.collabBg }]}>
                        <Ionicons name="person-add" size={14} color={THEME_COLORS.collabBorder} />
                      </View>
                      <Text style={s.resultText} numberOfLines={2}>{employee.label}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={THEME_COLORS.success} />
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

        {/* Lead Management Card */}
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
                style={[s.selector, { borderLeftWidth: 4, borderLeftColor: getStatusColor(editedLead.status) }]}
                onPress={() => setActiveDropdown('status')}
                activeOpacity={0.7}
              >
                <Text style={s.selectorText} numberOfLines={1}>
                  {getFilterLabel('status', editedLead.status)}
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
                  {getFilterLabel('phase', editedLead.phase)}
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
                {getFilterLabel('subphase', editedLead.subphase)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[s.saveBtn, loading && s.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={THEME_COLORS.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={THEME_COLORS.white} />
              <Text style={s.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.bottomSpacer} />
      </ScrollView>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setEditedLead({...editedLead, status: value as Lead['status']})}
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
        onSelect={(value) => setEditedLead({...editedLead, subphase: value})}
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
      
      {/* Collaborator Modal */}
      {activeDropdown === 'collaborator' && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Colleague</Text>
              <TouchableOpacity 
                onPress={() => {
                  setActiveDropdown(null);
                  setSearchQuery('');
                  setPotentialCollaborators([]);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={THEME_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={s.searchContainer}>
              <TextInput
                style={s.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search employees..."
                placeholderTextColor={THEME_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {searchLoading && (
                <ActivityIndicator 
                  size="small" 
                  color={THEME_COLORS.primary} 
                  style={s.searchLoader} 
                />
              )}
            </View>
            
            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {potentialCollaborators.length > 0 ? (
                potentialCollaborators
                  .filter(emp => !collaborators.some(collab => collab.user.email === emp.value))
                  .map((employee) => (
                    <TouchableOpacity
                      key={employee.value}
                      style={s.modalItem}
                      onPress={() => addCollaborator(employee.value)}
                      disabled={loadingCollaborators}
                      activeOpacity={0.7}
                    >
                      <View style={s.modalItemContent}>
                        <Ionicons 
                          name="person" 
                          size={18} 
                          color={THEME_COLORS.primary}
                        />
                        <View style={s.modalItemInfo}>
                          <Text style={s.modalItemName} numberOfLines={1}>
                            {employee.label.split(' (')[0]}
                          </Text>
                          <Text style={s.modalItemEmail} numberOfLines={1}>
                            {employee.value}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => addCollaborator(employee.value)}
                        disabled={loadingCollaborators}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={22} color={THEME_COLORS.success} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
              ) : searchQuery.length >= 2 && !searchLoading ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyText}>No users found</Text>
                </View>
              ) : (
                allEmployees
                  .filter(emp => !collaborators.some(collab => collab.user.email === emp.value))
                  .map((employee) => (
                    <TouchableOpacity
                      key={employee.value}
                      style={s.modalItem}
                      onPress={() => addCollaborator(employee.value)}
                      disabled={loadingCollaborators}
                      activeOpacity={0.7}
                    >
                      <View style={s.modalItemContent}>
                        <Ionicons name="person" size={18} color={THEME_COLORS.primary} />
                        <View style={s.modalItemInfo}>
                          <Text style={s.modalItemName} numberOfLines={1}>
                            {employee.label.split(' (')[0]}
                          </Text>
                          <Text style={s.modalItemEmail} numberOfLines={1}>
                            {employee.value}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => addCollaborator(employee.value)}
                        disabled={loadingCollaborators}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={22} color={THEME_COLORS.success} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
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
    backgroundColor: THEME_COLORS.background 
  },
  
  // Header Styles (unchanged as requested)
  header: {
    backgroundColor: '#075E54',
    borderBottomWidth: 1,
    borderBottomColor: '#128C7E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 100,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginTop: 25
  },
  headerTextContainer: {
    flex: 1,
    marginTop: 25,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
  },
  saveHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#25D366',
    borderRadius: 20,
  },
  saveHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Main Content
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    paddingTop: 16, 
    paddingBottom: 32 
  },
  
  // Cards
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
  
  // Form Fields
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
  
  // Read-only fields
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
  
  // Selectors
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
  
  // List Items
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
  
  // Empty Contact
  emptyContact: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.surface,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderStyle: 'dashed',
  },
  emptyContactText: {
    fontSize: 14,
    color: THEME_COLORS.textTertiary,
  },
  
  // Add Rows
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
  
  // Error Messages
  error: {
    fontSize: 12,
    color: THEME_COLORS.danger,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  // Search
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
  
  // Browse Button
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: THEME_COLORS.surface,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.primary,
  },
  
  // Results
  resultsBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: THEME_COLORS.divider,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.border,
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultText: {
    fontSize: 13,
    color: THEME_COLORS.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  
  // Layout
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  
  // Icons
  iconCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Custom Fields
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
  
  // Save Button
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
  
  // Modal
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
  
  // Empty States
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
  
  // Spacing
  bottomSpacer: {
    height: 30,
  },
});

export default EditLead;