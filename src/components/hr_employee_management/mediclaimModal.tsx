// hr_employee_management/mediclaimModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
  Linking
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../config/config';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import alert from '../../utils/Alert';

interface Employee {
  employee_id: string;
  full_name: string;
}

interface MediclaimProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
  onRefresh?: () => void;
}

interface MediclaimData {
  id: number;
  policy_number: string;
  insurance_provider_name: string;
  sum_insured_opted: string;
  base_cover: string;
  optional_top_up_cover: string;
  nominee_name?: string;
  nominee_relationship?: string;
  nominee_date_of_birth?: string;
  employee_signature?: string;
  sig_and_stamp?: string;
  update_allowed: boolean;
  verified_by?: any;
  uploaded_to_portal_on?: string;
  created_at: string;
  family?: any[];
}

const MediclaimModal: React.FC<MediclaimProps> = ({
  visible,
  onClose,
  employee,
  token,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [mediclaimData, setMediclaimData] = useState<MediclaimData | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    policy_number: '',
    insurance_provider_name: '',
    sum_insured_opted: '',
    base_cover: '',
    optional_top_up_cover: '',
  });

  useEffect(() => {
    if (visible) {
      fetchMediclaimData();
    }
  }, [visible]);

  useEffect(() => {
    // Reset state when modal closes
    if (!visible) {
      setModalMode('view');
      setIsEditing(false);
    }
  }, [visible]);

  const fetchMediclaimData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getMediclaim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id
        }),
      });

      const data = await response.json();

      if (response.ok && data.data) {
        setMediclaimData(data.data);
        setFormData({
          policy_number: data.data.policy_number || '',
          insurance_provider_name: data.data.insurance_provider_name || '',
          sum_insured_opted: data.data.sum_insured_opted?.toString() || '',
          base_cover: data.data.base_cover?.toString() || '',
          optional_top_up_cover: data.data.optional_top_up_cover?.toString() || '',
        });
      } else {
        setMediclaimData(null);
      }
    } catch (error) {
      console.error('Error fetching mediclaim:', error);
      alert('Error', 'Failed to fetch mediclaim data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMediclaim = async () => {
    if (!formData.policy_number || !formData.insurance_provider_name ||
      !formData.sum_insured_opted || !formData.base_cover ||
      !formData.optional_top_up_cover) {
      alert('Error', 'Please fill all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/addMediclaim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          policy_number: formData.policy_number,
          insurance_provider_name: formData.insurance_provider_name,
          sum_insured_opted: parseFloat(formData.sum_insured_opted),
          base_cover: parseFloat(formData.base_cover),
          optional_top_up_cover: parseFloat(formData.optional_top_up_cover),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          'Success',
          'Mediclaim created successfully! Employee will be notified to complete their details.',
          [{
            text: 'OK', onPress: () => {
              setModalMode('view');
              setFormData({
                policy_number: '',
                insurance_provider_name: '',
                sum_insured_opted: '',
                base_cover: '',
                optional_top_up_cover: '',
              });
              fetchMediclaimData();
              onRefresh?.();
            }
          }]
        );
      } else {
        alert('Error', data.message || 'Failed to create mediclaim');
      }
    } catch (error) {
      console.error('Error creating mediclaim:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMediclaim = async () => {
    if (!formData.policy_number || !formData.insurance_provider_name ||
      !formData.sum_insured_opted || !formData.base_cover ||
      !formData.optional_top_up_cover) {
      alert('Error', 'Please fill all required fields');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/updateMediclaim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          policy_number: formData.policy_number,
          insurance_provider_name: formData.insurance_provider_name,
          sum_insured_opted: parseFloat(formData.sum_insured_opted),
          base_cover: parseFloat(formData.base_cover),
          optional_top_up_cover: parseFloat(formData.optional_top_up_cover),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Success', 'Mediclaim updated successfully');
        setIsEditing(false);
        setModalMode('view');
        fetchMediclaimData();
        onRefresh?.();
      } else {
        alert('Error', data.message || 'Failed to update mediclaim');
      }
    } catch (error) {
      console.error('Error updating mediclaim:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignMediclaim = async () => {
    if (!mediclaimData?.employee_signature) {
      alert('Error', 'Employee has not signed the mediclaim yet');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const signatureFile = result.assets[0];

      alert(
        'Confirm Signature',
        'Once signed, this mediclaim cannot be edited. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign & Stamp',
            onPress: () => uploadSignature(signatureFile),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Error picking signature:', error);
      alert('Error', 'Failed to pick signature file');
    }
  };

  const uploadSignature = async (signatureFile: any) => {
    setActionLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('token', token);
      formDataToSend.append('employee_id', employee.employee_id);

      if (Platform.OS === 'web') {
        // For web, fetch the blob and create a File object
        const response = await fetch(signatureFile.uri);
        const blob = await response.blob();
        const file = new File([blob], signatureFile.name || 'signature.jpg', {
          type: signatureFile.mimeType || 'image/jpeg'
        });
        formDataToSend.append('signature', file);
      } else {
        // For mobile
        formDataToSend.append('signature', {
          uri: signatureFile.uri,
          type: signatureFile.mimeType || 'image/jpeg',
          name: signatureFile.name || 'signature.jpg',
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/manager/signMediclaim`, {
        method: 'POST',
        body: formDataToSend,
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          'Success',
          'Mediclaim signed and stamped successfully!',
          [{
            text: 'OK', onPress: () => {
              fetchMediclaimData();
              onRefresh?.();
            }
          }]
        );
      } else {
        alert('Error', data.message || 'Failed to sign mediclaim');
      }
    } catch (error) {
      console.error('Error signing mediclaim:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDocument = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert('Error', 'Cannot open this document');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Error', 'Failed to open document');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (mediclaimData) {
      setFormData({
        policy_number: mediclaimData.policy_number || '',
        insurance_provider_name: mediclaimData.insurance_provider_name || '',
        sum_insured_opted: mediclaimData.sum_insured_opted?.toString() || '',
        base_cover: mediclaimData.base_cover?.toString() || '',
        optional_top_up_cover: mediclaimData.optional_top_up_cover?.toString() || '',
      });
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPolicyColor = () => {
    if (!mediclaimData) return WHATSAPP_COLORS.primary;
    const provider = mediclaimData.insurance_provider_name?.toLowerCase() || '';
    if (provider.includes('icici')) return '#0056B3';
    if (provider.includes('hdfc')) return '#0047AB';
    if (provider.includes('bajaj')) return '#FF6B6B';
    if (provider.includes('star')) return '#4ECDC4';
    return WHATSAPP_COLORS.primary;
  };

  const canEdit = mediclaimData?.update_allowed && !mediclaimData?.sig_and_stamp;
  const isVerified = !!mediclaimData?.sig_and_stamp;
  const canSign = mediclaimData?.employee_signature && !mediclaimData?.sig_and_stamp;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="health-and-safety" size={64} color={WHATSAPP_COLORS.textTertiary} />
      <Text style={styles.emptyStateTitle}>No Mediclaim Found</Text>
      <Text style={styles.emptyStateMessage}>
        Create a mediclaim policy for {employee.full_name}
      </Text>
      <TouchableOpacity
        style={[styles.uploadPayslipButton, { marginTop: 20 }]}
        onPress={() => setModalMode('create')}
      >
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={styles.uploadPayslipButtonText}>Create Mediclaim</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPendingAction = () => (
    <View style={styles.sectionAlt}>
      <View style={[styles.statusBanner, { backgroundColor: '#FF9500' }]}>
        <View style={styles.statusIcon}>
          <Ionicons name="time-outline" size={24} color="white" />
        </View>
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>Pending Employee Action</Text>
          <Text style={styles.statusSubtitle}>
            Employee needs to complete mediclaim details
          </Text>
        </View>
      </View>
    </View>
  );

  const renderMediclaimDetails = () => {
    const policyColor = getPolicyColor();

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner - Only show if verified */}
        {isVerified && (
          <View style={[styles.statusBanner, {
            backgroundColor: '#25D366',
            margin: 16
          }]}>
            <View style={styles.statusIcon}>
              <MaterialIcons name="verified" size={24} color="white" />
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>Verified & Stamped</Text>
              <Text style={styles.statusSubtitle}>
                Sum Insured: ₹{mediclaimData?.sum_insured_opted}
              </Text>
            </View>
          </View>
        )}

        {/* Employee Signature Status */}
        {!mediclaimData?.employee_signature && (
          <View style={{ padding: 16 }}>
            {renderPendingAction()}
          </View>
        )}

        {/* Policy Details */}
        <View style={[styles.sectionAlt, { marginTop: 20 }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="policy" size={20} color={policyColor} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Policy Details</Text>
            {canEdit && !isEditing && (
              <TouchableOpacity
                style={{
                  marginLeft: 'auto',
                  backgroundColor: '#075E54',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
                onPress={() => setIsEditing(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.detailCard}>
            {isEditing ? (
              <>
                <Text style={styles.editLabel}>Policy Number *</Text>
                <TextInput
                  style={styles.editInput}
                  value={formData.policy_number}
                  onChangeText={(text) => setFormData({ ...formData, policy_number: text })}
                  placeholder="Enter policy number"
                  placeholderTextColor="#888"
                />

                <Text style={styles.editLabel}>Insurance Provider *</Text>
                <TextInput
                  style={styles.editInput}
                  value={formData.insurance_provider_name}
                  onChangeText={(text) => setFormData({ ...formData, insurance_provider_name: text })}
                  placeholder="Enter provider name"
                  placeholderTextColor="#888"
                />

                <Text style={styles.editLabel}>Sum Insured (₹) *</Text>
                <TextInput
                  style={styles.editInput}
                  value={formData.sum_insured_opted}
                  onChangeText={(text) => setFormData({ ...formData, sum_insured_opted: text })}
                  placeholder="500000"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />

                <Text style={styles.editLabel}>Base Cover (₹) *</Text>
                <TextInput
                  style={styles.editInput}
                  value={formData.base_cover}
                  onChangeText={(text) => setFormData({ ...formData, base_cover: text })}
                  placeholder="300000"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />

                <Text style={styles.editLabel}>Optional Top-up Cover (₹) *</Text>
                <TextInput
                  style={styles.editInput}
                  value={formData.optional_top_up_cover}
                  onChangeText={(text) => setFormData({ ...formData, optional_top_up_cover: text })}
                  placeholder="200000"
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                />
              </>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <MaterialIcons name="badge" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Policy Number</Text>
                  <Text style={styles.detailValue}>{mediclaimData?.policy_number}</Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <MaterialIcons name="business" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Provider</Text>
                  <Text style={[styles.detailValue, { color: policyColor, fontWeight: '700' }]}>
                    {mediclaimData?.insurance_provider_name}
                  </Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <MaterialIcons name="attach-money" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Sum Insured</Text>
                  <Text style={styles.detailValue}>₹{mediclaimData?.sum_insured_opted}</Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <MaterialIcons name="shield" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Base Cover</Text>
                  <Text style={styles.detailValue}>₹{mediclaimData?.base_cover}</Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <MaterialIcons name="add-circle" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Top-up Cover</Text>
                  <Text style={styles.detailValue}>₹{mediclaimData?.optional_top_up_cover}</Text>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={styles.detailLabel}>Created On</Text>
                  <Text style={styles.detailValue}>{formatDate(mediclaimData?.created_at)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Nominee Details */}
        {mediclaimData?.nominee_name && (
          <View style={styles.sectionAlt}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={20} color="#FF6B6B" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Nominee Details</Text>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <MaterialIcons name="person-outline" size={18} color="#666" />
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={[styles.detailValue, { color: '#FF6B6B' }]}>
                  {mediclaimData.nominee_name}
                </Text>
              </View>

              {mediclaimData.nominee_relationship && (
                <>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <MaterialIcons name="group" size={18} color="#666" />
                    <Text style={styles.detailLabel}>Relationship</Text>
                    <Text style={styles.detailValue}>{mediclaimData.nominee_relationship}</Text>
                  </View>
                </>
              )}

              {mediclaimData.nominee_date_of_birth && (
                <>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color="#666" />
                    <Text style={styles.detailLabel}>Date of Birth</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(mediclaimData.nominee_date_of_birth)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Family Members */}
        {mediclaimData?.family && mediclaimData.family.length > 0 && (
          <View style={styles.sectionAlt}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="family-restroom" size={20} color="#4ECDC4" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>
                Family Members ({mediclaimData.family.length})
              </Text>
            </View>

            {mediclaimData.family.map((member: any, index: number) => (
              <View key={index} style={[styles.familyCard, { borderLeftColor: '#4ECDC4' }]}>
                <View style={styles.familyHeader}>
                  <View style={[styles.memberAvatar, { backgroundColor: '#4ECDC4' }]}>
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
              </View>
            ))}
          </View>
        )}

        {/* Employee Signature */}
        {mediclaimData?.employee_signature && (
          <View style={styles.sectionAlt}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="draw" size={20} color="#FFA726" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Employee Signature</Text>
            </View>
            <View style={styles.hrCard}>
              <TouchableOpacity
                onPress={() => handleViewDocument(mediclaimData.employee_signature!)}
                style={styles.hrHeader}
              >
                <Text style={styles.hrTitle}>✓ Signed by Employee</Text>
                <Ionicons name="eye-outline" size={20} color="#FFA726" />
              </TouchableOpacity>
              <Image
                source={{ uri: mediclaimData.employee_signature }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* HR Signature */}
        {mediclaimData?.sig_and_stamp && (
          <View style={styles.sectionAlt}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="verified-user" size={20} color="#25D366" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>HR Verification</Text>
            </View>
            <View style={styles.hrCard}>
              <View style={styles.hrHeader}>
                <Text style={styles.hrTitle}>✓ Verified & Stamped by HR</Text>
                <TouchableOpacity
                  onPress={() => handleViewDocument(mediclaimData.sig_and_stamp!)}
                >
                  <Ionicons name="eye-outline" size={20} color="#25D366" />
                </TouchableOpacity>
              </View>
              <Image
                source={{ uri: mediclaimData.sig_and_stamp }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
              <Text style={styles.hrDate}>
                Verified on: {formatDate(mediclaimData.uploaded_to_portal_on)}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleCancelEdit}
              style={[styles.actionButtonLarge, styles.cancelButton]}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUpdateMediclaim}
              style={[
                styles.actionButtonLarge,
                styles.saveButton,
                actionLoading && styles.disabledButton
              ]}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>
                    Save Changes
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : canSign && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleSignMediclaim}
              style={[
                styles.actionButtonLarge,
                styles.saveButton,
                actionLoading && styles.disabledButton
              ]}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="verified-user" size={20} color="#fff" />
                  <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>
                    Sign & Stamp
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  const renderCreateForm = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Info Banner */}
      <View style={[styles.statusBanner, { backgroundColor: '#4ECDC4', margin: 16 }]}>
        <View style={styles.statusIcon}>
          <Ionicons name="information-circle" size={24} color="white" />
        </View>
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>New Policy</Text>
          <Text style={styles.statusSubtitle}>
            Employee will be notified to complete details
          </Text>
        </View>
      </View>

      {/* Form Section */}
      <View style={[styles.sectionAlt, { marginTop: 0 }]}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="policy" size={20} color={WHATSAPP_COLORS.primary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Policy Information</Text>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.editLabel}>Policy Number *</Text>
          <TextInput
            style={styles.editInput}
            value={formData.policy_number}
            onChangeText={(text) => setFormData({ ...formData, policy_number: text })}
            placeholder="POL-123456"
            placeholderTextColor="#888"
          />

          <Text style={styles.editLabel}>Insurance Provider *</Text>
          <TextInput
            style={styles.editInput}
            value={formData.insurance_provider_name}
            onChangeText={(text) => setFormData({ ...formData, insurance_provider_name: text })}
            placeholder="Insurance Company Name"
            placeholderTextColor="#888"
          />

          <Text style={styles.editLabel}>Sum Insured (₹) *</Text>
          <TextInput
            style={styles.editInput}
            value={formData.sum_insured_opted}
            onChangeText={(text) => setFormData({ ...formData, sum_insured_opted: text })}
            placeholder="500000"
            keyboardType="numeric"
            placeholderTextColor="#888"
          />

          <Text style={styles.editLabel}>Base Cover (₹) *</Text>
          <TextInput
            style={styles.editInput}
            value={formData.base_cover}
            onChangeText={(text) => setFormData({ ...formData, base_cover: text })}
            placeholder="300000"
            keyboardType="numeric"
            placeholderTextColor="#888"
          />

          <Text style={styles.editLabel}>Optional Top-up Cover (₹) *</Text>
          <TextInput
            style={styles.editInput}
            value={formData.optional_top_up_cover}
            onChangeText={(text) => setFormData({ ...formData, optional_top_up_cover: text })}
            placeholder="200000"
            keyboardType="numeric"
            placeholderTextColor="#888"
          />
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.assetsModalOverlay}>
        <View style={styles.assetsModalContainer}>
          <View style={styles.assetsModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="health-and-safety" size={24} color={WHATSAPP_COLORS.primary} />
              <Text style={[styles.assetsModalTitle, { marginLeft: 8 }]}>
                {modalMode === 'create' ? 'Create Mediclaim Policy' : 'Mediclaim Details'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (modalMode === 'create') {
                  setModalMode('view');
                } else if (isEditing) {
                  setIsEditing(false);
                } else {
                  onClose();
                }
              }}
              style={{ marginLeft: 12 }}
            >
              <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {modalMode === 'view' ? (
            loading && !mediclaimData ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
                <Text style={styles.loadingText}>Loading mediclaim details...</Text>
              </View>
            ) : mediclaimData ? (
              renderMediclaimDetails()
            ) : (
              renderEmptyState()
            )
          ) : (
            renderCreateForm()
          )}

          {modalMode === 'create' && (
            <View style={[styles.actionContainer, { marginBottom: 16 }]}>
              <TouchableOpacity
                style={[styles.actionButtonLarge, styles.cancelButton]}
                onPress={() => {
                  setModalMode('view');
                  setFormData({
                    policy_number: '',
                    insurance_provider_name: '',
                    sum_insured_opted: '',
                    base_cover: '',
                    optional_top_up_cover: '',
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButtonLarge,
                  styles.saveButton,
                  actionLoading && styles.disabledButton
                ]}
                onPress={handleCreateMediclaim}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="add-circle" size={20} color="#fff" />
                    <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>Create Policy</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MediclaimModal;