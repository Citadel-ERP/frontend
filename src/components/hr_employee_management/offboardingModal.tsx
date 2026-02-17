// hr_employee_management/offboardingModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import alert from '../../utils/Alert';

interface OffboardingModalProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
  onSuccess: () => void;
}

const OffboardingModal: React.FC<OffboardingModalProps> = ({
  visible,
  onClose,
  employee,
  token,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  const validateOffboarding = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/offboardEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          validate_only: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResults(data);
        setStep(2);
      } else {
        const errorData = await response.json();
        alert('Validation Failed', errorData.message);
      }
    } catch (error) {
      console.error('Error validating offboarding:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const completeOffboarding = async () => {
    onClose();
  };

  const renderStep1 = () => (
    <>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Offboard Employee</Text>
      </View>
      
      <Text style={styles.modalDescription}>
        You are about to offboard {employee.full_name} ({employee.employee_id}).
        {'\n\n'}This action will:
      </Text>
      
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={{ marginLeft: 8, color: WHATSAPP_COLORS.textPrimary }}>
            Remove access to all modules
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={{ marginLeft: 8, color: WHATSAPP_COLORS.textPrimary }}>
            Cancel all pending requests
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={{ marginLeft: 8, color: WHATSAPP_COLORS.textPrimary }}>
            Archive user data
          </Text>
        </View>
      </View>
      
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: '#FF9500' }]}
          onPress={validateOffboarding}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Offboarding Validation</Text>
      </View>
      
      <Text style={styles.modalDescription}>
        Validation Results:
      </Text>
      
      {validationResults && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: validationResults.success ? '#2E7D32' : '#D32F2F', marginBottom: 12 }}>
            {validationResults.message}
          </Text>
          
          {validationResults.validations && (
            <View>
              {validationResults.validations.map((validation: any, index: number) => (
                <View key={index} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 8,
                  padding: 8,
                  backgroundColor: validation.passed ? '#E8F5E9' : '#FFEBEE',
                  borderRadius: 6,
                }}>
                  <Ionicons 
                    name={validation.passed ? 'checkmark-circle' : 'close-circle'} 
                    size={20} 
                    color={validation.passed ? '#2E7D32' : '#D32F2F'} 
                  />
                  <Text style={{ marginLeft: 8, flex: 1, color: validation.passed ? '#2E7D32' : '#D32F2F' }}>
                    {validation.message}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: validationResults?.success ? '#D32F2F' : '#D32F2F' }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.submitButtonText]}>Complete </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {step === 1 ? renderStep1() : renderStep2()}
        </View>
      </View>
    </Modal>
  );
};

export default OffboardingModal;