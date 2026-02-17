import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { AssetFormData, ValidationError } from '../types/asset.types';
import { ExcelParser } from '../utils/excelParser';

interface ExcelUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (assets: AssetFormData[]) => Promise<void>;
  isDark?: boolean;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  visible,
  onClose,
  onUpload,
  isDark = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const theme = {
    bgColor: isDark ? '#111a2d' : '#ffffff',
    cardBg: isDark ? '#1a2539' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
    errorBg: isDark ? '#3a1a1a' : '#fee',
    errorText: '#ff4444',
    borderColor: isDark ? '#2a3549' : '#e0e0e0',
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
        ],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setErrors([]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const parseAndValidate = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setParsing(true);
    try {
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();
      const file = new File([blob], selectedFile.name, { type: selectedFile.mimeType });

      const { data, errors } = await ExcelParser.parse(file);
      
      if (errors.length > 0) {
        setErrors(errors);
      } else {
        setErrors([]);
        Alert.alert(
          'Success',
          `Parsed ${data.length} valid assets. Do you want to upload them?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upload', onPress: () => handleUpload(data) },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to parse Excel file');
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async (assets: AssetFormData[]) => {
    setUploading(true);
    try {
      await onUpload(assets);
      setSelectedFile(null);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload assets');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: theme.bgColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Upload Assets from Excel
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.instructions}>
              <Text style={[styles.instructionTitle, { color: theme.textMain }]}>
                Excel Format Required:
              </Text>
              <Text style={[styles.instructionText, { color: theme.textSub }]}>
                • Column 1: "Asset Name" (include location, e.g., laptop-bangalore)
              </Text>
              <Text style={[styles.instructionText, { color: theme.textSub }]}>
                • Column 2: "Asset Type" (e.g., Laptop, Printer)
              </Text>
              <Text style={[styles.instructionText, { color: theme.textSub }]}>
                • Column 3: "Description" (optional)
              </Text>
              <Text style={[styles.instructionText, { color: theme.textSub }]}>
                • Column 4: "Count" (positive number)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.filePicker, { backgroundColor: theme.cardBg }]}
              onPress={pickDocument}
            >
              <Ionicons name="document-outline" size={32} color={theme.accentBlue} />
              <Text style={[styles.filePickerText, { color: theme.textMain }]}>
                {selectedFile ? selectedFile.name : 'Select Excel File'}
              </Text>
              {selectedFile && (
                <Ionicons name="checkmark-circle" size={24} color={theme.accentBlue} />
              )}
            </TouchableOpacity>

            {errors.length > 0 && (
              <View style={[styles.errorContainer, { backgroundColor: theme.errorBg }]}>
                <Text style={[styles.errorTitle, { color: theme.errorText }]}>
                  Validation Errors ({errors.length}):
                </Text>
                {errors.slice(0, 5).map((error, index) => (
                  <Text key={index} style={[styles.errorText, { color: theme.errorText }]}>
                    • Row {error.row}: {error.message}
                  </Text>
                ))}
                {errors.length > 5 && (
                  <Text style={[styles.errorText, { color: theme.errorText }]}>
                    ... and {errors.length - 5} more errors
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: theme.textMain }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.uploadButton,
                { backgroundColor: theme.accentBlue },
                (!selectedFile || parsing || uploading) && styles.disabledButton,
              ]}
              onPress={parseAndValidate}
              disabled={!selectedFile || parsing || uploading}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                {parsing ? 'Parsing...' : uploading ? 'Uploading...' : 'Validate & Upload'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  instructions: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 128, 105, 0.1)',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  filePickerText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 4,
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
  uploadButton: {
    backgroundColor: '#008069',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});