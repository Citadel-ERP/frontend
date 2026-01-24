import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
  Alert, ActivityIndicator, Image, TextInput, Modal, Platform, Linking,
  SafeAreaView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons, FontAwesome, AntDesign } from '@expo/vector-icons';

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
  const [downloadingPDF, setDownloadingPDF] = useState(false);
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

  const downloadPDF = async () => {
    try {
      setDownloadingPDF(true);

      const response = await fetch(`${BACKEND_URL}/core/downloadMediclaim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.status !== 200) {
        Alert.alert('Error', 'Failed to download PDF');
        setDownloadingPDF(false);
        return;
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        Alert.alert('Error', 'PDF is empty');
        setDownloadingPDF(false);
        return;
      }

      // Read blob as text (base64)
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];

          // Use documentDirectory without accessing EncodingType
          const documentPath = FileSystem.documentDirectory + `mediclaim_${Date.now()}.pdf`;

          // Write file
          await FileSystem.writeAsStringAsync(documentPath, base64String, {
            encoding: 'base64',
          });

          // Share
          await Sharing.shareAsync(documentPath, {
            mimeType: 'application/pdf',
          });

          Alert.alert('Success', 'PDF downloaded');
        } catch (err) {
          console.error(err);
          Alert.alert('Error', 'Failed to save PDF');
        } finally {
          setDownloadingPDF(false);
        }
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to download PDF');
      setDownloadingPDF(false);
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

  const pickDocument = async (type: 'aadhar' | 'pan' | 'signature') => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: type === 'signature' ? ['image/jpeg', 'image/png', 'image/jpg'] : ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
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
  const member = familyMembers[index];
  // Convert string URLs to null for editing - user needs to re-upload if they want to change
  setNewFamilyMember({
    ...member,
    aadhar_card: (typeof member.aadhar_card === 'string') ? null : member.aadhar_card,
    pan_card: (typeof member.pan_card === 'string') ? null : member.pan_card,
  });
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
      
      console.log('=== STEP 1: Testing nominee update ===');
      const nomineeFormData = new FormData();
      nomineeFormData.append('token', token || '');
      nomineeFormData.append('nominee_name', nomineeName);
      nomineeFormData.append('nominee_relationship', nomineeRelationship);
      nomineeFormData.append('nominee_date_of_birth', nomineeDOB);
      nomineeFormData.append('family_members', JSON.stringify([]));
      
      console.log('Sending nominee update...');
      let response = await fetch(`${BACKEND_URL}/core/updateMediclaim`, {
        method: 'POST',
        body: nomineeFormData,
      });
      
      let data = await response.json();
      console.log('Nominee update response:', data);
      
      if (data.message !== "Mediclaim updated successfully") {
        Alert.alert('Error', 'Nominee update failed: ' + data.message);
        setLoading(false);
        return;
      }
      
      if (familyMembers.length > 0) {
        console.log('=== STEP 2: Updating family members ===');
        console.log('Family members count:', familyMembers.length);
        
        familyMembers.forEach((member, idx) => {
          console.log(`Member ${idx}:`, {
            name: `${member.first_name} ${member.last_name}`,
            hasAadhar: !!member.aadhar_card?.uri,
            hasPan: !!member.pan_card?.uri,
            aadharUri: member.aadhar_card?.uri,
            panUri: member.pan_card?.uri,
          });
        });
        
        const familyFormData = new FormData();
        familyFormData.append('token', token || '');
        
        const processedMembers = familyMembers.map((member) => ({
          first_name: member.first_name,
          last_name: member.last_name,
          relationship: member.relationship,
          date_of_birth: member.date_of_birth,
          gender: member.gender,
          dependant: member.dependant,
          existing_illness: member.existing_illness || [],
          ...(member.id && { id: member.id }),
        }));
        
        familyFormData.append('family_members', JSON.stringify(processedMembers));
        
        console.log('Attaching files...');
        familyMembers.forEach((member, index) => {
          if (member.aadhar_card && typeof member.aadhar_card === 'object' && member.aadhar_card.uri) { console.log(`Appending aadhar for ${member.first_name} ${member.last_name}`);
        const key = `aadhar_card_${member.first_name}_${member.last_name}`;
        familyFormData.append(key, {
          uri: member.aadhar_card.uri,
          type: 'application/pdf',
          name: member.aadhar_card.name || `aadhar_${index}.pdf`,
        } as any);
      }
          
          if (member.pan_card && typeof member.pan_card === 'object' && member.pan_card.uri) {console.log(`Appending pan for ${member.first_name} ${member.last_name}`);
          const key = `pan_card_${member.first_name}_${member.last_name}`;
          familyFormData.append(key, {
            uri: member.pan_card.uri,
            type: 'application/pdf',
            name: member.pan_card.name || `pan_${index}.pdf`,
          } as any);
        }
      });
        
        console.log('Sending family members update...');
        response = await fetch(`${BACKEND_URL}/core/updateMediclaim`, {
          method: 'POST',
          body: familyFormData,
        });
        
        data = await response.json();
        console.log('Family update response:', data);
        
        if (data.message !== "Mediclaim updated successfully") {
          Alert.alert('Error', 'Family members update failed: ' + data.message);
          setLoading(false);
          return;
        }
      }
      
      if (signature && signature.uri) {
          console.log('=== STEP 3: Uploading signature ===');
          const signatureFormData = new FormData();
          signatureFormData.append('token', token || '');
          signatureFormData.append('family_members', JSON.stringify([]));
          
          console.log('Signature details:', signature);
          
          // Determine the correct mime type
          const mimeType = signature.mimeType || signature.type || 'image/jpeg';
          const fileName = signature.name || `signature_${Date.now()}.jpg`;
          
          signatureFormData.append('employee_sign', {
            uri: signature.uri,
            type: mimeType,
            name: fileName,
          } as any);
                
        console.log('Sending signature upload...');
        response = await fetch(`${BACKEND_URL}/core/updateMediclaim`, {
          method: 'POST',
          body: signatureFormData,
        });
        
        data = await response.json();
        console.log('Signature upload response:', data);
        
        if (data.message !== "Mediclaim updated successfully") {
          Alert.alert('Error', 'Signature upload failed: ' + data.message);
          setLoading(false);
          return;
        }
      }
      
      Alert.alert('Success', 'Mediclaim updated successfully');
      setIsEditing(false);
      fetchMediclaimData();
      
    } catch (error) {
      console.error('Error updating mediclaim:', error);
      console.error('Error stack:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'Failed to update mediclaim: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getPolicyColor = () => {
    if (!mediclaimData) return '#128C7E';
    const provider = mediclaimData.insurance_provider_name?.toLowerCase() || '';
    if (provider.includes('icici')) return '#0056B3';
    if (provider.includes('hdfc')) return '#0047AB';
    if (provider.includes('bajaj')) return '#FF6B6B';
    if (provider.includes('star')) return '#4ECDC4';
    return '#128C7E';
  };

  const getMemberColor = (index: number) => {
    const colors = ['#25D366', '#34B7F1', '#FF6B6B', '#4ECDC4', '#FFA726', '#AB47BC'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#075E54" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={[styles.avatar, { backgroundColor: '#25D366' }]}>
              <MaterialIcons name="health-and-safety" size={24} color="white" />
            </View>
            <Text style={styles.headerTitle}>Mediclaim</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.typingIndicator}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
          <Text style={styles.loadingText}>Loading your mediclaim details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mediclaimData) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#075E54" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={[styles.avatar, { backgroundColor: '#25D366' }]}>
              <MaterialIcons name="health-and-safety" size={24} color="white" />
            </View>
            <Text style={styles.headerTitle}>Mediclaim</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyAvatar}>
            <MaterialIcons name="search-off" size={64} color="#25D366" />
          </View>
          <Text style={styles.emptyTitle}>No Mediclaim Found</Text>
          <Text style={styles.emptySubtitle}>Please ask your HR to add your mediclaim details</Text>
          <TouchableOpacity style={styles.contactButton} onPress={onBack}>
            <Text style={styles.contactButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canUpdate = mediclaimData.update_allowed && !mediclaimData.sig_and_stamp;
  const policyColor = getPolicyColor();

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.avatar, { backgroundColor: policyColor }]}>
            <MaterialIcons name="health-and-safety" size={24} color="white" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Mediclaim</Text>
            <Text style={styles.headerSubtitle}>
              {mediclaimData.insurance_provider_name} • Active
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.downloadButton} 
          onPress={downloadPDF}
          disabled={downloadingPDF}
        >
          {downloadingPDF ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="download-outline" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: policyColor }]}>
          <View style={styles.statusIcon}>
            <MaterialIcons name="verified" size={24} color="white" />
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Policy Active</Text>
            <Text style={styles.statusSubtitle}>Sum Insured: ₹{mediclaimData.sum_insured_opted}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{mediclaimData.policy_number}</Text>
          </View>
        </View>

        {/* Edit Button */}
        {/* Move edit button to Policy Details section header */}

        {/* Policy Details Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="policy" size={20} color={policyColor} />
            <Text style={styles.sectionTitle}>Policy Details</Text>
            {canUpdate && !isEditing && (
              <TouchableOpacity 
                onPress={() => setIsEditing(true)} 
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={18} color="#25D366" />
                <Text style={styles.editButtonText}>Edit Details</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <MaterialIcons name="badge" size={18} color="#666" />
              <Text style={styles.detailLabel}>Policy Number</Text>
              <Text style={styles.detailValue}>{mediclaimData.policy_number}</Text>
            </View>
            
            <View style={styles.detailDivider} />
            
            <View style={styles.detailRow}>
              <MaterialIcons name="business" size={18} color="#666" />
              <Text style={styles.detailLabel}>Insurance Provider</Text>
              <Text style={[styles.detailValue, { color: policyColor, fontWeight: '700' }]}>
                {mediclaimData.insurance_provider_name}
              </Text>
            </View>
            
            <View style={styles.detailDivider} />
            
            <View style={styles.detailRow}>
              <MaterialIcons name="attach-money" size={18} color="#666" />
              <Text style={styles.detailLabel}>Sum Insured</Text>
              <Text style={styles.detailValue}>₹{mediclaimData.sum_insured_opted}</Text>
            </View>
            
            <View style={styles.detailDivider} />
            
            <View style={styles.detailRow}>
              <MaterialIcons name="calendar-today" size={18} color="#666" />
              <Text style={styles.detailLabel}>Created On</Text>
              <Text style={styles.detailValue}>{formatDate(mediclaimData.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Nominee Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={20} color="#FF6B6B" />
            <Text style={styles.sectionTitle}>Nominee Details</Text>
          </View>
          
          <View style={styles.detailCard}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Nominee Name"
                  value={nomineeName}
                  onChangeText={setNomineeName}
                  placeholderTextColor="#888"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nominee Relationship"
                  value={nomineeRelationship}
                  onChangeText={setNomineeRelationship}
                  placeholderTextColor="#888"
                />
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowNomineeDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                  <Text style={nomineeDOB ? styles.inputText : styles.inputPlaceholder}>
                    {nomineeDOB || 'Select Date of Birth'}
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
                <View style={styles.detailRow}>
                  <MaterialIcons name="person-outline" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={[styles.detailValue, { color: '#FF6B6B' }]}>
                    {mediclaimData.nominee_name || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="group" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Relationship</Text>
                  <Text style={styles.detailValue}>{mediclaimData.nominee_relationship || 'N/A'}</Text>
                </View>
                
                <View style={styles.detailDivider} />
                
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Date of Birth</Text>
                  <Text style={styles.detailValue}>{formatDate(mediclaimData.nominee_date_of_birth)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Family Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="family-restroom" size={20} color="#4ECDC4" />
            <Text style={styles.sectionTitle}>Family Members ({familyMembers.length})</Text>
            {isEditing && (
              <TouchableOpacity 
                onPress={() => setShowAddFamily(true)} 
                style={styles.addMemberButton}
              >
                <Ionicons name="add-circle" size={24} color="#4ECDC4" />
              </TouchableOpacity>
            )}
          </View>
          
          {familyMembers.length === 0 ? (
            <View style={styles.emptyFamilyCard}>
              <Ionicons name="people-outline" size={48} color="#ddd" />
              <Text style={styles.emptyFamilyText}>No family members added</Text>
            </View>
          ) : (
            familyMembers.map((member, index) => (
              <View key={index} style={[styles.familyCard, { borderLeftColor: getMemberColor(index) }]}>
                <View style={styles.familyHeader}>
                  <View style={[styles.memberAvatar, { backgroundColor: getMemberColor(index) }]}>
                    <Text style={styles.memberInitials}>
                      {member.first_name[0]}{member.last_name[0]}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.first_name} {member.last_name}
                    </Text>
                    <Text style={styles.memberRelationship}>{member.relationship}</Text>
                  </View>
                  {isEditing && (
                    <View style={styles.familyActions}>
                      <TouchableOpacity 
                        onPress={() => handleEditFamilyMember(index)} 
                        style={styles.actionButton}
                      >
                        <Ionicons name="create-outline" size={18} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteFamilyMember(index)} 
                        style={styles.actionButton}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <View style={styles.familyDetails}>
                  <View style={styles.detailBadge}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.badgeText}>{formatDate(member.date_of_birth)}</Text>
                  </View>
                  <View style={styles.detailBadge}>
                    <MaterialIcons name="wc" size={14} color="#666" />
                    <Text style={styles.badgeText}>{member.gender}</Text>
                  </View>
                  {member.dependant && (
                    <View style={[styles.detailBadge, { backgroundColor: '#E8F5E9' }]}>
                      <Ionicons name="checkmark-circle" size={14} color="#25D366" />
                      <Text style={[styles.badgeText, { color: '#25D366' }]}>Dependant</Text>
                    </View>
                  )}
                </View>
                
                {(member.aadhar_card || member.pan_card) && (
                  <View style={styles.documentSection}>
                    <Text style={styles.documentTitle}>Documents:</Text>
                    <View style={styles.documentButtons}>
                      {member.aadhar_card && (
                        <TouchableOpacity 
                          onPress={() => downloadDocument(member.aadhar_card, `aadhar_${index}.pdf`)}
                          style={[styles.documentButton, { backgroundColor: '#25D366' }]}
                        >
                          <Ionicons name="document-text-outline" size={16} color="white" />
                          <Text style={styles.documentButtonText}>Aadhar</Text>
                        </TouchableOpacity>
                      )}
                      {member.pan_card && (
                        <TouchableOpacity 
                          onPress={() => downloadDocument(member.pan_card, `pan_${index}.pdf`)}
                          style={[styles.documentButton, { backgroundColor: '#34B7F1' }]}
                        >
                          <Ionicons name="document-text-outline" size={16} color="white" />
                          <Text style={styles.documentButtonText}>PAN</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Signature Section */}
        {isEditing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="draw" size={20} color="#FFA726" />
              <Text style={styles.sectionTitle}>Your Signature</Text>
            </View>
            <TouchableOpacity 
              onPress={() => pickDocument('signature')} 
              style={styles.signatureCard}
            >
              <Ionicons name="cloud-upload-outline" size={32} color="#FFA726" />
              <Text style={styles.signatureText}>
                {signature ? 'Signature Selected ✓' : 'Tap to Upload Signature'}
              </Text>
              <Text style={styles.signatureSubtext}>JPG, PNG or PDF format</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HR Signature */}
        {mediclaimData.sig_and_stamp && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="verified-user" size={20} color="#25D366" />
              <Text style={styles.sectionTitle}>HR Verification</Text>
            </View>
            <View style={styles.hrCard}>
              <View style={styles.hrHeader}>
                <Text style={styles.hrTitle}>✓ Verified & Stamped by HR</Text>
                <TouchableOpacity 
                  onPress={() => downloadDocument(mediclaimData!.sig_and_stamp!, 'hr_signature.jpg')}
                  style={styles.hrDownloadButton}
                >
                  <Ionicons name="download-outline" size={20} color="#25D366" />
                </TouchableOpacity>
              </View>
              <Image 
                source={{ uri: mediclaimData.sig_and_stamp }} 
                style={styles.signatureImage} 
                resizeMode="contain" 
              />
              <Text style={styles.hrDate}>Verified on: {formatDate(mediclaimData.uploaded_to_portal_on)}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              onPress={() => setIsEditing(false)} 
              style={[styles.actionButtonLarge, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleUpdateMediclaim} 
              style={[styles.actionButtonLarge, styles.saveButton]}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        ) : !canUpdate && !mediclaimData.sig_and_stamp ? (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle-outline" size={24} color="#FF6B6B" />
            <Text style={styles.warningText}>Updates are currently not allowed</Text>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Family Member Modal */}
      <Modal visible={showAddFamily} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFamilyIndex !== null ? 'Edit Family Member' : 'Add Family Member'}
              </Text>
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
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  style={styles.modalInput}
                  placeholder="First Name"
                  value={newFamilyMember.first_name}
                  onChangeText={(text) => setNewFamilyMember(prev => ({ ...prev, first_name: text }))}
                  placeholderTextColor="#888"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Last Name"
                  value={newFamilyMember.last_name}
                  onChangeText={(text) => setNewFamilyMember(prev => ({ ...prev, last_name: text }))}
                  placeholderTextColor="#888"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <MaterialIcons name="group" size={20} color="#666" />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Relationship (Spouse, Child, Parent)"
                  value={newFamilyMember.relationship}
                  onChangeText={(text) => setNewFamilyMember(prev => ({ ...prev, relationship: text }))}
                  placeholderTextColor="#888"
                />
              </View>
              
              <TouchableOpacity
                style={styles.inputGroup}
                onPress={() => setShowFamilyDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={newFamilyMember.date_of_birth ? styles.modalInputText : styles.modalInputPlaceholder}>
                  {newFamilyMember.date_of_birth || 'Date of Birth'}
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
                style={styles.inputGroup}
                onPress={() => setShowGenderDropdown(!showGenderDropdown)}
              >
                <MaterialIcons name="wc" size={20} color="#666" />
                <Text style={newFamilyMember.gender ? styles.modalInputText : styles.modalInputPlaceholder}>
                  {newFamilyMember.gender || 'Select Gender'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" style={styles.dropdownArrow} />
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
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setNewFamilyMember(prev => ({ ...prev, gender: 'Other' }));
                      setShowGenderDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Other</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity 
                onPress={() => setNewFamilyMember(prev => ({ ...prev, dependant: !prev.dependant }))}
                style={styles.checkboxContainer}
              >
                <View style={[styles.checkbox, newFamilyMember.dependant && styles.checkboxChecked]}>
                  {newFamilyMember.dependant && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Is Dependant</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => pickDocument('aadhar')} 
                style={[styles.documentUpload, styles.aadharUpload]}
              >
                <MaterialIcons name="badge" size={24} color="#25D366" />
                <View style={styles.uploadInfo}>
                  <Text style={styles.uploadTitle}>Aadhar Card</Text>
                  <Text style={styles.uploadSubtitle}>
                    {newFamilyMember.aadhar_card ? 'File Selected ✓' : 'Tap to upload'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => pickDocument('pan')} 
                style={[styles.documentUpload, styles.panUpload]}
              >
                <MaterialIcons name="credit-card" size={24} color="#34B7F1" />
                <View style={styles.uploadInfo}>
                  <Text style={styles.uploadTitle}>PAN Card</Text>
                  <Text style={styles.uploadSubtitle}>
                    {newFamilyMember.pan_card ? 'File Selected ✓' : 'Tap to upload'}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={handleAddFamilyMember} style={styles.modalSaveButton}>
                <Text style={styles.modalSaveButtonText}>
                  {editingFamilyIndex !== null ? 'Update Member' : 'Add Member'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Medical;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#075E54',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#075E54',
    borderBottomWidth: 1,
    borderBottomColor: '#128C7E',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  downloadButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIcon: {
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  editFloatingButton: {
    position: 'absolute',
    right: 16,
    top: 100,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  editFloatingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#075E54',
    marginLeft: 8,
  },
  addMemberButton: {
    marginLeft: 'auto',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  editButton: {
  marginLeft: 'auto',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#E8F5E9',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  gap: 4,
},
editButtonText: {
  color: '#25D366',
  fontSize: 13,
  fontWeight: '600',
},
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
    color: '#075E54',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 14,
    color: '#075E54',
    marginLeft: 10,
    flex: 1,
  },
  inputPlaceholder: {
    fontSize: 14,
    color: '#888',
    marginLeft: 10,
    flex: 1,
  },
  emptyFamilyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFamilyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  familyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitials: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#075E54',
  },
  memberRelationship: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  familyActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
    marginLeft: 8,
  },
  familyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
  },
  documentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  documentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  documentButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  documentButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  signatureCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFA726',
    borderStyle: 'dashed',
  },
  signatureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA726',
    marginTop: 12,
  },
  signatureSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  hrCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  hrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hrTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#25D366',
  },
  hrDownloadButton: {
    padding: 4,
  },
  signatureImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },
  hrDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  actionButtonLarge: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#25D366',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ECE5DD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  typingIndicator: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#25D366',
    marginHorizontal: 3,
    opacity: 0.6,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#ECE5DD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#075E54',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  contactButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#075E54',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  modalFooter: {
    padding: 20,
    paddingTop: 0,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalInput: {
    flex: 1,
    fontSize: 14,
    color: '#075E54',
    marginLeft: 12,
  },
  modalInputText: {
    flex: 1,
    fontSize: 14,
    color: '#075E54',
    marginLeft: 12,
  },
  modalInputPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    marginLeft: 12,
  },
  dropdownArrow: {
    marginLeft: 'auto',
  },
  dropdownList: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#075E54',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#25D366',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#25D366',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#075E54',
    fontWeight: '500',
  },
  documentUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  aadharUpload: {
    borderColor: '#25D366',
  },
  panUpload: {
    borderColor: '#34B7F1',
  },
  uploadInfo: {
    flex: 1,
    marginLeft: 12,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  modalSaveButton: {
    backgroundColor: '#25D366',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});