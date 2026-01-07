import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { BACKEND_URL } from '../config/config';

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
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    bio: '',
    phoneNumber: '',
    homeAddress: '',
    currentLocation: '',
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
    setFormData({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      bio: user.bio || '',
      phoneNumber: user.phone_number || '',
      homeAddress: user.home_address?.address || '',
      currentLocation: user.current_location?.address || '',
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
        body: JSON.stringify({ token, ...formData }),
      });
      
      const result = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
        setUserData(prev => prev ? {
          ...prev,
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          phone_number: formData.phoneNumber,
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
        type: response.assets[0].type,
        name: response.assets[0].fileName || 'profile.jpg',
      } as any);

      try {
        const res = await fetch(`${BACKEND_URL}/core/uploadProfilePicture`, {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data' },
          body: formDataImage,
        });
        
        const result = await res.json();
        if (res.ok) {
          setUserData(prev => prev ? { ...prev, profile_picture: result.profile_picture_url } : prev);
          Alert.alert('Success', 'Profile picture updated!');
        }
      } catch (error) {
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
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
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
      
      {/*<TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.borderLight }]}>
        <Ionicons name="arrow-redo" size={20} color={colors.text} />
        <Text style={[styles.shareButtonText, { color: colors.text }]}>Share profile</Text>
      </TouchableOpacity>*/}
    </View>
  );

  const EditProfileSection = () => (
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
      
      <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone number</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
          placeholder="Enter phone number"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
        />
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
            setIsEditing(false);
            if (userData) populateFormData(userData);
          }}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const MenuSection = () => (
    <View style={[styles.menuSection, { backgroundColor: colors.background }]}>
      <MenuItem
        title="Phone"
        subtitle={userData?.phone_number || 'Not provided'}
        icon="call-outline"
        onPress={() => {
          setModalContent({ title: 'Phone', type: 'personal', content: userData });
          setModalVisible(true);
        }}
        isFirst={true}
      />
      
      <MenuItem
        title="Email"
        subtitle={userData?.email || 'Not provided'}
        icon="mail-outline"
        onPress={() => {
          setModalContent({ title: 'Email', type: 'personal', content: userData });
          setModalVisible(true);
        }}
      />
      
      <MenuItem
        title="Designation"
        subtitle={userData?.designation || userData?.role || 'Not provided'}
        icon="briefcase-outline"
        onPress={() => {
          setModalContent({ title: 'Designation', type: 'personal', content: userData });
          setModalVisible(true);
        }}
      />
      
      <MenuItem
        title="Employee ID"
        subtitle={userData?.employee_id || 'Not provided'}
        icon="card-outline"
        onPress={() => {
          setModalContent({ title: 'Employee ID', type: 'personal', content: userData });
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
        
        {/* Spacer for bottom */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal */}
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
  
  // Header Styles
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
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Profile Section
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  
  // Edit Section
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
  
  // Menu Section
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
  
  // Modal
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
  
  // ID Card Modal
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
  
  // Spacer
  bottomSpacer: {
    height: 20,
  },
});

export default Profile;