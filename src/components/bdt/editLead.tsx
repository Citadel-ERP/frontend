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
  SafeAreaView,
  Platform,
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, FilterOption } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Modern green color scheme
const MODERN_COLORS = {
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
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'collaborator' | null>(null);
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

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no-requirement', label: 'No Requirement' },
    { value: 'transaction-complete', label: 'Transaction Complete' },
    { value: 'non-responsive', label: 'Non Responsive' }
  ];

  useEffect(() => {
    fetchPhases();
    fetchEmployees();
    if (editedLead.phase) {
      fetchSubphasesForPhase(editedLead.phase);
    }
    // Fetch current collaborators when component mounts
    fetchCollaborators();
  }, []);

  const ModernHeader = () => (
    <View style={[styles.header,{paddingTop: Platform.OS === 'ios' ? 10 : 10}]}>
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
      
      // Transform employees to match API response structure
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
      
      // Transform to match FilterOption structure
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
      
      // Validate email
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

      // Refresh collaborators list
      await fetchCollaborators();
      // Clear search
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

              // Refresh collaborators list
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

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Update the lead with new data
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

  return (
    <View style={styles.container}>
      <ModernHeader />
      
      <ScrollView 
        style={styles.detailScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Contact Information */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="email" size={20} color={MODERN_COLORS.primary} />
            <Text style={styles.sectionTitle}>Email Addresses ({editingEmails.length})</Text>
          </View>
          
          {editingEmails.map((email, index) => (
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
          ))}

          <View style={styles.addContactContainer}>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
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

        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="phone" size={20} color={MODERN_COLORS.primary} />
            <Text style={styles.sectionTitle}>Phone Numbers ({editingPhones.length})</Text>
          </View>
          
          {editingPhones.map((phone, index) => (
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
          ))}

          <View style={styles.addContactContainer}>
            <TextInput
              style={[styles.input, phoneError && styles.inputError]}
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
            <Text style={styles.sectionTitle}>Colleague ({collaborators.length})</Text>
            {loadingCollaborators && (
              <ActivityIndicator size="small" color={MODERN_COLORS.primary} style={{ marginLeft: 8 }} />
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
                  <Text style={styles.contactItemText}>
                    👤 {collaborator.user.full_name} 
                  </Text>
                  {/* <Text style={styles.collaboratorAddedDate}>
                    Added on {new Date(collaborator.created_at).toLocaleDateString()}
                  </Text> */}
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

          {/* Add Colleague Input */}
          <View style={styles.addContactContainer}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.length >= 2) {
                    searchPotentialCollaborators(text);
                  } else {
                    setPotentialCollaborators([]);
                  }
                }}
                placeholder="Search by name or email..."
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

          {/* Or use dropdown if no search results */}
          {searchQuery.length < 2 && potentialCollaborators.length === 0 && (
            <TouchableOpacity
              style={styles.addCollaboratorButton}
              onPress={() => setActiveDropdown('collaborator')}
              disabled={loadingCollaborators}
            >
              <MaterialIcons name="person-add" size={20} color={MODERN_COLORS.primary} />
              <Text style={styles.addCollaboratorText}>Browse All Employees</Text>
            </TouchableOpacity>
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
        <View style={[{display:'flex', justifyContent: 'center', alignItems: 'center'}]}>
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.buttonDisabled,{width: '90%', alignItems: 'center'}]} 
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
        title="Add Colleague"
        theme={{
          ...theme,
          primary: MODERN_COLORS.primary,
          background: MODERN_COLORS.background,
          cardBg: MODERN_COLORS.surface,
          text: MODERN_COLORS.textPrimary,
          border: MODERN_COLORS.border,
        }}
      />
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
    marginTop:25
  },
  headerTextContainer: {
    flex: 1,
    marginTop: 25,
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
    marginTop: 25,
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
  collaboratorAddedDate: {
    fontSize: 12,
    color: MODERN_COLORS.textTertiary,
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
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: MODERN_COLORS.danger,
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
    marginBottom:10,
    color: MODERN_COLORS.textPrimary,
    backgroundColor: "#fff",
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
    backgroundColor: "#fff",
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: MODERN_COLORS.accent,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MODERN_COLORS.textSecondary,
    marginBottom: 8,
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
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  inputGroup: {
    marginBottom: 8,
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
});

export default EditLead;