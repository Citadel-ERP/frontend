import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
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

    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Office name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.zipcode.trim()) newErrors.zipcode = 'Zip code is required';
    if (!formData.googleMapsLink.trim()) {
      newErrors.googleMapsLink = 'Google Maps link is required';
    } else {
      // Validate maps link
      try {
        const coords = MapsLinkParser.extractCoordinates(formData.googleMapsLink);
        if (!coords) {
          newErrors.googleMapsLink = 'Could not extract coordinates from the link';
        } else {
          setMapsLinkValid(true);
        }
      } catch (e) {
        newErrors.googleMapsLink = 'Invalid Google Maps link format';
        setMapsLinkValid(false);
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
    
    // Real-time validation (optional)
    if (text.trim()) {
      const coords = MapsLinkParser.extractCoordinates(text);
      setMapsLinkValid(!!coords);
    } else {
      setMapsLinkValid(null);
    }
  };

  const handlePasteExample = () => {
    setFormData(prev => ({
      ...prev,
      googleMapsLink: 'https://maps.google.com/?q=40.7128,-74.0060',
    }));
    setMapsLinkValid(true);
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
        value={formData[field]}
        onChangeText={(text) => {
          if (field === 'googleMapsLink') {
            handleMapsLinkChange(text);
          } else {
            setFormData(prev => ({ ...prev, [field]: text }));
          }
          // Clear error for this field
          if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
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
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {initialData ? 'Update Office' : 'Create New Office'}
        </Text>
        <TouchableOpacity onPress={onCancel} disabled={loading}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

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

      <View style={styles.mapsSection}>
        <Text style={styles.sectionTitle}>Location (from Google Maps)</Text>
        <Text style={styles.sectionDescription}>
          Paste a Google Maps link to automatically set the coordinates
        </Text>
        
        {renderInput('googleMapsLink', 'Google Maps Link')}
        
        <TouchableOpacity 
          style={styles.exampleLink}
          onPress={handlePasteExample}
        >
          <Ionicons name="copy-outline" size={16} color="#008069" />
          <Text style={styles.exampleLinkText}>Use example link</Text>
        </TouchableOpacity>
      </View>

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
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
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputValid: {
    borderColor: '#10B981',
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
    marginTop: 16,
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