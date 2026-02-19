import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssetFormData } from '../types/asset.types';

interface CreateAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => Promise<boolean>;
  isDark?: boolean;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isDark = false,
}) => {
  const [formData, setFormData] = useState<AssetFormData>({
    asset_name: '',
    asset_type: '',
    asset_description: '',
    asset_count: '',
    asset_serial: '',
  });
  const [loading, setLoading] = useState(false);

  const theme = {
    bgColor: isDark ? '#111a2d' : '#ffffff',
    modalBg: isDark ? '#1a2539' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
    borderColor: isDark ? '#2a3549' : '#e0e0e0',
  };

  const handleSubmit = async () => {
    if (!formData.asset_name || !formData.asset_type || !formData.asset_count) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    const success = await onSubmit(formData);
    setLoading(false);

    if (success) {
      setFormData({
        asset_name: '',
        asset_type: '',
        asset_description: '',
        asset_count: '',
        asset_serial: '',
      });
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.bgColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Create New Asset
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.textMain }]}>
              Serial Number
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.modalBg,
                color: theme.textMain,
                borderColor: theme.borderColor,
              }]}
              placeholder="e.g., SN-123456"
              placeholderTextColor={theme.textSub}
              value={formData.asset_serial}
              onChangeText={(text) => setFormData({ ...formData, asset_serial: text })}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>
                Asset Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                placeholder="e.g., laptop-bangalore"
                placeholderTextColor={theme.textSub}
                value={formData.asset_name}
                onChangeText={(text) => setFormData({ ...formData, asset_name: text })}
              />
              <Text style={[styles.hint, { color: theme.textSub }]}>
                Include location with hyphen (e.g., laptop-bangalore)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>
                Asset Type <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                placeholder="e.g., Laptop, Printer, Monitor"
                placeholderTextColor={theme.textSub}
                value={formData.asset_type}
                onChangeText={(text) => setFormData({ ...formData, asset_type: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>
                Description
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                placeholder="Enter asset description"
                placeholderTextColor={theme.textSub}
                value={formData.asset_description}
                onChangeText={(text) => setFormData({ ...formData, asset_description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>
                Asset Count <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                placeholder="Enter quantity"
                placeholderTextColor={theme.textSub}
                value={formData.asset_count.toString()}
                onChangeText={(text) => setFormData({ ...formData, asset_count: text })}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: theme.textMain }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: theme.accentBlue }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                {loading ? 'Creating...' : 'Create Asset'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#ff4444',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#008069',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});