// hr_employee_management/AddEmployeeScreen.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { Header } from './header';
import { BACKEND_URL } from '../../config/config';
import * as ImagePicker from 'expo-image-picker';
import alert from '../../utils/Alert';
import DateTimePicker from '@react-native-community/datetimepicker';

// ==================== DESIGNATION OPTIONS ====================
interface DesignationOption {
  value: string;
  label: string;
  subtitle?: string;
}

const DESIGNATION_OPTIONS: DesignationOption[] = [
  { value: 'BDT',              label: 'BDT',              subtitle: 'Transaction Team' },
  { value: 'BD Manager',       label: 'BD Manager' },
  { value: 'BUP',              label: 'BUP' },
  { value: 'Database Manager', label: 'Database Manager' },
  { value: 'Scouting Team',    label: 'Scouting Team' },
  { value: 'Driver',           label: 'Driver' },
  { value: 'Driver Manager',   label: 'Driver Manager' },
  { value: 'HouseKeeping',     label: 'HouseKeeping' },
  { value: 'HR',               label: 'HR' },
  { value: 'Finance',          label: 'Finance' },
  { value: 'Content Manager',  label: 'Content Manager' },
  { value: 'Admin',            label: 'Admin' },
  { value: 'Other',            label: 'Other',            subtitle: 'Specify below' },
];

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
  other_designation: string;
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

const TimeInputField: React.FC<TimeInputProps> = ({
  value,
  onChange,
  placeholder = 'Select Time',
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const parseTimeToDate = (timeStr: string): Date => {
    const now = new Date();
    if (timeStr && timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      now.setHours(hours, minutes, 0, 0);
    }
    return now;
  };

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

  const handlePress = () => setShowPicker(true);

  const handleChange = (_event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16, color: value ? '#000' : '#999' }}>
          {value || placeholder}
        </Text>
        <Ionicons name="time-outline" size={20} color="#666" />
      </TouchableOpacity>

      {showPicker && (
        <>
          {Platform.OS === 'ios' ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#ddd',
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
              <DateTimePicker
                mode="time"
                display="spinner"
                value={parseTimeToDate(value)}
                onChange={handleChange}
                textColor="#000"
              />
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={{
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: '#eee',
                }}
              >
                <Text style={{ color: WHATSAPP_COLORS.primary, fontSize: 16, fontWeight: '600' }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <DateTimePicker
              mode="time"
              display="default"
              value={parseTimeToDate(value)}
              onChange={handleChange}
              is24Hour={true}
            />
          )}
        </>
      )}
    </>
  );
};

// ==================== OFFICE PICKER MODAL ====================
interface OfficePickerModalProps {
  visible: boolean;
  offices: Office[];
  selectedOfficeId: string;
  onSelect: (officeId: string) => void;
  onClose: () => void;
}

const OfficePickerModal: React.FC<OfficePickerModalProps> = ({
  visible,
  offices,
  selectedOfficeId,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '75%',
          paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        }}
        onPress={() => {}}
      >
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: '#D1D1D6',
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: 10,
            marginBottom: 4,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E' }}>
            Select Office
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={26} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={offices}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          renderItem={({ item: office }) => {
            const isSelected = selectedOfficeId === office.id;
            return (
              <TouchableOpacity
                onPress={() => { onSelect(office.id); onClose(); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F2F2F7',
                  backgroundColor: isSelected ? '#F0FAF7' : '#fff',
                }}
                activeOpacity={0.6}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isSelected ? WHATSAPP_COLORS.primary : '#F2F2F7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons name="business" size={20} color={isSelected ? '#fff' : '#666'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? WHATSAPP_COLORS.primary : '#1C1C1E',
                    }}
                    numberOfLines={1}
                  >
                    {office.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }} numberOfLines={1}>
                    {office.city}, {office.state}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={WHATSAPP_COLORS.primary} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 15, color: '#8E8E93' }}>No offices available</Text>
            </View>
          }
        />
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

