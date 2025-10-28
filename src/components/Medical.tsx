import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
  Alert, ActivityIndicator, Image, TextInput, Modal, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';

interface MedicalProps {
  onBack: () => void;
}

interface FamilyMember {
  id: number;
  first_name: string;
  last_name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
  dependant: boolean;
  aadhar_card: string;
  pan_card: string;
  existing_illness: string[];
  created_at: string;
  updated_at: string;
}

interface MediclaimData {
  id: number;
  user: any;
  policy_number: string;
  insurance_provider_name: string;
  sum_insured_opted: string;
  base_cover: boolean;
  optional_top_up_cover: boolean;
  created_at: string;
  updated_at: string;
  nominee_name: string | null;
  nominee_relationship: string | null;
  nominee_date_of_birth: string | null;
  date_received: string | null;
  verified_by: any;
  remarks: string | null;
  uploaded_to_portal_on: string;
  sig_and_stamp: string | null;
  employee_signature: string | null;
  update_allowed: boolean;
  family: FamilyMember[];
}

const Medical: React.FC<MedicalProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediclaimData, setMediclaimData] = useState<MediclaimData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [editingFamilyIndex, setEditingFamilyIndex] = useState<number | null>(null);
  
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('');
  const [nomineeDOB, setNomineeDOB] = useState('');
  const [showNomineeDatePicker, setShowNomineeDatePicker] = useState(false);
  const [nomineeDate, setNomineeDate] = useState(new Date());
  
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [signature, setSignature] = useState<any>(null);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showFamilyDatePicker, setShowFamilyDatePicker] = useState(false);
  const [familyMemberDate, setFamilyMemberDate] = useState(new Date());

  const [newFamilyMember, setNewFamilyMember] = useState({
    first_name: '',
    last_name: '',
    relationship: '',
    date_of_birth: '',
    gender: '',
    dependant: false,
    aadhar_card: null as any,
    pan_card: null as any,
    existing_illness: [] as string[],
  });

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

  useEffect(() => {
    if (token) {
      fetchMediclaimData();
    }
  }, [token]);

  const fetchMediclaimData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/core/getMediclaim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (data.message === "Mediclaim fetched successfully") {
        setMediclaimData(data.data);
        setNomineeName(data.data.nominee_name || '');
        setNomineeRelationship(data.data.nominee_relationship || '');
        setNomineeDOB(data.data.nominee_date_of_birth || '');
        setFamilyMembers(data.data.family || []);
      } else {
        setMediclaimData(null);
      }
    } catch (error) {
      console.error('Error fetching mediclaim:', error);
      Alert.alert('Error', 'Failed to fetch mediclaim data');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (url: string, filename: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this document');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const downloadAllDocuments = async () => {
    Alert.alert(
      'Download All',
      'This will open all available documents in your browser',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            const documents: { url: string; name: string }[] = [];
            
            if (mediclaimData?.employee_signature) {
              documents.push({ url: mediclaimData.employee_signature, name: 'Employee Signature' });
            }
            if (mediclaimData?.sig_and_stamp) {
              documents.push({ url: mediclaimData.sig_and_stamp, name: 'HR Signature & Stamp' });
            }
            
            familyMembers.forEach((member, index) => {
              if (member.aadhar_card) {
                documents.push({ url: member.aadhar_card, name: `${member.first_name} - Aadhar` });
              }
              if (member.pan_card) {
                documents.push({ url: member.pan_card, name: `${member.first_name} - PAN` });
              }
            });

            for (const doc of documents) {
              await downloadDocument(doc.url, doc.name);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          },
        },
      ]
    );
  };

  const pickDocument = async (type: 'aadhar' | 'pan' | 'signature') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: type === 'signature' ? 'image/*' : ['image/*', 'application/pdf'],
      });

      if (!result.canceled) {
        const file = result.assets?.[0];
        if (file) {
          if (type === 'signature') {
            setSignature(file);
          } else {
            setNewFamilyMember(prev => ({
              ...prev,
              [type === 'aadhar' ? 'aadhar_card' : 'pan_card']: file,
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleNomineeDateChange = (event: any, selectedDate?: Date) => {
    setShowNomineeDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNomineeDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setNomineeDOB(formattedDate);
    }
  };

  const handleFamilyDateChange = (event: any, selectedDate?: Date) => {
    setShowFamilyDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFamilyMemberDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setNewFamilyMember(prev => ({ ...prev, date_of_birth: formattedDate }));
    }
  };

  const handleAddFamilyMember = () => {
    if (!newFamilyMember.first_name || !newFamilyMember.last_name || !newFamilyMember.relationship) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    
    if (editingFamilyIndex !== null) {
      const updatedMembers = [...familyMembers];
      updatedMembers[editingFamilyIndex] = { ...newFamilyMember };
      setFamilyMembers(updatedMembers);
      setEditingFamilyIndex(null);
    } else {
      setFamilyMembers([...familyMembers, { ...newFamilyMember }]);
    }
    
    setNewFamilyMember({
      first_name: '',
      last_name: '',
      relationship: '',
      date_of_birth: '',
      gender: '',
      dependant: false,
      aadhar_card: null,
      pan_card: null,
      existing_illness: [],
    });
    setShowAddFamily(false);
  };

  const handleEditFamilyMember = (index: number) => {
    setNewFamilyMember(familyMembers[index]);
    setEditingFamilyIndex(index);
    setShowAddFamily(true);
  };

  const handleDeleteFamilyMember = (index: number) => {
    Alert.alert(
      'Delete Family Member',
      'Are you sure you want to delete this family member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedMembers = familyMembers.filter((_, i) => i !== index);
            setFamilyMembers(updatedMembers);
          },
        },
      ]
    );
  };

  const handleUpdateMediclaim = async () => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('token', token || '');
      formData.append('nominee_name', nomineeName);
      formData.append('nominee_relationship', nomineeRelationship);
      formData.append('nominee_date_of_birth', nomineeDOB);
      formData.append('family_members', JSON.stringify(familyMembers));

      if (signature) {
        formData.append('employee_sign', {
          uri: signature.uri,
          type: signature.mimeType || 'image/jpeg',
          name: signature.name || 'signature.jpg',
        } as any);
      }

      familyMembers.forEach((member, index) => {
        if (member.aadhar_card && member.aadhar_card.uri) {
          formData.append(`aadhar_card_${index}`, {
            uri: member.aadhar_card.uri,
            type: member.aadhar_card.mimeType || 'application/pdf',
            name: member.aadhar_card.name || `aadhar_${index}.pdf`,
          } as any);
        }
        if (member.pan_card && member.pan_card.uri) {
          formData.append(`pan_card_${index}`, {
            uri: member.pan_card.uri,
            type: member.pan_card.mimeType || 'application/pdf',
            name: member.pan_card.name || `pan_${index}.pdf`,
          } as any);
        }
      });

      const response = await fetch(`${BACKEND_URL}/core/updateMediclaim`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.message === "Mediclaim updated successfully") {
        Alert.alert('Success', 'Mediclaim updated successfully');
        setIsEditing(false);
        fetchMediclaimData();
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      console.error('Error updating mediclaim:', error);
      Alert.alert('Error', 'Failed to update mediclaim');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const BackIcon = ({ color = colors.white, size = 24 }) => (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.5, height: size * 0.5, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: color, transform: [{ rotate: '45deg' }], marginLeft: size * 0.15 }} />
    </View>
  );

  const DownloadIcon = ({ size = 20, color = colors.primary }) => (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.7, height: size * 0.8, position: 'relative' }}>
        <View style={{ 
          width: size * 0.7, 
          height: size * 0.5, 
          borderWidth: 2, 
          borderColor: color, 
          borderTopWidth: 0,
          position: 'absolute',
          bottom: 0,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }} />
        <View style={{
          width: 2.5,
          height: size * 0.45,
          backgroundColor: color,
          position: 'absolute',
          left: size * 0.325,
          top: 0,
        }} />
        <View style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRightWidth: 2.5,
          borderBottomWidth: 2.5,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          position: 'absolute',
          left: size * 0.2,
          top: size * 0.22,
        }} />
      </View>
    </View>
  );

  const EditIcon = ({ size = 18 }) => (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.9, height: size * 0.9, position: 'relative' }}>
        <View style={{
          width: size * 0.45,
          height: size * 0.7,
          borderWidth: 2,
          borderColor: colors.primary,
          transform: [{ rotate: '45deg' }],
          position: 'absolute',
          right: 0,
          top: -size * 0.05,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        }} />
        <View style={{
          width: size * 0.2,
          height: size * 0.2,
          backgroundColor: colors.primary,
          transform: [{ rotate: '45deg' }],
          position: 'absolute',
          right: size * 0.05,
          top: -size * 0.12,
          borderRadius: 2,
        }} />
        <View style={{
          width: size * 0.55,
          height: 2,
          backgroundColor: colors.primary,
          position: 'absolute',
          left: 0,
          bottom: size * 0.15,
        }} />
        <View style={{
          width: 2,
          height: size * 0.2,
          backgroundColor: colors.primary,
          position: 'absolute',
          left: 0,
          bottom: size * 0.15,
        }} />
      </View>
    </View>
  );

  const DeleteIcon = ({ size = 18 }) => (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.6, height: size * 0.75, borderWidth: 2, borderColor: colors.error, borderTopWidth: 0, borderTopLeftRadius: 2, borderTopRightRadius: 2 }}>
        <View style={{ width: size * 0.7, height: 2, backgroundColor: colors.error, position: 'absolute', top: -size * 0.15, left: -size * 0.05 }} />
        <View style={{ width: 2, height: size * 0.4, backgroundColor: colors.error, position: 'absolute', top: size * 0.1, left: size * 0.15 }} />
        <View style={{ width: 2, height: size * 0.4, backgroundColor: colors.error, position: 'absolute', top: size * 0.1, right: size * 0.15 }} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mediclaim</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!mediclaimData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mediclaim</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2965/2965140.png' }} 
            style={styles.emptyImage} 
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No Mediclaim Found</Text>
          <Text style={styles.emptyText}>Please ask your HR to add your mediclaim details</Text>
        </View>
      </View>
    );
  }

  const canUpdate = mediclaimData.update_allowed && !mediclaimData.sig_and_stamp;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mediclaim</Text>
        <TouchableOpacity style={styles.downloadAllButton} onPress={downloadAllDocuments}>
          <DownloadIcon size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Policy Information</Text>
              {canUpdate && !isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Policy Number:</Text>
              <Text style={styles.infoValue}>{mediclaimData.policy_number}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Insurance Provider:</Text>
              <Text style={styles.infoValue}>{mediclaimData.insurance_provider_name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sum Insured:</Text>
              <Text style={styles.infoValue}>₹{mediclaimData.sum_insured_opted}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created On:</Text>
              <Text style={styles.infoValue}>{formatDate(mediclaimData.created_at)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nominee Details</Text>
            
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Nominee Name"
                  value={nomineeName}
                  onChangeText={setNomineeName}
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nominee Relationship"
                  value={nomineeRelationship}
                  onChangeText={setNomineeRelationship}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowNomineeDatePicker(true)}
                >
                  <Text style={nomineeDOB ? styles.dateInputText : styles.dateInputPlaceholder}>
                    {nomineeDOB || 'Select Nominee Date of Birth'}
                  </Text>
                </TouchableOpacity>
                {showNomineeDatePicker && (
                  <DateTimePicker
                    value={nomineeDate}
                    mode="date"
                    display="default"
                    onChange={handleNomineeDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{mediclaimData.nominee_name || 'N/A'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Relationship:</Text>
                  <Text style={styles.infoValue}>{mediclaimData.nominee_relationship || 'N/A'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date of Birth:</Text>
                  <Text style={styles.infoValue}>{formatDate(mediclaimData.nominee_date_of_birth)}</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Family Members</Text>
              {isEditing && (
                <TouchableOpacity onPress={() => setShowAddFamily(true)} style={styles.addButton}>
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {familyMembers.length === 0 ? (
              <Text style={styles.noDataText}>No family members added</Text>
            ) : (
              familyMembers.map((member, index) => (
                <View key={index} style={styles.familyMemberCard}>
                  <View style={styles.familyMemberHeader}>
                    <Text style={styles.familyMemberName}>{member.first_name} {member.last_name}</Text>
                    {isEditing && (
                      <View style={styles.familyMemberActions}>
                        <TouchableOpacity onPress={() => handleEditFamilyMember(index)} style={styles.iconButton}>
                          <EditIcon size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteFamilyMember(index)} style={styles.iconButton}>
                          <DeleteIcon size={20} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <View style={styles.familyMemberDetails}>
                    <Text style={styles.familyMemberText}>Relationship: {member.relationship}</Text>
                    <Text style={styles.familyMemberText}>DOB: {formatDate(member.date_of_birth)}</Text>
                    <Text style={styles.familyMemberText}>Gender: {member.gender}</Text>
                    <View style={styles.dependantRow}>
                      <Text style={styles.familyMemberText}>Dependant: </Text>
                      {member.dependant && (
                        <View style={styles.dependantBadge}>
                          <Text style={styles.dependantBadgeText}>✓</Text>
                        </View>
                      )}
                      {!member.dependant && <Text style={styles.familyMemberText}>No</Text>}
                    </View>
                    {member.existing_illness && member.existing_illness.length > 0 && (
                      <Text style={styles.familyMemberText}>Illness: {member.existing_illness.join(', ')}</Text>
                    )}
                    {member.aadhar_card && (
                      <TouchableOpacity 
                        onPress={() => downloadDocument(member.aadhar_card, `aadhar_${index}.pdf`)}
                        style={styles.downloadButton}
                      >
                        <DownloadIcon size={16} />
                        <Text style={styles.downloadButtonText}>Download Aadhar</Text>
                      </TouchableOpacity>
                    )}
                    {member.pan_card && (
                      <TouchableOpacity 
                        onPress={() => downloadDocument(member.pan_card, `pan_${index}.pdf`)}
                        style={styles.downloadButton}
                      >
                        <DownloadIcon size={16} />
                        <Text style={styles.downloadButtonText}>Download PAN</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {isEditing && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Signature</Text>
              <TouchableOpacity onPress={() => pickDocument('signature')} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>
                  {signature ? 'Signature Selected' : 'Upload Signature'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mediclaimData.employee_signature && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Employee Signature</Text>
                <TouchableOpacity 
                  onPress={() => downloadDocument(mediclaimData.employee_signature!, 'employee_signature.jpg')}
                  style={styles.downloadIconButton}
                >
                  <DownloadIcon />
                </TouchableOpacity>
              </View>
              <Image source={{ uri: mediclaimData.employee_signature }} style={styles.signatureImage} resizeMode="contain" />
            </View>
          )}

          {mediclaimData.sig_and_stamp && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>HR Signature & Stamp</Text>
                <TouchableOpacity 
                  onPress={() => downloadDocument(mediclaimData.sig_and_stamp!, 'hr_signature.jpg')}
                  style={styles.downloadIconButton}
                >
                  <DownloadIcon />
                </TouchableOpacity>
              </View>
              <Image source={{ uri: mediclaimData.sig_and_stamp }} style={styles.signatureImage} resizeMode="contain" />
              <Text style={styles.verifiedText}>✓ Verified by HR</Text>
            </View>
          )}

          {isEditing && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateMediclaim} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}

          {!canUpdate && !mediclaimData.sig_and_stamp && (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>Updates are currently not allowed</Text>
            </View>
          )}

        </View>
      </ScrollView>

      <Modal visible={showAddFamily} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingFamilyIndex !== null ? 'Edit Family Member' : 'Add Family Member'}
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="First Name *"
                value={newFamilyMember.first_name}
                onChangeText={(text) => setNewFamilyMember(prev => ({ ...prev, first_name: text }))}
                placeholderTextColor={colors.textSecondary}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Last Name *"
                value={newFamilyMember.last_name}
                onChangeText={(text) => setNewFamilyMember(prev => ({ ...prev, last_name: text }))}
                placeholderTextColor={colors.textSecondary}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Relationship *"
                value={newFamilyMember.relationship}
                onChangeText={(text) => setNewFamilyMember(prev => ({ ...prev, relationship: text }))}
                placeholderTextColor={colors.textSecondary}
              />
              
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowFamilyDatePicker(true)}
              >
                <Text style={newFamilyMember.date_of_birth ? styles.dateInputText : styles.dateInputPlaceholder}>
                  {newFamilyMember.date_of_birth || 'Select Date of Birth'}
                </Text>
              </TouchableOpacity>
              {showFamilyDatePicker && (
                <DateTimePicker
                  value={familyMemberDate}
                  mode="date"
                  display="default"
                  onChange={handleFamilyDateChange}
                  maximumDate={new Date()}
                />
              )}
              
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowGenderDropdown(!showGenderDropdown)}
              >
                <Text style={newFamilyMember.gender ? styles.dateInputText : styles.dateInputPlaceholder}>
                  {newFamilyMember.gender || 'Select Gender'}
                </Text>
              </TouchableOpacity>
              
              {showGenderDropdown && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setNewFamilyMember(prev => ({ ...prev, gender: 'Male' }));
                      setShowGenderDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setNewFamilyMember(prev => ({ ...prev, gender: 'Female' }));
                      setShowGenderDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Female</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity 
                onPress={() => setNewFamilyMember(prev => ({ ...prev, dependant: !prev.dependant }))}
                style={styles.checkboxContainer}
              >
                <View style={[styles.checkbox, newFamilyMember.dependant && styles.checkboxChecked]}>
                  {newFamilyMember.dependant && (
                    <Text style={styles.checkboxTick}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Is Dependant</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => pickDocument('aadhar')} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>
                  {newFamilyMember.aadhar_card ? 'Aadhar Selected' : 'Upload Aadhar Card'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => pickDocument('pan')} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>
                  {newFamilyMember.pan_card ? 'PAN Selected' : 'Upload PAN Card'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => {
                  setShowAddFamily(false);
                  setEditingFamilyIndex(null);
                  setNewFamilyMember({
                    first_name: '',
                    last_name: '',
                    relationship: '',
                    date_of_birth: '',
                    gender: '',
                    dependant: false,
                    aadhar_card: null,
                    pan_card: null,
                    existing_illness: [],
                  });
                }} 
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddFamilyMember} style={styles.modalSaveButton}>
                <Text style={styles.modalSaveButtonText}>
                  {editingFamilyIndex !== null ? 'Update' : 'Add Member'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Medical;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  downloadAllButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  loadingText: {
    marginTop: 16,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 40,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  dateInputPlaceholder: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  dropdownButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  dropdownList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  familyMemberCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  familyMemberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  familyMemberName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  familyMemberActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconButtonText: {
    fontSize: 18,
  },
  familyMemberDetails: {
    gap: 6,
  },
  familyMemberText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  dependantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dependantBadge: {
    backgroundColor: colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dependantBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  downloadButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadIconButton: {
    padding: 8,
  },
  uploadButton: {
    backgroundColor: colors.info,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  signatureImage: {
    width: '100%',
    height: 150,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  verifiedText: {
    marginTop: 12,
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  warningText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.success,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
  },
  checkboxTick: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 50,
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 50,
  },
  modalSaveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});