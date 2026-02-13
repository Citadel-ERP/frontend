import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, SafeAreaView, StatusBar, Platform,
  KeyboardAvoidingView, Modal 
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, FilterOption, AssignedTo } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface FilterOptionWithColor extends FilterOption {
  color?: string;
}

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

interface EditLeadProps {
  lead: Lead;
  onBack: () => void;
  onSave: (updatedLead: Lead, editingEmails: string[], editingPhones: string[]) => void;
  onDelete: () => void;
  token: string | null;
  theme: ThemeColors;
  fetchSubphases: (phase: string) => Promise<void>;
  selectedCity: string;
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

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [value, delay]);

  return debouncedValue;
};

const EditLead: React.FC<EditLeadProps> = ({
  lead, onBack, onSave, onDelete, token, theme, fetchSubphases, selectedCity,
}) => {
  const [editedLead, setEditedLead] = useState<Lead>(lead);
  const [editingEmails, setEditingEmails] = useState<string[]>(lead.emails.map(e => e.email));
  const [editingPhones, setEditingPhones] = useState<string[]>(lead.phone_numbers.map(p => p.number));
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'collaborator' | 'assigned' | 'officeType' | null>(null);
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
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [assignedToResults, setAssignedToResults] = useState<AssignedTo[]>([]);
  const [assignedToLoading, setAssignedToLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [areaRequirements, setAreaRequirements] = useState<string>(
    (lead.meta && typeof lead.meta === 'object' && lead.meta.area_requirements)
      ? String(lead.meta.area_requirements)
      : ''
  );
  const [officeType, setOfficeType] = useState<string>(
    (lead.meta && typeof lead.meta === 'object' && lead.meta.office_type)
      ? String(lead.meta.office_type)
      : ''
  );
  const [location, setLocation] = useState<string>(
    (lead.meta && typeof lead.meta === 'object' && lead.meta.location)
      ? String(lead.meta.location)
      : ''
  );
  const [contactPersonName, setContactPersonName] = useState<string>(
    (lead.meta && typeof lead.meta === 'object' && lead.meta.contact_person_name)
      ? String(lead.meta.contact_person_name)
      : ''
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    if (!lead.meta || typeof lead.meta !== 'object') return [];
    const defaultKeys = ['area_requirements', 'office_type', 'location', 'contact_person_name'];
    const customEntries = Object.entries(lead.meta)
      .filter(([key]) => !defaultKeys.includes(key))
      .map(([key, value], index) => ({
        id: `custom-${index}`,
        key,
        value: String(value)
      }));
    return customEntries;
  });
  const [customFieldErrors, setCustomFieldErrors] = useState<{ [key: string]: string }>({});

  const initializationDoneRef = useRef(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedAssignedSearch = useDebounce(assignedToSearch, 300);

  const STATUS_CHOICES: FilterOptionWithColor[] = [
    { value: 'active', label: 'Active', color: THEME_COLORS.success },
    { value: 'hold', label: 'Hold', color: THEME_COLORS.warning },
    { value: 'mandate', label: 'Mandate', color: THEME_COLORS.info },
    { value: 'closed', label: 'Closed', color: THEME_COLORS.textSecondary },
    { value: 'no_requirement', label: 'No Requirement', color: THEME_COLORS.textTertiary },
    { value: 'transaction_complete', label: 'Transaction Complete', color: THEME_COLORS.success },
    { value: 'non_responsive', label: 'Non Responsive', color: THEME_COLORS.danger }
  ];

  const OFFICE_TYPE_CHOICES: FilterOption[] = [
    { value: 'conventional_office', label: 'Conventional Office' },
    { value: 'managed_office', label: 'Managed Office' },
    { value: 'conventional_and_managed_office', label: 'Conventional and Managed Office' }
  ];

  const fetchPhases = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllPhases`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const beautifyName = (name: string): string => {
        return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      };
      setAllPhases(data.phases.map((phase: string) => ({ value: phase, label: beautifyName(phase) })));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  }, []);

  const fetchSubphasesForPhase = useCallback(async (phase: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const beautifyName = (name: string): string => {
        return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      };
      setAllSubphases(data.subphases.map((subphase: string) => ({ value: subphase, label: beautifyName(subphase) })));
    } catch (error) {
      console.error('Error fetching subphases:', error);
      setAllSubphases([]);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getPotentialCollaborators?query=`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
  }, []);

  const fetchCollaborators = useCallback(async () => {
    try {
      if (!token || !lead.id) return;
      
      const response = await fetch(`${BACKEND_URL}/manager/getCollaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: lead.id })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.collaborators) setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  }, [token, lead.id]);

  const searchPotentialCollaborators = useCallback(async (query: string) => {
    try {
      if (!token || query.length < 2) {
        setPotentialCollaborators([]);
        return;
      }
      setSearchLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/manager/getPotentialCollaborators?query=${encodeURIComponent(query)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
  }, [token]);

  const searchAssignedToUsers = useCallback(async (query: string) => {
    try {
      if (!token) {
        setAssignedToResults([]);
        return;
      }
      setAssignedToLoading(true);
      if (query.length === 0) {
        const response = await fetch(`${BACKEND_URL}/manager/getUsers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAssignedToResults(data.users || []);
        return;
      }
      if (query.length >= 2) {
        const response = await fetch(
          `${BACKEND_URL}/manager/getPotentialCollaborators?query=${encodeURIComponent(query)}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
  }, [token]);

  useEffect(() => {
  if (!initializationDoneRef.current) {
    initializationDoneRef.current = true;
    
    const initialize = async () => {
      await fetchPhases();
      await fetchEmployees();
      await fetchCollaborators();
      
      // Capture the initial phase value from props
      const initialPhase = lead.phase;
      if (initialPhase) {
        await fetchSubphasesForPhase(initialPhase);
      }
    };
    
    initialize();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty dependency array - runs only once on mount

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      searchPotentialCollaborators(debouncedSearchQuery);
    } else {
      setPotentialCollaborators([]);
    }
  }, [debouncedSearchQuery, searchPotentialCollaborators]);

  useEffect(() => {
    if (activeDropdown === 'assigned') {
      searchAssignedToUsers(debouncedAssignedSearch);
    }
  }, [debouncedAssignedSearch, activeDropdown, searchAssignedToUsers]);

  const ModernHeader = () => (
    <SafeAreaView style={s.header}>
      <View style={s.headerContent}>
        <TouchableOpacity onPress={onBack} style={s.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={s.headerTextContainer}>
          <Text style={s.headerTitle} numberOfLines={1}>Edit Lead</Text>
          <Text style={s.headerSubtitle} numberOfLines={1}>{lead.company || 'Lead Details'}</Text>
        </View>

        <View style={s.headerActions}>
          <TouchableOpacity 
            onPress={handleDelete} 
            style={[s.deleteHeaderButton, { marginRight: 12 }]}
            disabled={deleteLoading || loading}
          >
            {deleteLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <TouchableOpacity onPress={handleSave} style={s.saveHeaderButton} disabled={loading}>
              <Text style={s.saveHeaderText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      Alert.alert(
        'Delete Lead',
        'Are you sure you want to delete this lead? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setDeleteLoading(false) },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await onDelete();
                onBack();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete lead');
                setDeleteLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      setDeleteLoading(false);
    }
  };

  const addCollaborator = useCallback(async (email: string) => {
    try {
      if (!token || !lead.id) {
        Alert.alert('Error', 'Missing required information');
        return;
      }
      if (!validateEmail(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }
      
      // Find the collaborator being added to get their data
      const selectedEmployee = potentialCollaborators.find(emp => emp.value === email) as any;
      if (!selectedEmployee) {
        Alert.alert('Error', 'Employee data not found');
        return;
      }
      
      // Create optimistic collaborator object
      const optimisticCollaborator: Collaborator = {
        id: `temp-${Date.now()}`,
        user: {
          email: email,
          first_name: selectedEmployee.userData?.first_name || email.split('@')[0],
          last_name: selectedEmployee.userData?.last_name || '',
          full_name: selectedEmployee.label.split('(')[0].trim(),
          employee_id: selectedEmployee.userData?.employee_id || '',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // OPTIMISTIC: Add to state immediately without waiting for backend
      setCollaborators([...collaborators, optimisticCollaborator]);
      setSearchQuery('');
      setPotentialCollaborators([]);
      
      // Now send to backend (non-blocking)
      const response = await fetch(`${BACKEND_URL}/manager/addCollaborator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: lead.id, email: email })
      });
      
      const data = await response.json();
      if (!response.ok) {
        // If backend fails, remove the optimistic entry
        setCollaborators(prevCollab => prevCollab.filter(c => c.id !== optimisticCollaborator.id));
        Alert.alert('Error', data.message || 'Failed to add collaborator');
        return;
      }
      
      // Success - fetch fresh data from backend to replace optimistic entry with real data
      await fetchCollaborators();
      
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      // Remove optimistic entry on error
      setCollaborators(prevCollab => prevCollab.filter(c => !c.id.toString().startsWith('temp-')));
      Alert.alert('Error', error.message || 'Failed to add collaborator');
    }
  }, [token, lead.id, potentialCollaborators, collaborators, fetchCollaborators]);

  const removeCollaborator = useCallback(async (collaboratorId: string | number) => {
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
              // OPTIMISTIC: Remove from state immediately
              setCollaborators(collaborators.filter(c => c.id !== collaboratorId));
              
              try {
                const response = await fetch(`${BACKEND_URL}/manager/removeCollaborator`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token, lead_id: lead.id, collaborator_id: collaboratorId })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Failed to remove collaborator');
                
                Alert.alert('Success', data.message || 'Collaborator removed successfully');
              } catch (error: any) {
                // If backend fails, add back to list
                await fetchCollaborators();
                Alert.alert('Error', error.message || 'Failed to remove collaborator');
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', error.message || 'Failed to remove collaborator');
    }
  }, [token, lead.id, collaborators, fetchCollaborators]);

  const handleAssignToUser = useCallback((user: AssignedTo) => {
    setEditedLead(prev => ({ ...prev, assigned_to: user }));
    setActiveDropdown(null);
    setAssignedToSearch('');
    setAssignedToResults([]);
  }, []);

  const beautifyName = (name: string): string => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const handleAddEmail = useCallback(() => {
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
  }, [newEmail, editingEmails]);

  const handleRemoveEmail = useCallback((index: number) => {
    setEditingEmails(editingEmails.filter((_, i) => i !== index));
  }, [editingEmails]);

  const handleAddPhone = useCallback(() => {
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
  }, [newPhone, editingPhones]);

  const handleRemovePhone = useCallback((index: number) => {
    setEditingPhones(editingPhones.filter((_, i) => i !== index));
  }, [editingPhones]);

  const handleAddCustomField = useCallback(() => {
    const newId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCustomFields([...customFields, { id: newId, key: '', value: '' }]);
  }, [customFields]);

  const handleRemoveCustomField = useCallback((id: string) => {
    setCustomFields(customFields.filter(field => field.id !== id));
    setCustomFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  }, [customFields]);

  const handleCustomFieldChange = useCallback((id: string, field: 'key' | 'value', text: string) => {
    setCustomFields(customFields.map(fieldItem =>
      fieldItem.id === id ? { ...fieldItem, [field]: text } : fieldItem
    ));

    if (customFieldErrors[id]) {
      setCustomFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  }, [customFields, customFieldErrors]);

  const validateCustomFields = useCallback((): boolean => {
    const errors: { [key: string]: string } = {};
    let isValid = true;

    customFields.forEach(field => {
      if (field.key.trim() === '' && field.value.trim() !== '') {
        errors[field.id] = 'Key is required when value is provided';
        isValid = false;
      }
    });

    setCustomFieldErrors(errors);
    return isValid;
  }, [customFields]);

  const handleSave = async () => {
    try {
      if (!validateCustomFields()) {
        Alert.alert('Validation Error', 'Please check your custom fields. Key is required when value is provided.');
        return;
      }

      setLoading(true);

      const meta: { [key: string]: any } = {};

      if (areaRequirements.trim()) meta.area_requirements = areaRequirements.trim();
      if (officeType) meta.office_type = officeType;
      if (location.trim()) meta.location = location.trim();
      if (contactPersonName.trim()) meta.contact_person_name = contactPersonName.trim();
      
      customFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          meta[field.key.trim()] = field.value.trim();
        }
      });

      const updatedLead: Lead = {
        ...editedLead,
        meta: Object.keys(meta).length > 0 ? meta : null
      };

      await onSave(updatedLead, editingEmails, editingPhones);
    } catch (error) {
      Alert.alert('Error', 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseSelection = useCallback(async (phase: string) => {
    setEditedLead(prev => ({ ...prev, phase: phase }));
    await fetchSubphases(phase);
    await fetchSubphasesForPhase(phase);
    if (allSubphases.length > 0) {
      setEditedLead(prev => ({ ...prev, subphase: '' }));
    }
  }, [fetchSubphases, fetchSubphasesForPhase, allSubphases.length]);

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

  const getAssignedToLabel = (): string => {
    if (!editedLead.assigned_to) return 'Unassigned';
    return editedLead.assigned_to.full_name || `${editedLead.assigned_to.first_name} ${editedLead.assigned_to.last_name}`;
  };

  const getOfficeTypeLabel = (): string => {
    const option = OFFICE_TYPE_CHOICES.find(choice => choice.value === officeType);
    return option ? option.label : 'Select office type...';
  };

  const getStatusColor = (status: string): string => {
    const option = STATUS_CHOICES.find(choice => choice.value === status);
    return option?.color || THEME_COLORS.primary;
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ModernHeader />

      <ScrollView 
        style={s.scrollView} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={s.scrollContent}
      >
        {/* Basic Information Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.primary + '15' }]}>
              <Ionicons name="person-outline" size={20} color={THEME_COLORS.primary} />
            </View>
            <Text style={s.cardTitle}>Basic Information</Text>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Company</Text>
            <TextInput
              style={s.input}
              value={editedLead.company || ''}
              onChangeText={(text) => setEditedLead({ ...editedLead, company: text })}
              placeholder="Enter company name"
              placeholderTextColor={THEME_COLORS.textTertiary}
            />
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
                {editedLead.assigned_to ? (
                  <>
                    <View style={[s.iconCircleSmall, { backgroundColor: THEME_COLORS.accent }]}>
                      <Ionicons name="person" size={14} color={THEME_COLORS.primary} />
                    </View>
                    <Text style={s.selectorText} numberOfLines={1}>{getAssignedToLabel()}</Text>
                  </>
                ) : (
                  <Text style={s.selectorPlaceholder}>Select assignee...</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Lead Specific Information Card */}
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

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <View style={s.customFieldsSection}>
              <Text style={[s.label, { marginBottom: 12 }]}>Additional Information</Text>
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

        {/* Email Addresses Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: THEME_COLORS.emailBg }]}>
              <Ionicons name="mail-outline" size={20} color={THEME_COLORS.emailBorder} />
            </View>
            <Text style={s.cardTitle}>Email Addresses ({editingEmails.length})</Text>
          </View>

          {editingEmails.map((email, idx) => (
            <View key={idx} style={s.listItem}>
              <View style={s.listItemContent}>
                <Ionicons name="mail" size={16} color={THEME_COLORS.emailBorder} />
                <Text style={s.listItemText}>{email}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleRemoveEmail(idx)} 
                style={s.listItemDeleteBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={20} color={THEME_COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={s.addRow}>
            <TextInput
              style={[s.input, emailError && s.inputError, { flex: 1 }]}
              value={newEmail}
              onChangeText={(text) => { setNewEmail(text); setEmailError(null); }}
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

          {editingPhones.map((phone, idx) => (
            <View key={idx} style={s.listItem}>
              <View style={s.listItemContent}>
                <Ionicons name="call" size={16} color={THEME_COLORS.phoneBorder} />
                <Text style={s.listItemText}>{phone}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleRemovePhone(idx)} 
                style={s.listItemDeleteBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={20} color={THEME_COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={s.addRow}>
            <TextInput
              style={[s.input, phoneError && s.inputError, { flex: 1 }]}
              value={newPhone}
              onChangeText={(text) => { setNewPhone(text); setPhoneError(null); }}
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
          </View>

          {collaborators.map((collab) => (
            <View key={collab.id} style={s.listItem}>
              <View style={s.listItemContent}>
                <Ionicons name="person" size={16} color={THEME_COLORS.collabBorder} />
                <Text style={s.listItemText}>{collab.user.full_name}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => removeCollaborator(collab.id)} 
                style={s.listItemDeleteBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={20} color={THEME_COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={s.addRow}>
            <View style={s.searchContainer}>
              <TextInput
                style={s.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search colleagues..."
                placeholderTextColor={THEME_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {searchLoading && <ActivityIndicator size="small" color={THEME_COLORS.primary} style={s.searchLoader} />}
            </View>
          </View>

          {potentialCollaborators.length > 0 && (
            <View style={s.resultsBox}>
              {potentialCollaborators
                .filter(emp => !collaborators.some(collab => collab.user.email === emp.value))
                .map((employee) => (
                  <TouchableOpacity
                    key={employee.value}
                    style={s.resultItem}
                    onPress={() => addCollaborator(employee.value)}
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

        {/* Delete Button */}
        <TouchableOpacity 
          style={[s.deleteBtn, (deleteLoading || loading) && s.deleteBtnDisabled]} 
          onPress={handleDelete}
          disabled={deleteLoading || loading}
          activeOpacity={0.8}
        >
          {deleteLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={s.deleteBtnText}>Delete Lead</Text>
            </>
          )}
        </TouchableOpacity>

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
        onSelect={(value) => setEditedLead({ ...editedLead, status: value as Lead['status'] })}
        title="Select Status"
        theme={{ ...theme, primary: THEME_COLORS.primary, background: THEME_COLORS.background, cardBg: THEME_COLORS.card, text: THEME_COLORS.textPrimary, border: THEME_COLORS.border }}
      />
      <DropdownModal
        visible={activeDropdown === 'phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelection}
        title="Select Phase"
        theme={{ ...theme, primary: THEME_COLORS.primary, background: THEME_COLORS.background, cardBg: THEME_COLORS.card, text: THEME_COLORS.textPrimary, border: THEME_COLORS.border }}
      />
      <DropdownModal
        visible={activeDropdown === 'subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => setEditedLead({ ...editedLead, subphase: value })}
        title="Select Subphase"
        theme={{ ...theme, primary: THEME_COLORS.primary, background: THEME_COLORS.background, cardBg: THEME_COLORS.card, text: THEME_COLORS.textPrimary, border: THEME_COLORS.border }}
      />
      <DropdownModal
        visible={activeDropdown === 'officeType'}
        onClose={() => setActiveDropdown(null)}
        options={OFFICE_TYPE_CHOICES}
        onSelect={(value) => setOfficeType(value)}
        title="Select Office Type"
        theme={{ ...theme, primary: THEME_COLORS.primary, background: THEME_COLORS.background, cardBg: THEME_COLORS.card, text: THEME_COLORS.textPrimary, border: THEME_COLORS.border }}
      />

      {/* Assigned To Modal */}
      {activeDropdown === 'assigned' && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActiveDropdown(null)}
        >
          <TouchableOpacity 
            style={s.modalOverlay}
            activeOpacity={1} 
            onPress={() => setActiveDropdown(null)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={s.modalContent}
            >
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
                {assignedToLoading && (
                  <ActivityIndicator 
                    size="small" 
                    color={THEME_COLORS.primary} 
                    style={s.searchLoader} 
                  />
                )}
              </View>

              <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
                {assignedToResults.length > 0 ? (
                  assignedToResults.map((user) => (
                    <TouchableOpacity
                      key={user.email}
                      style={[
                        s.modalItem, 
                        editedLead.assigned_to?.email === user.email && s.modalItemSelected
                      ]}
                      onPress={() => handleAssignToUser(user)}
                      activeOpacity={0.7}
                    >
                      <View style={s.modalItemContent}>
                        <Ionicons 
                          name="person" 
                          size={18} 
                          color={
                            editedLead.assigned_to?.email === user.email 
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
                      {editedLead.assigned_to?.email === user.email && (
                        <Ionicons 
                          name="checkmark-circle" 
                          size={20} 
                          color={THEME_COLORS.primary} 
                        />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  !assignedToLoading && (
                    <View style={s.emptyState}>
                      <Text style={s.emptyText}>No users found</Text>
                    </View>
                  )
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME_COLORS.background },
  header: { 
    backgroundColor: '#075E54', 
    borderBottomWidth: 1, 
    borderBottomColor: '#128C7E', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 3, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    height: 60 
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  deleteHeaderButton: {
    padding: 8,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#25D366', borderRadius: 20 },
  saveHeaderText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 32 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '600', color: THEME_COLORS.textPrimary, letterSpacing: -0.3 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: THEME_COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.2, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderColor: THEME_COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: THEME_COLORS.textPrimary, backgroundColor: THEME_COLORS.surface },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: THEME_COLORS.danger, backgroundColor: '#FEF2F2' },
  readOnlyField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: THEME_COLORS.divider, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: THEME_COLORS.surface },
  fieldIcon: { marginRight: 10 },
  readOnlyText: { fontSize: 15, color: THEME_COLORS.textPrimary, fontWeight: '500' },
  selector: { borderWidth: 1.5, borderColor: THEME_COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: THEME_COLORS.surface },
  selectorContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  selectorText: { fontSize: 15, color: THEME_COLORS.textPrimary, flex: 1, fontWeight: '500' },
  selectorPlaceholder: { fontSize: 15, color: THEME_COLORS.textTertiary, fontStyle: 'italic' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 12, paddingLeft: 14, paddingVertical: 12, borderRadius: 10, marginBottom: 8, backgroundColor: THEME_COLORS.surface, borderWidth: 1, borderColor: THEME_COLORS.border },
  listItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listItemText: { fontSize: 14, fontWeight: '500', color: THEME_COLORS.textPrimary, flex: 1 },
  listItemDeleteBtn: { padding: 8, borderRadius: 20, backgroundColor: THEME_COLORS.background, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: THEME_COLORS.divider },
  addBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME_COLORS.hover },
  error: { fontSize: 12, color: THEME_COLORS.danger, marginTop: 6, marginLeft: 4, fontWeight: '500' },
  searchContainer: { flex: 1, position: 'relative' },
  searchInput: { marginBottom: 12, borderWidth: 1.5, borderColor: THEME_COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: THEME_COLORS.textPrimary, backgroundColor: THEME_COLORS.surface, paddingRight: 40 },
  searchLoader: { position: 'absolute', right: 14, top: 12 },
  resultsBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: THEME_COLORS.divider },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, backgroundColor: THEME_COLORS.surface, borderWidth: 1.5, borderColor: THEME_COLORS.border },
  resultContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultText: { fontSize: 13, color: THEME_COLORS.textPrimary, flex: 1, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfField: { flex: 1 },
  iconCircleSmall: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  customFieldsSection: { marginTop: 8, marginBottom: 16 },
  customFieldRow: { marginBottom: 12 },
  customFieldInputs: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 4 },
  customFieldInput: { flex: 1, borderWidth: 1.5, borderColor: THEME_COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: THEME_COLORS.textPrimary, backgroundColor: THEME_COLORS.customFieldBg },
  removeCustomFieldBtn: { padding: 10 },
  addCustomFieldBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: THEME_COLORS.hover, borderWidth: 1.5, borderColor: THEME_COLORS.border, borderStyle: 'dashed' },
  addCustomFieldText: { fontSize: 14, fontWeight: '600', color: THEME_COLORS.primary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#EF4444', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, backgroundColor: THEME_COLORS.primary, marginHorizontal: 16, marginTop: 8, marginBottom: 8, shadowColor: THEME_COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.white, letterSpacing: 0.3 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { width: '90%', maxHeight: '70%', backgroundColor: THEME_COLORS.card, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: THEME_COLORS.divider },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME_COLORS.textPrimary },
  modalScroll: { maxHeight: 350 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 8, backgroundColor: THEME_COLORS.surface, borderWidth: 1.5, borderColor: THEME_COLORS.border },
  modalItemSelected: { backgroundColor: THEME_COLORS.accent, borderLeftWidth: 4, borderLeftColor: THEME_COLORS.primary, borderColor: THEME_COLORS.primary },
  modalItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  modalItemInfo: { flex: 1, marginLeft: 12 },
  modalItemName: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textPrimary },
  modalItemEmail: { fontSize: 12, color: THEME_COLORS.textTertiary, marginTop: 2 },
  emptyState: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: THEME_COLORS.textTertiary, fontStyle: 'italic' },
  bottomSpacer: { height: 30 },
});

export default EditLead;