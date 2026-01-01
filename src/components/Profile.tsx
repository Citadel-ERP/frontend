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
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

interface FormInputProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  multiline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface MenuItemProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  showArrow?: boolean;
  badge?: string | number;
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

  const colors = {
    primary: '#1C5CFB',
    primaryDark: '#0742da',
    bg: '#F5F7FA',
    white: '#FFFFFF',
    text: '#1a1a1a',
    textLight: '#8F9BB3',
    border: '#EDF1F7',
    success: '#00E096',
    warning: '#FFAA00',
    error: '#FF3D71',
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

  const FormInput: React.FC<FormInputProps> = ({ 
    label, 
    value, 
    onChangeText, 
    editable = true, 
    multiline = false,
    icon
  }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.textLight }]}>{label}</Text>
      <View style={[
        styles.inputWrapper, 
        { borderColor: colors.border, backgroundColor: editable ? colors.white : '#f5f5f5' }
      ]}>
        {icon && <Ionicons name={icon} size={20} color={colors.textLight} style={styles.inputIcon} />}
        <TextInput
          style={[
            styles.input, 
            { color: colors.text }, 
            multiline && styles.multilineInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          placeholderTextColor={colors.textLight}
        />
      </View>
    </View>
  );

  const MenuItem: React.FC<MenuItemProps> = ({ title, icon, onPress, showArrow = true, badge }) => (
    <TouchableOpacity 
      style={[styles.menuItem, { backgroundColor: colors.white, borderBottomColor: colors.border }]} 
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <Text style={[styles.menuItemText, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {badge !== undefined && badge !== 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {showArrow && <Ionicons name="chevron-forward" size={20} color={colors.textLight} />}
      </View>
    </TouchableOpacity>
  );

  const renderPersonalDetailsModal = () => (
    <View>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>First Name</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.first_name || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Last Name</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.last_name || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Email</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.email || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Phone</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.phone_number || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Employee ID</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.employee_id || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Designation</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.designation || userData?.role || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Bio</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.bio || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Home Address</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.home_address?.address || 'Not provided'}
        </Text>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Current Location</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {userData?.current_location?.address || 'Not provided'}
        </Text>
      </View>
    </View>
  );

  const renderIDCardModal = () => (
    <View>
      <View style={[styles.idCardContainer, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <View style={styles.idCardHeader}>
          <Text style={[styles.companyName, { color: colors.primary }]}>Company Name</Text>
          <Text style={[styles.idCardTitle, { color: colors.textLight }]}>Employee ID Card</Text>
        </View>
        
        <View style={styles.idCardContent}>
          <View style={styles.idCardLeft}>
            {userData?.profile_picture ? (
              <Image source={{ uri: userData.profile_picture }} style={styles.idPhoto} />
            ) : (
              <LinearGradient 
                colors={[colors.primary, colors.primaryDark]} 
                style={styles.idPhotoPlaceholder}
              >
                <Text style={styles.idPhotoText}>
                  {userData?.first_name?.charAt(0) || 'U'}{userData?.last_name?.charAt(0) || 'N'}
                </Text>
              </LinearGradient>
            )}
          </View>
          
          <View style={styles.idCardRight}>
            <Text style={[styles.idName, { color: colors.text }]}>
              {userData?.first_name || ''} {userData?.last_name || ''}
            </Text>
            <Text style={[styles.idDesignation, { color: colors.textLight }]}>
              {userData?.designation || userData?.role || 'Employee'}
            </Text>
            <Text style={[styles.idNumber, { color: colors.primary }]}>
              ID: {userData?.employee_id || 'N/A'}
            </Text>
            <Text style={[styles.idEmail, { color: colors.textLight }]}>{userData?.email || ''}</Text>
            <Text style={[styles.idPhone, { color: colors.textLight }]}>{userData?.phone_number || ''}</Text>
          </View>
        </View>
        
        <View style={[styles.idCardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.validText, { color: colors.textLight }]}>Valid until: Dec 2025</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.downloadButtonLarge, { backgroundColor: colors.primary }]} 
        onPress={handleDownloadIDCard}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Download ID Card</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAssetsModal = () => {
    if (!assets || assets.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={64} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Assets Found</Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            You don't have any assets assigned yet
          </Text>
        </View>
      );
    }

    return (
      <View>
        {assets.map((asset, index) => (
          <View key={index}>
            <View style={styles.listItemModal}>
              <View style={[styles.listIconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="briefcase" size={24} color={colors.primary} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: colors.text }]}>
                  {asset.name || 'Unknown Asset'}
                </Text>
                <Text style={[styles.listItemSubtitle, { color: colors.textLight }]}>
                  Type: {asset.type || 'N/A'}
                </Text>
                <Text style={[styles.listItemSubtitle, { color: colors.textLight }]}>
                  Serial: {asset.serial_number || 'N/A'}
                </Text>
              </View>
            </View>
            {index < assets.length - 1 && (
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPayslipsModal = () => {
    if (!payslips || payslips.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cash-outline" size={64} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payslips Found</Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            No payslips are available at the moment
          </Text>
        </View>
      );
    }

    return (
      <View>
        {payslips.map((payslip, index) => (
          <View key={index}>
            <View style={styles.listItemModal}>
              <View style={[styles.listIconCircle, { backgroundColor: `${colors.success}15` }]}>
                <Text style={[styles.iconText, { color: colors.success }]}>₹</Text>
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: colors.text }]}>
                  {payslip.month || 'Unknown'} {payslip.year || ''}
                </Text>
                <Text style={[styles.listItemSubtitle, { color: colors.textLight }]}>
                  Net Salary: ₹{payslip.net_salary || '0'}
                </Text>
              </View>
            </View>
            {index < payslips.length - 1 && (
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderDocumentsModal = () => {
    if (!documents || documents.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Documents Found</Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            No documents have been uploaded yet
          </Text>
        </View>
      );
    }

    return (
      <View>
        {documents.map((doc, index) => (
          <View key={index}>
            <View style={styles.listItemModal}>
              <View style={[styles.listIconCircle, { backgroundColor: `${colors.warning}15` }]}>
                <Ionicons name="document-text" size={24} color={colors.warning} />
              </View>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: colors.text }]}>
                  {doc.document_name || 'Unknown Document'}
                </Text>
                <Text style={[styles.listItemSubtitle, { color: colors.textLight }]}>
                  Type: {doc.document_type || 'N/A'}
                </Text>
              </View>
            </View>
            {index < documents.length - 1 && (
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderModalContent = () => {
    switch (modalContent.type) {
      case 'personal':
        return renderPersonalDetailsModal();
      case 'idcard':
        return renderIDCardModal();
      case 'assets':
        return renderAssetsModal();
      case 'payslips':
        return renderPayslipsModal();
      case 'documents':
        return renderDocumentsModal();
      default:
        return <Text>No data available</Text>;
    }
  };

  const renderProfileContent = () => (
    <View style={styles.content}>
      {/* Contact Info Card */}
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <View style={styles.contactRow}>
          <View style={[styles.contactIconBox, { backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name="call" size={20} color={colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: colors.textLight }]}>Phone</Text>
            <Text style={[styles.contactValue, { color: colors.text }]}>
              {userData?.phone_number || 'Not provided'}
            </Text>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <View style={styles.contactRow}>
          <View style={[styles.contactIconBox, { backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name="mail" size={20} color={colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: colors.textLight }]}>Email</Text>
            <Text style={[styles.contactValue, { color: colors.text }]}>
              {userData?.email || 'Not provided'}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuSection, { backgroundColor: colors.white }]}>
        <MenuItem 
          title="Personal Details" 
          icon="person-outline" 
          onPress={() => {
            setModalContent({ title: 'Personal Details', type: 'personal', content: userData });
            setModalVisible(true);
          }} 
        />
        <MenuItem 
          title="ID Card" 
          icon="card-outline" 
          onPress={() => {
            setModalContent({ title: 'ID Card', type: 'idcard', content: userData });
            setModalVisible(true);
          }} 
        />
        <MenuItem 
          title="Assets" 
          icon="briefcase-outline" 
          onPress={() => {
            setModalContent({ title: 'My Assets', type: 'assets', content: assets });
            setModalVisible(true);
          }} 
          badge={assets.length}
        />
        <MenuItem 
          title="Payslips" 
          icon="cash-outline" 
          onPress={() => {
            setModalContent({ title: 'Payslips', type: 'payslips', content: payslips });
            setModalVisible(true);
          }} 
          badge={payslips.length}
        />
        <MenuItem 
          title="Documents" 
          icon="document-text-outline" 
          onPress={() => {
            setModalContent({ title: 'My Documents', type: 'documents', content: documents });
            setModalVisible(true);
          }} 
          badge={documents.length}
        />
      </View>

      {/* Edit Profile Section */}
      {isEditing && (
        <View style={[styles.card, { backgroundColor: colors.white, marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Information</Text>
          
          <FormInput 
            label="First Name" 
            value={formData.firstName} 
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, firstName: text }))} 
            icon="person-outline"
            editable={true}
          />
          
          <FormInput 
            label="Last Name" 
            value={formData.lastName} 
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, lastName: text }))} 
            icon="person-outline"
            editable={true}
          />
          
          <FormInput 
            label="Phone Number" 
            value={formData.phoneNumber} 
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, phoneNumber: text }))} 
            icon="call-outline"
            editable={true}
          />
          
          <FormInput 
            label="Bio" 
            value={formData.bio} 
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, bio: text }))} 
            multiline 
            icon="text-outline"
            editable={true}
          />

          <FormInput 
            label="Home Address" 
            value={formData.homeAddress} 
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, homeAddress: text }))} 
            icon="home-outline"
            editable={true}
          />

          <FormInput 
            label="Current Location" 
            value={formData.currentLocation} 
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, currentLocation: text }))} 
            icon="location-outline"
            editable={true}
          />

          <View style={styles.editActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton, { borderColor: colors.border }]} 
              onPress={() => {
                setIsEditing(false);
                populateFormData(userData!);
              }}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButtonFull, { backgroundColor: colors.primary }]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>No user data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
      
      {/* Header with Gradient and Decorative Pattern */}
      <LinearGradient 
        colors={[colors.primary, colors.primaryDark]} 
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Decorative Background Pattern */}
        <View style={styles.decorativePattern}>
          {/* Large circles */}
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
          <View style={[styles.circle, styles.circle4]} />
          
          {/* Grid pattern */}
          <View style={styles.gridPattern}>
            {[...Array(8)].map((_, i) => (
              <View key={`row-${i}`} style={styles.gridRow}>
                {[...Array(4)].map((_, j) => (
                  <View key={`dot-${i}-${j}`} style={styles.gridDot} />
                ))}
              </View>
            ))}
          </View>
          
          {/* Wave shapes */}
          <View style={[styles.wave, styles.wave1]} />
          <View style={[styles.wave, styles.wave2]} />
        </View>

        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>PROFILE</Text>
          
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons name={isEditing ? "close" : "create-outline"} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCardContainer}>
          <View style={[styles.profileCard, { backgroundColor: colors.white }]}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleImageUpload}>
              {userData.profile_picture ? (
                <Image source={{ uri: userData.profile_picture }} style={styles.avatar} />
              ) : (
                <LinearGradient 
                  colors={[colors.primary, colors.primaryDark]} 
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>
                    {userData.first_name?.[0] || 'U'}{userData.last_name?.[0] || 'N'}
                  </Text>
                </LinearGradient>
              )}
              <View style={[styles.cameraButton, { backgroundColor: colors.white }]}>
                <Ionicons name="camera" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
            
            <Text style={[styles.profileName, { color: colors.text }]}>
              {userData.first_name || ''} {userData.last_name || ''}
            </Text>
            <Text style={[styles.profileRole, { color: colors.textLight }]}>
              {userData.designation || userData.role || 'Employee'} • {userData.employee_id || 'N/A'}
            </Text>
            
            {userData.bio && (
              <Text style={[styles.profileBio, { color: colors.textLight }]}>
                {userData.bio}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {renderProfileContent()}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {modalContent.title || 'Details'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  
  header: {
    paddingBottom: 80,
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Decorative Pattern Styles
  decorativePattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -60,
  },
  circle2: {
    width: 150,
    height: 150,
    top: 100,
    left: -40,
  },
  circle3: {
    width: 100,
    height: 100,
    bottom: 50,
    right: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle4: {
    width: 80,
    height: 80,
    top: 150,
    right: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridPattern: {
    position: 'absolute',
    top: 60,
    right: 20,
    opacity: 0.4,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gridDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
  },
  wave: {
    position: 'absolute',
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 60,
  },
  wave1: {
    width: width * 1.5,
    bottom: -40,
    left: -100,
    transform: [{ rotate: '-5deg' }],
  },
  wave2: {
    width: width * 1.3,
    bottom: -20,
    right: -80,
    transform: [{ rotate: '3deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
  },
  backText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  profileCardContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 10,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileRole: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  profileBio: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  scrollView: {
    flex: 1,
    marginTop: -60,
  },
  content: {
    paddingHorizontal: 20,
  },

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },

  menuSection: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  saveButtonFull: {
    shadowColor: '#1C5CFB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },

  detailRow: {
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailDivider: {
    height: 1,
    marginVertical: 8,
  },

  idCardContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  idCardHeader: {
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
    borderBottomColor: '#e9ecef',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  idCardTitle: {
    fontSize: 13,
    marginTop: 4,
  },
  idCardContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  idCardLeft: {
    marginRight: 16,
  },
  idPhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  idPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idPhotoText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  idCardRight: {
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
    marginBottom: 2,
  },
  idPhone: {
    fontSize: 13,
  },
  idCardFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  validText: {
    fontSize: 12,
  },

  downloadButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  listItemModal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Profile;