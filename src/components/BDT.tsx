import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, TextInput, FlatList, Dimensions, ActivityIndicator,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
import * as DocumentPicker from 'expo-document-picker';
import Incentive from './Incentive';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

interface BDTProps { onBack: () => void; }

interface AssignedTo {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
}

interface ContactEmail {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
}

interface ContactPhone {
  id: number;
  number: string;
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: number;
  name: string;
  emails: ContactEmail[];
  phone_numbers: ContactPhone[];
  company: string | null;
  status: 'active' | 'hold' | 'no-requirement' | 'closed' | 'mandate' | 'transaction-complete' | 'non-responsive';
  assigned_by: string | null;
  assigned_to: AssignedTo;
  created_at: string;
  updated_at: string;
  phase: string;
  subphase: string;
  meta: any;
  createdAt?: string;
  collaborators?: CollaboratorData[];
  comments?: ApiComment[];
}

interface DocumentType {
  id: number;
  document: string;
  document_url: string;
  document_name: string;
  uploaded_at: string;
}

interface CommentUser {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
}

interface CommentData {
  id: number;
  user: CommentUser;
  content: string;
  documents: DocumentType[];
  created_at: string;
  updated_at: string;
}

interface ApiComment {
  id: number;
  lead: Lead;
  comment: CommentData;
  created_at: string;
  updated_at: string;
  created_at_phase: string;
  created_at_subphase: string;
}

interface Comment {
  id: string; commentBy: string; date: string; phase: string; subphase: string;
  content: string; hasFile?: boolean; fileName?: string; documents?: DocumentType[];
}

interface CollaboratorData {
  id: number;
  user: CommentUser;
  created_at: string;
  updated_at: string;
}

interface PotentialCollaborator {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
}

interface PotentialCollaboratorsResponse {
  message: string;
  potential_collaborators: PotentialCollaborator[];
}

interface DefaultComment {
  id: number;
  data: string;
  at_subphase: string;
  at_phase: string;
}

interface DefaultCommentsResponse {
  message: string;
  comments: DefaultComment[];
}

interface FilterOption { value: string; label: string; }

interface DropdownModalProps {
  visible: boolean; onClose: () => void; options: FilterOption[];
  onSelect: (value: string) => void; title: string; searchable?: boolean;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
}

interface LeadsResponse {
  message: string;
  leads: Lead[];
  pagination?: Pagination;
}

interface CommentsResponse {
  message: string;
  comments: ApiComment[];
  pagination: Pagination;
}

interface CollaboratorsResponse {
  message: string;
  collaborators: CollaboratorData[];
}

interface UpdateLeadResponse {
  message: string;
  lead: Lead;
}

interface PhasesResponse {
  message: string;
  phases: string[];
}

interface SubphasesResponse {
  message: string;
  subphases: string[];
}

interface AddCommentResponse {
  message: string;
  lead_comment: ApiComment;
}

interface InvoiceFormData {
  vendor_name: string;
  vendor_address: string;
  vendor_gst_or_pan: string;
  loi_document?: DocumentPicker.DocumentPickerAsset | null;
  billing_area: string;
  property_type: string;
  car_parking: string;
  terrace_rent: string;
  particular_matter_to_mention: string;
  executive_name: string;
}

interface CreateInvoiceResponse {
  message: string;
  invoice: any;
}

// Theme colors - UPDATED with your specific colors
const lightTheme = {
  primary: '#007AFF',
  primaryBlue: '#007AFF',
  background: '#f5f7fa',
  backgroundSecondary: '#FFFFFF',
  cardBg: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E7EB',
  white: '#FFFFFF',
  gray: '#6B7280',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  moduleColors: {
    bdt: '#1da1f2',
    hr: '#00d285',
    cab: '#ff5e7a',
    attendance: '#ffb157',
  },
  headerBg: '#0a1128',
  gradientStart: '#007AFF',
  gradientEnd: '#0056CC',
  // NEW: Lead status colors for light mode
  leadStatusColors: {
    active: '#00D492',
    pending: '#F59E0B',
    cold: '#FF637F',
  }
};

const darkTheme = {
  primary: '#1C5CFB',
  primaryBlue: '#1C5CFB',
  background: '#050b18',
  backgroundSecondary: '#111a2d',
  cardBg: '#111a2d',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textLight: '#999999',
  border: '#404040',
  white: '#111a2d',
  gray: '#4B5563',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  moduleColors: {
    bdt: '#1C5CFB',
    hr: '#00A73A',
    cab: '#FE395C',
    attendance: '#FAAB21',
  },
  headerBg: '#0a1128',
  gradientStart: '#1C5CFB',
  gradientEnd: '#0F3FD9',
  // NEW: Lead status colors for dark mode
  leadStatusColors: {
    active: '#007AFF',
    pending: '#FFBB64',
    cold: '#FF637F',
  }
};

const beautifyName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const createFilterOption = (value: string): FilterOption => ({
  value,
  label: beautifyName(value)
});

