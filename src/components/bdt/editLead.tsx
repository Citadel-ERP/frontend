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
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, FilterOption } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// WhatsApp Color Scheme (same as CreateLead BUP)
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

  const ModernHeader = () => (
    <View style={[styles.header, {paddingTop: Platform.OS === 'ios' ? 10 : 10}]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Edit Lead
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {lead.name || 'Lead Details'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <TouchableOpacity 
              onPress={handleSave}
              style={styles.saveHeaderButton}
              disabled={loading}
            >
              <Text style={styles.saveHeaderText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

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

  return (
    <View style={styles.container}>
      <ModernHeader />
      
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
              value={editedLead.name}
              onChangeText={(text) => setEditedLead({...editedLead, name: text})}
              placeholder="Enter lead name"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company</Text>
            <TextInput
              style={styles.input}
              value={editedLead.company || ''}
              onChangeText={(text) => setEditedLead({...editedLead, company: text})}
              placeholder="Enter company name (optional)"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            <View style={styles.readOnlyField}>
              <Ionicons name="location" size={16} color={WHATSAPP_COLORS.primaryDark} style={styles.fieldIcon} />
              <Text style={styles.readOnlyText}>{lead.city}</Text>
            </View>
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
              autoComplete="email"
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
              autoComplete="tel"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddPhone}>
              <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.primary} />
            </TouchableOpacity>
          </View>
          {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
        </View>

        {/* Collaborators */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Colleague ({collaborators.length})</Text>
            {loadingCollaborators && (
              <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} style={{ marginLeft: 8 }} />
            )}
          </View>
          
          {collaborators.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No Colleague added yet</Text>
            </View>
          ) : (
            collaborators.map((collaborator) => (
              <View key={collaborator.id} style={styles.contactItemContainer}>
                <View style={styles.contactItemContent}>
                  <Ionicons name="person" size={16} color={WHATSAPP_COLORS.primaryLight} style={styles.contactIcon} />
                  <Text style={styles.contactItemText}>
                    {collaborator.user.full_name} 
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeContactButton}
                  onPress={() => removeCollaborator(collaborator.id)}
                  disabled={loadingCollaborators}
                >
                  {loadingCollaborators ? (
                    <ActivityIndicator size="small" color={WHATSAPP_COLORS.danger} />
                  ) : (
                    <Ionicons name="close-circle" size={22} color={WHATSAPP_COLORS.danger} />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Add Colleague Input */}
          <View style={styles.addContactContainer}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
                placeholder="Search by name or email..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {searchLoading && (
                <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} style={styles.searchLoading} />
              )}
            </View>
          </View>

          {/* Or use dropdown if no search results */}
          {searchQuery.length < 2 && potentialCollaborators.length === 0 && (
            <TouchableOpacity
              style={styles.addCollaboratorButton}
              onPress={() => setActiveDropdown('collaborator')}
              disabled={loadingCollaborators}
            >
              <MaterialIcons name="person-add" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.addCollaboratorText}>Browse All Employees</Text>
            </TouchableOpacity>
          )}
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
                  {getFilterLabel('status', editedLead.status)}
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
                  {getFilterLabel('phase', editedLead.phase)}
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
                {getFilterLabel('subphase', editedLead.subphase)}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={[{display:'flex', justifyContent: 'center', alignItems: 'center'}]}>
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.buttonDisabled,{width: '90%', alignItems: 'center'}]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color={WHATSAPP_COLORS.white} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
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
        onSelect={(value) => setEditedLead({...editedLead, status: value as Lead['status']})}
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
        onSelect={(value) => setEditedLead({...editedLead, subphase: value})}
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
      
      {/* Collaborator Dropdown Modal */}
      {activeDropdown === 'collaborator' && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Colleague</Text>
              <TouchableOpacity onPress={() => {
                setActiveDropdown(null);
                setSearchQuery('');
                setPotentialCollaborators([]);
              }}>
                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search employees..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {searchLoading && (
                <ActivityIndicator 
                  size="small" 
                  color={WHATSAPP_COLORS.primary} 
                  style={styles.searchLoading} 
                />
              )}
            </View>
            
            <ScrollView style={styles.modalScrollView}>              
              {/* Search results */}
              {potentialCollaborators.length > 0 ? (
                potentialCollaborators
                  .filter(emp => 
                    !collaborators.some(collab => collab.user.email === emp.value)
                  )
                  .map((employee) => (
                    <TouchableOpacity
                      key={employee.value}
                      style={[
                        styles.searchResultItem,
                        { backgroundColor: "#fff" },
                      ]}
                      onPress={() => addCollaborator(employee.value)}
                      disabled={loadingCollaborators}
                    >
                      <View style={styles.searchResultContent}>
                        <Ionicons 
                          name="person" 
                          size={18} 
                          color={WHATSAPP_COLORS.primary}
                        />
                        <Text style={styles.searchResultText} numberOfLines={2}>
                          {employee.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => addCollaborator(employee.value)}
                        disabled={loadingCollaborators}
                      >
                        <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.success} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
              ) : searchQuery.length >= 2 && !searchLoading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No users found</Text>
                </View>
              ) : (
                allEmployees
                  .filter(emp => 
                    !collaborators.some(collab => collab.user.email === emp.value)
                  )
                  .map((employee) => (
                    <TouchableOpacity
                      key={employee.value}
                      style={styles.searchResultItem}
                      onPress={() => addCollaborator(employee.value)}
                      disabled={loadingCollaborators}
                    >
                      <View style={styles.searchResultContent}>
                        <Ionicons name="person" size={18} color={WHATSAPP_COLORS.primary} />
                        <Text style={styles.searchResultText} numberOfLines={2}>
                          {employee.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => addCollaborator(employee.value)}
                        disabled={loadingCollaborators}
                      >
                        <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.success} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
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
  
  // Header Styles
  header: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.primaryDark,
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
    color: WHATSAPP_COLORS.white,
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
    backgroundColor: WHATSAPP_COLORS.secondary,
    borderRadius: 20,
  },
  saveHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
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
  
  // Assigned To Content (reused for office type)
  assignedToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
  
  // Empty State
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
    textAlign: 'center',
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
  addCollaboratorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    borderStyle: 'dashed',
  },
  addCollaboratorText: {
    fontSize: 15,
    fontWeight: '500',
    color: WHATSAPP_COLORS.primary,
  },
  
  // Search Input
  searchInputContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: "#fff",
    paddingRight: 40,
  },
  searchLoading: {
    position: 'absolute',
    right: 12,
    top: 12,
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
  
  // Save Button
  saveButton: {
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
  saveButtonText: {
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
  
  // Search Results
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderLeftWidth: 3,
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

export default EditLead;