import React, { useState, useEffect } from 'react';
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
import { Asset, AssetFormData } from '../types/asset.types';

interface UpdateAssetModalProps {
  visible: boolean;
  asset: Asset | null;
  onClose: () => void;
  onSubmit: (id: number, data: Partial<AssetFormData>) => Promise<boolean>;
  isDark?: boolean;
}

export const UpdateAssetModal: React.FC<UpdateAssetModalProps> = ({
  visible,
  asset,
  onClose,
  onSubmit,
  isDark = false,
}) => {
  const [formData, setFormData] = useState<Partial<AssetFormData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({
        asset_name: asset.asset_name,
        asset_type: asset.asset_type,
        asset_description: asset.asset_description,
        asset_count: asset.asset_count.toString(),
        asset_serial: asset.asset_serial ?? '', 
      });
    }
  }, [asset]);

  const theme = {
    bgColor: isDark ? '#111a2d' : '#ffffff',
    modalBg: isDark ? '#1a2539' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
    borderColor: isDark ? '#2a3549' : '#e0e0e0',
  };

  const handleSubmit = async () => {
    if (!asset?.id) return;

    setLoading(true);
    const success = await onSubmit(asset.id, formData);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!asset) return null;

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
              Update Asset
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>Serial Number</Text>
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
              <Text style={[styles.label, { color: theme.textMain }]}>Asset Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                value={formData.asset_name}
                onChangeText={(text) => setFormData({ ...formData, asset_name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>Asset Type</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                value={formData.asset_type}
                onChangeText={(text) => setFormData({ ...formData, asset_type: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                value={formData.asset_description}
                onChangeText={(text) => setFormData({ ...formData, asset_description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>Asset Count</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                value={formData.asset_count?.toString()}
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
                {loading ? 'Updating...' : 'Update Asset'}
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