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
import { ThemeColors, Lead, FilterOption } from './types';
import DropdownModal from './dropdownModal';

interface EditLeadProps {
  lead: Lead;
  onBack: () => void;
  onSave: (updatedLead: Lead, editingEmails: string[], editingPhones: string[]) => void;
  token: string | null;
  theme: ThemeColors;
  fetchSubphases: (phase: string) => Promise<void>;
  selectedCity: string;
}

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
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);

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
    if (editedLead.phase) {
      fetchSubphasesForPhase(editedLead.phase);
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

  const handlePhaseSelection = async (phase: string) => {
    setEditedLead({...editedLead, phase: phase, subphase: ''});
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

  return (
    <ScrollView 
      style={[styles.detailScrollView, { backgroundColor: theme.background }]} 
      showsVerticalScrollIndicator={false}
    >
      {/* Basic Information Card */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Lead Name</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.white,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={editedLead.name}
            onChangeText={(text) => setEditedLead({...editedLead, name: text})}
            placeholder="Enter lead name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Company</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.white,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={editedLead.company || ''}
            onChangeText={(text) => setEditedLead({...editedLead, company: text})}
            placeholder="Enter company name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>City</Text>
          <View style={[styles.readOnlyField, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.readOnlyText, { color: theme.text }]}>{selectedCity}</Text>
          </View>
        </View>
      </View>

      {/* Contact Information Card */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Information</Text>
        
        <Text style={[styles.subsectionTitle, { color: theme.text }]}>Email Addresses ({editingEmails.length})</Text>
        {editingEmails.length > 0 ? (
          editingEmails.map((email, index) => (
            <View key={index} style={[styles.contactItemContainer, { 
              backgroundColor: theme.backgroundSecondary,
              borderLeftColor: theme.info
            }]}>
              <View style={styles.contactItemContent}>
                <Text style={[styles.contactItemText, { color: theme.text }]}>📧 {email}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.removeContactButton, { backgroundColor: theme.error }]}
                onPress={() => handleRemoveEmail(index)}
              >
                <Text style={[styles.removeContactButtonText, { color: theme.white }]}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={[styles.emptyContactContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.emptyContactText, { color: theme.textSecondary }]}>No emails added</Text>
          </View>
        )}

        <View style={[styles.addContactContainer, { borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { flex: 1, 
              backgroundColor: theme.white,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="Add email..."
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
          />
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleAddEmail}>
            <Text style={[styles.addButtonText, { color: theme.white }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Phone Numbers Card */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.subsectionTitle, { color: theme.text }]}>Phone Numbers ({editingPhones.length})</Text>
        {editingPhones.length > 0 ? (
          editingPhones.map((phone, index) => (
            <View key={index} style={[styles.contactItemContainer, { 
              backgroundColor: theme.backgroundSecondary,
              borderLeftColor: theme.info
            }]}>
              <View style={styles.contactItemContent}>
                <Text style={[styles.contactItemText, { color: theme.text }]}>📱 {phone}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.removeContactButton, { backgroundColor: theme.error }]}
                onPress={() => handleRemovePhone(index)}
              >
                <Text style={[styles.removeContactButtonText, { color: theme.white }]}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={[styles.emptyContactContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.emptyContactText, { color: theme.textSecondary }]}>No phone numbers added</Text>
          </View>
        )}

        <View style={[styles.addContactContainer, { borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { flex: 1, 
              backgroundColor: theme.white,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={newPhone}
            onChangeText={setNewPhone}
            placeholder="Add phone..."
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleAddPhone}>
            <Text style={[styles.addButtonText, { color: theme.white }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lead Management Card */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Lead Management</Text>
        
        <View style={styles.managementRow}>
          <View style={styles.managementItem}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Status</Text>
            <TouchableOpacity
              style={[styles.dropdown, { 
                backgroundColor: theme.white,
                borderColor: theme.border
              }]}
              onPress={() => setActiveDropdown('status')}
            >
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                {getFilterLabel('status', editedLead.status)}
              </Text>
              <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.managementItem}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Phase</Text>
            <TouchableOpacity
              style={[styles.dropdown, { 
                backgroundColor: theme.white,
                borderColor: theme.border
              }]}
              onPress={() => setActiveDropdown('phase')}
            >
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                {getFilterLabel('phase', editedLead.phase)}
              </Text>
              <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Subphase</Text>
          <TouchableOpacity
            style={[styles.dropdown, { 
              backgroundColor: theme.white,
              borderColor: theme.border
            }]}
            onPress={() => setActiveDropdown('subphase')}
          >
            <Text style={[styles.dropdownText, { color: theme.text }]}>
              {getFilterLabel('subphase', editedLead.subphase)}
            </Text>
            <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Save Button Card */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.success }, loading && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.white} size="small" />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.white }]}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setEditedLead({...editedLead, status: value as Lead['status']})}
        title="Select Status"
        theme={theme}
      />
      <DropdownModal
        visible={activeDropdown === 'phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelection}
        title="Select Phase"
        theme={theme}
      />
      <DropdownModal
        visible={activeDropdown === 'subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => setEditedLead({...editedLead, subphase: value})}
        title="Select Subphase"
        theme={theme}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  detailScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  detailCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  readOnlyField: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 14,
  },
  contactItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeContactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeContactButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContactContainer: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyContactText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addContactContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  managementRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  managementItem: {
    flex: 1,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditLead;