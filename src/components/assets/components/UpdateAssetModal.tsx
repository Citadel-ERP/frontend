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

// Matches backend CITY_CHOICES exactly
export const CITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'gurgaon', label: 'Gurgaon' },
  { value: 'hyderabad', label: 'Hyderabad' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'noida', label: 'Noida' },
  { value: 'pune', label: 'Pune' },
];

export const UpdateAssetModal: React.FC<UpdateAssetModalProps> = ({
  visible,
  asset,
  onClose,
  onSubmit,
  isDark = false,
}) => {
  const [formData, setFormData] = useState<Partial<AssetFormData>>({});
  const [loading, setLoading] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({
        asset_name: asset.asset_name,
        asset_type: asset.asset_type,
        asset_description: asset.asset_description,
        asset_count: asset.asset_count.toString(),
        asset_serial: asset.asset_serial ?? '',
        // asset_city comes from serializer as asset_city field
        city: (asset as any).asset_city ?? asset.city ?? '',
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
    dropdownBg: isDark ? '#1a2539' : '#ffffff',
    dropdownItemHover: isDark ? '#243050' : '#f0f0f0',
  };

  const handleSubmit = async () => {
    if (!asset?.id) return;

    setLoading(true);
    const success = await onSubmit(asset.id, formData);
    setLoading(false);

    if (success) {
      setShowCityDropdown(false);
      onClose();
    }
  };

  const handleClose = () => {
    setShowCityDropdown(false);
    onClose();
  };

  const selectedCityLabel =
    CITY_OPTIONS.find(
      (c) => c.value === formData.city?.toLowerCase(),
    )?.label ?? formData.city ?? 'Select city';

  if (!asset) return null;

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
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>Update Asset</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                onChangeText={(text) => setFormData({ ...formData, asset_serial: text })}
              />
            </View>

            {/* Asset Name */}
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

            {/* Asset Type */}
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

            {/* Description */}
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

            {/* Asset Count */}
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

            {/* City Dropdown */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textMain }]}>City</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dropdownTrigger,
                  {
                    backgroundColor: theme.modalBg,
                    borderColor: showCityDropdown ? theme.accentBlue : theme.borderColor,
                  },
                ]}
                onPress={() => setShowCityDropdown((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    {
                      color: formData.city ? theme.textMain : theme.textSub,
                    },
                  ]}
                >
                  {selectedCityLabel}
                </Text>
                <Ionicons
                  name={showCityDropdown ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.textSub}
                />
              </TouchableOpacity>

              {showCityDropdown && (
                <View
                  style={[
                    styles.dropdownList,
                    {
                      backgroundColor: theme.dropdownBg,
                      borderColor: theme.borderColor,
                    },
                  ]}
                >
                  {CITY_OPTIONS.map((cityOption) => {
                    const isSelected =
                      formData.city?.toLowerCase() === cityOption.value;
                    return (
                      <TouchableOpacity
                        key={cityOption.value}
                        style={[
                          styles.dropdownItem,
                          isSelected && {
                            backgroundColor: theme.accentBlue + '20',
                          },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, city: cityOption.value });
                          setShowCityDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: isSelected ? theme.accentBlue : theme.textMain },
                          ]}
                        >
                          {cityOption.label}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={theme.accentBlue}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
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
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  submitButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});