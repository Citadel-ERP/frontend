// hr_employee_management/mediclaimModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee, MediclaimData } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';

interface MediclaimModalProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
  mediclaimData?: MediclaimData;
}

const MediclaimModal: React.FC<MediclaimModalProps> = ({
  visible,
  onClose,
  employee,
  token,
  mediclaimData,
}) => {
  const [mediclaim, setMediclaim] = useState({
    policy_number: mediclaimData?.policy_number || '',
    insurance_provider_name: mediclaimData?.insurance_provider_name || '',
    sum_insured_opted: mediclaimData?.sum_insured_opted?.toString() || '',
    base_cover: mediclaimData?.base_cover?.toString() || '',
    optional_top_up_cover: mediclaimData?.optional_top_up_cover?.toString() || '',
  });

  const saveMediclaim = async () => {
    if (!mediclaim.policy_number || !mediclaim.insurance_provider_name || 
        !mediclaim.sum_insured_opted || !mediclaim.base_cover || !mediclaim.optional_top_up_cover) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const endpoint = mediclaimData ? 
        `${BACKEND_URL}/hr_manager/updateMediclaim` : 
        `${BACKEND_URL}/hr_manager/addMediclaim`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          ...mediclaim,
          sum_insured_opted: parseFloat(mediclaim.sum_insured_opted),
          base_cover: parseFloat(mediclaim.base_cover),
          optional_top_up_cover: parseFloat(mediclaim.optional_top_up_cover),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', mediclaimData ? 'Mediclaim updated' : 'Mediclaim added');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to save mediclaim');
      }
    } catch (error) {
      console.error('Error saving mediclaim:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const signMediclaim = async () => {
    Alert.alert(
      'Sign Mediclaim',
      'Are you ready to sign this mediclaim document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/hr_manager/signMediclaim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  employee_id: employee.employee_id,
                }),
              });

              if (response.ok) {
                Alert.alert('Success', 'Mediclaim signed successfully');
                onClose();
              } else {
                Alert.alert('Error', 'Failed to sign mediclaim');
              }
            } catch (error) {
              console.error('Error signing mediclaim:', error);
              Alert.alert('Error', 'Network error occurred');
            }
          }
        }
      ]
    );
  };

  const unsignMediclaim = async () => {
    Alert.alert(
      'Unsign Mediclaim',
      'Are you sure you want to unsign this mediclaim?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsign',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/hr_manager/unsignMediclaim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  employee_id: employee.employee_id,
                }),
              });

              if (response.ok) {
                Alert.alert('Success', 'Mediclaim unsigned');
                onClose();
              } else {
                Alert.alert('Error', 'Failed to unsign mediclaim');
              }
            } catch (error) {
              console.error('Error unsigning mediclaim:', error);
              Alert.alert('Error', 'Network error occurred');
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {mediclaimData ? 'Mediclaim Details' : 'Add Mediclaim'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalLabel}>Policy Number *</Text>
          <TextInput
            style={styles.modalInput}
            value={mediclaim.policy_number}
            onChangeText={(text) => setMediclaim({...mediclaim, policy_number: text})}
            placeholder="POL-123456"
            editable={!mediclaimData?.update_allowed}
          />
          
          <Text style={styles.modalLabel}>Insurance Provider *</Text>
          <TextInput
            style={styles.modalInput}
            value={mediclaim.insurance_provider_name}
            onChangeText={(text) => setMediclaim({...mediclaim, insurance_provider_name: text})}
            placeholder="Insurance Company Name"
            editable={!mediclaimData?.update_allowed}
          />
          
          <Text style={styles.modalLabel}>Sum Insured (₹) *</Text>
          <TextInput
            style={styles.modalInput}
            value={mediclaim.sum_insured_opted}
            onChangeText={(text) => setMediclaim({...mediclaim, sum_insured_opted: text})}
            placeholder="500000"
            keyboardType="numeric"
            editable={!mediclaimData?.update_allowed}
          />
          
          <Text style={styles.modalLabel}>Base Cover (₹) *</Text>
          <TextInput
            style={styles.modalInput}
            value={mediclaim.base_cover}
            onChangeText={(text) => setMediclaim({...mediclaim, base_cover: text})}
            placeholder="300000"
            keyboardType="numeric"
            editable={!mediclaimData?.update_allowed}
          />
          
          <Text style={styles.modalLabel}>Optional Top-up Cover (₹) *</Text>
          <TextInput
            style={styles.modalInput}
            value={mediclaim.optional_top_up_cover}
            onChangeText={(text) => setMediclaim({...mediclaim, optional_top_up_cover: text})}
            placeholder="200000"
            keyboardType="numeric"
            editable={!mediclaimData?.update_allowed}
          />
          
          {mediclaimData && (
            <>
              <Text style={styles.modalLabel}>Status</Text>
              <View style={{
                padding: 12,
                backgroundColor: mediclaimData.update_allowed ? '#FFF3E0' : '#E8F5E9',
                borderRadius: 8,
                marginBottom: 16,
              }}>
                <Text style={{
                  color: mediclaimData.update_allowed ? '#EF6C00' : '#2E7D32',
                  fontWeight: '600',
                }}>
                  {mediclaimData.update_allowed ? 'Update Allowed' : 'Signed & Verified'}
                </Text>
              </View>
            </>
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            {mediclaimData ? (
              <>
                {mediclaimData.update_allowed ? (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={saveMediclaim}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.submitButtonText}>Update</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: '#FF9500' }]}
                      onPress={unsignMediclaim}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.submitButtonText}>Unsign</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={signMediclaim}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.submitButtonText}>Sign</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={saveMediclaim}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default MediclaimModal;