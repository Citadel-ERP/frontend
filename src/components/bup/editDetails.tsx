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
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, FilterOption, AssignedTo } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Modern green color scheme matching BDT EditLead
const MODERN_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F0F2F5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
};

interface EditLeadProps {
  lead: Lead;
  onBack: () => void;
  onSave: (updatedLead: Lead, editingEmails: string[], editingPhones: string[]) => void;
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

// Debounce hook for search
const useDebounce = (value: string, delay: number) => {
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
  selectedCity,
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
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'collaborator' | 'assigned' | null>(null);
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
  
  // Assigned person states
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [assignedToResults, setAssignedToResults] = useState<AssignedTo[]>([]);
  const [assignedToLoading, setAssignedToLoading] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
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

  useEffect(() => {
    fetchPhases();
    fetchEmployees();
    if (editedLead.phase) {
      fetchSubphasesForPhase(editedLead.phase);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      searchPotentialCollaborators(debouncedSearchQuery);
    } else {
      setPotentialCollaborators([]);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (debouncedAssignedSearch.length >= 2) {
      searchAssignedToUsers(debouncedAssignedSearch);
    } else {
      setAssignedToResults([]);
    }
  }, [debouncedAssignedSearch]);

  const ModernHeader = () => (
    <SafeAreaView style={styles.header}>
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
    </SafeAreaView>
  );

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

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getPotentialCollaborators?query=`, {
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
      const response = await fetch(`${BACKEND_URL}/manager/getCollaborators`, {
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

  const searchAssignedToUsers = async (query: string) => {
    try {
      if (!token || query.length < 2) {
        setAssignedToResults([]);
        return;
      }

      setAssignedToLoading(true);
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
    } catch (error) {
      console.error('Error searching assignable users:', error);
      setAssignedToResults([]);
    } finally {
      setAssignedToLoading(false);
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
      const response = await fetch(`${BACKEND_URL}/manager/addCollaborators`, {
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

      // Refresh collaborators list after adding
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
              const response = await fetch(`${BACKEND_URL}/manager/removeCollaborator`, {
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

  const handleAssignToUser = (user: AssignedTo) => {
    setEditedLead({...editedLead, assigned_to: user});
    setActiveDropdown(null);
    setAssignedToSearch('');
    setAssignedToResults([]);
  };

  const clearAssignedTo = () => {
    setEditedLead({...editedLead, assigned_to: null});
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

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(editedLead, editingEmails, editingPhones);
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
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  const getEmployeeNameByEmail = (email: string): string => {
    const employee = allEmployees.find(emp => emp.value === email);
    return employee?.label || email;
  };

  const getAssignedToLabel = (): string => {
    if (!editedLead.assigned_to) return 'Unassigned';
    return editedLead.assigned_to.full_name || `${editedLead.assigned_to.first_name} ${editedLead.assigned_to.last_name}`;
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
            <MaterialIcons name="info" size={20} color={MODERN_COLORS.primary} />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lead Name</Text>
            <TextInput
              style={styles.input}
              value={editedLead.name}
              onChangeText={(text) => setEditedLead({...editedLead, name: text})}
              placeholder="Enter lead name"
              placeholderTextColor={MODERN_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company</Text>
            <TextInput
              style={styles.input}
              value={editedLead.company || ''}
              onChangeText={(text) => setEditedLead({...editedLead, company: text})}
              placeholder="Enter company name"
              placeholderTextColor={MODERN_COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{selectedCity}</Text>
            </View>
          </View>

          {/* Assigned To Section - NEW */}
          <View style={styles.inputGroup}>
            <View style={styles.assignedToHeader}>
              <Text style={styles.inputLabel}>Assigned To</Text>
              {editedLead.assigned_to && (
                <TouchableOpacity onPress={clearAssignedTo} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={16} color={MODERN_COLORS.danger} />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setActiveDropdown('assigned')}
            >
              <View style={styles.assignedToContent}>
                {editedLead.assigned_to ? (
                  <>
                    <Ionicons name="person" size={18} color={MODERN_COLORS.primary} />
                    <Text style={styles.assignedToText} numberOfLines={1}>
                      {getAssignedToLabel()}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    Select assignee...
                  </Text>
                )}
              </View>
              <MaterialIcons name="arrow-drop-down" size={24} color={MODERN_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Email Addresses */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="email" size={20} color={MODERN_COLORS.primary} />
            <Text style={styles.sectionTitle}>Email Addresses ({editingEmails.length})</Text>
          </View>
          
          {editingEmails.length > 0 ? (
            editingEmails.map((email, index) => (
              <View key={index} style={styles.contactItemContainer}>
                <View style={styles.contactItemContent}>
                  <Text style={styles.contactItemText}>📧 {email}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeContactButton}
                  onPress={() => handleRemoveEmail(index)}
                >
                  <Ionicons name="close-circle" size={22} color={MODERN_COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No emails added</Text>
            </View>
          )}

          <View style={styles.addContactContainer}>
            <TextInput
              style={[styles.input, emailError && styles.inputError, {width: '83%'}]}
              value={newEmail}
              onChangeText={(text) => {
                setNewEmail(text);
                setEmailError(null);
              }}
              placeholder="Add email..."
              placeholderTextColor={MODERN_COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
              <Ionicons name="add-circle" size={24} color={MODERN_COLORS.primary} />
            </TouchableOpacity>
          </View>
          {emailError && <Text style={styles.errorText}>{emailError}</Text>}
        </View>

        {/* Phone Numbers */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="phone" size={20} color={MODERN_COLORS.primary} />
            <Text style={styles.sectionTitle}>Phone Numbers ({editingPhones.length})</Text>
          </View>
          
          {editingPhones.length > 0 ? (
            editingPhones.map((phone, index) => (
              <View key={index} style={styles.contactItemContainer}>
                <View style={styles.contactItemContent}>
                  <Text style={styles.contactItemText}>📱 {phone}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeContactButton}
                  onPress={() => handleRemovePhone(index)}
                >
                  <Ionicons name="close-circle" size={22} color={MODERN_COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No phone numbers added</Text>
            </View>
          )}

          <View style={styles.addContactContainer}>
            <TextInput
              style={[styles.input, phoneError && styles.inputError, {width: '83%'}]}
              value={newPhone}
              onChangeText={(text) => {
                setNewPhone(text);
                setPhoneError(null);
              }}
              placeholder="Add phone..."
              placeholderTextColor={MODERN_COLORS.textTertiary}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddPhone}>
              <Ionicons name="add-circle" size={24} color={MODERN_COLORS.primary} />
            </TouchableOpacity>
          </View>
          {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
        </View>

        {/* Collaborators */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={20} color={MODERN_COLORS.primary} />
            <Text style={styles.sectionTitle}>Collaborators ({collaborators.length})</Text>
            {loadingCollaborators && (
              <ActivityIndicator size="small" color={MODERN_COLORS.primary} style={{ marginLeft: 8 }} />
            )}
          </View>
          
          {collaborators.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No collaborators added yet</Text>
            </View>
          ) : (
            collaborators.map((collaborator) => (
              <View key={collaborator.id} style={styles.contactItemContainer}>
                <View style={styles.contactItemContent}>
                  <Text style={styles.contactItemText}>
                    👤 {collaborator.user.full_name} 
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeContactButton}
                  onPress={() => removeCollaborator(collaborator.id)}
                  disabled={loadingCollaborators}
                >
                  {loadingCollaborators ? (
                    <ActivityIndicator size="small" color={MODERN_COLORS.danger} />
                  ) : (
                    <Ionicons name="close-circle" size={22} color={MODERN_COLORS.danger} />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Add Collaborator Input */}
          <View style={styles.addContactContainer}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Type at least 2 characters to search..."
                placeholderTextColor={MODERN_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {searchLoading && (
                <ActivityIndicator size="small" color={MODERN_COLORS.primary} style={styles.searchLoading} />
              )}
            </View>
          </View>

          {/* Search Results */}
          {potentialCollaborators.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>Search Results:</Text>
              {potentialCollaborators
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
                      <Ionicons name="person" size={18} color={MODERN_COLORS.primary} />
                      <Text style={styles.searchResultText} numberOfLines={2}>
                        {employee.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => addCollaborator(employee.value)}
                      disabled={loadingCollaborators}
                    >
                      <Ionicons name="add-circle" size={24} color={MODERN_COLORS.success} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              }
            </View>
          )}
        </View>

        {/* Lead Management */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={20} color={MODERN_COLORS.primary} />
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
                <MaterialIcons name="arrow-drop-down" size={24} color={MODERN_COLORS.textSecondary} />
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
                <MaterialIcons name="arrow-drop-down" size={24} color={MODERN_COLORS.textSecondary} />
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
              <MaterialIcons name="arrow-drop-down" size={24} color={MODERN_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.detailCard}>
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.buttonDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={MODERN_COLORS.white} size="small" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color={MODERN_COLORS.white} />
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
          primary: MODERN_COLORS.primary,
          background: MODERN_COLORS.background,
          cardBg: MODERN_COLORS.surface,
          text: MODERN_COLORS.textPrimary,
          border: MODERN_COLORS.border,
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
          primary: MODERN_COLORS.primary,
          background: MODERN_COLORS.background,
          cardBg: MODERN_COLORS.surface,
          text: MODERN_COLORS.textPrimary,
          border: MODERN_COLORS.border,
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
          primary: MODERN_COLORS.primary,
          background: MODERN_COLORS.background,
          cardBg: MODERN_COLORS.surface,
          text: MODERN_COLORS.textPrimary,
          border: MODERN_COLORS.border,
        }}
      />
      <DropdownModal
        visible={activeDropdown === 'collaborator'}
        onClose={() => {
          setActiveDropdown(null);
          setSearchQuery('');
          setPotentialCollaborators([]);
        }}
        options={allEmployees.filter(emp => 
          !collaborators.some(collab => collab.user.email === emp.value)
        )}
        onSelect={async (email) => {
          await addCollaborator(email);
          setActiveDropdown(null);
        }}
        title="Add Collaborator"
        theme={{
          ...theme,
          primary: MODERN_COLORS.primary,
          background: MODERN_COLORS.background,
          cardBg: MODERN_COLORS.surface,
          text: MODERN_COLORS.textPrimary,
          border: MODERN_COLORS.border,
        }}
      />
      
      {/* Assigned To Dropdown Modal */}
      {activeDropdown === 'assigned' && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Lead To</Text>
              <TouchableOpacity onPress={() => setActiveDropdown(null)}>
                <Ionicons name="close" size={24} color={MODERN_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                value={assignedToSearch}
                onChangeText={setAssignedToSearch}
                placeholder="Search employees..."
                placeholderTextColor={MODERN_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {assignedToLoading && (
                <ActivityIndicator size="small" color={MODERN_COLORS.primary} style={styles.searchLoading} />
              )}
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Clear assignment option */}
              <TouchableOpacity
                style={styles.searchResultItem}
                onPress={clearAssignedTo}
              >
                <View style={styles.searchResultContent}>
                  <Ionicons name="person-remove" size={18} color={MODERN_COLORS.danger} />
                  <Text style={[styles.searchResultText, { color: MODERN_COLORS.danger }]}>
                    Unassign / Clear
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Current assigned user if exists */}
              {editedLead.assigned_to && (
                <View style={[styles.searchResultItem, styles.currentAssignedItem]}>
                  <View style={styles.searchResultContent}>
                    <Ionicons name="person-add" size={18} color={MODERN_COLORS.success} />
                    <View>
                      <Text style={[styles.searchResultText, { color: MODERN_COLORS.success, fontWeight: '600' }]}>
                        Current: {getAssignedToLabel()}
                      </Text>
                      <Text style={styles.assignedToEmail}>
                        {editedLead.assigned_to.email}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Search results */}
              {assignedToResults.length > 0 ? (
                assignedToResults.map((user) => (
                  <TouchableOpacity
                    key={user.email}
                    style={[
                      styles.searchResultItem,
                      editedLead.assigned_to?.email === user.email && styles.selectedItem
                    ]}
                    onPress={() => handleAssignToUser(user)}
                  >
                    <View style={styles.searchResultContent}>
                      <Ionicons 
                        name="person" 
                        size={18} 
                        color={editedLead.assigned_to?.email === user.email ? MODERN_COLORS.success : MODERN_COLORS.primary} 
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
                    {editedLead.assigned_to?.email === user.email && (
                      <Ionicons name="checkmark-circle" size={22} color={MODERN_COLORS.success} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                assignedToSearch.length >= 2 && !assignedToLoading && (
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
    backgroundColor: MODERN_COLORS.background,
  },
  
  // Header Styles
  header: {
    backgroundColor: MODERN_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: MODERN_COLORS.primaryDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MODERN_COLORS.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: MODERN_COLORS.secondary,
    borderRadius: 20,
  },
  saveHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: MODERN_COLORS.white,
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
    backgroundColor: MODERN_COLORS.surface,
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
    color: MODERN_COLORS.textPrimary,
  },
  
  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MODERN_COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
    backgroundColor: MODERN_COLORS.background,
    width: '100%',
  },
  inputError: {
    borderColor: MODERN_COLORS.danger,
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MODERN_COLORS.background,
  },
  readOnlyText: {
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
  },
  
  // Assigned To Section
  assignedToHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: MODERN_COLORS.background,
  },
  clearButtonText: {
    fontSize: 12,
    color: MODERN_COLORS.danger,
    fontWeight: '500',
  },
  assignedToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  assignedToText: {
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
    flex: 1,
  },
  assignedToUserInfo: {
    flex: 1,
    marginLeft: 8,
  },
  assignedToEmail: {
    fontSize: 12,
    color: MODERN_COLORS.textTertiary,
    marginTop: 2,
  },
  selectedItem: {
    backgroundColor: MODERN_COLORS.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: MODERN_COLORS.primary,
  },
  currentAssignedItem: {
    borderLeftWidth: 3,
    borderLeftColor: MODERN_COLORS.success,
  },
  
  // Contact Items
  contactItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: MODERN_COLORS.background,
    borderLeftWidth: 3,
    borderLeftColor: MODERN_COLORS.primary,
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: MODERN_COLORS.textPrimary,
    marginBottom: 4,
  },
  removeContactButton: {
    padding: 4,
  },
  
  // Add Contact
  addContactContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: MODERN_COLORS.border,
    width: '100%',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MODERN_COLORS.background,
  },
  addCollaboratorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: MODERN_COLORS.background,
    borderStyle: 'dashed',
  },
  addCollaboratorText: {
    fontSize: 15,
    fontWeight: '500',
    color: MODERN_COLORS.primary,
  },
  
  // Search Input
  searchInputContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
    backgroundColor: MODERN_COLORS.background,
    paddingRight: 40,
  },
  searchLoading: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  
  // Search Results
  searchResultsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: MODERN_COLORS.border,
    paddingTop: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: MODERN_COLORS.textSecondary,
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: MODERN_COLORS.background,
    borderLeftWidth: 3,
    borderLeftColor: MODERN_COLORS.accent,
  },
  searchResultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchResultText: {
    fontSize: 14,
    color: MODERN_COLORS.textPrimary,
    flex: 1,
  },
  
  // Error Text
  errorText: {
    fontSize: 12,
    color: MODERN_COLORS.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  
  // Empty State
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MODERN_COLORS.background,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: MODERN_COLORS.textTertiary,
    textAlign: 'center',
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
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: MODERN_COLORS.background,
  },
  dropdownText: {
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
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
    backgroundColor: MODERN_COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: MODERN_COLORS.white,
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
    backgroundColor: MODERN_COLORS.surface,
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
    color: MODERN_COLORS.textPrimary,
  },
  modalScrollView: {
    maxHeight: 400,
  },
});

export default EditLead;