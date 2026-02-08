import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../config/config';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

interface AddressData {
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

interface UserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  bio?: string;
  profile_picture?: string;
  designation?: string;
  role?: string;
  employee_id?: string;
  home_address?: AddressData;
  current_location?: AddressData;
  birth_date?: string;
}

interface Asset {
  name?: string;
  type?: string;
  serial_number?: string;
}

interface Payslip {
  month?: string;
  year?: string;
  net_salary?: string;
}

interface Document {
  document_name?: string;
  document_type?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  bio: string;
  phoneNumber: string;
  dateOfBirth: string;
  homeAddress: {
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  currentLocation: {
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
}

interface ModalContent {
  title?: string;
  type?: string;
  content?: any;
}

interface ProfileProps {
  onBack: () => void;
  userData?: UserData;
  onProfileUpdate?: (updatedData: UserData) => void;
  initialModalToOpen?: string | null; // Modal to open on mount (assets/payslips/documents)
}

interface MenuItemProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  type?: 'default' | 'danger';
  isStatic?: boolean;
}

// Separate component for empty state
const EmptyState: React.FC<{ icon: string; message: string; color: string }> = ({
  icon,
  message,
  color
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.emptyStateContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Ionicons name={icon as any} size={64} color={color} />
      <Text style={[styles.emptyStateText, { color }]}>{message}</Text>
    </Animated.View>
  );
};

interface AddressInputsProps {
  type: 'home' | 'current';
  title: string;
  addressData: {
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  onChange: (type: 'home' | 'current', field: string, value: string) => void;
}

const AddressInputs: React.FC<AddressInputsProps> = React.memo(({
  type,
  title,
  addressData,
  onChange
}) => {
  console.log(`${type} address:`, addressData);

  return (
    <View style={styles.addressSection}>
      <Text style={[styles.addressTitle, { color: '#000000' }]}>{title}</Text>

      <View style={[styles.inputContainer, { borderBottomColor: '#E9EDEF' }]}>
        <Text style={[styles.inputLabel, { color: '#667781' }]}>Address</Text>
        <TextInput
          style={[styles.input, { color: '#000000' }]}
          value={addressData.address}
          onChangeText={(text) => onChange(type, 'address', text)}
          placeholder="Street address"
          placeholderTextColor="#8696A0"
          multiline
        />
      </View>

      <View style={[styles.inputContainer, { borderBottomColor: '#E9EDEF' }]}>
        <Text style={[styles.inputLabel, { color: '#667781' }]}>City</Text>
        <TextInput
          style={[styles.input, { color: '#000000' }]}
          value={addressData.city}
          onChangeText={(text) => onChange(type, 'city', text)}
          placeholder="City"
          placeholderTextColor="#8696A0"
        />
      </View>

      <View style={[styles.inputContainer, { borderBottomColor: '#E9EDEF' }]}>
        <Text style={[styles.inputLabel, { color: '#667781' }]}>State</Text>
        <TextInput
          style={[styles.input, { color: '#000000' }]}
          value={addressData.state}
          onChangeText={(text) => onChange(type, 'state', text)}
          placeholder="State/Province"
          placeholderTextColor="#8696A0"
        />
      </View>

      <View style={[styles.inputContainer, { borderBottomColor: '#E9EDEF' }]}>
        <Text style={[styles.inputLabel, { color: '#667781' }]}>Country</Text>
        <TextInput
          style={[styles.input, { color: '#000000' }]}
          value={addressData.country}
          onChangeText={(text) => onChange(type, 'country', text)}
          placeholder="Country"
          placeholderTextColor="#8696A0"
        />
      </View>
    </View>
  );
});

interface EditProfileSectionProps {
  formData: FormData;
  onFormChange: (field: keyof FormData, value: any) => void;
  onAddressChange: (type: 'home' | 'current', field: string, value: string) => void;
  showDatePickerModal: () => void;
  handleDateChange: (event: any, date?: Date) => void;
  selectedDate: Date;
  showDatePicker: boolean;
  formatDisplayDate: (dateString: string) => string;
  firstNameInputRef: React.RefObject<TextInput | null>;
  lastNameInputRef: React.RefObject<TextInput | null>;
  handleSave: () => void;
  saving: boolean;
  setIsEditing: (value: boolean) => void;
  userData: UserData | null;
  populateFormData: (user: UserData) => void;
}

const EditProfileSection: React.FC<EditProfileSectionProps> = React.memo(({
  formData,
  onFormChange,
  onAddressChange,
  showDatePickerModal,
  handleDateChange,
  selectedDate,
  showDatePicker,
  formatDisplayDate,
  firstNameInputRef,
  lastNameInputRef,
  handleSave,
  saving,
  setIsEditing,
  userData,
  populateFormData
}) => {
  const colors = {
    background: '#e7e6e5',
    headerBackground: '#008069',
    text: '#000000',
    textSecondary: '#667781',
    textTertiary: '#8696A0',
    border: '#E9EDEF',
    borderLight: '#F0F2F5',
    icon: '#8696A0',
    iconActive: '#008069',
    danger: '#FF3B30',
    modalBackground: '#e7e6e5',
    emptyState: '#8696A0',
  };

  return (
    <View style={[styles.editSection, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Profile</Text>

      <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>First name</Text>
        <TextInput
          ref={firstNameInputRef}
          style={[styles.input, { color: colors.text }]}
          value={formData.firstName}
          onChangeText={(text) => onFormChange('firstName', text)}
          placeholder="Enter first name"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="next"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      </View>

      <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Last name</Text>
        <TextInput
          ref={lastNameInputRef}
          style={[styles.input, { color: colors.text }]}
          value={formData.lastName}
          onChangeText={(text) => onFormChange('lastName', text)}
          placeholder="Enter last name"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      </View>

      {/* Phone number field - Read Only */}
      <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone number</Text>
        <TextInput
          style={[styles.input, { color: colors.textTertiary }]}
          value={formData.phoneNumber}
          editable={false}
          placeholder="Phone number (not editable)"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={[styles.readOnlyNote, { color: colors.textTertiary }]}>
          Contact admin to change phone number
        </Text>
      </View>

      {/* Home Address section */}
      <AddressInputs
        type="home"
        title="Home Address"
        addressData={formData.homeAddress}
        onChange={onAddressChange}
      />

      {/* Current Address section */}
      <AddressInputs
        type="current"
        title="Current Address"
        addressData={formData.currentLocation}
        onChange={onAddressChange}
      />

      {/* Date of Birth field with dropdown */}
      <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date of Birth</Text>

        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={showDatePickerModal}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.datePickerText,
            { color: formData.dateOfBirth ? colors.text : colors.textTertiary }
          ]}>
            {formatDisplayDate(formData.dateOfBirth)}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={colors.icon} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            textColor={colors.text}
          />
        )}

        {formData.dateOfBirth && (
          <Text style={[styles.dateFormatNote, { color: colors.textTertiary }]}>
            Selected: {formData.dateOfBirth}
          </Text>
        )}
      </View>

      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: saving ? colors.textTertiary : colors.headerBackground }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => {
            Keyboard.dismiss();
            setIsEditing(false);
            if (userData) populateFormData(userData);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const Profile: React.FC<ProfileProps> = ({ onBack, userData: propUserData, onProfileUpdate, initialModalToOpen })=> {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(!propUserData);
  const [userData, setUserData] = useState<UserData | null>(propUserData || null);
  const [token, setToken] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent>({});
  const [downloading, setDownloading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDateSet, setIsDateSet] = useState(false);

  // Refs for keyboard handling
  const scrollViewRef = useRef<ScrollView>(null);
  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const bioInputRef = useRef<TextInput>(null);

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  );

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    bio: '',
    phoneNumber: '',
    dateOfBirth: '',
    homeAddress: {
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
    },
    currentLocation: {
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
    },
  });

