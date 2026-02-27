// hr_employee_management/AddEmployeeScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { Header } from './header';
import { BACKEND_URL } from '../../config/config';
import * as ImagePicker from 'expo-image-picker';
import alert from '../../utils/Alert';

// ==================== TYPES ====================
interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
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

// ==================== TIME INPUT COMPONENT ====================
interface TimeInputProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}

const TimeInputField: React.FC<TimeInputProps> = ({ value, onChange, placeholder = 'Select Time' }) => {
  if (Platform.OS === 'web') {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          boxSizing: 'border-box' as const,
        }}
      />
    );
  }

  // Fallback for native (simple text input)
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#999"
    />
  );
};

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
  const [selectedReportingTag, setSelectedReportingTag] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);

  const [showOfficePicker, setShowOfficePicker] = useState<boolean>(false);

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
  const reportingTags = useMemo(() =>
    tags.filter(tag => selectedTags.includes(tag.tag_id)),
    [tags, selectedTags]
  );

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

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setShowOfficePicker(false);
  }, [currentStep]);

  // ==================== DATA FETCHING ====================
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchOffices(), fetchTags()]);
    } catch (error) {
      alert('Error', 'Failed to load initial data');
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
      alert('Error', error.message || 'Failed to fetch offices');
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
      alert('Error', error.message || 'Failed to fetch tags');
    }
  };

  // ==================== HANDLERS ====================
  const handleBasicInfoChange = useCallback((field: keyof BasicInfoData, value: string) => {
    setBasicInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

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

  const selectReportingTag = useCallback((tagId: string) => {
    setSelectedReportingTag(tagId);
  }, []);

  const pickFromGallery = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    alert('Permission', 'Gallery access is required');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (!result.canceled && result.assets) {
    const newDocs: Document[] = result.assets.map(asset => ({
      uri: asset.uri,
      name: asset.fileName || `image_${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
    }));
    setDocuments(prev => [...prev, ...newDocs]);
  }
};
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
    alert('Error', 'Failed to pick documents');
  }
};

const showPickerOptions = () => {
  alert('Upload Document', 'Choose source', [
    { text: 'Gallery', onPress: pickFromGallery },
    { text: 'Files', onPress: pickDocuments },
    { text: 'Cancel', style: 'cancel' },
  ]);
};

  const removeDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ==================== VALIDATION ====================
  const validateStep1 = (): StepValidationResult => {
    const requiredFields: (keyof BasicInfoData)[] = ['employee_id', 'first_name'];
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
    if (!selectedReportingTag) {
      return {
        isValid: false,
        errorMessage: 'Please select a reporting tag',
      };
    }
    return { isValid: true };
  };

  const handleNext = () => {
    setShowOfficePicker(false);

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
      alert('Validation Error', validationResult.errorMessage);
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setShowOfficePicker(false);
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack();
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
            formData.append(key, String(parseInt(value) || 0));
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
      if (selectedReportingTag) {
        formData.append('reporting_tag_ids', selectedReportingTag);
      }

      // Add documents - IMPROVED FOR WEB AND MOBILE
      if (documents.length > 0) {
        for (let index = 0; index < documents.length; index++) {
          const doc = documents[index];
          const fieldName = getDocumentFieldName(doc.name || `document_${index}`);

          try {
            if (Platform.OS === 'web') {
              // For web, fetch the blob and create a File object
              const response = await fetch(doc.uri);
              
              if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText}`);
              }
              
              const blob = await response.blob();
              const file = new File([blob], doc.name || `document_${index}`, {
                type: doc.type || 'application/octet-stream'
              });
              
              formData.append(fieldName, file);
              console.log(`Web file prepared: ${fieldName} - ${doc.name}`);
            } else {
              // For mobile (iOS/Android)
              formData.append(fieldName, {
                uri: doc.uri,
                name: doc.name || `document_${index}`,
                type: doc.type || 'application/octet-stream',
              } as any);
              console.log(`Mobile file prepared: ${fieldName} - ${doc.name}`);
            }
          } catch (error) {
            console.error('Error fetching file for web upload:', error);
            alert('Error', `Failed to prepare file ${doc.name} for upload`);
            setSubmitting(false);

            return;
          }
        }
      }

      // Add joining date
      formData.append('joining_date', new Date().toISOString().split('T')[0]);

      console.log('Submitting employee data...');

      // API call
      const response = await fetch(`${BACKEND_URL}/manager/addEmployee`, {
        method: 'POST',
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      // CRITICAL: Check response status FIRST before parsing JSON
      if (!response.ok) {
        // Parse error response
        const text = await response.text();
          let errorMessage = 'Failed to create employee. Please try again.';
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // Server returned HTML (500 page), use generic message
            console.error('Server HTML error:', text.substring(0, 200));
          }
          alert('Error', errorMessage);
          return;
      }

      // Only parse success response if response.ok is true
      const data = await response.json();
      console.log('Success response:', data);

      // Success case - show alert with OK button and navigation callback
      alert(
        'Success',
        'Employee created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onEmployeeAdded(); // Callback to refresh employee list
              onBack(); // Navigate back to previous screen
            },
          },
        ]
      );

    } catch (error: any) {
      console.error('Error creating employee:', error);
      alert('Error', error.message || 'Failed to create employee');

    } finally {
      setSubmitting(false);
    }
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 0 : 0 }}
        style={{ flex: 1 }}
      >
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

          {/* Designation Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Designation</Text>
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

          {/* Work Timing Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>Work Timing (Optional)</Text>
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Login Time</Text>
                <TimeInputField
                  value={basicInfo.login_time}
                  onChange={(time) => handleBasicInfoChange('login_time', time)}
                  placeholder="HH:MM"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Logout Time</Text>
                <TimeInputField
                  value={basicInfo.logout_time}
                  onChange={(time) => handleBasicInfoChange('logout_time', time)}
                  placeholder="HH:MM"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12, marginTop: 20 }]}>Leave Allocation</Text>
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Earned Leaves</Text>
                <TextInput
                  style={styles.input}
                  value={basicInfo.earned_leaves}
                  onChangeText={value => handleBasicInfoChange('earned_leaves', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginHorizontal: 8 }]}>
                <Text style={styles.label}>Sick Leaves</Text>
                <TextInput
                  style={styles.input}
                  value={basicInfo.sick_leaves}
                  onChangeText={value => handleBasicInfoChange('sick_leaves', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>

      <View style={[styles.section, { marginTop: 10, zIndex: 10, position: 'relative' }]}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Office Assignment *
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
        ) : (
          <View style={[styles.formGroup, { marginBottom: 20 }]}>
            <TouchableOpacity
                style={[
                  styles.input,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12
                  }
                ]}
                onPress={() => setShowOfficePicker(!showOfficePicker)}
              >
              <Text style={addressInfo.office_id ? {} : { color: '#999' }}>
                {addressInfo.office_id
                  ? selectedOffice?.name || 'Select Office'
                  : 'Select Office'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {showOfficePicker && (
              <View style={styles.officePickerContainer}>
                <ScrollView>
                  {offices.map(office => (
                    <TouchableOpacity
                      key={office.id}
                      style={[
                        styles.officeOption,
                        addressInfo.office_id === office.id && styles.officeOptionSelected
                      ]}
                      onPress={() => {
                        setAddressInfo(prev => ({ ...prev, office_id: office.id }));
                        setShowOfficePicker(false);
                      }}
                    >
                      <View style={[
                        styles.officeIconContainer,
                        addressInfo.office_id === office.id && styles.officeIconSelected
                      ]}>
                        <Ionicons
                          name="business"
                          size={20}
                          color={addressInfo.office_id === office.id ? '#fff' : '#666'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.officeName,
                          addressInfo.office_id === office.id && styles.officeNameSelected
                        ]}>
                          {office.name}
                        </Text>
                        <Text style={styles.officeLocation}>
                          {office.city}, {office.state}
                        </Text>
                      </View>
                      {addressInfo.office_id === office.id && (
                        <Ionicons name="checkmark-circle" size={24} color={WHATSAPP_COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.officePickerCloseButton}
                  onPress={() => setShowOfficePicker(false)}
                >
                  <Text style={styles.officePickerCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
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


    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
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
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Assign Reporting Tag *
        </Text>
        <Text style={styles.sectionSubtitle}>
          Select one tag this employee should report to
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
                  selectedReportingTag === tag.tag_id && styles.tagItemSelected,
                ]}
                onPress={() => selectReportingTag(tag.tag_id)}
              >
                <Text style={[
                  styles.tagText,
                  selectedReportingTag === tag.tag_id && styles.tagTextSelected,
                ]}>
                  {tag.tag_name}
                </Text>
                {tag.tag_type && (
                  <Text style={styles.tagType}>{tag.tag_type}</Text>
                )}
                {selectedReportingTag === tag.tag_id && (
                  <Ionicons name="checkmark" size={16} color="#fff" style={styles.tagCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Upload Documents (Optional)
        </Text>
        <Text style={styles.sectionSubtitle}>
          Upload required documents (Aadhar, PAN, Educational, etc.)
        </Text>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={showPickerOptions}
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

          <ReviewSection label="Office:" value={selectedOffice?.name || 'Not selected'} />

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
            value={
              selectedReportingTag
                ? tags.find(t => t.tag_id === selectedReportingTag)?.tag_name || selectedReportingTag
                : 'Not selected'
            }
          />

          <ReviewSection label="Documents:" value={`${documents.length} file(s)`} />
        </View>
      </View>
    </ScrollView>
  );

  // ==================== HELPER COMPONENT ====================
  const ReviewSection: React.FC<{
    label: string;
    value?: string;
    customContent?: React.ReactNode;
  }> = ({ label, value, customContent }) => (
    <View style={styles.reviewSection}>
      <Text style={styles.reviewLabel}>{label}</Text>
      {customContent ? customContent : (
        <Text style={styles.reviewValue}>{value}</Text>
      )}
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Header
          title="Add New Employee"
          subtitle={`Step ${currentStep} of 5`}
          onBack={handlePrevious}
        />

        <View style={styles.stepProgress}>
          {renderStepIndicator()}
        </View>

        <View style={styles.content}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddEmployeeScreen;