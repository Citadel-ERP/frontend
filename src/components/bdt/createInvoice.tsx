import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors } from './types';

interface CreateInvoiceProps {
  visible: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  onInvoiceCreated: () => void;
  onCancel: () => void;
  theme: ThemeColors;
  token: string | null;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({
  visible,
  onClose,
  leadId,
  leadName,
  onInvoiceCreated,
  onCancel,
  theme,
  token,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_address: '',
    vendor_gst_or_pan: '',
    billing_area: '',
    property_type: '',
    car_parking: '',
    terrace_rent: '',
    particular_matter_to_mention: '',
    executive_name: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);

  const handleAttachFiles = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true, // Changed to true for multiple files
        type: '*/*',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFiles(prev => [...prev, ...result.assets]);
        Alert.alert('Files Selected', `${result.assets.length} file(s) added`);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    // Validate required fields
    if (!formData.vendor_name.trim()) {
      Alert.alert('Error', 'Vendor Name is required');
      return;
    }
    if (!formData.vendor_gst_or_pan.trim()) {
      Alert.alert('Error', 'Vendor GST/PAN is required');
      return;
    }
    if (!formData.billing_area.trim()) {
      Alert.alert('Error', 'Billing Area is required');
      return;
    }
    if (!formData.property_type.trim()) {
      Alert.alert('Error', 'Property Type is required');
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append('token', token);
      submitData.append('lead_id', leadId.toString());
      submitData.append('vendor_name', formData.vendor_name.trim());
      submitData.append('vendor_gst_or_pan', formData.vendor_gst_or_pan.trim());
      submitData.append('billing_area', formData.billing_area.trim());
      submitData.append('property_type', formData.property_type.trim());

      if (formData.vendor_address.trim()) {
        submitData.append('vendor_address', formData.vendor_address.trim());
      }
      if (formData.car_parking.trim()) {
        submitData.append('car_parking', formData.car_parking.trim());
      }
      if (formData.terrace_rent.trim()) {
        submitData.append('terrace_rent', formData.terrace_rent.trim());
      }
      if (formData.particular_matter_to_mention.trim()) {
        submitData.append('particular_matter_to_mention', formData.particular_matter_to_mention.trim());
      }
      if (formData.executive_name.trim()) {
        submitData.append('executive_name', formData.executive_name.trim());
      }

      // Append multiple files under 'files' key
      selectedFiles.forEach((file) => {
        submitData.append('files', {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name,
        } as any);
      });

      const response = await fetch(`${BACKEND_URL}/employee/createInvoice`, {
        method: 'POST',
        body: submitData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();

      if (data.message === 'Invoice created successfully') {
        Alert.alert('Success', 'Invoice created successfully!');
        onInvoiceCreated();
        onClose();
      } else {
        Alert.alert('Error', data.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Invoice Creation',
      'Are you sure you want to cancel? The lead will not be updated.',
      [
        { text: 'No, Continue', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            onCancel();
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <SafeAreaView style={[styles.invoiceModalContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme === darkTheme ? "light-content" : "dark-content"} backgroundColor={theme.background} />

        <View style={[styles.invoiceHeader, {
          backgroundColor: theme.cardBg,
          borderBottomColor: theme.border
        }]}>
          <TouchableOpacity style={styles.invoiceBackButton} onPress={handleCancel}>
            <Text style={[styles.invoiceBackButtonText, { color: theme.error }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.invoiceHeaderTitle, { color: theme.text }]}>Create Invoice</Text>
          <TouchableOpacity
            style={[
              styles.invoiceSaveButton,
              loading && styles.invoiceSaveButtonDisabled,
              { backgroundColor: theme.primary }
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.white} size="small" />
            ) : (
              <Text style={[styles.invoiceSaveButtonText, { color: theme.white }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={[styles.invoiceScrollView, { backgroundColor: theme.background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.invoiceFormCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.invoiceFormTitle, { color: theme.primary }]}>Invoice Details for {leadName}</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Vendor Name *</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={formData.vendor_name}
                  onChangeText={(value) => handleInputChange('vendor_name', value)}
                  placeholder="Enter vendor name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Vendor Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, {
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={formData.vendor_address}
                  onChangeText={(value) => handleInputChange('vendor_address', value)}
                  placeholder="Enter vendor address"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Vendor GST/PAN *</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={formData.vendor_gst_or_pan}
                  onChangeText={(value) => handleInputChange('vendor_gst_or_pan', value)}
                  placeholder="Enter GST or PAN number"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  Upload Files (LOI, Sale Deed, etc.)
                </Text>
                <TouchableOpacity
                  style={[styles.fileUploadButton, {
                    borderColor: theme.info,
                    backgroundColor: theme.info + '10'
                  }]}
                  onPress={handleAttachFiles}
                >
                  <Text style={[styles.fileUploadButtonText, { color: theme.info }]}>
                    📎 Attach Files {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                  </Text>
                </TouchableOpacity>

                {selectedFiles.length > 0 && (
                  <View style={styles.filesListContainer}>
                    {selectedFiles.map((file, index) => (
                      <View key={index} style={[styles.fileItem, {
                        backgroundColor: theme.background,
                        borderColor: theme.border
                      }]}>
                        <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                          📄 {file.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveFile(index)}
                          style={styles.removeFileIconButton}
                        >
                          <Text style={[styles.removeFileIcon, { color: theme.error }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Billing Area & Rs. Per Sft. / No. days or Month *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, {
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={formData.billing_area}
                  onChangeText={(value) => handleInputChange('billing_area', value)}
                  placeholder="Enter billing area details"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Car Parking / Terrace Rent (if any)</Text>
                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: theme.white,
                        borderColor: theme.border,
                        color: theme.text
                      }]}
                      value={formData.car_parking}
                      onChangeText={(value) => handleInputChange('car_parking', value)}
                      placeholder="Car Parking"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: theme.white,
                        borderColor: theme.border,
                        color: theme.text
                      }]}
                      value={formData.terrace_rent}
                      onChangeText={(value) => handleInputChange('terrace_rent', value)}
                      placeholder="Terrace Rent"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Property Type (SEZ / Non SEZ) *</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={formData.property_type}
                  onChangeText={(value) => handleInputChange('property_type', value)}
                  placeholder="Enter property type"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>If any particular matter to mention in narration</Text>
                <TextInput
                  style={[styles.input, styles.textArea, {
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={formData.particular_matter_to_mention}
                  onChangeText={(value) => handleInputChange('particular_matter_to_mention', value)}
                  placeholder="Enter any additional information"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Ref. Executive Name to mention</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    color: theme.text
                  }]}
                  value={formData.executive_name}
                  onChangeText={(value) => handleInputChange('executive_name', value)}
                  placeholder="Enter executive name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <Text style={[styles.requiredNote, { color: theme.error }]}>* Required fields</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  invoiceModalContainer: {
    flex: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  invoiceBackButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  invoiceBackButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  invoiceHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  invoiceSaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  invoiceSaveButtonDisabled: {
    opacity: 0.6,
  },
  invoiceSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceScrollView: {
    flex: 1,
  },
  invoiceFormCard: {
    padding: 25,
    borderRadius: 16,
    margin: 20,
    marginBottom: 25,
  },
  invoiceFormTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 15,
  },
  halfInput: {
    flex: 1,
  },
  fileUploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  fileUploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },

  requiredNote: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
    textAlign: 'center',
  },
  filesListContainer: {
    marginTop: 12,
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
  },
  removeFileIconButton: {
    padding: 4,
  },
  removeFileIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollViewContent: {
  flexGrow: 1,
  paddingBottom: 40, // Extra padding at bottom
},
});

// Need to import darkTheme from theme
import { darkTheme } from './theme';

export default CreateInvoice;