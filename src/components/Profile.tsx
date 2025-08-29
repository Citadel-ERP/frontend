import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows, commonStyles } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType, PhotoQuality } from 'react-native-image-picker';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileProps {
  onBack: () => void;
  userData?: UserData;
}

interface UserData {
  role: string;
  employee_id: string;
  email: string;
  token: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mpin: string;
  home_address: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  office: {
    id: number;
    name: string;
    address: {
      id: number;
      address: string;
      city: string;
      state: string;
      country: string;
      zip_code: string;
    };
  };
  phone_number: string;
  profile_picture: string | null;
  current_location: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  approved_by_hr_at: string | null;
  approved_by_admin_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  earned_leaves: number;
  sick_leaves: number;
  casual_leaves: number;
  login_time: string | null;
  logout_time: string | null;
  first_login: boolean;
  bio: string;
  designation?: string;
  user_tags: Array<{
    id: number;
    tag: {
      id: number;
      tag_name: string;
      tag_id: string;
      tag_type: string;
      created_at: string;
      updated_at: string;
    };
    created_at: string;
    updated_at: string;
  }>;
  reporting_tags: Array<{
    id: number;
    reporting_tag: {
      id: number;
      tag_name: string;
      tag_id: string;
      tag_type: string;
      created_at: string;
      updated_at: string;
    };
    created_at: string;
    updated_at: string;
  }>;
}

interface Document {
  id: number;
  document_name: string;
  document_type: string;
  document_url: string;
  uploaded_at: string;
}

interface ApiResponse {
  message: string;
  user: UserData;
  documents: Document[];
}

interface ValidationErrors {
  [key: string]: string;
}

