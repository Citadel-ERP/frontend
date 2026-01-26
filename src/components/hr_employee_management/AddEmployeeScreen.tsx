// hr_employee_management/AddEmployeeScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { Header } from './header';
import { BACKEND_URL } from '../../config/config';

// ==================== TYPES ====================
interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  zip_code?: string;
}

interface Tag {
  tag_id: string;
  tag_name: string;
  tag_type: string;
  description?: string;
}

interface Document {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface AddEmployeeScreenProps {
  token: string;
  onBack: () => void;
  onEmployeeAdded: () => void;
}

interface AddressData {
  address: string;
  street: string;
  pin_code: string;
  city: string;
  state: string;
  country: string;
}

interface BasicInfoData {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  employee_password: string;
  earned_leaves: string;
  sick_leaves: string;
  casual_leaves: string;
  designation: string;
  login_time: string;
  logout_time: string;
}

interface StepValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

// ==================== HELPER COMPONENTS ====================
const ReviewSection: React.FC<{
  label: string;
  value?: string | number;
  customContent?: React.ReactNode;
}> = ({ label, value, customContent }) => (
  <View style={styles.reviewSection}>
    <Text style={styles.reviewLabel}>{label}</Text>
    {customContent ? customContent : (
      <Text style={styles.reviewValue}>
        {value !== undefined && value !== null 
          ? (typeof value === 'object' ? JSON.stringify(value) : String(value))
          : 'Not specified'
        }
      </Text>
    )}
  </View>
);

// ==================== COMPONENT ====================
const AddEmployeeScreen: React.FC<AddEmployeeScreenProps> = ({
  token,
  onBack,
  onEmployeeAdded,
}) => {
  // ==================== STATE ====================
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedReportingTags, setSelectedReportingTags] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showLoginTimePicker, setShowLoginTimePicker] = useState<boolean>(false);
  const [showLogoutTimePicker, setShowLogoutTimePicker] = useState<boolean>(false);

  // Step 1: Basic Information
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    employee_password: 'Citadel2025@',
    earned_leaves: '0',
    sick_leaves: '0',
    casual_leaves: '0',
    designation: '',
    login_time: '',
    logout_time: '',
  });

  // Step 2: Address & Office
  const [addressInfo, setAddressInfo] = useState({
    home_address: {
      address: '',
      street: '',
      pin_code: '',
      city: '',
      state: '',
      country: 'India',
    },
    current_address: {
      address: '',
      street: '',
      pin_code: '',
      city: '',
      state: '',
      country: 'India',
    },
    office_id: '',
  });

  // ==================== MEMOIZED VALUES ====================
  const selectedOffice = useMemo(() =>
    offices.find(office => office.id === addressInfo.office_id),
    [offices, addressInfo.office_id]
  );

  const selectedTagNames = useMemo(() =>
    selectedTags.map(tagId =>
      tags.find(t => t.tag_id === tagId)?.tag_name || tagId
    ),
    [selectedTags, tags]
  );

  const selectedReportingTagNames = useMemo(() =>
    selectedReportingTags.map(tagId =>
      tags.find(t => t.tag_id === tagId)?.tag_name || tagId
    ),
    [selectedReportingTags, tags]
  );

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchInitialData();
  }, []);

  // ==================== DATA FETCHING ====================
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchOffices(), fetchTags()]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load initial data');
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/HrgetOffices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setOffices(data.offices || []);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch offices');
      }
    } catch (error: any) {
      console.error('Error fetching offices:', error);
      Alert.alert('Error', error.message || 'Failed to fetch offices');
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getTags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tags');
      }
    } catch (error: any) {
      console.error('Error fetching tags:', error);
      Alert.alert('Error', error.message || 'Failed to fetch tags');
    }
  };

  // ==================== HANDLERS ====================
  const handleBasicInfoChange = useCallback((field: keyof BasicInfoData, value: string) => {
    setBasicInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleTimeSelect = useCallback((field: 'login_time' | 'logout_time', date: Date) => {
    const timeString = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    handleBasicInfoChange(field, timeString);

    if (field === 'login_time') {
      setShowLoginTimePicker(false);
    } else {
      setShowLogoutTimePicker(false);
    }
  }, [handleBasicInfoChange]);

  const handleAddressChange = useCallback(
    (addressType: 'home_address' | 'current_address', field: keyof AddressData, value: string) => {
      setAddressInfo(prev => ({
        ...prev,
        [addressType]: {
          ...prev[addressType],
          [field]: value,
        },
      }));
    },
    []
  );

  const copyHomeToCurrentAddress = useCallback(() => {
    setAddressInfo(prev => ({
      ...prev,
      current_address: { ...prev.home_address },
    }));
  }, []);

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  const handleReportingTagSelection = useCallback((tagId: string) => {
    // Single selection only - replace the array with just this tag
    setSelectedReportingTags(prev => 
      prev.includes(tagId) ? [] : [tagId]
    );
  }, []);

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newDocuments: Document[] = result.assets.map(doc => ({
          uri: doc.uri,
          name: doc.name || 'Document',
          type: doc.mimeType || 'application/octet-stream',
          size: doc.size,
        }));
        setDocuments(prev => [...prev, ...newDocuments]);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents');
    }
  };

  const removeDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ==================== VALIDATION ====================
  const validateStep1 = (): StepValidationResult => {
    const requiredFields: (keyof BasicInfoData)[] = [
      'employee_id', 
      'first_name', 
      'designation', 
      'login_time', 
      'logout_time'
    ];
    const missingFields = requiredFields.filter(field => !basicInfo[field]);

    if (missingFields.length > 0) {
      return {
        isValid: false,
        errorMessage: `Please fill in: ${missingFields.join(', ').replace(/_/g, ' ')}`,
      };
    }

    if (!basicInfo.email && !basicInfo.phone_number) {
      return {
        isValid: false,
        errorMessage: 'Please provide either email or phone number',
      };
    }

    if (basicInfo.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(basicInfo.email)) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid email address',
        };
      }
    }

    if (basicInfo.phone_number && basicInfo.phone_number.length < 10) {
      return {
        isValid: false,
        errorMessage: 'Please enter a valid phone number (minimum 10 digits)',
      };
    }

    return { isValid: true };
  };

  const validateStep2 = (): StepValidationResult => {
    const home = addressInfo.home_address;
    const requiredFields: (keyof AddressData)[] = ['address', 'street', 'pin_code', 'city', 'state'];
    const missingFields = requiredFields.filter(field => !home[field]);

    if (missingFields.length > 0) {
      return {
        isValid: false,
        errorMessage: `Please fill in home address: ${missingFields.join(', ')}`,
      };
    }

    if (!addressInfo.office_id) {
      return {
        isValid: false,
        errorMessage: 'Please select an office for the employee',
      };
    }

    return { isValid: true };
  };

  const validateStep3 = (): StepValidationResult => {
    if (selectedTags.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Please select at least one tag for the employee',
      };
    }
    return { isValid: true };
  };

  const validateStep4 = (): StepValidationResult => {
    if (selectedReportingTags.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Please select a reporting tag',
      };
    }
    return { isValid: true };
  };

  const handleNext = () => {
    let validationResult: StepValidationResult = { isValid: true };

    switch (currentStep) {
      case 1:
        validationResult = validateStep1();
        break;
      case 2:
        validationResult = validateStep2();
        break;
      case 3:
        validationResult = validateStep3();
        break;
      case 4:
        validationResult = validateStep4();
        break;
    }

    if (!validationResult.isValid) {
      Alert.alert('Validation Error', validationResult.errorMessage);
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack();
    }
  };

  // ==================== SUBMISSION ====================
  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('token', token);

      // Add basic info
      Object.entries(basicInfo).forEach(([key, value]) => {
        if (value) {
          if (key.includes('leaves')) {
            formData.append(key, parseInt(value) || 0);
          } else {
            formData.append(key, value);
          }
        }
      });

      // Add addresses
      const homeAddressData = {
        address: addressInfo.home_address.address || '',
        street: addressInfo.home_address.street || '',
        city: addressInfo.home_address.city || '',
        state: addressInfo.home_address.state || '',
        country: addressInfo.home_address.country || 'India',
        pin_code: addressInfo.home_address.pin_code || '',
      };
      formData.append('home_address', JSON.stringify(homeAddressData));

      const hasCurrentAddress = Object.values(addressInfo.current_address).some(val => val && val !== '');
      if (hasCurrentAddress) {
        const currentAddressData = {
          address: addressInfo.current_address.address || '',
          street: addressInfo.current_address.street || '',
          city: addressInfo.current_address.city || '',
          state: addressInfo.current_address.state || '',
          country: addressInfo.current_address.country || 'India',
          pin_code: addressInfo.current_address.pin_code || '',
        };
        formData.append('current_location', JSON.stringify(currentAddressData));
      }

      // Add office
      formData.append('office_id', addressInfo.office_id);

      // Add tags
      selectedTags.forEach(tagId => {
        formData.append('tag_ids', tagId);
      });

      // Add reporting tags
      selectedReportingTags.forEach(tagId => {
        formData.append('reporting_tag_ids', tagId);
      });

      // Add documents
      documents.forEach((doc, index) => {
        const fieldName = getDocumentFieldName(doc.name || `document_${index}`);
        const file = {
          uri: doc.uri,
          name: doc.name || `document_${index}`,
          type: doc.type || 'application/octet-stream',
        } as any;
        formData.append(fieldName, file);
      });

      // Add joining date
      formData.append('joining_date', new Date().toISOString().split('T')[0]);

      // API call
      const response = await fetch(`${BACKEND_URL}/manager/addEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok) {
        const result = JSON.parse(responseText);
        Alert.alert(
          'Success',
          `Employee ${basicInfo.first_name} ${basicInfo.last_name} created successfully!`,
          [{
            text: 'OK',
            onPress: () => {
              onEmployeeAdded();
              onBack();
            },
          }]
        );
      } else {
        let errorMessage = 'Failed to create employee';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      Alert.alert('Error', error.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== UTILITY FUNCTIONS ====================
  const getDocumentFieldName = (fileName: string): string => {
    const lowerName = fileName.toLowerCase();

    const documentMappings: { [key: string]: string } = {
      'aadhaar': 'aadhar_card',
      'aadhar': 'aadhar_card',
      'pan': 'pan_card',
      'education': 'educational_documents',
      'offer': 'offer_letter',
      'appointment': 'appointment_letter',
      'relieving': 'relieving_letter',
      'experience': 'experience_letter',
      'bank': 'bank_statement',
      'form16': 'form_16',
      'form_16': 'form_16',
      'passport': 'passport',
      'epfo': 'epfo_number',
      'uan': 'epfo_number',
    };

    for (const [keyword, fieldName] of Object.entries(documentMappings)) {
      if (lowerName.includes(keyword)) return fieldName;
    }

    return 'other_document';
  };

  const getDocumentIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'document-text';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    return 'document-attach';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ==================== RENDER COMPONENTS ====================
  const renderStepIndicator = () => (
    <View style={styles.stepProgress}>
      {/* Circles Row */}
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3, 4, 5].map((step, index) => (
          <React.Fragment key={step}>
            <View style={[
              styles.stepIndicator,
              currentStep >= step ? styles.stepIndicatorActive : styles.stepIndicatorInactive,
            ]}>
              <Text style={[
                styles.stepIndicatorText,
                currentStep >= step ? styles.stepIndicatorTextActive : styles.stepIndicatorTextInactive,
              ]}>
                {step}
              </Text>
            </View>
            {step < 5 && (
              <View style={[
                styles.stepConnector,
                currentStep > step ? styles.stepConnectorActive : styles.stepConnectorInactive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
      
      {/* Labels Row */}
      <View style={styles.stepLabelsContainer}>
        <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>
          Basic Info
        </Text>
        <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>
          Address
        </Text>
        <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive]}>
          Tags
        </Text>
        <Text style={[styles.stepLabel, currentStep === 4 && styles.stepLabelActive]}>
          Reporting
        </Text>
        <Text style={[styles.stepLabel, currentStep === 5 && styles.stepLabelActive]}>
          Documents
        </Text>
      </View>
    </View>
  );

  // ==================== STEP RENDERERS ====================
  const renderStep1 = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>Basic Information</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Employee ID *</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.employee_id}
            onChangeText={value => handleBasicInfoChange('employee_id', value)}
            placeholder="Enter employee ID"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.first_name}
              onChangeText={value => handleBasicInfoChange('first_name', value)}
              placeholder="First name"
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.last_name}
              onChangeText={value => handleBasicInfoChange('last_name', value)}
              placeholder="Last name"
            />
          </View>
        </View>

        {/* Designation Field - NOW MANDATORY */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Designation *</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.designation}
            onChangeText={value => handleBasicInfoChange('designation', value)}
            placeholder="e.g., Software Engineer, HR Manager"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.email}
            onChangeText={value => handleBasicInfoChange('email', value)}
            placeholder="employee@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>Either email or phone is required</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.phone_number}
            onChangeText={value => handleBasicInfoChange('phone_number', value)}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
          />
          <Text style={styles.helperText}>Either email or phone is required</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Default Password</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.employee_password}
            onChangeText={value => handleBasicInfoChange('employee_password', value)}
            placeholder="Enter password"
            secureTextEntry
          />
          <Text style={styles.helperText}>Default: Citadel2025@</Text>
        </View>

        {/* Login/Logout Time Fields - NOW MANDATORY */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>Work Timing *</Text>
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Login Time *</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => setShowLoginTimePicker(true)}
              >
                <Text style={basicInfo.login_time ? {} : { color: '#999' }}>
                  {basicInfo.login_time || 'Select Time'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Logout Time *</Text>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => setShowLogoutTimePicker(true)}
              >
                <Text style={basicInfo.logout_time ? {} : { color: '#999' }}>
                  {basicInfo.logout_time || 'Select Time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Time Pickers */}
        {showLoginTimePicker && (
          <DateTimePicker
            value={basicInfo.login_time ? new Date(`2000-01-01T${basicInfo.login_time}`) : new Date()}
            mode="time"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                handleTimeSelect('login_time', selectedDate);
              }
            }}
          />
        )}

        {showLogoutTimePicker && (
          <DateTimePicker
            value={basicInfo.logout_time ? new Date(`2000-01-01T${basicInfo.logout_time}`) : new Date()}
            mode="time"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                handleTimeSelect('logout_time', selectedDate);
              }
            }}
          />
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12, marginTop: -30 }]}>Leave Allocation</Text>
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Earned Leaves</Text>
              <TextInput
                style={styles.input}
                value={basicInfo.earned_leaves}
                onChangeText={value => handleBasicInfoChange('earned_leaves', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginHorizontal: 8 }]}>
              <Text style={styles.label}>Sick Leaves</Text>
              <TextInput
                style={[styles.input, { marginTop: 16 }]}
                value={basicInfo.sick_leaves}
                onChangeText={value => handleBasicInfoChange('sick_leaves', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Casual Leaves</Text>
              <TextInput
                style={styles.input}
                value={basicInfo.casual_leaves}
                onChangeText={value => handleBasicInfoChange('casual_leaves', value)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Home Address *
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={addressInfo.home_address.address}
            onChangeText={value => handleAddressChange('home_address', 'address', value)}
            placeholder="Full address"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Street</Text>
          <TextInput
            style={styles.input}
            value={addressInfo.home_address.street}
            onChangeText={value => handleAddressChange('home_address', 'street', value)}
            placeholder="Street name"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.home_address.city}
              onChangeText={value => handleAddressChange('home_address', 'city', value)}
              placeholder="City"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.home_address.state}
              onChangeText={value => handleAddressChange('home_address', 'state', value)}
              placeholder="State"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Pin Code</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.home_address.pin_code}
              onChangeText={value => handleAddressChange('home_address', 'pin_code', value)}
              placeholder="Pin code"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={[styles.input, { color: '#666' }]}
              value={addressInfo.home_address.country}
              editable={false}
              placeholder="India"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
            Current Address
          </Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={copyHomeToCurrentAddress}
          >
            <Ionicons name="copy-outline" size={16} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.copyButtonText}>Same as Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={addressInfo.current_address.address}
            onChangeText={value => handleAddressChange('current_address', 'address', value)}
            placeholder="Current address (leave blank if same as home)"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Street</Text>
          <TextInput
            style={styles.input}
            value={addressInfo.current_address.street}
            onChangeText={value => handleAddressChange('current_address', 'street', value)}
            placeholder="Street name"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.current_address.city}
              onChangeText={value => handleAddressChange('current_address', 'city', value)}
              placeholder="City"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.current_address.state}
              onChangeText={value => handleAddressChange('current_address', 'state', value)}
              placeholder="State"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Pin Code</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.current_address.pin_code}
              onChangeText={value => handleAddressChange('current_address', 'pin_code', value)}
              placeholder="Pin code"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={[styles.input, { color: '#666' }]}
              value={addressInfo.current_address.country}
              editable={false}
              placeholder="India"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Office Assignment *
        </Text>
        <Text style={styles.sectionSubtitle}>
          Select the primary office for this employee
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} style={{ marginTop: 20 }} />
        ) : offices.length === 0 ? (
          <Text style={styles.noDataText}>No offices available</Text>
        ) : (
          <View style={{ marginTop: 16, marginBottom: 200 }}>
            {offices.map(office => (
              <TouchableOpacity
                key={office.id}
                style={[
                  styles.officeCard,
                  addressInfo.office_id === office.id && styles.officeCardSelected,
                ]}
                onPress={() => setAddressInfo(prev => ({ ...prev, office_id: office.id }))}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.officeCardIcon,
                  addressInfo.office_id === office.id && styles.officeCardIconSelected,
                ]}>
                  <Ionicons
                    name="business"
                    size={24}
                    color={addressInfo.office_id === office.id ? '#fff' : WHATSAPP_COLORS.primary}
                  />
                </View>
                
                <View style={styles.officeCardContent}>
                  <Text style={[
                    styles.officeCardName,
                    addressInfo.office_id === office.id && styles.officeCardNameSelected,
                  ]}>
                    {office.name}
                  </Text>
                  <Text style={styles.officeCardAddress}>
                    {office.address}
                  </Text>
                  <Text style={styles.officeCardLocation}>
                    {office.city}, {office.state}
                  </Text>
                </View>
                
                {addressInfo.office_id === office.id && (
                  <View style={styles.officeCardCheck}>
                    <Ionicons name="checkmark-circle" size={28} color={WHATSAPP_COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Assign Tags *
        </Text>
        <Text style={styles.sectionSubtitle}>
          Select one or more tags for the employee
        </Text>

        {tags.length === 0 ? (
          <Text style={styles.noDataText}>No tags available</Text>
        ) : (
          <View style={styles.tagsContainer}>
            {tags.map(tag => (
              <TouchableOpacity
                key={tag.tag_id}
                style={[
                  styles.tagItem,
                  selectedTags.includes(tag.tag_id) && styles.tagItemSelected,
                ]}
                onPress={() => toggleTagSelection(tag.tag_id)}
              >
                <Text style={[
                  styles.tagText,
                  selectedTags.includes(tag.tag_id) && styles.tagTextSelected,
                ]}>
                  {tag.tag_name}
                </Text>
                {tag.tag_type && (
                  <Text style={styles.tagType}>{tag.tag_type}</Text>
                )}
                {selectedTags.includes(tag.tag_id) && (
                  <Ionicons name="checkmark" size={16} color="#fff" style={styles.tagCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Assign Reporting Manager *
        </Text>
        <Text style={styles.sectionSubtitle}>
          Select ONE tag that this employee will report to
        </Text>

        {/* Show currently selected reporting tag if any */}
        {selectedReportingTags.length > 0 && (
          <View style={styles.selectedReportingBanner}>
            <Ionicons name="person-circle" size={24} color={WHATSAPP_COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.selectedReportingLabel}>Reports To:</Text>
              <Text style={styles.selectedReportingValue}>
                {tags.find(t => t.tag_id === selectedReportingTags[0])?.tag_name || 'Unknown'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedReportingTags([])}
              style={styles.clearReportingButton}
            >
              <Ionicons name="close-circle" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {tags.length === 0 ? (
          <Text style={styles.noDataText}>No tags available</Text>
        ) : (
          <View style={styles.tagsContainer}>
            {tags.map(tag => {
              const isSelected = selectedReportingTags.includes(tag.tag_id);
              
              return (
                <TouchableOpacity
                  key={tag.tag_id}
                  style={[
                    styles.tagItem,
                    isSelected && styles.tagItemSelected,
                  ]}
                  onPress={() => handleReportingTagSelection(tag.tag_id)}
                >
                  <View style={styles.tagContent}>
                    <Ionicons
                      name="person-circle-outline"
                      size={18}
                      color={isSelected ? '#fff' : '#666'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[
                      styles.tagText,
                      isSelected && styles.tagTextSelected,
                    ]}>
                      {tag.tag_name}
                    </Text>
                  </View>
                  {tag.tag_type && (
                    <Text style={[
                      styles.tagType,
                      isSelected && styles.tagTypeSelected,
                    ]}>
                      {tag.tag_type}
                    </Text>
                  )}
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.tagCheck} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Upload Documents (Optional)
        </Text>
        <Text style={styles.sectionSubtitle}>
          Upload required documents (Aadhar, PAN, Educational, etc.)
        </Text>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickDocuments}
          disabled={submitting}
        >
          <Ionicons name="cloud-upload-outline" size={24} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.uploadButtonText}>Browse Documents</Text>
          <Text style={styles.uploadButtonSubtext}>
            PDF, DOC, JPG, PNG supported
          </Text>
        </TouchableOpacity>

        {documents.length > 0 && (
          <View style={styles.uploadedDocuments}>
            <Text style={styles.uploadedDocumentsTitle}>
              Selected Documents ({documents.length})
            </Text>
            {documents.map((doc, index) => (
              <View key={index} style={styles.documentItem}>
                <View style={styles.documentIcon}>
                  <Ionicons
                    name={getDocumentIcon(doc.type)}
                    size={20}
                    color={WHATSAPP_COLORS.primary}
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={styles.documentSize}>
                    {formatFileSize(doc.size || 0)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeDocumentButton}
                  onPress={() => removeDocument(index)}
                  disabled={submitting}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
            Review Information
          </Text>

          <ReviewSection label="Employee:" value={`${basicInfo.first_name} ${basicInfo.last_name}`} />
          <ReviewSection label="Employee ID:" value={basicInfo.employee_id} />
          <ReviewSection label="Designation:" value={basicInfo.designation || 'Not specified'} />
          <ReviewSection label="Contact:" value={basicInfo.email || basicInfo.phone_number || 'Not provided'} />

          <ReviewSection
            label="Work Timing:"
            value={
              basicInfo.login_time && basicInfo.logout_time
                ? `${basicInfo.login_time} - ${basicInfo.logout_time}`
                : basicInfo.login_time
                  ? `Login: ${basicInfo.login_time}`
                  : basicInfo.logout_time
                    ? `Logout: ${basicInfo.logout_time}`
                    : 'Not specified'
            }
          />

          <ReviewSection 
            label="Office:" 
            value={selectedOffice?.name || 'Not selected'} 
          />

          <ReviewSection
            label="Employee Tags:"
            customContent={
              selectedTags.length > 0 ? (
                <View style={styles.reviewTags}>
                  {selectedTagNames.map((tagName, index) => (
                    <View key={index} style={styles.reviewTag}>
                      <Text style={styles.reviewTagText}>{tagName}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No tags selected</Text>
              )
            }
          />

          <ReviewSection
            label="Reporting Tag:"
            customContent={
              selectedReportingTags.length > 0 ? (
                <View style={styles.reviewTags}>
                  {selectedReportingTagNames.map((tagName, index) => (
                    <View key={index} style={[styles.reviewTag, styles.reportingTag]}>
                      <Ionicons name="person-circle" size={14} color="#fff" />
                      <Text style={styles.reviewTagText}>{tagName}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No reporting tag selected</Text>
              )
            }
          />

          <ReviewSection label="Documents:" value={`${documents.length} file(s)`} />
        </View>
      </View>
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WHATSAPP_COLORS.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Header
            title="Add New Employee"
            subtitle={`Step ${currentStep} of 5`}
            onBack={handlePrevious}
          />

          <View style={styles.stepProgress}>
            {renderStepIndicator()}
          </View>

          <View style={[styles.content, { flex: 1 }]}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.secondaryButton]}
            onPress={handlePrevious}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.primaryButton,
              submitting && styles.disabledButton
            ]}
            onPress={currentStep === 5 ? handleSubmit : handleNext}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === 5 ? 'Create Employee' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddEmployeeScreen;