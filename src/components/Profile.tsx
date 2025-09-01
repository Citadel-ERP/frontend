import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const Profile = ({ onBack, userData: propUserData }) => {
  const insets = useSafeAreaInsets();
  
  // Core States
  const [loading, setLoading] = useState(!propUserData);
  const [userData, setUserData] = useState(propUserData || null);
  const [token, setToken] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({});
  
  // Form States
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    phoneNumber: '',
    homeAddress: '',
    currentLocation: '',
  });
  
  // Feature Data States
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [payslips, setPayslips] = useState([]);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token_2');
      setToken(storedToken);
      
      if (propUserData) {
        populateFormData(propUserData);
        fetchAdditionalData(storedToken);
      } else if (storedToken) {
        await fetchUserData(storedToken);
      }
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const populateFormData = (user) => {
    setFormData({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      bio: user.bio || '',
      phoneNumber: user.phone_number || '',
      homeAddress: user.home_address?.address || '',
      currentLocation: user.current_location?.address || '',
    });
  };

  const fetchUserData = async (userToken) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/core/getUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: userToken }),
      });
      
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

  const fetchAdditionalData = async (userToken) => {
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

      const [docsData, assetsData, payslipsData] = await Promise.all([
        docsRes.json(),
        assetsRes.json(),
        payslipsRes.json(),
      ]);

      setDocuments(docsData.documents || []);
      setAssets(assetsData.assets || []);
      setPayslips(payslipsData.payslips || []);
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
        // Update userData with new values
        setUserData(prev => ({
          ...prev,
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          phone_number: formData.phoneNumber,
        }));
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = () => {
    Alert.alert('Update Picture', 'Choose option', [
      { text: 'Camera', onPress: () => openCamera() },
      { text: 'Gallery', onPress: () => openGallery() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = () => {
    launchCamera({ mediaType: 'photo', quality: 0.8 }, handleImageResponse);
  };

  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, handleImageResponse);
  };

  const handleImageResponse = async (response) => {
    if (response.assets?.[0] && token) {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('profile_picture', {
        uri: response.assets[0].uri,
        type: response.assets[0].type,
        name: response.assets[0].fileName || 'profile.jpg',
      });

      try {
        const res = await fetch(`${BACKEND_URL}/core/uploadProfilePicture`, {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data' },
          body: formData,
        });
        
        const result = await res.json();
        if (res.ok) {
          setUserData(prev => ({ ...prev, profile_picture: result.profile_picture_url }));
          Alert.alert('Success', 'Profile picture updated!');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };

  const showModal = (title, content, type = 'text') => {
    setModalContent({ title, content, type });
    setModalVisible(true);
  };

  const renderIDCard = () => (
    <View style={styles.idCard}>
      <View style={styles.idCardHeader}>
        <Text style={styles.companyName}>Company Name</Text>
        <Text style={styles.idCardTitle}>Employee ID Card</Text>
      </View>
      
      <View style={styles.idCardContent}>
        <View style={styles.idCardLeft}>
          {userData.profile_picture ? (
            <Image source={{ uri: userData.profile_picture }} style={styles.idPhoto} />
          ) : (
            <View style={styles.idPhotoPlaceholder}>
              <Text style={styles.idPhotoText}>
                {userData.first_name?.charAt(0)}{userData.last_name?.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.idCardRight}>
          <Text style={styles.idName}>{userData.full_name}</Text>
          <Text style={styles.idDesignation}>{userData.designation || userData.role}</Text>
          <Text style={styles.idNumber}>ID: {userData.employee_id}</Text>
          <Text style={styles.idEmail}>{userData.email}</Text>
          <Text style={styles.idPhone}>{userData.phone_number}</Text>
        </View>
      </View>
      
      <View style={styles.idCardFooter}>
        <Text style={styles.validText}>Valid until: Dec 2024</Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileContent();
      case 'idcard':
        return renderIDCard();
      case 'assets':
        return renderAssets();
      case 'payslips':
        return renderPayslips();
      case 'documents':
        return renderDocuments();
      default:
        return renderProfileContent();
    }
  };

  const renderProfileContent = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <FormInput
            label="First Name"
            value={formData.firstName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
            editable={isEditing}
          />
          <FormInput
            label="Last Name"
            value={formData.lastName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
            editable={isEditing}
          />
        </View>
        
        <FormInput
          label="Email"
          value={userData.email}
          editable={false}
        />
        
        <FormInput
          label="Phone"
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
          editable={isEditing}
        />
        
        <FormInput
          label="Bio"
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
          multiline
          editable={isEditing}
        />
        
        <FormInput
          label="Home Address"
          value={formData.homeAddress}
          onChangeText={(text) => setFormData(prev => ({ ...prev, homeAddress: text }))}
          editable={isEditing}
        />
        
        <FormInput
          label="Current Location"
          value={formData.currentLocation}
          onChangeText={(text) => setFormData(prev => ({ ...prev, currentLocation: text }))}
          editable={isEditing}
          note="Update with manager approval for office travel"
        />
      </View>
    </View>
  );

  const renderAssets = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Assigned Assets</Text>
      <View style={styles.card}>
        {assets.length > 0 ? assets.map((asset, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.listItem}
            onPress={() => showModal('Asset Details', asset, 'asset')}
          >
            <View style={styles.assetIcon}>
              <Text style={styles.assetIconText}>{asset.type?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{asset.name}</Text>
              <Text style={styles.listItemSubtitle}>{asset.type} • {asset.serial_number}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )) : (
          <Text style={styles.emptyText}>No assets assigned</Text>
        )}
      </View>
    </View>
  );

  const renderPayslips = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payslips</Text>
      <View style={styles.card}>
        {payslips.length > 0 ? payslips.map((payslip, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.listItem}
            onPress={() => showModal('Payslip', payslip, 'payslip')}
          >
            <View style={styles.payslipIcon}>
              <Text style={styles.payslipIconText}>₹</Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{payslip.month} {payslip.year}</Text>
              <Text style={styles.listItemSubtitle}>Net: ₹{payslip.net_salary}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )) : (
          <Text style={styles.emptyText}>No payslips available</Text>
        )}
      </View>
    </View>
  );

  const renderDocuments = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Documents</Text>
      <View style={styles.card}>
        {documents.length > 0 ? documents.map((doc, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.listItem}
            onPress={() => showModal('Document', doc, 'document')}
          >
            <View style={styles.docIcon}>
              <Text style={styles.docIconText}>📄</Text>
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{doc.document_name}</Text>
              <Text style={styles.listItemSubtitle}>{doc.document_type}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )) : (
          <Text style={styles.emptyText}>No documents uploaded</Text>
        )}
      </View>
    </View>
  );

  const FormInput = ({ label, value, onChangeText, editable = true, multiline = false, note }) => (
    <View style={[styles.inputContainer, multiline && { flex: 1 }]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {note && <Text style={styles.noteText}>{note}</Text>}
    </View>
  );

  const TabButton = ({ title, isActive, onPress, icon }) => (
    <TouchableOpacity 
      style={[styles.tabButton, isActive && styles.activeTab]} 
      onPress={onPress}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        
        {activeTab === 'profile' && (
          !isEditing ? (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.white} /> : 
                  <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          )
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleImageUpload}>
            {userData.profile_picture ? (
              <Image source={{ uri: userData.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userData.first_name?.[0]}{userData.last_name?.[0]}
                </Text>
              </View>
            )}
            <View style={styles.cameraButton}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{userData.full_name}</Text>
          <Text style={styles.profileRole}>{userData.designation || userData.role}</Text>
        </View>

        {/* Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabContainer}
          contentContainerStyle={styles.tabContent}
        >
          <TabButton title="Profile" icon="👤" isActive={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
          <TabButton title="ID Card" icon="🆔" isActive={activeTab === 'idcard'} onPress={() => setActiveTab('idcard')} />
          <TabButton title="Assets" icon="💼" isActive={activeTab === 'assets'} onPress={() => setActiveTab('assets')} />
          <TabButton title="Payslips" icon="💰" isActive={activeTab === 'payslips'} onPress={() => setActiveTab('payslips')} />
          <TabButton title="Documents" icon="📄" isActive={activeTab === 'documents'} onPress={() => setActiveTab('documents')} />
        </ScrollView>

        {/* Tab Content */}
        {renderTabContent()}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>{JSON.stringify(modalContent.content, null, 2)}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  loadingText: { color: colors.white, marginTop: spacing.md },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  backIcon: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.white, fontSize: fontSize.xl, fontWeight: '600' },
  editButton: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  editIcon: { color: colors.white, fontSize: 16 },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  cancelButton: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 15 },
  cancelText: { color: colors.white, fontSize: 14 },
  saveButton: { padding: spacing.sm, backgroundColor: colors.success, borderRadius: 15, minWidth: 50, alignItems: 'center' },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '600' },

  // Profile Header
  profileHeader: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: spacing.md,
  },
  avatarContainer: { position: 'relative', marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.white },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: 'bold' },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, backgroundColor: colors.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { fontSize: 12 },
  profileName: { color: colors.white, fontSize: fontSize.xl, fontWeight: 'bold', marginBottom: 4 },
  profileRole: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.md },

  // Tabs
  tabContainer: { backgroundColor: colors.white, marginBottom: spacing.md },
  tabContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 6, marginRight: spacing.sm, borderRadius: 12, backgroundColor: colors.backgroundSecondary, minHeight: 26 },
  activeTab: { backgroundColor: colors.primary },
  tabIcon: { fontSize: 12, marginRight: 4 },
  tabText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: colors.white, fontWeight: '600' },

  // Content
  content: { flex: 1, paddingHorizontal: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.sm },

  // Form
  inputContainer: { marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md },
  multilineInput: { height: 60, textAlignVertical: 'top' },
  inputDisabled: { backgroundColor: colors.backgroundSecondary, color: colors.textSecondary },
  noteText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, fontStyle: 'italic' },

  // ID Card
  idCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md },
  idCardHeader: { alignItems: 'center', marginBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: spacing.md },
  companyName: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.primary },
  idCardTitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  idCardContent: { flexDirection: 'row', marginBottom: spacing.lg },
  idCardLeft: { marginRight: spacing.lg },
  idPhoto: { width: 60, height: 60, borderRadius: 8 },
  idPhotoPlaceholder: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  idPhotoText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  idCardRight: { flex: 1 },
  idName: { fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  idDesignation: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xs },
  idNumber: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginBottom: spacing.xs },
  idEmail: { fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs },
  idPhone: { fontSize: fontSize.sm, color: colors.text },
  idCardFooter: { alignItems: 'center', borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md },
  validText: { fontSize: fontSize.xs, color: colors.textSecondary },

  // List Items
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  listItemContent: { flex: 1, marginLeft: spacing.md },
  listItemTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  listItemSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: fontSize.lg, color: colors.textSecondary },
  
  // Icons
  assetIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  assetIconText: { color: colors.white, fontSize: fontSize.lg, fontWeight: 'bold' },
  payslipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  payslipIconText: { color: colors.white, fontSize: fontSize.lg, fontWeight: 'bold' },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.warning, justifyContent: 'center', alignItems: 'center' },
  docIconText: { fontSize: fontSize.lg },

  // Empty State
  emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: fontSize.md, paddingVertical: spacing.xl },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.white, borderRadius: borderRadius.lg, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  closeButton: { fontSize: fontSize.xl, color: colors.textSecondary },
  modalBody: { padding: spacing.lg },
  modalText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },

  bottomSpacing: { height: spacing.xl },
});

export default Profile;