  const [documents, setDocuments] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  // WhatsApp-like colors
  const colors = {
    background: '#e7e6e5',
    headerBackground: '#008069',
    text: '#000000',
    textSecondary: '#667781',
    textTertiary: '#8696A0',
    border: '#E9EDEF',
    borderLight: '#F0F2F5',
    icon: '#8696A0',
    iconActive: '#008069',
    danger: '#FF3B30',
    modalBackground: '#e7e6e5',
    emptyState: '#8696A0',
  };

  useEffect(() => {
    initializeData();
    return () => { };
  }, []);
  useEffect(() => {
    if (initialModalToOpen && !loading) {
      console.log(`📱 [PROFILE] Opening modal: ${initialModalToOpen}`);

      // Small delay to ensure data is loaded
      const timer = setTimeout(() => {
        switch (initialModalToOpen) {
          case 'assets':
            setModalContent({
              title: 'My Assets',
              type: 'assets',
              content: assets
            });
            setModalVisible(true);
            break;
          case 'payslips':
            setModalContent({
              title: 'Payslips',
              type: 'payslips',
              content: payslips
            });
            setModalVisible(true);
            break;
          case 'documents':
            setModalContent({
              title: 'My Documents',
              type: 'documents',
              content: documents
            });
            setModalVisible(true);
            break;
          default:
            console.warn(`Unknown modal type: ${initialModalToOpen}`);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [initialModalToOpen, loading, assets, payslips, documents]);
  // NEW: Function to refresh user data from backend
  const refreshUserData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token_2');
      if (!storedToken) return;

      const response = await fetch(`${BACKEND_URL}/core/getUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: storedToken }),
      });

      if (!response.ok) throw new Error('Failed to fetch user data');

      const data = await response.json();
      if (data.message === "Get modules successful" && data.user) {
        const updatedUser = data.user;
        setUserData(updatedUser);

        // Update AsyncStorage with fresh data
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));

        // Notify parent component (Dashboard) about the update
        if (onProfileUpdate) {
          onProfileUpdate(updatedUser);
        }

        // Also update the form data
        populateFormData(updatedUser);

        return updatedUser;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const initializeData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token_2');
      setToken(storedToken);

      if (propUserData) {
        populateFormData(propUserData);
        if (storedToken) fetchAdditionalData(storedToken);
      } else if (storedToken) {
        await fetchUserData(storedToken);
      }
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const populateFormData = useCallback((user: UserData) => {
    // Parse date of birth
    const dob = user.birth_date || '';
    if (dob) {
      const dateParts = dob.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          setSelectedDate(new Date(year, month, day));
          setIsDateSet(true);
        }
      }
    }

    // Parse home address
    const homeAddress = user.home_address || {};
    const currentLocation = user.current_location || {};

    console.log('Populating form with home address:', homeAddress);
    console.log('Populating form with current location:', currentLocation);

    setFormData({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      bio: user.bio || '',
      phoneNumber: user.phone_number || '',
      dateOfBirth: dob,
      homeAddress: {
        address: homeAddress.address || '',
        city: homeAddress.city || '',
        state: homeAddress.state || '',
        zip_code: homeAddress.zip_code || '',
        country: homeAddress.country || '',
      },
      currentLocation: {
        address: currentLocation.address || '',
        city: currentLocation.city || '',
        state: currentLocation.state || '',
        zip_code: currentLocation.zip_code || '',
        country: currentLocation.country || '',
      },
    });
  }, []);

  const fetchUserData = async (userToken: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/core/getUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: userToken }),
      });

      if (!response.ok) throw new Error('Failed to fetch user data');

      const data = await response.json();
      if (data.message === "Get modules successful") {
        setUserData(data.user);
        populateFormData(data.user);
        await fetchAdditionalData(userToken);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalData = async (userToken: string) => {
    try {
      const [docsRes, assetsRes, payslipsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/core/getDocuments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: userToken }),
        }),
        fetch(`${BACKEND_URL}/core/getAssets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: userToken }),
        }),
        fetch(`${BACKEND_URL}/core/getPayslips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: userToken }),
        }),
      ]);

      const docsData = docsRes.ok ? await docsRes.json() : null;
      const assetsData = assetsRes.ok ? await assetsRes.json() : null;
      const payslipsData = payslipsRes.ok ? await payslipsRes.json() : null;

      setDocuments(docsData?.documents || []);
      setAssets(assetsData?.assets || []);
      setPayslips(payslipsData?.payslips || []);
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  };

  const handleSave = async () => {
    if (!token) return;

    // Validate address fields
    if (!formData.homeAddress.address || !formData.homeAddress.city ||
      !formData.homeAddress.state || !formData.homeAddress.country) {
      Alert.alert('Validation Error', 'Please fill all home address fields (address, city, state, country)');
      return;
    }

    if (!formData.currentLocation.address || !formData.currentLocation.city ||
      !formData.currentLocation.state || !formData.currentLocation.country) {
      Alert.alert('Validation Error', 'Please fill all current address fields (address, city, state, country)');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${BACKEND_URL}/core/updateProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          date_of_birth: formData.dateOfBirth,
          home_address: {
            address: formData.homeAddress.address,
            city: formData.homeAddress.city,
            state: formData.homeAddress.state,
            zip_code: formData.homeAddress.zip_code,
            country: formData.homeAddress.country,
          },
          current_address: {
            address: formData.currentLocation.address,
            city: formData.currentLocation.city,
            state: formData.currentLocation.state,
            zip_code: formData.currentLocation.zip_code,
            country: formData.currentLocation.country,
          }
        }),
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);

        // NEW: Refresh user data from backend after successful update
        await refreshUserData();

      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      setIsDateSet(true);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      setFormData(prev => ({ ...prev, dateOfBirth: formattedDate }));
    }
  }, []);

  const showDatePickerModal = useCallback(() => {
    Keyboard.dismiss();
    setShowDatePicker(true);
  }, []);

  const formatDisplayDate = useCallback((dateString: string) => {
    if (!dateString) return 'Select Date';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Select Date';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const handleImageUpload = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => handleCameraLaunch()
        },
        {
          text: 'Choose from Gallery',
          onPress: () => handleGalleryLaunch()
        },
        {
          text: 'Cancel',
          style: 'cancel'
        },
      ],
      { cancelable: true }
    );
  };

  const handleCameraLaunch = async () => {
    try {
      // Request camera permissions
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

      if (cameraStatus !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleGalleryLaunch = async () => {
    try {
      // Request media library permissions
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (mediaLibraryStatus !== 'granted') {
        Alert.alert('Permission Required', 'Media library permission is required to select photos');
        return;
      }

      // Launch image library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    try {
      setUploadingImage(true);

      // Extract filename from URI
      const filename = imageUri.split('/').pop() || `profile_${Date.now()}.jpg`;

      // Determine file type
      let fileType = 'image/jpeg';
      if (filename.endsWith('.png')) fileType = 'image/png';
      if (filename.endsWith('.gif')) fileType = 'image/gif';

      // Create FormData
      const formDataImage = new FormData();
      formDataImage.append('token', token);
      formDataImage.append('profile_picture', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        type: fileType,
        name: filename,
      } as any);

      console.log('Uploading image to:', `${BACKEND_URL}/core/uploadProfilePicture`);

      // Upload image
      const uploadResponse = await fetch(`${BACKEND_URL}/core/uploadProfilePicture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formDataImage,
      });

      const result = await uploadResponse.json();
      console.log('Upload response:', result);

      if (uploadResponse.ok) {
        Alert.alert('Success', 'Profile picture updated successfully!');

        // NEW: Refresh user data after image upload
        await refreshUserData();

      } else {
        throw new Error(result.message || result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert(
        'Upload Failed',
        'Could not upload profile picture. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDownloadIDCard = async () => {
    if (!token) return;
    try {
      setDownloading(true);
      const response = await fetch(`${BACKEND_URL}/core/downloadIDCard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'ID Card downloaded successfully!');
      } else {
        throw new Error(result.message || 'Download failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download ID card');
    } finally {
      setDownloading(false);
    }
  };

  const MenuItem: React.FC<MenuItemProps> = React.memo(({
    title,
    subtitle,
    icon,
    onPress,
    isFirst = false,
    isLast = false,
    type = 'default',
    isStatic = false,
  }) => {
    const containerStyle = [
      styles.menuItemContainer,
      isFirst && styles.menuItemFirst,
      isLast && styles.menuItemLast,
      { backgroundColor: colors.background },
    ];

    const iconColor = type === 'danger' ? colors.danger : colors.icon;
    const textColor = type === 'danger' ? colors.danger : colors.text;

    if (isStatic) {
      return (
        <View style={containerStyle}>
          <View style={styles.menuItemIconContainer}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
          <View style={styles.menuItemTextContainer}>
            <Text style={[styles.menuItemTitle, { color: textColor }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.menuItemSubtitle, { color: colors.textTertiary }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemIconContainer}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.menuItemTextContainer}>
          <Text style={[styles.menuItemTitle, { color: textColor }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.menuItemSubtitle, { color: colors.textTertiary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
      </TouchableOpacity>
    );
  });

  const ProfileHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.headerBackground, paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            setIsEditing(!isEditing);
          }}
          style={styles.editButton}
        >
          <Ionicons name={isEditing ? "close" : "create-outline"} size={24} color={colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ProfileSection = React.memo(() => {
    const [bioText, setBioText] = useState(userData?.bio || 'Hey there! I am using WhatsApp.');

    // Update bioText when userData changes
    useEffect(() => {
      if (userData?.bio !== undefined) {
        setBioText(userData.bio || 'Hey there! I am using WhatsApp.');
      }
    }, [userData?.bio]);

    // Update bioText when formData.bio changes in edit mode
    useEffect(() => {
      if (isEditing) {
        setBioText(formData.bio);
      }
    }, [formData.bio, isEditing]);

    const handleBioChange = useCallback((text: string) => {
      if (isEditing) {
        setBioText(text);
        setFormData(prev => ({ ...prev, bio: text }));
      }
    }, [isEditing]);

    return (
      <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleImageUpload}
          activeOpacity={0.8}
          disabled={uploadingImage}
        >
          {userData?.profile_picture ? (
            <Image source={{ uri: userData.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.headerBackground }]}>
              <Text style={styles.avatarText}>
                {userData?.first_name?.[0] || 'U'}{userData?.last_name?.[0] || 'N'}
              </Text>
            </View>
          )}
          <View style={[styles.cameraButton, { backgroundColor: colors.headerBackground }]}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Ionicons name="camera" size={16} color={colors.background} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={[styles.profileName, { color: colors.text }]}>
          {userData?.first_name || ''} {userData?.last_name || ''}
        </Text>
      </View>
    );
  });

  const handleFormChange = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddressChange = useCallback((type: 'home' | 'current', field: string, value: string) => {
    if (type === 'home') {
      setFormData(prev => ({
        ...prev,
        homeAddress: {
          ...prev.homeAddress,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        currentLocation: {
          ...prev.currentLocation,
          [field]: value
        }
      }));
    }
  }, []);

  const MenuSection = () => {
    // Format address for display
    const formatAddress = (address: AddressData | undefined) => {
      if (!address) return 'Not provided';
      const parts = [];
      if (address.address) parts.push(address.address);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      if (address.zip_code) parts.push(`Zip: ${address.zip_code}`);
      return parts.join(', ') || 'Not provided';
    };

    return (
      <View style={[styles.menuSection, { backgroundColor: colors.background }]}>
        <MenuItem
          title="Phone"
          subtitle={userData?.phone_number || 'Not provided'}
          icon="call-outline"
          isStatic={true}
          isFirst={true}
        />

        <MenuItem
          title="Email"
          subtitle={userData?.email || 'Not provided'}
          icon="mail-outline"
          isStatic={true}
        />

        <MenuItem
          title="Designation"
          subtitle={userData?.designation || userData?.role || 'Not provided'}
          icon="briefcase-outline"
          isStatic={true}
        />

        <MenuItem
          title="Employee ID"
          subtitle={userData?.employee_id || 'Not provided'}
          icon="card-outline"
          isStatic={true}
        />

        <MenuItem
          title="Date of Birth"
          subtitle={userData?.birth_date || 'Not provided'}
          icon="calendar-outline"
          isStatic={true}
        />

        <MenuItem
          title="Home Address"
          subtitle={formatAddress(userData?.home_address)}
          icon="home-outline"
          isStatic={true}
        />

        <MenuItem
          title="Current Address"
          subtitle={formatAddress(userData?.current_location)}
          icon="location-outline"
          isStatic={true}
          isLast={true}
        />
      </View>
    );
  };

  const FeaturesSection = () => (
    <View style={[styles.menuSection, { backgroundColor: colors.background, marginTop: 16 }]}>
      <MenuItem
        title="ID Card"
        icon="id-card-outline"
        onPress={() => {
          setModalContent({ title: 'ID Card', type: 'idcard', content: userData });
          setModalVisible(true);
        }}
        isFirst={true}
      />

      <MenuItem
        title="Assets"
        subtitle={`${assets.length} items`}
        icon="briefcase-outline"
        onPress={() => {
          setModalContent({ title: 'My Assets', type: 'assets', content: assets });
          setModalVisible(true);
        }}
      />

      <MenuItem
        title="Payslips"
        subtitle={`${payslips.length} payslips`}
        icon="cash-outline"
        onPress={() => {
          setModalContent({ title: 'Payslips', type: 'payslips', content: payslips });
          setModalVisible(true);
        }}
      />

      <MenuItem
        title="Documents"
        subtitle={`${documents.length} documents`}
        icon="document-text-outline"
        onPress={() => {
          setModalContent({ title: 'My Documents', type: 'documents', content: documents });
          setModalVisible(true);
        }}
        isLast={true}
      />
    </View>
  );

  const renderModalContent = () => {
    switch (modalContent.type) {
      case 'personal':
        return (
          <View style={styles.modalPersonalContainer}>
            <Text style={[styles.modalDetail, { color: colors.text }]}>{modalContent.content}</Text>
          </View>
        );
      case 'idcard':
        return (
          <View style={[styles.modalIDCard, { backgroundColor: colors.background }]}>
            <View style={styles.idCardHeader}>
              <Text style={[styles.companyName, { color: colors.headerBackground }]}>
                Company Name
              </Text>
              <Text style={[styles.idCardTitle, { color: colors.textTertiary }]}>
                Employee ID Card
              </Text>
            </View>

            <View style={styles.idCardContent}>
              {userData?.profile_picture ? (
                <Image source={{ uri: userData.profile_picture }} style={styles.idPhoto} />
              ) : (
                <View style={[styles.idPhotoPlaceholder, { backgroundColor: colors.headerBackground }]}>
                  <Text style={styles.idPhotoText}>
                    {userData?.first_name?.[0] || 'U'}{userData?.last_name?.[0] || 'N'}
                  </Text>
                </View>
              )}

              <View style={styles.idCardInfo}>
                <Text style={[styles.idName, { color: colors.text }]}>
                  {userData?.first_name || ''} {userData?.last_name || ''}
                </Text>
                <Text style={[styles.idDesignation, { color: colors.textTertiary }]}>
                  {userData?.designation || userData?.role || 'Employee'}
                </Text>
                <Text style={[styles.idNumber, { color: colors.headerBackground }]}>
                  ID: {userData?.employee_id || 'N/A'}
                </Text>
                <Text style={[styles.idEmail, { color: colors.textTertiary }]}>
                  {userData?.email || ''}
                </Text>
                {userData?.birth_date && (
                  <Text style={[styles.idDob, { color: colors.textTertiary }]}>
                    DOB: {userData.birth_date}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      case 'assets':
        return (
          <View style={styles.modalListContainer}>
            {modalContent.content && modalContent.content.length > 0 ? (
              modalContent.content.map((asset: Asset, index: number) => (
                <View key={index} style={[styles.modalListItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalListItemIcon}>
                    <Ionicons name="briefcase-outline" size={24} color={colors.icon} />
                  </View>
                  <View style={styles.modalListItemContent}>
                    <Text style={[styles.modalListItemTitle, { color: colors.text }]}>
                      {asset.name || 'Unnamed Asset'}
                    </Text>
                    <Text style={[styles.modalListItemSubtitle, { color: colors.textTertiary }]}>
                      {asset.type || 'No type'} • Serial: {asset.serial_number || 'N/A'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="briefcase-outline"
                message="Oops! No assets found!"
                color={colors.emptyState}
              />
            )}
          </View>
        );
      case 'payslips':
        return (
          <View style={styles.modalListContainer}>
            {modalContent.content && modalContent.content.length > 0 ? (
              modalContent.content.map((payslip: Payslip, index: number) => (
                <View key={index} style={[styles.modalListItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalListItemIcon}>
                    <Ionicons name="cash-outline" size={24} color={colors.icon} />
                  </View>
                  <View style={styles.modalListItemContent}>
                    <Text style={[styles.modalListItemTitle, { color: colors.text }]}>
                      {payslip.month || ''} {payslip.year || ''}
                    </Text>
                    <Text style={[styles.modalListItemSubtitle, { color: colors.textTertiary }]}>
                      Net Salary: {payslip.net_salary || 'N/A'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="cash-outline"
                message="Oops! No payslips have been updated for you!"
                color={colors.emptyState}
              />
            )}
          </View>
        );
      case 'documents':
        return (
          <View style={styles.modalListContainer}>
            {modalContent.content && modalContent.content.length > 0 ? (
              modalContent.content.map((doc: Document, index: number) => (
                <View key={index} style={[styles.modalListItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.modalListItemIcon}>
                    <Ionicons name="document-text-outline" size={24} color={colors.icon} />
                  </View>
                  <View style={styles.modalListItemContent}>
                    <Text style={[styles.modalListItemTitle, { color: colors.text }]}>
                      {doc.document_name || 'Unnamed Document'}
                    </Text>
                    <Text style={[styles.modalListItemSubtitle, { color: colors.textTertiary }]}>
                      Type: {doc.document_type || 'N/A'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="document-text-outline"
                message="Oops! No documents found!"
                color={colors.emptyState}
              />
            )}
          </View>
        );
      default:
        return <Text style={{ color: colors.text }}>No data available</Text>;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.headerBackground} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          No user data available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.modalBackground }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerBackground} />

        <ProfileHeader />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={16}
          bounces={true}
          overScrollMode="always"
        >
          <ProfileSection />

          {isEditing ? (
            <EditProfileSection
              formData={formData}
              onFormChange={handleFormChange}
              onAddressChange={handleAddressChange}
              showDatePickerModal={showDatePickerModal}
              handleDateChange={handleDateChange}
              selectedDate={selectedDate}
              showDatePicker={showDatePicker}
              formatDisplayDate={formatDisplayDate}
              firstNameInputRef={firstNameInputRef}
              lastNameInputRef={lastNameInputRef}
              handleSave={handleSave}
              saving={saving}
              setIsEditing={setIsEditing}
              userData={userData}
              populateFormData={populateFormData}
            />
          ) : (
            <>
              <MenuSection />
              <FeaturesSection />
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {modalContent.title || 'Details'}
                </Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
                {renderModalContent()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: -15
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  bioInput: {
    width: '100%',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },

  editSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  addressSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDEF',
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000',
  },
  inputContainer: {
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    paddingVertical: 4,
  },
  readOnlyNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  dateFormatNote: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButtonContainer: {
    marginTop: 24,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Date picker styles
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  datePickerText: {
    fontSize: 16,
  },

  menuSection: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E9EDEF',
  },
  menuItemFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E9EDEF',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  menuItemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemTitle: {
    fontSize: 17,
  },
  menuItemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  modalPersonalContainer: {
    padding: 16,
  },
  modalDetail: {
    fontSize: 16,
  },

  // List modal styles
  modalListContainer: {
    flex: 1,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalListItemIcon: {
    width: 40,
    alignItems: 'center',
  },
  modalListItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalListItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalListItemSubtitle: {
    fontSize: 14,
  },

  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.8,
  },

  modalIDCard: {
    padding: 20,
    borderRadius: 16,
  },
  idCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  idCardTitle: {
    fontSize: 14,
    marginTop: 4,
  },
  idCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  idPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  idPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  idPhotoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  idCardInfo: {
    flex: 1,
  },
  idName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  idDesignation: {
    fontSize: 14,
    marginBottom: 4,
  },
  idNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  idEmail: {
    fontSize: 13,
  },
  idDob: {
    fontSize: 13,
    marginTop: 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 20,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
  },
});

export default Profile;