// ==================== DESIGNATION PICKER MODAL ====================
interface DesignationPickerModalProps {
  visible: boolean;
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const DesignationPickerModal: React.FC<DesignationPickerModalProps> = ({
  visible,
  selectedValue,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
          paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        }}
        onPress={() => {}}
      >
        {/* Handle bar */}
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: '#D1D1D6',
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: 10,
            marginBottom: 4,
          }}
        />

        {/* Title row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E' }}>
            Select Designation
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={26} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Designation list */}
        <FlatList
          data={DESIGNATION_OPTIONS}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          renderItem={({ item }) => {
            const isSelected = selectedValue === item.value;
            const isOther = item.value === 'Other';
            return (
              <TouchableOpacity
                onPress={() => { onSelect(item.value); onClose(); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F2F2F7',
                  backgroundColor: isSelected ? '#F0FAF7' : '#fff',
                }}
                activeOpacity={0.6}
              >
                {/* Icon circle */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isSelected
                      ? WHATSAPP_COLORS.primary
                      : isOther
                      ? '#FFF3E0'
                      : '#F2F2F7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons
                    name={
                      isOther
                        ? 'create-outline'
                        : isSelected
                        ? 'person'
                        : 'person-outline'
                    }
                    size={20}
                    color={
                      isSelected
                        ? '#fff'
                        : isOther
                        ? '#FF9800'
                        : '#666'
                    }
                  />
                </View>

                {/* Label + subtitle */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected
                        ? WHATSAPP_COLORS.primary
                        : isOther
                        ? '#FF9800'
                        : '#1C1C1E',
                    }}
                  >
                    {item.label}
                  </Text>
                  {item.subtitle ? (
                    <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>

                {/* Checkmark */}
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={WHATSAPP_COLORS.primary}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
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
  const [selectedReportingTag, setSelectedReportingTag] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showOfficePicker, setShowOfficePicker] = useState<boolean>(false);
  const [showDesignationPicker, setShowDesignationPicker] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);

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
    other_designation: '',
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
  const reportingTags = useMemo(
    () => tags.filter((tag) => selectedTags.includes(tag.tag_id)),
    [tags, selectedTags]
  );
  const selectedOffice = useMemo(
    () => offices.find((office) => office.id === addressInfo.office_id),
    [offices, addressInfo.office_id]
  );
  const selectedTagNames = useMemo(
    () =>
      selectedTags.map(
        (tagId) => tags.find((t) => t.tag_id === tagId)?.tag_name || tagId
      ),
    [selectedTags, tags]
  );

  // Derived: the designation label to display in the picker button
  const designationLabel = useMemo(() => {
    if (!basicInfo.designation) return '';
    const opt = DESIGNATION_OPTIONS.find((d) => d.value === basicInfo.designation);
    return opt ? opt.label : basicInfo.designation;
  }, [basicInfo.designation]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    setShowOfficePicker(false);
    setShowDesignationPicker(false);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
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
  const handleBasicInfoChange = useCallback(
    (field: keyof BasicInfoData, value: string) => {
      setBasicInfo((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleDesignationSelect = useCallback((value: string) => {
    setBasicInfo((prev) => ({
      ...prev,
      designation: value,
      // Clear other_designation when switching away from Other
      other_designation: value !== 'Other' ? '' : prev.other_designation,
    }));
  }, []);

  const handleAddressChange = useCallback(
    (
      addressType: 'home_address' | 'current_address',
      field: keyof AddressData,
      value: string
    ) => {
      setAddressInfo((prev) => ({
        ...prev,
        [addressType]: { ...prev[addressType], [field]: value },
      }));
    },
    []
  );

  const copyHomeToCurrentAddress = useCallback(() => {
    setAddressInfo((prev) => ({
      ...prev,
      current_address: { ...prev.home_address },
    }));
  }, []);

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
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
      const newDocs: Document[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      }));
      setDocuments((prev) => [...prev, ...newDocs]);
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
      if (!result.canceled && result.assets) {
        const newDocuments: Document[] = result.assets.map((doc) => ({
          uri: doc.uri,
          name: doc.name || 'Document',
          type: doc.mimeType || 'application/octet-stream',
          size: doc.size,
        }));
        setDocuments((prev) => [...prev, ...newDocuments]);
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
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ==================== VALIDATION ====================
  const validateStep1 = (): StepValidationResult => {
    const requiredFields: (keyof BasicInfoData)[] = ['employee_id', 'first_name'];
    const missingFields = requiredFields.filter((field) => !basicInfo[field]);
    if (missingFields.length > 0) {
      return {
        isValid: false,
        errorMessage: `Please fill in: ${missingFields.join(', ').replace(/_/g, ' ')}`,
      };
    }
    if (!basicInfo.email && !basicInfo.phone_number) {
      return { isValid: false, errorMessage: 'Please provide either email or phone number' };
    }
    if (basicInfo.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(basicInfo.email)) {
        return { isValid: false, errorMessage: 'Please enter a valid email address' };
      }
    }
    if (basicInfo.phone_number && basicInfo.phone_number.length < 10) {
      return {
        isValid: false,
        errorMessage: 'Please enter a valid phone number (minimum 10 digits)',
      };
    }
    // If designation is "Other", require other_designation
    if (basicInfo.designation === 'Other' && !basicInfo.other_designation.trim()) {
      return {
        isValid: false,
        errorMessage: 'Please specify the designation in the "Other Designation" field',
      };
    }
    return { isValid: true };
  };

  const validateStep2 = (): StepValidationResult => {
    const home = addressInfo.home_address;
    const requiredFields: (keyof AddressData)[] = ['address', 'street', 'pin_code', 'city', 'state'];
    const missingFields = requiredFields.filter((field) => !home[field]);
    if (missingFields.length > 0) {
      return {
        isValid: false,
        errorMessage: `Please fill in home address: ${missingFields.join(', ')}`,
      };
    }
    if (!addressInfo.office_id) {
      return { isValid: false, errorMessage: 'Please select an office for the employee' };
    }
    return { isValid: true };
  };

  const validateStep3 = (): StepValidationResult => {
    if (selectedTags.length === 0) {
      return { isValid: false, errorMessage: 'Please select at least one tag for the employee' };
    }
    return { isValid: true };
  };

  const validateStep4 = (): StepValidationResult => {
    if (!selectedReportingTag) {
      return { isValid: false, errorMessage: 'Please select a reporting tag' };
    }
    return { isValid: true };
  };

  const handleNext = () => {
    Keyboard.dismiss();
    setShowOfficePicker(false);
    setShowDesignationPicker(false);
    let validationResult: StepValidationResult = { isValid: true };
    switch (currentStep) {
      case 1: validationResult = validateStep1(); break;
      case 2: validationResult = validateStep2(); break;
      case 3: validationResult = validateStep3(); break;
      case 4: validationResult = validateStep4(); break;
    }
    if (!validationResult.isValid) {
      alert('Validation Error', validationResult.errorMessage);
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    Keyboard.dismiss();
    setShowOfficePicker(false);
    setShowDesignationPicker(false);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  // ==================== UTILITY FUNCTIONS ====================
  const getDocumentFieldName = (fileName: string): string => {
    const lowerName = fileName.toLowerCase();
    const documentMappings: { [key: string]: string } = {
      aadhaar: 'aadhar_card',
      aadhar: 'aadhar_card',
      pan: 'pan_card',
      education: 'educational_documents',
      offer: 'offer_letter',
      appointment: 'appointment_letter',
      relieving: 'relieving_letter',
      experience: 'experience_letter',
      bank: 'bank_statement',
      form16: 'form_16',
      form_16: 'form_16',
      passport: 'passport',
      epfo: 'epfo_number',
      uan: 'epfo_number',
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

      Object.entries(basicInfo).forEach(([key, value]) => {
        if (key === 'other_designation') {
          // Only send other_designation when designation is "Other"
          if (basicInfo.designation === 'Other' && value) {
            formData.append(key, value);
          }
          return;
        }
        if (value) {
          if (key.includes('leaves')) {
            formData.append(key, String(parseInt(value) || 0));
          } else {
            formData.append(key, value);
          }
        }
      });

      const homeAddressData = {
        address: addressInfo.home_address.address || '',
        street: addressInfo.home_address.street || '',
        city: addressInfo.home_address.city || '',
        state: addressInfo.home_address.state || '',
        country: addressInfo.home_address.country || 'India',
        pin_code: addressInfo.home_address.pin_code || '',
      };
      formData.append('home_address', JSON.stringify(homeAddressData));

      const hasCurrentAddress = Object.values(addressInfo.current_address).some(
        (val) => val && val !== ''
      );
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

      formData.append('office_id', addressInfo.office_id);
      selectedTags.forEach((tagId) => formData.append('tag_ids', tagId));
      if (selectedReportingTag) {
        formData.append('reporting_tag_ids', selectedReportingTag);
      }

      if (documents.length > 0) {
        for (let index = 0; index < documents.length; index++) {
          const doc = documents[index];
          const fieldName = getDocumentFieldName(doc.name || `document_${index}`);
          try {
            if (Platform.OS === 'web') {
              const response = await fetch(doc.uri);
              if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
              const blob = await response.blob();
              const file = new File([blob], doc.name || `document_${index}`, {
                type: doc.type || 'application/octet-stream',
              });
              formData.append(fieldName, file);
            } else {
              formData.append(fieldName, {
                uri: doc.uri,
                name: doc.name || `document_${index}`,
                type: doc.type || 'application/octet-stream',
              } as any);
            }
          } catch (error) {
            console.error('Error fetching file for web upload:', error);
            alert('Error', `Failed to prepare file ${doc.name} for upload`);
            setSubmitting(false);
            return;
          }
        }
      }

      formData.append('joining_date', new Date().toISOString().split('T')[0]);

      const response = await fetch(`${BACKEND_URL}/manager/addEmployee`, {
        method: 'POST',
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Failed to create employee. Please try again.';
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          console.error('Server HTML error:', text.substring(0, 200));
        }
        alert('Error', errorMessage);
        return;
      }

      const data = await response.json();
      console.log('Success response:', data);
      alert('Success', 'Employee created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onEmployeeAdded();
            onBack();
          },
        },
      ]);
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
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepIndicator,
                currentStep >= step ? styles.stepIndicatorActive : styles.stepIndicatorInactive,
              ]}
            >
              <Text
                style={[
                  styles.stepIndicatorText,
                  currentStep >= step ? styles.stepIndicatorTextActive : styles.stepIndicatorTextInactive,
                ]}
              >
                {step}
              </Text>
            </View>
            {step < 5 && (
              <View
                style={[
                  styles.stepConnector,
                  currentStep > step ? styles.stepConnectorActive : styles.stepConnectorInactive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.stepLabelsContainer}>
        {['Basic Info', 'Address', 'Tags', 'Reporting', 'Documents'].map((label, i) => (
          <Text
            key={label}
            style={[styles.stepLabel, currentStep === i + 1 && styles.stepLabelActive]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );

  const renderFooterButtons = () => (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 16,
        gap: 10,
        backgroundColor: '#FFFFFF',
        marginTop: -10,
      }}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          height: 52,
          borderRadius: 12,
          backgroundColor: '#D1D1D6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={handlePrevious}
        disabled={submitting}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#3A3A3C' }}>
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          flex: 1,
          height: 52,
          borderRadius: 12,
          backgroundColor: submitting ? '#7FB5A8' : WHATSAPP_COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={currentStep === 5 ? handleSubmit : handleNext}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
            {currentStep === 5 ? 'Create Employee' : 'Next'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // ==================== STEP RENDERERS ====================
  const renderStep1 = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ paddingBottom: 0, backgroundColor: '#FFFFFF' }}
    >
      {/* Designation picker modal — rendered at this level so it overlays everything */}
      <DesignationPickerModal
        visible={showDesignationPicker}
        selectedValue={basicInfo.designation}
        onSelect={handleDesignationSelect}
        onClose={() => setShowDesignationPicker(false)}
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Basic Information
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Employee ID *</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.employee_id}
            onChangeText={(v) => handleBasicInfoChange('employee_id', v)}
            placeholder="Enter employee ID"
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.first_name}
              onChangeText={(v) => handleBasicInfoChange('first_name', v)}
              placeholder="First name"
              returnKeyType="next"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.last_name}
              onChangeText={(v) => handleBasicInfoChange('last_name', v)}
              placeholder="Last name"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* ── Designation Picker ── */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Designation</Text>
          <TouchableOpacity
            style={[
              styles.input,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
              },
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setShowDesignationPicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 16,
                color: basicInfo.designation ? '#000' : '#999',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {designationLabel || 'Select designation'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Inline chip showing selected designation (optional UX reinforcement) */}
          {basicInfo.designation && basicInfo.designation !== 'Other' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 6,
                backgroundColor: '#F0FAF7',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                alignSelf: 'flex-start',
              }}
            >
              <Ionicons name="person-circle-outline" size={14} color={WHATSAPP_COLORS.primary} />
              <Text style={{ fontSize: 12, color: WHATSAPP_COLORS.primary, marginLeft: 4, fontWeight: '500' }}>
                {designationLabel}
              </Text>
              <TouchableOpacity
                onPress={() => handleDesignationSelect('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="close-circle" size={14} color={WHATSAPP_COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Other Designation text input — only shown when "Other" is selected ── */}
        {basicInfo.designation === 'Other' && (
          <View style={[styles.formGroup, { marginTop: -4 }]}>
            <Text style={styles.label}>
              Other Designation *{' '}
              <Text style={{ fontSize: 12, color: '#8E8E93', fontWeight: '400' }}>
                (please specify)
              </Text>
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: '#FF9800',
                    borderWidth: 1.5,
                    paddingRight: 40,
                  },
                ]}
                value={basicInfo.other_designation}
                onChangeText={(v) => handleBasicInfoChange('other_designation', v)}
                placeholder="e.g., Project Manager, Legal Advisor…"
                autoFocus
                returnKeyType="next"
              />
              <View
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="create-outline" size={18} color="#FF9800" />
              </View>
            </View>
            <Text style={[styles.helperText, { color: '#FF9800' }]}>
              This field is required when designation is "Other"
            </Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.email}
            onChangeText={(v) => handleBasicInfoChange('email', v)}
            placeholder="employee@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <Text style={styles.helperText}>Either email or phone is required</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.phone_number}
            onChangeText={(v) => handleBasicInfoChange('phone_number', v)}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          <Text style={styles.helperText}>Either email or phone is required</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Default Password</Text>
          <TextInput
            style={styles.input}
            value={basicInfo.employee_password}
            onChangeText={(v) => handleBasicInfoChange('employee_password', v)}
            placeholder="Enter password"
            secureTextEntry
            returnKeyType="done"
          />
          <Text style={styles.helperText}>Default: Citadel2025@</Text>
        </View>

        {/* Work Timing */}
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12, marginTop: 12 }]}>
          Work Timing (Optional)
        </Text>
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Login Time</Text>
            <TimeInputField
              value={basicInfo.login_time}
              onChange={(time) => handleBasicInfoChange('login_time', time)}
              placeholder="Select time"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Logout Time</Text>
            <TimeInputField
              value={basicInfo.logout_time}
              onChange={(time) => handleBasicInfoChange('logout_time', time)}
              placeholder="Select time"
            />
          </View>
        </View>

        {/* Leave Allocation */}
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12, marginTop: 12 }]}>
          Leave Allocation
        </Text>
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Earned Leaves</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.earned_leaves}
              onChangeText={(v) => handleBasicInfoChange('earned_leaves', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#999"
              returnKeyType="next"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginHorizontal: 8 }]}>
            <Text style={styles.label}>Sick Leaves</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.sick_leaves}
              onChangeText={(v) => handleBasicInfoChange('sick_leaves', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#999"
              returnKeyType="next"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Casual Leaves</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.casual_leaves}
              onChangeText={(v) => handleBasicInfoChange('casual_leaves', v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#999"
              returnKeyType="done"
            />
          </View>
        </View>
      </View>
      {renderFooterButtons()}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ paddingBottom: 16, backgroundColor: '#FFFFFF' }}
    >
      <OfficePickerModal
        visible={showOfficePicker}
        offices={offices}
        selectedOfficeId={addressInfo.office_id}
        onSelect={(id) => setAddressInfo((prev) => ({ ...prev, office_id: id }))}
        onClose={() => setShowOfficePicker(false)}
      />

      <View style={[styles.section, { marginTop: 10 }]}>
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
                  paddingVertical: 12,
                },
              ]}
              onPress={() => setShowOfficePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={addressInfo.office_id ? {} : { color: '#999' }}>
                {addressInfo.office_id ? selectedOffice?.name || 'Select Office' : 'Select Office'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
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
            onChangeText={(v) => handleAddressChange('home_address', 'address', v)}
            placeholder="Full address"
            multiline
            numberOfLines={3}
            returnKeyType="next"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Street</Text>
          <TextInput
            style={styles.input}
            value={addressInfo.home_address.street}
            onChangeText={(v) => handleAddressChange('home_address', 'street', v)}
            placeholder="Street name"
            returnKeyType="next"
          />
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.home_address.city}
              onChangeText={(v) => handleAddressChange('home_address', 'city', v)}
              placeholder="City"
              returnKeyType="next"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.home_address.state}
              onChangeText={(v) => handleAddressChange('home_address', 'state', v)}
              placeholder="State"
              returnKeyType="next"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Pin Code</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.home_address.pin_code}
              onChangeText={(v) => handleAddressChange('home_address', 'pin_code', v)}
              placeholder="Pin code"
              keyboardType="numeric"
              returnKeyType="next"
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
          <TouchableOpacity style={styles.copyButton} onPress={copyHomeToCurrentAddress}>
            <Ionicons name="copy-outline" size={16} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.copyButtonText}>Same as Home</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={addressInfo.current_address.address}
            onChangeText={(v) => handleAddressChange('current_address', 'address', v)}
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
            onChangeText={(v) => handleAddressChange('current_address', 'street', v)}
            placeholder="Street name"
            returnKeyType="next"
          />
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.current_address.city}
              onChangeText={(v) => handleAddressChange('current_address', 'city', v)}
              placeholder="City"
              returnKeyType="next"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.current_address.state}
              onChangeText={(v) => handleAddressChange('current_address', 'state', v)}
              placeholder="State"
              returnKeyType="next"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Pin Code</Text>
            <TextInput
              style={styles.input}
              value={addressInfo.current_address.pin_code}
              onChangeText={(v) => handleAddressChange('current_address', 'pin_code', v)}
              placeholder="Pin code"
              keyboardType="numeric"
              returnKeyType="done"
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
      {renderFooterButtons()}
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 16, backgroundColor: '#FFFFFF' }}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Assign Tags *
        </Text>
        <Text style={styles.sectionSubtitle}>Select one or more tags for the employee</Text>
        {tags.length === 0 ? (
          <Text style={styles.noDataText}>No tags available</Text>
        ) : (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag.tag_id}
                style={[styles.tagItem, selectedTags.includes(tag.tag_id) && styles.tagItemSelected]}
                onPress={() => toggleTagSelection(tag.tag_id)}
              >
                <Text style={[styles.tagText, selectedTags.includes(tag.tag_id) && styles.tagTextSelected]}>
                  {tag.tag_name}
                </Text>
                {tag.tag_type && <Text style={styles.tagType}>{tag.tag_type}</Text>}
                {selectedTags.includes(tag.tag_id) && (
                  <Ionicons name="checkmark" size={16} color="#fff" style={styles.tagCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {renderFooterButtons()}
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 16, backgroundColor: '#FFFFFF' }}
    >
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
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag.tag_id}
                style={[styles.tagItem, selectedReportingTag === tag.tag_id && styles.tagItemSelected]}
                onPress={() => selectReportingTag(tag.tag_id)}
              >
                <Text style={[styles.tagText, selectedReportingTag === tag.tag_id && styles.tagTextSelected]}>
                  {tag.tag_name}
                </Text>
                {tag.tag_type && <Text style={styles.tagType}>{tag.tag_type}</Text>}
                {selectedReportingTag === tag.tag_id && (
                  <Ionicons name="checkmark" size={16} color="#fff" style={styles.tagCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {renderFooterButtons()}
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 16, backgroundColor: '#FFFFFF' }}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitleAlt, { fontSize: 20, marginBottom: 12 }]}>
          Upload Documents (Optional)
        </Text>
        <Text style={styles.sectionSubtitle}>
          Upload required documents (Aadhar, PAN, Educational, etc.)
        </Text>
        <TouchableOpacity style={styles.uploadButton} onPress={showPickerOptions} disabled={submitting}>
          <Ionicons name="cloud-upload-outline" size={24} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.uploadButtonText}>Browse Documents</Text>
          <Text style={styles.uploadButtonSubtext}>PDF, DOC, JPG, PNG supported</Text>
        </TouchableOpacity>

        {documents.length > 0 && (
          <View style={styles.uploadedDocuments}>
            <Text style={styles.uploadedDocumentsTitle}>
              Selected Documents ({documents.length})
            </Text>
            {documents.map((doc, index) => (
              <View key={index} style={styles.documentItem}>
                <View style={styles.documentIcon}>
                  <Ionicons name={getDocumentIcon(doc.type)} size={20} color={WHATSAPP_COLORS.primary} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.documentSize}>{formatFileSize(doc.size || 0)}</Text>
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
          <ReviewSection
            label="Designation:"
            value={
              basicInfo.designation === 'Other'
                ? `Other — ${basicInfo.other_designation || 'not specified'}`
                : designationLabel || 'Not specified'
            }
          />
          <ReviewSection
            label="Contact:"
            value={basicInfo.email || basicInfo.phone_number || 'Not provided'}
          />
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
                ? tags.find((t) => t.tag_id === selectedReportingTag)?.tag_name || selectedReportingTag
                : 'Not selected'
            }
          />
          <ReviewSection label="Documents:" value={`${documents.length} file(s)`} />
        </View>
      </View>
      {renderFooterButtons()}
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
      {customContent ? customContent : <Text style={styles.reviewValue}>{value}</Text>}
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : StatusBar.currentHeight ?? 0}
    >
      <View style={styles.container}>
        {!keyboardVisible && (
          <Header
            title="Add New Employee"
            subtitle={`Step ${currentStep} of 5`}
            onBack={handlePrevious}
          />
        )}
        {keyboardVisible && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: (StatusBar.currentHeight ?? 0) + (Platform.OS === 'ios' ? 44 : 8),
              paddingBottom: 8,
              backgroundColor: '#fff',
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
            }}
          >
            <TouchableOpacity onPress={handlePrevious} style={{ marginRight: 12 }}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', flex: 1 }}>
              Add New Employee
            </Text>
            <Text style={{ fontSize: 13, color: '#666' }}>Step {currentStep} of 5</Text>
          </View>
        )}

        {renderStepIndicator()}

        <View style={{ flex: 1 }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddEmployeeScreen;