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
} from 'react-native';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, FilterOption } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Modern green color scheme
const MODERN_COLORS = {
  primary: '#075E54', // WhatsApp green
  primaryLight: '#128C7E', // Light WhatsApp green
  primaryDark: '#054D44', // Dark WhatsApp green
  secondary: '#25D366', // WhatsApp bright green
  accent: '#10B981', // Emerald green
  danger: '#EF4444', // Red
  warning: '#F59E0B', // Amber
  background: '#F0F2F5', // Light background
  surface: '#FFFFFF', // White for surfaces
  textPrimary: '#1F2937', // Dark gray
  textSecondary: '#6B7280', // Medium gray
  textTertiary: '#9CA3AF', // Light gray
  border: '#E5E7EB', // Border gray
  success: '#25D366', // WhatsApp bright green
  info: '#3B82F6', // Blue for info
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
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);

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
    if (editedLead.phase) {
      fetchSubphasesForPhase(editedLead.phase);
    }
  }, []);

  // Modern Header Component
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

  const beautifyName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (editingEmails.includes(newEmail.trim())) {
      Alert.alert('Error', 'This email already exists');
      return;
    }
    setEditingEmails([...editingEmails, newEmail.trim()]);
    setNewEmail('');
  };

  const handleRemoveEmail = (index: number) => {
    setEditingEmails(editingEmails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    if (!newPhone.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (editingPhones.includes(newPhone.trim())) {
      Alert.alert('Error', 'This phone number already exists');
      return;
    }
    setEditingPhones([...editingPhones, newPhone.trim()]);
    setNewPhone('');
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
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Add email..."
              placeholderTextColor={MODERN_COLORS.textTertiary}
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
              <Ionicons name="add-circle" size={24} color={MODERN_COLORS.primary} />
            </TouchableOpacity>
          </View>
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
              style={styles.input}
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="Add phone..."
              placeholderTextColor={MODERN_COLORS.textTertiary}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddPhone}>
              <Ionicons name="add-circle" size={24} color={MODERN_COLORS.primary} />
            </TouchableOpacity>
          </View>
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
    height: 64,
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
    backgroundColor: MODERN_COLORS.background,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MODERN_COLORS.background,
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
    backgroundColor: MODERN_COLORS.background,
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