const Profile: React.FC<ProfileProps> = ({ onBack, userData: propUserData }) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [loading, setLoading] = useState(!propUserData);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(propUserData || null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Editable form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [homeState, setHomeState] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [homeZipCode, setHomeZipCode] = useState('');

  // Original values for change detection
  const [originalData, setOriginalData] = useState<any>({});

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token_2');
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    
    getToken();
  }, []);

  // Validation functions
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'firstName':
        return value.trim().length < 2 ? 'First name must be at least 2 characters' : '';
      case 'lastName':
        return value.trim().length < 2 ? 'Last name must be at least 2 characters' : '';
      case 'phoneNumber':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return value && !phoneRegex.test(value.replace(/\s/g, '')) ? 'Please enter a valid phone number' : '';
      case 'homeZipCode':
        const zipRegex = /^[0-9]{5,6}$/;
        return value && !zipRegex.test(value) ? 'Please enter a valid ZIP code' : '';
      case 'bio':
        return value.length > 500 ? 'Bio must be less than 500 characters' : '';
      default:
        return '';
    }
  };

  const validateAllFields = (): boolean => {
    const errors: ValidationErrors = {};
    
    errors.firstName = validateField('firstName', firstName);
    errors.lastName = validateField('lastName', lastName);
    errors.phoneNumber = validateField('phoneNumber', phoneNumber);
    errors.homeZipCode = validateField('homeZipCode', homeZipCode);
    errors.bio = validateField('bio', bio);
    
    const hasErrors = Object.values(errors).some(error => error !== '');
    setValidationErrors(errors);
    
    return !hasErrors;
  };

  const populateFormFields = (user: UserData) => {
    const data = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      bio: user.bio || '',
      phone_number: user.phone_number || '',
      homeAddress: user.home_address?.address || '',
      homeCity: user.home_address?.city || '',
      homeState: user.home_address?.state || '',
      homeCountry: user.home_address?.country || '',
      homeZipCode: user.home_address?.zip_code || '',
    };
    
    setFirstName(data.first_name);
    setLastName(data.last_name);
    setBio(data.bio);
    setPhoneNumber(data.phone_number);
    setHomeAddress(data.homeAddress);
    setHomeCity(data.homeCity);
    setHomeState(data.homeState);
    setHomeCountry(data.homeCountry);
    setHomeZipCode(data.homeZipCode);
    
    setOriginalData(data);
  };

  useEffect(() => {
    if (propUserData) {
      setUserData(propUserData);
      populateFormFields(propUserData);
      setLoading(false);
    }
  }, [propUserData]);

  useEffect(() => {
    if (!token || propUserData) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${BACKEND_URL}/core/getUser`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiResponse = await response.json();

        if (data.message === "Get modules successful") {
          setUserData(data.user);
          setDocuments(data.documents || []);
          populateFormFields(data.user);
        } else {
          throw new Error(data.message || 'Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [token, propUserData]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form fields to original values
    setFirstName(originalData.first_name);
    setLastName(originalData.last_name);
    setBio(originalData.bio);
    setPhoneNumber(originalData.phone_number);
    setHomeAddress(originalData.homeAddress);
    setHomeCity(originalData.homeCity);
    setHomeState(originalData.homeState);
    setHomeCountry(originalData.homeCountry);
    setHomeZipCode(originalData.homeZipCode);
    
    setValidationErrors({});
    setIsEditing(false);
  };

  const checkForChanges = (): boolean => {
    return (
      firstName.trim() !== originalData.first_name ||
      lastName.trim() !== originalData.last_name ||
      bio.trim() !== originalData.bio ||
      phoneNumber.trim() !== originalData.phone_number ||
      homeAddress.trim() !== originalData.homeAddress ||
      homeCity.trim() !== originalData.homeCity ||
      homeState.trim() !== originalData.homeState ||
      homeCountry.trim() !== originalData.homeCountry ||
      homeZipCode.trim() !== originalData.homeZipCode
    );
  };

  const handleSave = async () => {
    if (!token || !userData) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    // Check if there are any changes
    if (!checkForChanges()) {
      Alert.alert('No Changes', 'No changes were made to save.');
      setIsEditing(false);
      return;
    }

    // Validate all fields
    if (!validateAllFields()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        token,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim(),
        phone_number: phoneNumber.trim(),
        home_address: {
          address: homeAddress.trim(),
          city: homeCity.trim(),
          state: homeState.trim(),
          country: homeCountry.trim(),
          zip_code: homeZipCode.trim(),
        }
      };

      console.log('Sending update data:', updateData);

      const response = await fetch(`${BACKEND_URL}/core/updateProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      console.log('Update response:', result);
      
      if (response.ok && (result.message === "Profile updated successfully" || result.success)) {
        // Update original data to reflect saved state
        const newOriginalData = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim(),
          phone_number: phoneNumber.trim(),
          homeAddress: homeAddress.trim(),
          homeCity: homeCity.trim(),
          homeState: homeState.trim(),
          homeCountry: homeCountry.trim(),
          homeZipCode: homeZipCode.trim(),
        };
        setOriginalData(newOriginalData);
        
        // Update userData state
        if (userData) {
          setUserData({
            ...userData,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            bio: bio.trim(),
            phone_number: phoneNumber.trim(),
            home_address: {
              ...userData.home_address,
              address: homeAddress.trim(),
              city: homeCity.trim(),
              state: homeState.trim(),
              country: homeCountry.trim(),
              zip_code: homeZipCode.trim(),
            }
          });
        }
        
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error(result.message || result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please check your connection and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 400,
      maxWidth: 400,
      quality: 0.8 as PhotoQuality,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        uploadProfilePicture(response.assets[0]);
      }
    });
  };

  const openGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 400,
      maxWidth: 400,
      quality: 0.8 as PhotoQuality,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        uploadProfilePicture(response.assets[0]);
      }
    });
  };

  const uploadProfilePicture = async (image: any) => {
    if (!token) return;

    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('token', token);
      formData.append('profile_picture', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.fileName || `profile_${Date.now()}.jpg`,
      } as any);

      const response = await fetch(`${BACKEND_URL}/core/uploadProfilePicture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && (result.success || result.message === "Profile picture updated successfully")) {
        // Update userData with new profile picture
        if (userData && result.profile_picture_url) {
          setUserData({
            ...userData,
            profile_picture: result.profile_picture_url
          });
        }
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(result.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocumentUpload = async () => {
    Alert.alert(
      'Upload Document',
      'Choose document source',
      [
        { text: 'Gallery', onPress: () => openDocumentPicker() },
        { text: 'Camera', onPress: () => openCameraForDocument() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openDocumentPicker = () => {
    const options = {
      mediaType: 'mixed' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        uploadDocument({
          uri: response.assets[0].uri!,
          type: response.assets[0].type!,
          name: response.assets[0].fileName || `document_${Date.now()}.jpg`,
          size: response.assets[0].fileSize || 0,
        });
      }
    });
  };

  const openCameraForDocument = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        uploadDocument({
          uri: response.assets[0].uri!,
          type: response.assets[0].type!,
          name: response.assets[0].fileName || `document_${Date.now()}.jpg`,
          size: response.assets[0].fileSize || 0,
        });
      }
    });
  };

  const uploadDocument = async (document: {uri: string, type: string, name: string, size: number}) => {
    if (!token) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('token', token);
      formData.append('document', {
        uri: document.uri,
        type: document.type,
        name: document.name,
      } as any);
      formData.append('document_name', document.name || '');
      formData.append('document_type', document.type || '');

      const response = await fetch(`${BACKEND_URL}/core/uploadDocument`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && (result.success || result.message === "Document uploaded successfully")) {
        // Add new document to the list
        if (result.document) {
          setDocuments(prev => [...prev, result.document]);
        } else {
          // Refresh documents list
          fetchDocuments();
        }
        Alert.alert('Success', 'Document uploaded successfully!');
      } else {
        throw new Error(result.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/core/getDocuments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      if (response.ok && result.documents) {
        setDocuments(result.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // Component definitions
  const BackIcon = ({ color = colors.white, size = 24 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.6,
        height: size * 0.6,
        borderLeftWidth: 2,
        borderTopWidth: 2,
        borderColor: color,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );

  const EditIcon = ({ color = colors.white, size = 18 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.7,
        height: size * 0.7,
        borderWidth: 1.2,
        borderColor: color,
        borderRadius: 1,
        position: 'relative',
      }}>
        <View style={{
          position: 'absolute',
          top: -3,
          right: -3,
          width: size * 0.5,
          height: size * 0.25,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: '45deg' }],
        }} />
        <View style={{
          position: 'absolute',
          top: -1,
          right: -1,
          width: 2,
          height: 2,
          backgroundColor: color,
          borderRadius: 1,
        }} />
      </View>
    </View>
  );

  const CameraIcon = ({ color = colors.primary, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.85,
        height: size * 0.65,
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 3,
      }}>
        <View style={{
          position: 'absolute',
          top: -4,
          alignSelf: 'center',
          width: size * 0.3,
          height: size * 0.2,
          backgroundColor: color,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        }} />
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: size * 0.4,
          height: size * 0.4,
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: size * 0.2,
          transform: [{ translateX: -size * 0.2 }, { translateY: -size * 0.2 }],
        }} />
      </View>
    </View>
  );

  const InfoRow = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoRowHeader}>
        {icon}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
    </View>
  );

  const FormInput = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    error, 
    fieldName,
    editable = true,
    multiline = false,
    keyboardType = 'default',
    maxLength,
    flex,
    ...props 
  }: any) => (
    <View style={[styles.inputContainer, flex && { flex: 1 }]}>
      <Text style={styles.inputLabel}>
        {label}
        {maxLength && ` (${value.length}/${maxLength})`}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          error && styles.inputError,
          !editable && styles.inputDisabled,
          focusedField === fieldName && styles.inputFocused,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setFocusedField(fieldName)}
        onBlur={() => setFocusedField(null)}
        editable={editable && isEditing}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        maxLength={maxLength}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <Text style={styles.errorTitle}>Unable to load profile</Text>
        <Text style={styles.errorSubtitle}>Please check your connection and try again</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        
        {!isEditing ? (
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <EditIcon />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Profile Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {uploadingImage ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color={colors.white} />
              </View>
            ) : userData.profile_picture ? (
              <Image source={{ uri: userData.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {userData.first_name?.charAt(0)}{userData.last_name?.charAt(0)}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleImagePicker}
              disabled={uploadingImage}
            >
              <CameraIcon size={18} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{userData.full_name}</Text>
          <Text style={styles.profileDesignation}>{userData.designation || userData.role}</Text>
          <Text style={styles.employeeId}>ID: {userData.employee_id}</Text>
        </View>

        <View style={styles.sectionsContainer}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.sectionContent}>
              <View style={styles.inputRow}>
                <FormInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  error={validationErrors.firstName}
                  fieldName="firstName"
                  flex={1}
                />
                <FormInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  error={validationErrors.lastName}
                  fieldName="lastName"
                  flex={1}
                />
              </View>
              
              <FormInput
                label="Email Address"
                value={userData.email}
                onChangeText={() => {}}
                placeholder="Email address"
                fieldName="email"
                editable={false}
                keyboardType="email-address"
              />
              
              <FormInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                error={validationErrors.phoneNumber}
                fieldName="phoneNumber"
                keyboardType="phone-pad"
              />

              <FormInput
                label="Bio"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                error={validationErrors.bio}
                fieldName="bio"
                multiline={true}
                maxLength={500}
              />
            </View>
          </View>

          {/* Office Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Office Information</Text>
            <View style={styles.sectionContent}>
              <InfoRow 
                label="Office Name" 
                value={userData.office?.name || 'Not assigned'} 
              />
              {userData.office?.address && (
                <InfoRow 
                  label="Office Address" 
                  value={`${userData.office.address.address}, ${userData.office.address.city}, ${userData.office.address.state}, ${userData.office.address.country} ${userData.office.address.zip_code}`}
                />
              )}
            </View>
          </View>

          {/* Home Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Home Address</Text>
            <View style={styles.sectionContent}>
              <FormInput
                label="Street Address"
                value={homeAddress}
                onChangeText={setHomeAddress}
                placeholder="Street address"
                fieldName="homeAddress"
              />

              <View style={styles.inputRow}>
                <FormInput
                  label="City"
                  value={homeCity}
                  onChangeText={setHomeCity}
                  placeholder="City"
                  fieldName="homeCity"
                  flex={1}
                />
                <FormInput
                  label="State"
                  value={homeState}
                  onChangeText={setHomeState}
                  placeholder="State"
                  fieldName="homeState"
                  flex={1}
                />
              </View>

              <View style={styles.inputRow}>
                <FormInput
                  label="Country"
                  value={homeCountry}
                  onChangeText={setHomeCountry}
                  placeholder="Country"
                  fieldName="homeCountry"
                  flex={1}
                />
                <FormInput
                  label="ZIP Code"
                  value={homeZipCode}
                  onChangeText={setHomeZipCode}
                  placeholder="ZIP code"
                  error={validationErrors.homeZipCode}
                  fieldName="homeZipCode"
                  keyboardType="numeric"
                  flex={1}
                />
              </View>
            </View>
          </View>

          {/* Documents */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Documents</Text>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handleDocumentUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.uploadButtonText}>+ Upload</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.sectionContent}>
              {documents.length > 0 ? (
                documents.map((document, index) => (
                  <TouchableOpacity key={index} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName}>{document.document_name}</Text>
                      <Text style={styles.documentDate}>
                        {new Date(document.uploaded_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    <Text style={styles.documentArrow}>→</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No documents uploaded</Text>
                  <TouchableOpacity 
                    style={styles.emptyUploadButton}
                    onPress={handleDocumentUpload}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.emptyUploadButtonText}>Upload First Document</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    color: colors.white,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    fontWeight: '500',
  },
  errorTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  editButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: spacing.sm,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  
  // Profile Header
  profileHeader: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarInitials: {
    color: colors.white,
    fontSize: fontSize.xxxl,
    fontWeight: '600',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    backgroundColor: colors.white,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  profileName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  profileDesignation: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  employeeId: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },

  // Sections
  sectionsContainer: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },

  // Form Inputs
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.backgroundSecondary,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
    fontWeight: '500',
  },

  // Info Rows
  infoRow: {
    marginBottom: spacing.md,
  },
  infoRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },

  // Upload Button
  uploadButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  uploadButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Documents
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  documentDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  documentArrow: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: '300',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyUploadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  emptyUploadButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  bottomSpacing: {
    height: spacing.xxl,
  },
});