const DropdownModal: React.FC<DropdownModalProps> = ({ 
  visible, onClose, options, onSelect, title, searchable = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const checkDarkMode = async () => {
      try {
        const darkMode = await AsyncStorage.getItem('dark_mode');
        setIsDarkMode(darkMode === 'true');
      } catch (error) {
        console.error('Error checking dark mode:', error);
      }
    };
    checkDarkMode();
  }, []);
  
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const filteredOptions = searchable 
    ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.dropdownContainer, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.dropdownTitle, { color: theme.text }]}>{title}</Text>
            {searchable && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={[styles.searchInput, { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            )}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                  onPress={() => { onSelect(item.value); onClose(); }}
                >
                  <Text style={[styles.dropdownItemText, { color: theme.text }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyDropdown}>
                  <Text style={[styles.emptyDropdownText, { color: theme.textSecondary }]}>No options found</Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const InvoiceForm: React.FC<{
  visible: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  onInvoiceCreated: () => void;
  onCancel: () => void;
}> = ({ visible, onClose, leadId, leadName, onInvoiceCreated, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    vendor_name: '',
    vendor_address: '',
    vendor_gst_or_pan: '',
    billing_area: '',
    property_type: '',
    car_parking: '',
    terrace_rent: '',
    particular_matter_to_mention: '',
    executive_name: '',
  });
  const [loiDocument, setLoiDocument] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      try {
        const API_TOKEN = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(API_TOKEN);
        const darkMode = await AsyncStorage.getItem('dark_mode');
        setIsDarkMode(darkMode === 'true');
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleAttachLOI = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: '*/*',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoiDocument(result.assets[0]);
        Alert.alert('File Selected', `LOI/Sale Deed: ${result.assets[0].name}`);
      }
    } catch (error) {
      console.error('Error picking LOI document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleInputChange = (field: keyof InvoiceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    // Validate required fields
    if (!formData.vendor_name.trim()) {
      Alert.alert('Error', 'Vendor Name is required');
      return;
    }
    if (!formData.vendor_gst_or_pan.trim()) {
      Alert.alert('Error', 'Vendor GST/PAN is required');
      return;
    }
    if (!formData.billing_area.trim()) {
      Alert.alert('Error', 'Billing Area is required');
      return;
    }
    if (!formData.property_type.trim()) {
      Alert.alert('Error', 'Property Type is required');
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append('token', token);
      submitData.append('lead_id', leadId.toString());
      submitData.append('vendor_name', formData.vendor_name.trim());
      submitData.append('vendor_gst_or_pan', formData.vendor_gst_or_pan.trim());
      submitData.append('billing_area', formData.billing_area.trim());
      submitData.append('property_type', formData.property_type.trim());

      if (formData.vendor_address.trim()) {
        submitData.append('vendor_address', formData.vendor_address.trim());
      }
      if (formData.car_parking.trim()) {
        submitData.append('car_parking', formData.car_parking.trim());
      }
      if (formData.terrace_rent.trim()) {
        submitData.append('terrace_rent', formData.terrace_rent.trim());
      }
      if (formData.particular_matter_to_mention.trim()) {
        submitData.append('particular_matter_to_mention', formData.particular_matter_to_mention.trim());
      }
      if (formData.executive_name.trim()) {
        submitData.append('executive_name', formData.executive_name.trim());
      }

      if (loiDocument) {
        submitData.append('loi', {
          uri: loiDocument.uri,
          type: loiDocument.mimeType || 'application/octet-stream',
          name: loiDocument.name,
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/employee/createInvoice`, {
        method: 'POST',
        body: submitData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data: CreateInvoiceResponse = await response.json();
      
      if (data.message === 'Invoice created successfully') {
        Alert.alert('Success', 'Invoice created successfully!');
        onInvoiceCreated();
        onClose();
      } else {
        Alert.alert('Error', data.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Invoice Creation',
      'Are you sure you want to cancel? The lead will not be updated.',
      [
        { text: 'No, Continue', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            onCancel();
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <SafeAreaView style={[styles.invoiceModalContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
        
        <View style={[styles.invoiceHeader, { 
          backgroundColor: theme.cardBg,
          borderBottomColor: theme.border 
        }]}>
          <TouchableOpacity style={styles.invoiceBackButton} onPress={handleCancel}>
            <Text style={[styles.invoiceBackButtonText, { color: theme.error }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.invoiceHeaderTitle, { color: theme.text }]}>Create Invoice</Text>
          <TouchableOpacity 
            style={[
              styles.invoiceSaveButton, 
              loading && styles.invoiceSaveButtonDisabled,
              { backgroundColor: theme.primary }
            ]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.white} size="small" />
            ) : (
              <Text style={[styles.invoiceSaveButtonText, { color: theme.white }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.invoiceScrollView, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.invoiceFormCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.invoiceFormTitle, { color: theme.primary }]}>Invoice Details for {leadName}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Vendor Name *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={formData.vendor_name}
                onChangeText={(value) => handleInputChange('vendor_name', value)}
                placeholder="Enter vendor name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Vendor Address</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={formData.vendor_address}
                onChangeText={(value) => handleInputChange('vendor_address', value)}
                placeholder="Enter vendor address"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Vendor GST/PAN *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={formData.vendor_gst_or_pan}
                onChangeText={(value) => handleInputChange('vendor_gst_or_pan', value)}
                placeholder="Enter GST or PAN number"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>LOI or Sale Deed (if any)</Text>
              <TouchableOpacity style={[styles.fileUploadButton, { 
                borderColor: theme.info,
                backgroundColor: theme.info + '10'
              }]} onPress={handleAttachLOI}>
                <Text style={[styles.fileUploadButtonText, { color: theme.info }]}>
                  {loiDocument ? `📎 ${loiDocument.name}` : '📎 Attach LOI/Sale Deed'}
                </Text>
              </TouchableOpacity>
              {loiDocument && (
                <TouchableOpacity 
                  style={styles.removeFileButton}
                  onPress={() => setLoiDocument(null)}
                >
                  <Text style={[styles.removeFileButtonText, { color: theme.error }]}>Remove File</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Billing Area & Rs. Per Sft. / No. days or Month *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={formData.billing_area}
                onChangeText={(value) => handleInputChange('billing_area', value)}
                placeholder="Enter billing area details"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Car Parking / Terrace Rent (if any)</Text>
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.white,
                      borderColor: theme.border,
                      color: theme.text
                    }]}
                    value={formData.car_parking}
                    onChangeText={(value) => handleInputChange('car_parking', value)}
                    placeholder="Car Parking"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
                <View style={styles.halfInput}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.white,
                      borderColor: theme.border,
                      color: theme.text
                    }]}
                    value={formData.terrace_rent}
                    onChangeText={(value) => handleInputChange('terrace_rent', value)}
                    placeholder="Terrace Rent"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Property Type (SEZ / Non SEZ) *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={formData.property_type}
                onChangeText={(value) => handleInputChange('property_type', value)}
                placeholder="Enter property type"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>If any particular matter to mention in narration</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={formData.particular_matter_to_mention}
                onChangeText={(value) => handleInputChange('particular_matter_to_mention', value)}
                placeholder="Enter any additional information"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Ref. Executive Name to mention</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={formData.executive_name}
                onChangeText={(value) => handleInputChange('executive_name', value)}
                placeholder="Enter executive name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <Text style={[styles.requiredNote, { color: theme.error }]}>* Required fields</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const BDT: React.FC<BDTProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'incentive'>('list');
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<Pagination | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newCollaborator, setNewCollaborator] = useState('');
  const [showDefaultComments, setShowDefaultComments] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'filter' | 'filter-phase' | 'filter-subphase' | null>(null);

  const [defaultComments, setDefaultComments] = useState<DefaultComment[]>([]);
  const [loadingDefaultComments, setLoadingDefaultComments] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);

  const [potentialCollaborators, setPotentialCollaborators] = useState<PotentialCollaborator[]>([]);
  const [showPotentialCollaborators, setShowPotentialCollaborators] = useState(false);
  const [loadingPotentialCollaborators, setLoadingPotentialCollaborators] = useState(false);
  const [collaboratorSearchTimeout, setCollaboratorSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // New state for invoice form
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [pendingLeadUpdate, setPendingLeadUpdate] = useState<{
    leadData: Partial<Lead>;
    editingEmails: string[];
    editingPhones: string[];
  } | null>(null);

  // New state for managing emails and phone numbers in edit mode
  const [editingEmails, setEditingEmails] = useState<string[]>([]);
  const [editingPhones, setEditingPhones] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no-requirement', label: 'No Requirement' },
    { value: 'transaction-complete', label: 'Transaction Complete' },
    { value: 'non-responsive', label: 'Non Responsive' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Leads' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'phase', label: 'Filter by Phase' },
    { value: 'subphase', label: 'Filter by Subphase' }
  ];

  const tabs = [
    { id: 'all', label: 'All leads (10,007)' },
    { id: 'nurtured', label: 'Nurtured' },
    { id: 'engaged', label: 'Engaged' },
    { id: 'ready-to-inspect', label: 'Ready to inspect' },
  ];
  const [activeTab, setActiveTab] = useState('all');

  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const checkDarkMode = async () => {
      try {
        const darkMode = await AsyncStorage.getItem('dark_mode');
        setIsDarkMode(darkMode === 'true');
      } catch (error) {
        console.error('Error checking dark mode:', error);
      }
    };
    checkDarkMode();
  }, []);

  useEffect(() => {
    if (token) {
      fetchLeads(1);
      fetchPhases();
    }
  }, [token]);

  useEffect(() => {
    const getToken = async () => {
      try {
        const API_TOKEN = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(API_TOKEN);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await AsyncStorage.setItem('dark_mode', newDarkMode.toString());
  };

  const fetchPotentialCollaborators = async (query: string): Promise<void> => {
    if (!query.trim() || !token) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }

    try {
      setLoadingPotentialCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/employee/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PotentialCollaboratorsResponse = await response.json();
      setPotentialCollaborators(data.potential_collaborators);
      setShowPotentialCollaborators(data.potential_collaborators.length > 0);
    } catch (error) {
      console.error('Error fetching potential collaborators:', error);
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    } finally {
      setLoadingPotentialCollaborators(false);
    }
  };

  const handleCollaboratorInputChange = (text: string) => {
    setNewCollaborator(text);
    
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    
    if (!text.trim()) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      fetchPotentialCollaborators(text);
    }, 500);
    
    setCollaboratorSearchTimeout(timeout);
  };

  const handlePotentialCollaboratorSelect = (collaborator: PotentialCollaborator) => {
    setNewCollaborator(collaborator.email);
    setShowPotentialCollaborators(false);
    setPotentialCollaborators([]);
  };

  const fetchDefaultComments = async (phase: string, subphase: string): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingDefaultComments(true);

      const response = await fetch(`${BACKEND_URL}/employee/getDefaultComments?at_phase=${encodeURIComponent(phase)}&at_subphase=${encodeURIComponent(subphase)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DefaultCommentsResponse = await response.json();
      setDefaultComments(data.comments);
    } catch (error) {
      console.error('Error fetching default comments:', error);
      Alert.alert('Error', 'Failed to fetch default comments. Please try again.');
      setDefaultComments([]);
    } finally {
      setLoadingDefaultComments(false);
    }
  };

  const handleAttachDocuments = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
      });

      if (!result.canceled && result.assets) {
        setSelectedDocuments(result.assets);
        Alert.alert(
          'Files Selected',
          `${result.assets.length} file(s) selected: ${result.assets.map(doc => doc.name).join(', ')}`
        );
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

  const addCommentToBackend = async (comment: string, documents: DocumentPicker.DocumentPickerAsset[]): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      setAddingComment(true);

      const formData = new FormData();
      formData.append('token', token);
      formData.append('lead_id', selectedLead.id.toString());
      formData.append('comment', comment);

      if (documents && documents.length > 0) {
        documents.forEach((doc, index) => {
          formData.append('documents', {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name,
          } as any);
        });
      }

      const response = await fetch(`${BACKEND_URL}/employee/addComment`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AddCommentResponse = await response.json();
      
      const newComment: Comment = {
        id: data.lead_comment.comment.id.toString(),
        commentBy: data.lead_comment.comment.user.full_name,
        date: data.lead_comment.comment.created_at,
        phase: data.lead_comment.created_at_phase,
        subphase: data.lead_comment.created_at_subphase,
        content: data.lead_comment.comment.content,
        hasFile: data.lead_comment.comment.documents.length > 0,
        fileName: data.lead_comment.comment.documents.length > 0 
          ? data.lead_comment.comment.documents.map(doc => doc.document_name).join(', ')
          : undefined,
        documents: data.lead_comment.comment.documents
      };

      setComments(prevComments => [newComment, ...prevComments]);
      
      Alert.alert('Success', 'Comment added successfully!');
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
      return false;
    } finally {
      setAddingComment(false);
    }
  };

  const fetchLeads = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getLeads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      
      const transformedLeads = data.leads.map(lead => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: []
      }));

      if (append) {
        setLeads(prevLeads => [...prevLeads, ...transformedLeads]);
      } else {
        setLeads(transformedLeads);
      }
      
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching leads:', error);
      Alert.alert('Error', 'Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const fetchComments = async (leadId: number, page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getComments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId,
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CommentsResponse = await response.json();
      
      const transformedComments: Comment[] = data.comments.map(apiComment => ({
        id: apiComment.comment.id.toString(),
        commentBy: apiComment.comment.user.full_name,
        date: apiComment.comment.created_at,
        phase: apiComment.created_at_phase,
        subphase: apiComment.created_at_subphase,
        content: apiComment.comment.content,
        hasFile: apiComment.comment.documents.length > 0,
        fileName: apiComment.comment.documents.length > 0 
          ? apiComment.comment.documents.map(doc => doc.document_name).join(', ')
          : undefined,
        documents: apiComment.comment.documents
      }));

      if (append) {
        setComments(prevComments => [...prevComments, ...transformedComments]);
      } else {
        setComments(transformedComments);
      }
      
      setCommentsPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to fetch comments. Please try again.');
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  const fetchCollaborators = async (leadId: number): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/employee/getCollaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CollaboratorsResponse = await response.json();
      setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      Alert.alert('Error', 'Failed to fetch collaborators. Please try again.');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const updateLead = async (leadData: Partial<Lead>, emails: string[], phones: string[]): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      setLoading(true);

      const updatePayload: any = {
        token: token,
        lead_id: selectedLead.id
      };

      if (emails.length > 0) updatePayload.emails = emails;
      if (phones.length > 0) updatePayload.phone_numbers = phones;
      if (leadData.status !== undefined) updatePayload.status = leadData.status;
      if (leadData.phase !== undefined) updatePayload.phase = leadData.phase;
      if (leadData.subphase !== undefined) updatePayload.subphase = leadData.subphase;

      const response = await fetch(`${BACKEND_URL}/employee/updateLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UpdateLeadResponse = await response.json();
      
      const updatedLead = {
        ...data.lead,
        createdAt: data.lead.created_at,
        collaborators: collaborators,
        comments: []
      };
      
      setSelectedLead(updatedLead);
      
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === selectedLead.id ? updatedLead : lead
        )
      );

      Alert.alert('Success', 'Lead updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addCollaborator = async (email: string): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      const response = await fetch(`${BACKEND_URL}/employee/addCollaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: selectedLead.id,
          email: email
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator added successfully!');
      return true;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      Alert.alert('Error', 'Failed to add collaborator. Please try again.');
      return false;
    }
  };

  const removeCollaborator = async (collaboratorId: number): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      const response = await fetch(`${BACKEND_URL}/employee/removeCollaborator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: selectedLead.id,
          collaborator_id: collaboratorId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator removed successfully!');
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', 'Failed to remove collaborator. Please try again.');
      return false;
    }
  };

  const searchLeads = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setIsSearchMode(false);
      fetchLeads(1);
      return;
    }

    try {
      setLoading(true);
      setIsSearchMode(true);

      const response = await fetch(`${BACKEND_URL}/employee/searchLeads?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      
      const transformedLeads = data.leads.map(lead => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: []
      }));

      setLeads(transformedLeads);
      setPagination(null);
    } catch (error) {
      console.error('Error searching leads:', error);
      Alert.alert('Error', 'Failed to search leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhases = async (): Promise<void> => {
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

      const data: PhasesResponse = await response.json();
      setAllPhases(data.phases.map(createFilterOption));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  };

  const fetchSubphases = async (phase: string): Promise<void> => {
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

      const data: SubphasesResponse = await response.json();
      setAllSubphases(data.subphases.map(createFilterOption));
    } catch (error) {
      console.error('Error fetching subphases:', error);
      setAllSubphases([]);
    }
  };

  const handleSearchSubmit = () => {
    searchLeads(searchQuery);
  };

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchLeads(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode]);

  const handleLoadMoreComments = useCallback(() => {
    if (commentsPagination && commentsPagination.has_next && !loadingMoreComments && selectedLead) {
      fetchComments(selectedLead.id, commentsPagination.current_page + 1, true);
    }
  }, [commentsPagination, loadingMoreComments, selectedLead]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  };

  const handleCommentsScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMoreComments();
    }
  };

  const filteredLeads = leads.filter(lead => {
    let matchesFilter = true;
    if (filterBy && filterValue) {
      if (filterBy === 'status') {
        matchesFilter = lead.status === filterValue;
      } else if (filterBy === 'phase') {
        matchesFilter = lead.phase === filterValue;
      } else if (filterBy === 'subphase') {
        matchesFilter = lead.subphase === filterValue;
      }
    }
    return matchesFilter;
  });

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
    
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    setNewComment('');
    setNewCollaborator('');
    setPotentialCollaborators([]);
    setShowPotentialCollaborators(false);
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    
    // Initialize editing arrays with current emails and phone numbers
    setEditingEmails(lead.emails.map(e => e.email) || []);
    setEditingPhones(lead.phone_numbers.map(p => p.number) || []);
    
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
    fetchDefaultComments(lead.phase, lead.subphase);
  };

  const handleIncentivePress = () => {
    if (selectedLead) {
      setViewMode('incentive');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedLead(null);
    setIsEditMode(false);
    setNewComment('');
    setNewCollaborator('');
    
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    setDefaultComments([]);
    
    setPotentialCollaborators([]);
    setShowPotentialCollaborators(false);
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    
    setEditingEmails([]);
    setEditingPhones([]);
    setNewEmail('');
    setNewPhone('');
    
    // Clear any pending updates
    setPendingLeadUpdate(null);
  };

  const handleSave = async () => {
    if (!selectedLead) return;
    
    // Check if phase is "Post Property Finalization" and subphase is "Raise Invoice"
    if (selectedLead.phase === 'post_property_finalization' && selectedLead.subphase === 'raise_invoice') {
      // Store the pending update and show invoice form
      setPendingLeadUpdate({
        leadData: selectedLead,
        editingEmails: [...editingEmails],
        editingPhones: [...editingPhones]
      });
      setShowInvoiceForm(true);
    } else {
      // For other phases/subphases, update directly
      const success = await updateLead(selectedLead, editingEmails, editingPhones);
      if (success) {
        setIsEditMode(false);
        setNewEmail('');
        setNewPhone('');
      }
    }
  };

  const handleInvoiceCreated = async () => {
    if (pendingLeadUpdate && selectedLead) {
      // Now update the lead after invoice is created
      const success = await updateLead(pendingLeadUpdate.leadData, pendingLeadUpdate.editingEmails, pendingLeadUpdate.editingPhones);
      if (success) {
        setIsEditMode(false);
        setNewEmail('');
        setNewPhone('');
        setPendingLeadUpdate(null);
      }
    }
  };

  const handleInvoiceCancel = () => {
    // Reset to original lead data if invoice creation is cancelled
    if (selectedLead && pendingLeadUpdate) {
      // You might want to revert the phase/subphase changes here
      // For now, just clear the pending update
      setPendingLeadUpdate(null);
      // You could also fetch the lead again to get original data
      // fetchLeadDetails(selectedLead.id);
    }
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

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedLead) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    const success = await addCommentToBackend(newComment.trim(), selectedDocuments);
    if (success) {
      setNewComment('');
      setSelectedDocuments([]);
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollaborator.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    const success = await addCollaborator(newCollaborator.trim());
    if (success) {
      setNewCollaborator('');
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    }
  };

  const handleRemoveCollaborator = (collaborator: CollaboratorData) => {
    Alert.alert(
      'Remove Collaborator',
      `Are you sure you want to remove ${collaborator.user.full_name} from this lead?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeCollaborator(collaborator.id)
        }
      ]
    );
  };

  const handleDefaultCommentSelect = (defaultComment: DefaultComment) => {
    try {
      const commentText = JSON.parse(defaultComment.data);
      setNewComment(commentText);
      setShowDefaultComments(false);
    } catch (error) {
      setNewComment(defaultComment.data);
      setShowDefaultComments(false);
    }
  };

  const handleShowDefaultComments = () => {
    if (selectedLead) {
      fetchDefaultComments(selectedLead.phase, selectedLead.subphase);
      setShowDefaultComments(true);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // UPDATED: Get lead card background color based on status
  const getLeadCardBackgroundColor = (status: string): string => {
    const statusColor = theme.leadStatusColors;
    
    switch (status) {
      case 'active':
      case 'transaction-complete':
        return isDarkMode ? 
          `rgba(${hexToRgb(statusColor.active)}, 0.15)` : 
          `rgba(${hexToRgb(statusColor.active)}, 0.08)`;
      case 'hold':
      case 'mandate':
        return isDarkMode ? 
          `rgba(${hexToRgb(statusColor.pending)}, 0.15)` : 
          `rgba(${hexToRgb(statusColor.pending)}, 0.08)`;
      case 'no-requirement':
      case 'closed':
      case 'non-responsive':
        return isDarkMode ? 
          `rgba(${hexToRgb(statusColor.cold)}, 0.15)` : 
          `rgba(${hexToRgb(statusColor.cold)}, 0.08)`;
      default:
        return isDarkMode ? 
          'rgba(255, 255, 255, 0.05)' : 
          'rgba(0, 0, 0, 0.02)';
    }
  };

  // UPDATED: Get status badge color based on status
  const getStatusBadgeColor = (status: string): string => {
    const statusColor = theme.leadStatusColors;
    
    switch (status) {
      case 'active':
      case 'transaction-complete':
        return statusColor.active;
      case 'hold':
      case 'mandate':
        return statusColor.pending;
      case 'no-requirement':
      case 'closed':
      case 'non-responsive':
        return statusColor.cold;
      default:
        return theme.textSecondary;
    }
  };

  // Helper function to convert hex to rgb
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      '0, 0, 0';
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

  const handleFilterSelection = (filterType: string) => {
    setFilterBy(filterType);
    if (!filterType) {
      setFilterValue('');
      setSelectedPhase('');
    } else {
      setTimeout(() => {
        if (filterType === 'status') {
          setActiveDropdown('status');
        } else if (filterType === 'phase') {
          setActiveDropdown('filter-phase');
        } else if (filterType === 'subphase') {
          if (allPhases.length > 0) {
            setActiveDropdown('filter-phase');
          }
        }
      }, 300);
    }
  };

  const handlePhaseSelectionForFilter = (phase: string) => {
    setSelectedPhase(phase);
    if (filterBy === 'phase') {
      setFilterValue(phase);
    } else if (filterBy === 'subphase') {
      fetchSubphases(phase);
      setTimeout(() => {
        setActiveDropdown('filter-subphase');
      }, 300);
    }
  };

  const handlePhaseSelection = async (phase: string) => {
    if (!selectedLead) return;
    
    setSelectedLead({...selectedLead, phase: phase});
    await fetchSubphases(phase);
    
    if (allSubphases.length > 0) {
      setSelectedLead(prev => prev ? {...prev, subphase: ''} : null);
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <Text style={styles.backIconText}>‹</Text>
    </View>
  );

  // Bottom Navigation Component
  // const BottomNavigation = () => {
  //   const navItems = [
  //     { id: 'home', label: 'Home', icon: '🏠' },
  //     { id: 'message', label: 'Message', icon: '💬' },
  //     { id: 'hr', label: 'HR', icon: '📮' },
  //     { id: 'support', label: 'Support', icon: '👤' },
  //   ];
  //   const [activeNavItem, setActiveNavItem] = useState('home');

  //   return (
  //     <View style={styles.bottomNavContainer}>
  //       <View style={[styles.navBar, { backgroundColor: isDarkMode ? '#0a111f' : '#ffffff' }]}>
  //         {navItems.map((item, index) => {
  //           const isActive = activeNavItem === item.id;
  //           const itemPosition = 12.5 + (index * 25);
            
  //           return (
  //             <TouchableOpacity
  //               key={item.id}
  //               style={[styles.navItem, isActive && styles.navItemActive]}
  //               onPress={() => setActiveNavItem(item.id)}
  //             >
  //               {isActive && (
  //                 <View style={[styles.bulge, { left: `${itemPosition}%` }]} />
  //               )}
  //               <View style={styles.navItemContent}>
  //                 {isActive ? (
  //                   <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
  //                     <Text style={styles.activeNavIcon}>{item.icon}</Text>
  //                   </View>
  //                 ) : (
  //                   <Text style={styles.navIcon}>{item.icon}</Text>
  //                 )}
  //                 <Text style={[styles.navLabel, isActive && styles.activeNavLabel, { 
  //                   color: isActive ? theme.primary : (isDarkMode ? '#a0a0a0' : '#666666')
  //                 }]}>
  //                   {item.label}
  //                 </Text>
  //               </View>
  //             </TouchableOpacity>
  //           );
  //         })}
  //       </View>
  //     </View>
  //   );
  // };

  if (viewMode === 'incentive' && selectedLead) {
    return (
      <Incentive 
        onBack={handleBackToList}
        leadId={selectedLead.id}
        leadName={selectedLead.name}
      />
    );
  }

  if (viewMode === 'detail' && selectedLead) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "light-content"} backgroundColor={theme.headerBg} />

        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead Details</Text>
          <View style={styles.headerActions}>
            {!isEditMode ? (
              <>
                <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.info }]} onPress={() => setIsEditMode(true)}>
                  <Text style={[styles.editButtonText, { color: theme.white }]}>Edit</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.success }]} onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={theme.white} size="small" />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.white }]}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          style={[styles.detailScrollView, { backgroundColor: theme.background }]} 
          showsVerticalScrollIndicator={false}
          onScroll={handleCommentsScroll}
          scrollEventThrottle={16}
        >
          <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.leadHeader}>
              <View style={styles.leadInfo}>
                <View style={styles.leadNameRow}>
                  <Text style={[styles.leadName, { color: theme.text }]}>{selectedLead.name}</Text>
                  <TouchableOpacity style={[styles.incentiveIconButton, { backgroundColor: theme.success }]} onPress={handleIncentivePress}>
                    <Text style={[styles.incentiveIconText, { color: theme.white }]}>Incentive</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.statusIndicatorRow}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusBadgeColor(selectedLead.status) }]} />
                  <Text style={[styles.statusText, { color: theme.text }]}>{beautifyName(selectedLead.status)}</Text>
                </View>
                <Text style={[styles.leadCompany, { color: theme.textSecondary }]}>{selectedLead.company || 'No company'}</Text>
                <Text style={[styles.leadDate, { color: theme.textLight }]}>Created: {formatDateTime(selectedLead.created_at || selectedLead.createdAt)}</Text>
                <Text style={[styles.leadDate, { color: theme.textLight }]}>Updated: {formatDateTime(selectedLead.updated_at)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Email Addresses ({editingEmails.length})</Text>
            
            {editingEmails.length > 0 ? (
              editingEmails.map((email, index) => (
                <View key={index} style={[styles.contactItemContainer, { 
                  backgroundColor: theme.backgroundSecondary,
                  borderLeftColor: theme.info
                }]}>
                  <View style={styles.contactItemContent}>
                    <Text style={[styles.contactItemText, { color: theme.text }]}>📧 {email}</Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity 
                      style={[styles.removeContactButton, { backgroundColor: theme.error }]}
                      onPress={() => handleRemoveEmail(index)}
                    >
                      <Text style={[styles.removeContactButtonText, { color: theme.white }]}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={[styles.emptyContactContainer, { backgroundColor: theme.gray + '20' }]}>
                <Text style={[styles.emptyContactText, { color: theme.textSecondary }]}>No emails added</Text>
              </View>
            )}

            {isEditMode && (
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
            )}
          </View>

          <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Phone Numbers ({editingPhones.length})</Text>
            
            {editingPhones.length > 0 ? (
              editingPhones.map((phone, index) => (
                <View key={index} style={[styles.contactItemContainer, { 
                  backgroundColor: theme.backgroundSecondary,
                  borderLeftColor: theme.info
                }]}>
                  <View style={styles.contactItemContent}>
                    <Text style={[styles.contactItemText, { color: theme.text }]}>📱 {phone}</Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity 
                      style={[styles.removeContactButton, { backgroundColor: theme.error }]}
                      onPress={() => handleRemovePhone(index)}
                    >
                      <Text style={[styles.removeContactButtonText, { color: theme.white }]}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={[styles.emptyContactContainer, { backgroundColor: theme.gray + '20' }]}>
                <Text style={[styles.emptyContactText, { color: theme.textSecondary }]}>No phone numbers added</Text>
              </View>
            )}

            {isEditMode && (
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
            )}
          </View>

          <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Lead Management</Text>
            
            <View style={styles.managementRow}>
              <View style={styles.managementItem}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Status</Text>
                {isEditMode ? (
                  <TouchableOpacity
                    style={[styles.dropdown, { 
                      backgroundColor: theme.white,
                      borderColor: theme.border
                    }]}
                    onPress={() => setActiveDropdown('status')}
                  >
                    <Text style={[styles.dropdownText, { color: theme.text }]}>
                      {getFilterLabel('status', selectedLead.status)}
                    </Text>
                    <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.readOnlyField, { backgroundColor: theme.gray }]}>
                    <Text style={[styles.readOnlyText, { color: theme.textSecondary }]}>
                      {getFilterLabel('status', selectedLead.status)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.managementItem}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Phase</Text>
                {isEditMode ? (
                  <TouchableOpacity
                    style={[styles.dropdown, { 
                      backgroundColor: theme.white,
                      borderColor: theme.border
                    }]}
                    onPress={() => setActiveDropdown('phase')}
                  >
                    <Text style={[styles.dropdownText, { color: theme.text }]}>
                      {getFilterLabel('phase', selectedLead.phase)}
                    </Text>
                    <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.readOnlyField, { backgroundColor: theme.gray }]}>
                    <Text style={[styles.readOnlyText, { color: theme.textSecondary }]}>
                      {getFilterLabel('phase', selectedLead.phase)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Subphase</Text>
              {isEditMode ? (
                <TouchableOpacity
                  style={[styles.dropdown, { 
                    backgroundColor: theme.white,
                    borderColor: theme.border
                  }]}
                  onPress={() => setActiveDropdown('subphase')}
                >
                  <Text style={[styles.dropdownText, { color: theme.text }]}>
                    {getFilterLabel('subphase', selectedLead.subphase)}
                  </Text>
                  <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>▼</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.readOnlyField, { backgroundColor: theme.gray }]}>
                  <Text style={[styles.readOnlyText, { color: theme.textSecondary }]}>
                    {getFilterLabel('subphase', selectedLead.subphase)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Collaborators ({collaborators.length})
            </Text>
            
            {loadingCollaborators ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading collaborators...</Text>
              </View>
            ) : collaborators.length > 0 ? (
              collaborators.map((collaborator) => (
                <View key={collaborator.id} style={[styles.collaboratorItem, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={styles.collaboratorInfo}>
                    <Text style={[styles.collaboratorName, { color: theme.text }]}>{collaborator.user.full_name}</Text>
                    <Text style={[styles.collaboratorEmail, { color: theme.textSecondary }]}>{collaborator.user.email}</Text>
                    <Text style={[styles.collaboratorRole, { color: theme.textSecondary }]}>
                      {collaborator.user.designation || collaborator.user.role}
                    </Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: theme.error }]}
                      onPress={() => handleRemoveCollaborator(collaborator)}
                    >
                      <Text style={[styles.removeButtonText, { color: theme.white }]}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyCollaborators}>
                <Text style={[styles.emptyCollaboratorsText, { color: theme.textSecondary }]}>No collaborators yet</Text>
              </View>
            )}
            
            {isEditMode && (
              <View style={styles.addCollaboratorContainer}>
                <View style={{ flex: 1, position: 'relative' }}>
                  <TextInput
                    style={[styles.input, { flex: 1, 
                      backgroundColor: theme.white,
                      borderColor: theme.border,
                      color: theme.text
                    }]}
                    value={newCollaborator}
                    onChangeText={handleCollaboratorInputChange}
                    placeholder="Enter collaborator email..."
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="email-address"
                  />
                  
                  {showPotentialCollaborators && (
                    <View style={[styles.potentialCollaboratorsDropdown, { 
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border
                    }]}>
                      {loadingPotentialCollaborators ? (
                        <View style={styles.potentialCollaboratorLoadingItem}>
                          <ActivityIndicator size="small" color={theme.primary} />
                          <Text style={[styles.potentialCollaboratorLoadingText, { color: theme.textSecondary }]}>Searching...</Text>
                        </View>
                      ) : (
                        <ScrollView
                          style={styles.potentialCollaboratorsList}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled={true}
                        >
                          {potentialCollaborators.map((collaborator) => (
                            <TouchableOpacity
                              key={collaborator.employee_id}
                              style={[styles.potentialCollaboratorItem, { borderBottomColor: theme.border }]}
                              onPress={() => handlePotentialCollaboratorSelect(collaborator)}
                            >
                              <View style={styles.potentialCollaboratorInfo}>
                                <Text style={[styles.potentialCollaboratorName, { color: theme.text }]}>
                                  {collaborator.full_name}
                                </Text>
                                <Text style={[styles.potentialCollaboratorEmail, { color: theme.textSecondary }]}>
                                  {collaborator.email}
                                </Text>
                                <Text style={[styles.potentialCollaboratorRole, { color: theme.primary }]}>
                                  {collaborator.designation || collaborator.role}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>
                
                <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={handleAddCollaborator}>
                  <Text style={[styles.addButtonText, { color: theme.white }]}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Comments ({comments.length}
              {commentsPagination && ` of ${commentsPagination.total_items}`})
            </Text>
            
            {loadingComments ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading comments...</Text>
              </View>
            ) : comments.length > 0 ? (
              <>
                {comments.map((comment) => (
                  <View key={comment.id} style={[styles.commentItem, { 
                    backgroundColor: theme.white,
                    borderLeftColor: theme.info
                  }]}>
                    <View style={styles.commentHeaderRow}>
                      <View style={styles.commentMetaItem}>
                        <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Comment By:</Text>
                        <Text style={[styles.commentValue, { color: theme.text }]}>{comment.commentBy}</Text>
                      </View>
                      <View style={styles.commentMetaItem}>
                        <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Date:</Text>
                        <Text style={[styles.commentValue, { color: theme.text }]}>{formatDateTime(comment.date)}</Text>
                      </View>
                    </View>
                    <View style={styles.commentHeaderRow}>
                      <View style={styles.commentMetaItem}>
                        <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Phase:</Text>
                        <Text style={[styles.commentValue, { color: theme.text }]}>{beautifyName(comment.phase)}</Text>
                      </View>
                      <View style={styles.commentMetaItem}>
                        <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Subphase:</Text>
                        <Text style={[styles.commentValue, { color: theme.text }]}>{beautifyName(comment.subphase)}</Text>
                      </View>
                    </View>
                    <View style={styles.commentContentRow}>
                      <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Content:</Text>
                      <Text style={[styles.commentContentText, { 
                        color: theme.text,
                        backgroundColor: theme.backgroundSecondary
                      }]}>{comment.content}</Text>
                    </View>
                    {comment.documents && comment.documents.length > 0 && (
                      <View style={styles.documentsContainer}>
                        <Text style={[styles.documentsLabel, { color: theme.textSecondary }]}>Attachments:</Text>
                        {comment.documents.map((doc, index) => (
                          <TouchableOpacity key={doc.id} style={[styles.fileButton, { backgroundColor: theme.info + '20' }]}>
                            <Text style={[styles.fileButtonText, { color: theme.info }]}>📎 {doc.document_name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {comment.hasFile && !comment.documents && (
                      <TouchableOpacity style={[styles.fileButton, { backgroundColor: theme.info + '20' }]}>
                        <Text style={[styles.fileButtonText, { color: theme.info }]}>📎 {comment.fileName}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {loadingMoreComments && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>Loading more comments...</Text>
                  </View>
                )}

                {commentsPagination && !commentsPagination.has_next && comments.length > 0 && (
                  <View style={styles.endOfListContainer}>
                    <Text style={[styles.endOfListText, { color: theme.textSecondary }]}>
                      You've reached the end of the comments
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyComments}>
                <Text style={[styles.emptyCommentsText, { color: theme.textSecondary }]}>No comments yet</Text>
                <Text style={[styles.emptyCommentsSubtext, { color: theme.textLight }]}>Start the conversation by adding a comment below</Text>
              </View>
            )}

            <View style={[styles.addCommentSection, { borderTopColor: theme.border }]}>
              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { 
                    borderColor: theme.primary,
                    backgroundColor: theme.primary + '10'
                  }]}
                  onPress={handleShowDefaultComments}
                  disabled={loadingDefaultComments}
                >
                  {loadingDefaultComments ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={[styles.actionButtonText, { color: theme.primary }]}>Default Comments</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { 
                    borderColor: theme.primary,
                    backgroundColor: theme.primary + '10'
                  }]} 
                  onPress={handleAttachDocuments}
                >
                  <Text style={[styles.actionButtonText, { color: theme.primary }]}>📎 Attach ({selectedDocuments.length})</Text>
                </TouchableOpacity>
              </View>

              {selectedDocuments.length > 0 && (
                <View style={[styles.selectedDocumentsContainer, { 
                  backgroundColor: theme.background,
                  borderColor: theme.border
                }]}>
                  <Text style={[styles.selectedDocumentsTitle, { color: theme.primary }]}>Selected Files:</Text>
                  {selectedDocuments.map((doc, index) => (
                    <View key={index} style={[styles.selectedDocumentItem, { backgroundColor: theme.white }]}>
                      <Text style={[styles.selectedDocumentName, { color: theme.primary }]} numberOfLines={1}>
                        📎 {doc.name}
                      </Text>
                      <TouchableOpacity 
                        style={[styles.removeDocumentButton, { backgroundColor: theme.error }]}
                        onPress={() => handleRemoveDocument(index)}
                      >
                        <Text style={[styles.removeDocumentButtonText, { color: theme.white }]}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TextInput
                style={[styles.commentInput, { 
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add your comment here..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={theme.textSecondary}
              />

              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  addingComment && styles.submitButtonDisabled,
                  { backgroundColor: theme.primary }
                ]} 
                onPress={handleAddComment}
                disabled={addingComment}
              >
                {addingComment ? (
                  <ActivityIndicator color={theme.white} size="small" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: theme.white }]}>Add Comment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <DropdownModal
          visible={activeDropdown === 'status'}
          onClose={() => setActiveDropdown(null)}
          options={STATUS_CHOICES}
          onSelect={(value) => setSelectedLead({...selectedLead, status: value as Lead['status']})}
          title="Select Status"
        />
        <DropdownModal
          visible={activeDropdown === 'phase'}
          onClose={() => setActiveDropdown(null)}
          options={allPhases}
          onSelect={handlePhaseSelection}
          title="Select Phase"
        />
        <DropdownModal
          visible={activeDropdown === 'subphase'}
          onClose={() => setActiveDropdown(null)}
          options={allSubphases}
          onSelect={(value) => setSelectedLead({...selectedLead, subphase: value})}
          title="Select Subphase"
        />

        <Modal visible={showDefaultComments} transparent animationType="fade" onRequestClose={() => setShowDefaultComments(false)}>
          <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} activeOpacity={1} onPress={() => setShowDefaultComments(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.defaultCommentsModal, { backgroundColor: theme.cardBg }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Default Comments - {beautifyName(selectedLead.phase)} → {beautifyName(selectedLead.subphase)}
                </Text>
                <ScrollView style={styles.defaultCommentsList}>
                  {loadingDefaultComments ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={theme.primary} />
                      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading default comments...</Text>
                    </View>
                  ) : defaultComments.length > 0 ? (
                    defaultComments.map((comment) => (
                      <TouchableOpacity
                        key={comment.id}
                        style={[styles.defaultCommentItem, { borderBottomColor: theme.border }]}
                        onPress={() => handleDefaultCommentSelect(comment)}
                      >
                        <Text style={[styles.defaultCommentText, { color: theme.text }]}>
                          {(() => {
                            try {
                              return JSON.parse(comment.data);
                            } catch {
                              return comment.data;
                            }
                          })()}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                        No default comments available for this phase/subphase
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {selectedLead && (
          <InvoiceForm
            visible={showInvoiceForm}
            onClose={() => setShowInvoiceForm(false)}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
            onInvoiceCreated={handleInvoiceCreated}
            onCancel={handleInvoiceCancel}
          />
        )}
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "light-content"} backgroundColor={theme.headerBg} />

      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BDT</Text>
        <View style={styles.headerSpacer}>
          <TouchableOpacity onPress={toggleDarkMode} style={styles.themeToggleButton}>
            <Text style={styles.themeIcon}>
              {isDarkMode ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBg }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search Leads"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholderTextColor={theme.textSecondary}
          />
          <TouchableOpacity onPress={() => setActiveDropdown('filter')}>
            <Text style={styles.slidersIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsContainer, { backgroundColor: theme.cardBg }]}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab, 
              activeTab === tab.id && [styles.activeTab, { backgroundColor: theme.primary }]
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText, 
              { color: theme.textSecondary },
              activeTab === tab.id && [styles.activeTabText, { color: theme.white }]
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active Filter Indicator */}
      {filterBy && filterValue && (
        <View style={[styles.activeFilterContainer, { backgroundColor: theme.info + '20' }]}>
          <Text style={[styles.activeFilterText, { color: theme.info }]}>
            {getFilterLabel(filterBy, filterValue)}
          </Text>
          <TouchableOpacity onPress={() => { 
            setFilterBy(''); 
            setFilterValue(''); 
            setSelectedPhase('');
            if (!isSearchMode) {
              fetchLeads(1);
            }
          }}>
            <Text style={[styles.clearFilterText, { color: theme.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSearchMode && (
        <View style={[styles.searchModeIndicator, { backgroundColor: theme.success + '20' }]}>
          <Text style={[styles.searchModeText, { color: theme.success }]}>
            Search results for: "{searchQuery}"
          </Text>
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setIsSearchMode(false);
            fetchLeads(1);
          }}>
            <Text style={[styles.clearSearchText, { color: theme.error }]}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Leads List */}
      <ScrollView 
        style={[styles.leadsContainer, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              if (isSearchMode) {
                searchLeads(searchQuery);
              } else {
                fetchLeads(1);
              }
            }}
            tintColor={theme.primary}
          />
        }
      >
        {loading && leads.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading leads...</Text>
          </View>
        ) : filteredLeads.length > 0 ? (
          filteredLeads.map((lead, index) => {
            // Get background color and status badge color based on lead status
            const cardBackgroundColor = getLeadCardBackgroundColor(lead.status);
            const statusBadgeColor = getStatusBadgeColor(lead.status);
            
            return (
              <View 
                key={lead.id} 
                style={[
                  styles.leadCard,
                  { backgroundColor: cardBackgroundColor }
                ]}
              >
                {/* Status Badge */}
                <View style={[styles.statusBadgeContainer, { backgroundColor: statusBadgeColor }]}>
                  <Text style={styles.statusBadgeText}>
                    {beautifyName(lead.status)}
                  </Text>
                </View>
                
                <TouchableOpacity onPress={() => handleLeadPress(lead)}>
                  <View style={styles.leadHeader}>
                    <Image
                      source={{ uri: `https://i.pravatar.cc/150?u=${lead.name}` }}
                      style={styles.avatar}
                    />
                    <View style={styles.leadInfo}>
                      <Text style={[styles.leadName, { color: theme.text }]}>{lead.name}</Text>
                      <Text style={[styles.leadContact, { color: theme.textSecondary }]}>
                        {lead.emails && lead.emails.length > 0 
                          ? lead.emails[0].email 
                          : 'No email'} • {lead.phone_numbers && lead.phone_numbers.length > 0 
                          ? lead.phone_numbers[0].number 
                          : 'No phone'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tagContainer}>
                    <View style={[styles.tag, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)' }]}>
                      <Text style={[styles.tagText, { color: theme.text }]}>{beautifyName(lead.phase)}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)' }]}>
                      <Text style={[styles.tagText, { color: theme.text }]}>{beautifyName(lead.subphase)}</Text>
                    </View>
                    <View style={[styles.tag, styles.preApprovedTag, { backgroundColor: isDarkMode ? '#1C3A5E' : '#e1f5fe' }]}>
                      <Text style={[styles.preApprovedTagText, { color: isDarkMode ? '#64B5F6' : '#0288d1' }]}>Pre-approved</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={[styles.companyName, { color: theme.text }]}>{lead.company || 'No company specified'}</Text>
                      <Text style={[styles.lastOpened, { color: theme.textSecondary }]}>
                        Last opened: {formatDateTime(lead.created_at || lead.createdAt)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.viewButton, { borderColor: theme.primary }]}
                      onPress={() => handleLeadPress(lead)}
                    >
                      <Text style={[styles.viewButtonText, { color: theme.primary }]}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyState, { 
            backgroundColor: theme.cardBg,
            borderColor: theme.border
          }]}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {searchQuery || filterValue ? 'No leads match your criteria' : 'No leads found'}
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
              {searchQuery || filterValue 
                ? 'Try adjusting your search or filters' 
                : 'Your leads will appear here when they are created'
              }
            </Text>
          </View>
        )}

        {loadingMore && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>Loading more leads...</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation
      <BottomNavigation /> */}

      {/* Filter Modals */}
      <DropdownModal
        visible={activeDropdown === 'filter'}
        onClose={() => setActiveDropdown(null)}
        options={FILTER_OPTIONS}
        onSelect={handleFilterSelection}
        title="Filter Options"
      />

      <DropdownModal
        visible={activeDropdown === 'status' && !selectedLead}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Status"
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelectionForFilter}
        title={filterBy === 'subphase' ? "Select Phase (for Subphase)" : "Select Phase"}
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => setFilterValue(value)}
        title="Select Subphase"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: { 
    padding: 8 
  },
  backIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerSpacer: { 
    width: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleButton: {
    padding: 8,
  },
  themeIcon: {
    fontSize: 20,
  },
  
  // Search Section
  searchContainer: {
    padding: 15,
  },
  searchBar: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    paddingVertical: 0,
  },
  slidersIcon: {
    fontSize: 16,
  },
  
  // Tabs
  tabsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight:55,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  activeTab: {
    maxHeight:30, 
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  
  // Lead Cards
  leadsContainer: {
    flex: 1,
    padding: 15,
  },
  leadCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  // UPDATED: Status Badge styles
  statusBadgeContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  // leadHeader: {
  //   flexDirection: 'row',
  //   gap: 12,
  //   marginBottom: 10,
  // },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
  },
  leadInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  // leadName: {
  //   fontSize: 18,
  //   fontWeight: '600',
  //   marginBottom: 2,
  // },
  leadContact: {
    fontSize: 12,
    opacity: 0.8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  tagText: {
    fontSize: 11,
  },
  preApprovedTag: {
  },
  preApprovedTagText: {
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  lastOpened: {
    fontSize: 10,
  },
  viewButton: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Bottom Navigation
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 80,
    zIndex: 1000,
  },
  navBar: {
    height: 70,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  navItemActive: {
    zIndex: 2,
  },
  navItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeNavIcon: {
    color: 'white',
    fontSize: 20,
  },
  navLabel: {
    fontSize: 12,
  },
  activeNavLabel: {
    fontWeight: 'bold',
    marginTop: 35,
  },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -25,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  bulge: {
    position: 'absolute',
    top: -20,
    width: 70,
    height: 40,
    backgroundColor: '#f5f7fa',
    borderRadius: 20,
    zIndex: 1,
  },

  // Existing styles (kept for detail view functionality)
  contactItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
  },
  contactItemContent: {
    flex: 1,
  },
  contactItemText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  removeContactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  removeContactButtonText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  addContactContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  emptyContactContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  emptyContactText: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
  },
  potentialCollaboratorsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
  },
  potentialCollaboratorsList: {
    maxHeight: 200,
  },
  potentialCollaboratorItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  potentialCollaboratorInfo: {
    flex: 1,
  },
  potentialCollaboratorName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  potentialCollaboratorEmail: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  potentialCollaboratorRole: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  potentialCollaboratorLoadingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  potentialCollaboratorLoadingText: {
    fontSize: fontSize.sm,
  },
  selectedDocumentsContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  selectedDocumentsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  selectedDocumentName: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  removeDocumentButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDocumentButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  emptyCollaborators: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCollaboratorsText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  documentsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  documentsLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  searchModeIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchModeText: {
    fontWeight: '500',
    flex: 1,
  },
  clearSearchText: {
    fontWeight: '500',
  },
  // Invoice Form Styles
  invoiceModalContainer: {
    flex: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  invoiceBackButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  invoiceBackButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  invoiceHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  invoiceSaveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  invoiceSaveButtonDisabled: {
    opacity: 0.6,
  },
  invoiceSaveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  invoiceScrollView: {
    flex: 1,
    padding: spacing.lg,
  },
  invoiceFormCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  invoiceFormTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fileUploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  fileUploadButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  removeFileButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  removeFileButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  requiredNote: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incentiveButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  incentiveButtonText: {
    fontSize: 18,
  },
  editButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  editButtonText: { fontSize: fontSize.sm, fontWeight: '600' },
  saveButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  saveButtonText: { fontSize: fontSize.sm, fontWeight: '600' },

  activeFilterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeFilterText: { fontSize: fontSize.sm, fontWeight: '600' },
  clearFilterText: { fontSize: fontSize.sm, fontWeight: '600' },

  contentContainer: { flex: 1 },
  tabContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.md },

  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyStateText: { fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.xs },
  emptyStateSubtext: { fontSize: fontSize.sm, textAlign: 'center', fontStyle: 'italic' },

  detailScrollView: { flex: 1 },
  detailCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },

  leadNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  leadName: { 
    fontSize: fontSize.xxl, 
    fontWeight: '700',
    flex: 1,
  },
  incentiveIconButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 90,
  },
  incentiveIconText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  leadHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.md 
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  leadCompany: { 
    fontSize: fontSize.md, 
    fontWeight: '500', 
    marginBottom: spacing.sm 
  },
  leadDate: { fontSize: fontSize.sm },

  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  inputDisabled: { color: colors.textSecondary },

  managementRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  managementItem: { flex: 1 },
  dropdown: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: { fontSize: fontSize.md, flex: 1 },
  dropdownArrow: { fontSize: fontSize.sm },
  readOnlyField: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  readOnlyText: { fontSize: fontSize.md },

  collaboratorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  collaboratorName: { fontSize: fontSize.md, fontWeight: '500' },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: { fontSize: fontSize.lg, fontWeight: '600' },
  addCollaboratorContainer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: fontSize.lg, fontWeight: '600' },

  commentItem: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  commentHeaderRow: { 
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  commentMetaItem: { flex: 1, marginRight: spacing.sm },
  commentLabel: { 
    fontSize: fontSize.xs, fontWeight: '600', marginBottom: spacing.xs,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  endOfListText: {
    fontStyle: 'italic',
  },
  commentValue: { fontSize: fontSize.sm, fontWeight: '500' },
  commentContentRow: { marginTop: spacing.sm },
  commentContentText: { 
    fontSize: fontSize.md, lineHeight: 22, marginTop: spacing.xs,
    padding: spacing.md, borderRadius: borderRadius.md,
  },
  fileButton: { 
    paddingHorizontal: spacing.sm, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.sm, 
    alignSelf: 'flex-start', 
    marginTop: spacing.xs 
  },
  fileButtonText: { fontSize: fontSize.sm, fontWeight: '500' },

  emptyComments: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyCommentsText: { 
    fontSize: fontSize.lg, 
    fontWeight: '600', 
    marginBottom: spacing.sm 
  },
  emptyCommentsSubtext: { 
    fontSize: fontSize.sm, 
    textAlign: 'center' 
  },

  addCommentSection: { 
    marginTop: spacing.lg, 
    paddingTop: spacing.lg, 
    borderTopWidth: 1,
  },
  commentActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  actionButton: {
    flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1,
    borderRadius: borderRadius.lg, alignItems: 'center',
  },
  actionButtonText: { fontSize: fontSize.sm, fontWeight: '600' },
  commentInput: {
    borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md,
    fontSize: fontSize.sm, marginBottom: spacing.md,
    textAlignVertical: 'top', minHeight: 100,
  },
  submitButton: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, alignItems: 'center',
  },
  submitButtonText: { fontSize: fontSize.md, fontWeight: '600' },

  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: spacing.xl 
  },
  dropdownContainer: {
    borderRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.6,
  },
  dropdownTitle: {
    fontSize: fontSize.lg, fontWeight: '600', textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1,
  },
  dropdownList: { maxHeight: screenHeight * 0.4 },
  dropdownItem: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1,
  },
  dropdownItemText: { fontSize: fontSize.md, fontWeight: '500' },
  emptyDropdown: { padding: spacing.xl, alignItems: 'center' },
  emptyDropdownText: { fontSize: fontSize.md, textAlign: 'center' },

  defaultCommentsModal: { 
    borderRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.6,
  },
  modalTitle: {
    fontSize: fontSize.lg, fontWeight: '600', textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1,
  },
  defaultCommentsList: { maxHeight: screenHeight * 0.4, padding: spacing.sm },
  defaultCommentItem: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1,
  },
  defaultCommentText: { fontSize: fontSize.md },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  loadMoreText: {
    marginLeft: spacing.sm,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  leadCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadCardPhase: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  leadCardDateContainer: {
    alignItems: 'flex-end',
  },
  leadCardDate: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  leadCardTime: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorEmail: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  collaboratorRole: {
    fontSize: fontSize.sm,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default BDT;