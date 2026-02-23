import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Office, OfficeFormData } from '../types/office.types';

interface UpdateOfficeProps {
  office: Office;
  onSubmit: (data: OfficeFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

export const UpdateOffice: React.FC<UpdateOfficeProps> = ({
  office,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const [formData, setFormData] = useState<OfficeFormData>({
    name: office.name,
    address: office.address.address,
    city: office.address.city,
    state: office.address.state,
    country: office.address.country,
    zipcode: office.address.zip_code,
    googleMapsLink: '', // Not shown or validated in update
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OfficeFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) newErrors.name = 'Office name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.zipcode.trim()) newErrors.zipcode = 'Zip code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    await onSubmit(formData);
  };

  // Scroll to end when bottom fields (country/zip) are focused
  const handleBottomFieldFocus = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const renderInput = (
    field: keyof Omit<OfficeFormData, 'googleMapsLink'>,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric' | 'email-address';
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
      isBottomField?: boolean;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {placeholder}
        <Text style={styles.required}> *</Text>
      </Text>
      <TextInput
        style={[
          styles.input,
          errors[field] && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={formData[field]}
        onChangeText={(text) => {
          setFormData(prev => ({ ...prev, [field]: text }));
          if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
          }
        }}
        onFocus={options?.isBottomField ? handleBottomFieldFocus : undefined}
        multiline={options?.multiline}
        keyboardType={options?.keyboardType}
        autoCapitalize={options?.autoCapitalize}
        editable={!loading}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 40}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Update Office</Text>
          <TouchableOpacity
            onPress={onCancel}
            disabled={loading}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Office Name */}
        {renderInput('name', 'Office Name')}

        {/* Street Address */}
        {renderInput('address', 'Street Address', { multiline: true })}

        {/* City + State */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderInput('city', 'City')}
          </View>
          <View style={styles.halfWidth}>
            {renderInput('state', 'State')}
          </View>
        </View>

        {/* Country + Zip — isBottomField triggers scroll on focus */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderInput('country', 'Country', { isBottomField: true })}
          </View>
          <View style={styles.halfWidth}>
            {renderInput('zipcode', 'Zip Code', {
              keyboardType: 'numeric',
              isBottomField: true,
            })}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Update Office</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120, // Generous padding so buttons never sit behind keyboard
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#008069',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});