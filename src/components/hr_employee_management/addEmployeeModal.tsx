// hr_employee_management/addEmployeeModal.tsx
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
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface AddEmployeeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  token: string;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  visible,
  onClose,
  onSubmit,
  token,
}) => {
  const [employeeData, setEmployeeData] = useState({
    employee_email: '',
    employee_id: '',
    employee_password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    tag: { tag_name: 'employee', tag_type: 'role' },
    office_id: '1',
    earned_leaves: 12,
    sick_leaves: 6,
    casual_leaves: 6,
    joining_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = () => {
    if (!employeeData.employee_email || !employeeData.employee_id || 
        !employeeData.employee_password || !employeeData.first_name) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    onSubmit(employeeData);
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
            <Text style={styles.modalTitle}>Add New Employee</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalLabel}>Email *</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.employee_email}
            onChangeText={(text) => setEmployeeData({...employeeData, employee_email: text})}
            placeholder="employee@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Text style={styles.modalLabel}>Employee ID *</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.employee_id}
            onChangeText={(text) => setEmployeeData({...employeeData, employee_id: text})}
            placeholder="EMP001"
            autoCapitalize="characters"
          />
          
          <Text style={styles.modalLabel}>Password *</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.employee_password}
            onChangeText={(text) => setEmployeeData({...employeeData, employee_password: text})}
            placeholder="Enter password"
            secureTextEntry
          />
          
          <Text style={styles.modalLabel}>First Name *</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.first_name}
            onChangeText={(text) => setEmployeeData({...employeeData, first_name: text})}
            placeholder="John"
          />
          
          <Text style={styles.modalLabel}>Last Name</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.last_name}
            onChangeText={(text) => setEmployeeData({...employeeData, last_name: text})}
            placeholder="Doe"
          />
          
          <Text style={styles.modalLabel}>Phone Number</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.phone_number}
            onChangeText={(text) => setEmployeeData({...employeeData, phone_number: text})}
            placeholder="+91 1234567890"
            keyboardType="phone-pad"
          />
          
          <Text style={styles.modalLabel}>Earned Leaves</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.earned_leaves.toString()}
            onChangeText={(text) => setEmployeeData({...employeeData, earned_leaves: parseInt(text) || 0})}
            keyboardType="numeric"
            placeholder="12"
          />
          
          <Text style={styles.modalLabel}>Sick Leaves</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.sick_leaves.toString()}
            onChangeText={(text) => setEmployeeData({...employeeData, sick_leaves: parseInt(text) || 0})}
            keyboardType="numeric"
            placeholder="6"
          />
          
          <Text style={styles.modalLabel}>Casual Leaves</Text>
          <TextInput
            style={styles.modalInput}
            value={employeeData.casual_leaves.toString()}
            onChangeText={(text) => setEmployeeData({...employeeData, casual_leaves: parseInt(text) || 0})}
            keyboardType="numeric"
            placeholder="6"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>Add Employee</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default AddEmployeeModal;