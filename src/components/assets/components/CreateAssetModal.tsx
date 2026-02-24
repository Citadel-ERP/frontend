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
import { AssetFormData } from '../types/asset.types';

interface CreateAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => Promise<boolean>;
  isDark?: boolean;
  city?: string;
}

const EMPTY_FORM = (city: string): AssetFormData => ({
  asset_name: '',
  asset_type: '',
  asset_description: '',
  asset_count: '',
  asset_serial: '',
  city,
});

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isDark = false,
  city = '',
}) => {
  const [formData, setFormData] = useState<AssetFormData>(EMPTY_FORM(city));
  const [loading, setLoading] = useState(false);

  // Sync city if it changes externally
  useEffect(() => {
    setFormData((prev) => ({ ...prev, city }));
  }, [city]);

  const theme = {
    bgColor: isDark ? '#111a2d' : '#ffffff',
    modalBg: isDark ? '#1a2539' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
    borderColor: isDark ? '#2a3549' : '#e0e0e0',
    cityBadgeBg: isDark ? '#1e3a2f' : '#e6f4f1',
  };

  const handleSubmit = async () => {
    if (!formData.asset_name.trim() || !formData.asset_type.trim() || !formData.asset_count) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // Auto-append city suffix to asset_name if not already present
    const suffix = `-${city.toLowerCase()}`;
    const finalName =
      city && !formData.asset_name.toLowerCase().endsWith(suffix)
        ? `${formData.asset_name.trim()}${suffix}`
        : formData.asset_name.trim();

    setLoading(true);
    const success = await onSubmit({
      ...formData,
      asset_name: finalName,
      city,
    });
    setLoading(false);

    if (success) {
      setFormData(EMPTY_FORM(city));
      onClose();
    }
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM(city));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.bgColor }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Create New Asset
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          {/* City badge — read-only */}
          {city ? (
            <View style={[styles.cityBadge, { backgroundColor: theme.cityBadgeBg }]}>
              <Ionicons name="location" size={16} color={theme.accentBlue} />
              <Text style={[styles.cityBadgeText, { color: theme.accentBlue }]}>
                {city}
              </Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Serial Number */}
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
                onChangeText={(t) => setFormData({ ...formData, asset_serial: t })}
              />
            </View>

            {/* Asset Name */}
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
                placeholder="e.g., Laptop, Printer"
                placeholderTextColor={theme.textSub}
                value={formData.asset_name}
                onChangeText={(t) => setFormData({ ...formData, asset_name: t })}
              />
              {city ? (
                <Text style={[styles.hint, { color: theme.textSub }]}>
                  Will be saved as "{formData.asset_name || 'name'}-{city.toLowerCase()}"
                </Text>
              ) : null}
            </View>

            {/* Asset Type */}
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
                onChangeText={(t) => setFormData({ ...formData, asset_type: t })}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, {
                  backgroundColor: theme.modalBg,
                  color: theme.textMain,
                  borderColor: theme.borderColor,
                }]}
                placeholder="Enter asset description"
                placeholderTextColor={theme.textSub}
                value={formData.asset_description}
                onChangeText={(t) => setFormData({ ...formData, asset_description: t })}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Asset Count */}
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
                onChangeText={(t) => setFormData({ ...formData, asset_count: t })}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.borderColor }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: theme.textMain }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accentBlue }]}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  cityBadgeText: {
    fontSize: 14,
    fontWeight: '700',
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
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});