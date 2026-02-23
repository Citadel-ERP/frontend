import React, { useState } from 'react';
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
import { OfficeFormData } from '../types/office.types';
import { MapsLinkParser } from '../utils/mapsUtils';

interface CreateOfficeProps {
  onSubmit: (data: OfficeFormData) => Promise<boolean>;
  onCancel: () => void;
  initialData?: OfficeFormData;
  loading?: boolean;
}

const initialFormState: OfficeFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  zipcode: '',
  googleMapsLink: '',
};

export const CreateOffice: React.FC<CreateOfficeProps> = ({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<OfficeFormData>(
    initialData || initialFormState
  );
  const [errors, setErrors] = useState<Partial<Record<keyof OfficeFormData, string>>>({});
  const [mapsLinkValid, setMapsLinkValid] = useState<boolean | null>(null);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) newErrors.name = 'Office name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.zipcode.trim()) newErrors.zipcode = 'Zip code is required';

    if (!formData.googleMapsLink.trim()) {
      newErrors.googleMapsLink = 'Google Maps link is required';
    } else {
      const coords = MapsLinkParser.extractCoordinates(formData.googleMapsLink);
      if (!coords) {
        newErrors.googleMapsLink = 'Could not extract coordinates from the link';
        setMapsLinkValid(false);
      } else {
        setMapsLinkValid(true);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const success = await onSubmit(formData);
    if (success) {
      setFormData(initialFormState);
      setErrors({});
      setMapsLinkValid(null);
    }
  };

  const handleMapsLinkChange = (text: string) => {
    setFormData(prev => ({ ...prev, googleMapsLink: text }));
    if (errors.googleMapsLink) {
      setErrors(prev => ({ ...prev, googleMapsLink: undefined }));
    }
    if (text.trim()) {
      const coords = MapsLinkParser.extractCoordinates(text);
      setMapsLinkValid(!!coords);
    } else {
      setMapsLinkValid(null);
    }
  };

  const handlePasteExample = () => {
    const example = 'https://maps.google.com/?q=40.7128,-74.0060';
    setFormData(prev => ({ ...prev, googleMapsLink: example }));
    setMapsLinkValid(true);
    setErrors(prev => ({ ...prev, googleMapsLink: undefined }));
  };

  const renderInput = (
    field: keyof OfficeFormData,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric' | 'email-address';
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
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
          field === 'googleMapsLink' && mapsLinkValid === true && styles.inputValid,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={formData[field]}
        onChangeText={(text) => {
          if (field === 'googleMapsLink') {
            handleMapsLinkChange(text);
          } else {
            setFormData(prev => ({ ...prev, [field]: text }));
            if (errors[field]) {
              setErrors(prev => ({ ...prev, [field]: undefined }));
            }
          }
        }}
        multiline={options?.multiline}
        keyboardType={options?.keyboardType}
        autoCapitalize={options?.autoCapitalize}
        editable={!loading}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
      {field === 'googleMapsLink' && mapsLinkValid === true && !errors[field] && (
        <View style={styles.validIndicator}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.validText}>Coordinates detected</Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {initialData ? 'Update Office' : 'Create New Office'}
          </Text>
          <TouchableOpacity
            onPress={onCancel}
            disabled={loading}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Basic Info */}
        {renderInput('name', 'Office Name')}
        {renderInput('address', 'Street Address', { multiline: true })}

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderInput('city', 'City')}
          </View>
          <View style={styles.halfWidth}>
            {renderInput('state', 'State')}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderInput('country', 'Country')}
          </View>
          <View style={styles.halfWidth}>
            {renderInput('zipcode', 'Zip Code')}
          </View>
        </View>

        {/* Maps Section */}
        <View style={styles.mapsSection}>
          <Text style={styles.sectionTitle}>Location (from Google Maps)</Text>
          <Text style={styles.sectionDescription}>
            Paste a Google Maps link to automatically set the coordinates
          </Text>

          {renderInput('googleMapsLink', 'Google Maps Link', {
            autoCapitalize: 'none',
          })}

          <TouchableOpacity
            style={styles.exampleLink}
            onPress={handlePasteExample}
            disabled={loading}
          >
            <Ionicons name="copy-outline" size={16} color="#008069" />
            <Text style={styles.exampleLinkText}>Use example link</Text>
          </TouchableOpacity>
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
              <Text style={styles.submitButtonText}>
                {initialData ? 'Update' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 80,
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
  inputValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  validIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  validText: {
    color: '#10B981',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  mapsSection: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  exampleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: 8,
    gap: 4,
  },
  exampleLinkText: {
    color: '#008069',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
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