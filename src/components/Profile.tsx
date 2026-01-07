import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { BACKEND_URL } from '../config/config';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

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
  home_address?: { address?: string };
  current_location?: { address?: string };
  date_of_birth?: string;
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
  homeAddress: string;
  currentLocation: string;
  dateOfBirth: string;
}

interface ModalContent {
  title?: string;
  type?: string;
  content?: any;
}

interface ProfileProps {
  onBack: () => void;
  userData?: UserData;
}

interface MenuItemProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  type?: 'default' | 'danger';
}

const Profile: React.FC<ProfileProps> = ({ onBack, userData: propUserData }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(!propUserData);
  const [userData, setUserData] = useState<UserData | null>(propUserData || null);
  const [token, setToken] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent>({});
  const [downloading, setDownloading] = useState(false);
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDateSet, setIsDateSet] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    bio: '',
    phoneNumber: '',
    homeAddress: '',
    currentLocation: '',
    dateOfBirth: '',
  });
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  // WhatsApp-like colors
  const colors = {
    background: '#FFFFFF',
    headerBackground: '#008069',
    text: '#000000',
    textSecondary: '#667781',
    textTertiary: '#8696A0',
    border: '#E9EDEF',
    borderLight: '#F0F2F5',
    icon: '#8696A0',
    iconActive: '#008069',
    danger: '#FF3B30',
    modalBackground: '#F7F8FA',
  };

  useEffect(() => {
    initializeData();
  }, []);

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

  const populateFormData = (user: UserData) => {
    const dob = user.date_of_birth || '';
    if (dob) {
      const dateParts = dob.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Months are 0-indexed
        const day = parseInt(dateParts[2]);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          setSelectedDate(new Date(year, month, day));
          setIsDateSet(true);
        }
      }
    }
    
    setFormData({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      bio: user.bio || '',
      phoneNumber: user.phone_number || '',
      homeAddress: user.home_address?.address || '',
      currentLocation: user.current_location?.address || '',
      dateOfBirth: dob,
    });
  };

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
    
    try {
      setSaving(true);
      const response = await fetch(`${BACKEND_URL}/core/updateProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          firstName: formData.firstName,
          lastName: formData.lastName,
          homeAddress: formData.homeAddress,
          currentLocation: formData.currentLocation,
          dateOfBirth: formData.dateOfBirth,
        }),
      });
      
      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
        setUserData(prev => prev ? {
          ...prev,
          first_name: formData.firstName,
          last_name: formData.lastName,
          home_address: { address: formData.homeAddress },
          current_location: { address: formData.currentLocation },
          date_of_birth: formData.dateOfBirth,
        } : prev);
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      setIsDateSet(true);
      
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setFormData(prev => ({ ...prev, dateOfBirth: formattedDate }));
    }
  };

  const showDatePickerModal = () => {
    Keyboard.dismiss(); // Dismiss keyboard before showing date picker
    setShowDatePicker(true);
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select Date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Select Date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Rest of your existing functions remain the same (handleImageUpload, handleImageResponse, handleDownloadIDCard, etc.)

  const handleImageUpload = () => {
    Alert.alert('Update Picture', 'Choose option', [
      { text: 'Camera', onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, handleImageResponse) },
      { text: 'Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, handleImageResponse) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleImageResponse = async (response: ImagePickerResponse) => {
    if (response.assets?.[0] && token) {
      const formDataImage = new FormData();
      formDataImage.append('token', token);
      formDataImage.append('profile_picture', {
        uri: response.assets[0].uri,
        type: response.assets[0].type || 'image/jpeg',
        name: response.assets[0].fileName || 'profile.jpg',
      } as any);

      try {
        const res = await fetch(`${BACKEND_URL}/core/uploadProfilePicture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formDataImage,
        });
        
        const result = await res.json();
        if (res.ok) {
          setUserData(prev => prev ? { ...prev, profile_picture: result.profile_picture_url } : prev);
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        Alert.alert('Error', 'Failed to upload image');
      }
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

  const MenuItem: React.FC<MenuItemProps> = ({ 
    title, 
    subtitle, 
    icon, 
    onPress, 
    isFirst = false, 
    isLast = false,
    type = 'default'
  }) => {
    const containerStyle = [
      styles.menuItemContainer,
      isFirst && styles.menuItemFirst,
      isLast && styles.menuItemLast,
      { backgroundColor: colors.background },
    ];

    const iconColor = type === 'danger' ? colors.danger : colors.icon;
    const textColor = type === 'danger' ? colors.danger : colors.text;

    return (
      <TouchableOpacity style={containerStyle} onPress={onPress}>
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
  };

  const ProfileHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.headerBackground, paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.background} />
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

  const ProfileSection = () => (
    <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.avatarContainer} onPress={handleImageUpload}>
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
          <Ionicons name="camera" size={16} color={colors.background} />
        </View>
      </TouchableOpacity>
      
      <Text style={[styles.profileName, { color: colors.text }]}>
        {userData?.first_name || ''} {userData?.last_name || ''}
      </Text>
      
      {isEditing ? (
        <TextInput
          style={[styles.bioInput, { color: colors.text, borderBottomColor: colors.border }]}
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
          placeholder="Add about"
          placeholderTextColor={colors.textTertiary}
          multiline
        />
      ) : (
        <Text style={[styles.profileBio, { color: colors.textTertiary }]}>
          {userData?.bio || 'Hey there! I am using WhatsApp.'}
        </Text>
      )}
    </View>
  );

  const EditProfileSection = () => {
    return (
      <View style={[styles.editSection, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Profile</Text>
        
        <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>First name</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={formData.firstName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
            placeholder="Enter first name"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        
        <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Last name</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={formData.lastName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
            placeholder="Enter last name"
            placeholderTextColor={colors.textTertiary}
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
        
        {/* Home Address field */}
        <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Home Address</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={formData.homeAddress}
            onChangeText={(text) => setFormData(prev => ({ ...prev, homeAddress: text }))}
            placeholder="Enter home address"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>
        
        {/* Current Address field */}
        <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Address</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={formData.currentLocation}
            onChangeText={(text) => setFormData(prev => ({ ...prev, currentLocation: text }))}
            placeholder="Enter current address"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>
        
        {/* Date of Birth field with dropdown */}
        <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date of Birth</Text>
          
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={showDatePickerModal}
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
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Rest of your component remains the same (MenuSection, FeaturesSection, renderModalContent, etc.)

  const MenuSection = () => (
    <View style={[styles.menuSection, { backgroundColor: colors.background }]}>
      <MenuItem
        title="Phone"
        subtitle={userData?.phone_number || 'Not provided'}
        icon="call-outline"
        onPress={() => {
          setModalContent({ title: 'Phone', type: 'personal', content: userData?.phone_number || 'Not provided' });
          setModalVisible(true);
        }}
        isFirst={true}
      />
      
      <MenuItem
        title="Email"
        subtitle={userData?.email || 'Not provided'}
        icon="mail-outline"
        onPress={() => {
          setModalContent({ title: 'Email', type: 'personal', content: userData?.email || 'Not provided' });
          setModalVisible(true);
        }}
      />
      
      <MenuItem
        title="Designation"
        subtitle={userData?.designation || userData?.role || 'Not provided'}
        icon="briefcase-outline"
        onPress={() => {
          setModalContent({ title: 'Designation', type: 'personal', content: userData?.designation || userData?.role || 'Not provided' });
          setModalVisible(true);
        }}
      />
      
      <MenuItem
        title="Employee ID"
        subtitle={userData?.employee_id || 'Not provided'}
        icon="card-outline"
        onPress={() => {
          setModalContent({ title: 'Employee ID', type: 'personal', content: userData?.employee_id || 'Not provided' });
          setModalVisible(true);
        }}
      />
      
      <MenuItem
        title="Date of Birth"
        subtitle={userData?.date_of_birth || 'Not provided'}
        icon="calendar-outline"
        onPress={() => {
          setModalContent({ title: 'Date of Birth', type: 'personal', content: userData?.date_of_birth || 'Not provided' });
          setModalVisible(true);
        }}
      />
      
      <MenuItem
        title="Home Address"
        subtitle={userData?.home_address?.address || 'Not provided'}
        icon="home-outline"
        onPress={() => {
          setModalContent({ title: 'Home Address', type: 'personal', content: userData?.home_address?.address || 'Not provided' });
          setModalVisible(true);
        }}
      />
      
      <MenuItem
        title="Current Address"
        subtitle={userData?.current_location?.address || 'Not provided'}
        icon="location-outline"
        onPress={() => {
          setModalContent({ title: 'Current Address', type: 'personal', content: userData?.current_location?.address || 'Not provided' });
          setModalVisible(true);
        }}
      />
    </View>
  );

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
                {userData?.date_of_birth && (
                  <Text style={[styles.idDob, { color: colors.textTertiary }]}>
                    DOB: {userData.date_of_birth}
                  </Text>
                )}
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.downloadButton, { backgroundColor: colors.headerBackground }]} 
              onPress={handleDownloadIDCard}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color={colors.background} />
                  <Text style={[styles.downloadButtonText, { color: colors.background }]}>
                    Download ID Card
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
    <View style={[styles.container, { backgroundColor: colors.modalBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerBackground} />
      
      <ProfileHeader />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileSection />
        
        {isEditing ? (
          <EditProfileSection />
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
            
            <ScrollView style={styles.modalBody}>
              {renderModalContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
  profileBio: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
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
  inputContainer: {
    borderBottomWidth: 1,
    marginBottom: 20,
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
    marginTop: 8,
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
});

export default Profile;