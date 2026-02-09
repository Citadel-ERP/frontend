// hr_employee_management/BulkUploadEmployees.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import { Header } from './header';

interface BulkUploadEmployeesProps {
  token: string;
  onBack: () => void;
  onEmployeesAdded?: () => void;
}

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const BulkUploadEmployees: React.FC<BulkUploadEmployeesProps> = ({
  token,
  onBack,
  onEmployeesAdded,
}) => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);

  const handleDownloadSample = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setDownloadingSample(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadEmployeeTemplate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || 'Failed to download sample');
      }

      const data = await response.json();

      if (data.file_url) {
        await WebBrowser.openBrowserAsync(data.file_url);
        Alert.alert('Success', 'Sample template downloaded successfully');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Download sample error:', error);
      Alert.alert('Error', error.message || 'Failed to download sample template');
    } finally {
      setDownloadingSample(false);
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      // Handle both old and new API versions
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // New API (expo-document-picker v11+)
        const asset = result.assets[0];
        const newFile: SelectedFile = {
          uri: asset.uri,
          name: asset.name || 'Unknown',
          size: asset.size || 0,
          mimeType: asset.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        setSelectedFile(newFile);
        console.log('File selected (new API):', newFile);
      } else if (result.type === 'success') {
        // Old API (expo-document-picker v10 and below)
        const newFile: SelectedFile = {
          uri: result.uri,
          name: result.name || 'Unknown',
          size: result.size || 0,
          mimeType: result.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        setSelectedFile(newFile);
        console.log('File selected (old API):', newFile);
      } else {
        console.log('File selection cancelled');
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateExcelFile = (fileName: string): boolean => {
    return /\.(xlsx|xls)$/i.test(fileName);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      Alert.alert('Validation Error', 'Please select an Excel file');
      return;
    }

    if (!validateExcelFile(selectedFile.name)) {
      Alert.alert('Invalid File', 'Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('token', token);

      // Handle file upload for both web and mobile
      if (Platform.OS === 'web') {
        // For web, fetch the file and append it as a Blob
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('employee_data', blob, selectedFile.name);
      } else {
        // For mobile (iOS/Android)
        formData.append('employee_data', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType,
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/manager/bulkUploadEmployeeData`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser/system handle it
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || 'Failed to upload employee data');
      }

      const data = await response.json();

      // Create detailed success message
      let successMessage = `Successfully updated ${data.successful || 0} employee record${(data.successful || 0) !== 1 ? 's' : ''}`;

      if (data.failed && data.failed > 0) {
        successMessage += `\n\n${data.failed} record${data.failed !== 1 ? 's' : ''} failed to update`;

        if (data.failed_updates && data.failed_updates.length > 0) {
          successMessage += '\n\nFailed records:';
          data.failed_updates.slice(0, 5).forEach((failedUpdate: any) => {
            successMessage += `\n• Row ${failedUpdate.row}: ${failedUpdate.error}`;
          });

          if (data.failed_updates.length > 5) {
            successMessage += `\n... and ${data.failed_updates.length - 5} more`;
          }
        }
      }

      Alert.alert('Upload Complete', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            setSelectedFile(null);
            if (onEmployeesAdded) {
              onEmployeesAdded();
            }
            // Optionally go back to employee list
            if (data.successful > 0) {
              onBack();
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload employee data');
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = selectedFile && !uploading && validateExcelFile(selectedFile.name);

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <Header
        title="Upload Employee Data"
        subtitle="Bulk Upload employee data via Excel file"
        onBack={onBack}
        showBack={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions Card */}
        <View style={[styles.infoCard, { marginTop: 16, marginRight: 16, marginLeft: 16 }]}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Instructions</Text>
          </View>
          <View style={styles.infoCardContent}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>•</Text>
              <Text style={styles.infoText}>
                Check the Excel template to see the required format and columns
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>•</Text>
              <Text style={styles.infoText}>
                Fill in employee data according to the template structure
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>•</Text>
              <Text style={styles.infoText}>
                Ensure all employee IDs in the file match existing employees
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>•</Text>
              <Text style={styles.infoText}>
                Only .xlsx and .xls file formats are supported
              </Text>
            </View>
          </View>

          {/* <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                marginTop: 16,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 25,
                backgroundColor: WHATSAPP_COLORS.primary,
              },
            ]}
            onPress={handleDownloadSample}
            disabled={downloadingSample}
            activeOpacity={0.7}
          >
            {downloadingSample ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={[styles.secondaryButtonText, { color: '#FFFFFF' }]}>
                  Download Sample Format
                </Text>
              </>
            )}
          </TouchableOpacity> */}
        </View>

        {/* Important Notes */}
        <View style={[styles.warningCard, { marginRight: 16, marginLeft: 16, marginBottom: 16 }]}>
          <Ionicons name="warning" size={24} color="#D32F2F" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#D32F2F', marginBottom: 8 }}>
              Important Notes
            </Text>
            <View style={{ gap: 6 }}>
              <Text style={styles.warningText}>
                • Only existing employees can be updated via bulk upload
              </Text>
              <Text style={styles.warningText}>
                • Employee ID must match exactly with existing records
              </Text>
              <Text style={styles.warningText}>
                • Invalid or missing data will be skipped with error details
              </Text>
              <Text style={styles.warningText}>
                • Review the sample template carefully before uploading
              </Text>
            </View>
          </View>
        </View>

        {/* File Selection */}
        <View style={[styles.infoCard, { marginRight: 16, marginLeft: 16 }]}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="document-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Excel File</Text>
          </View>

          {!selectedFile ? (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleSelectFile}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={48} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.uploadButtonText}>Select Excel File</Text>
              <Text style={styles.uploadButtonSubtext}>
                Tap to browse and select your Excel file
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.documentCard}>
              <View style={styles.documentIconContainer}>
                <Ionicons
                  name="document-text"
                  size={28}
                  color={validateExcelFile(selectedFile.name) ? WHATSAPP_COLORS.primary : '#D32F2F'}
                />
              </View>
              <View style={styles.documentInfo}>
                <Text
                  style={[
                    styles.documentName,
                    !validateExcelFile(selectedFile.name) && { color: '#D32F2F' },
                  ]}
                  numberOfLines={1}
                >
                  {selectedFile.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Ionicons name="document" size={14} color={WHATSAPP_COLORS.textSecondary} />
                  <Text style={styles.documentDate}>
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </View>
                {validateExcelFile(selectedFile.name) && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 6,
                      backgroundColor: '#E8F5E9',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={WHATSAPP_COLORS.primary} />
                    <Text
                      style={{
                        fontSize: 11,
                        color: WHATSAPP_COLORS.primary,
                        marginLeft: 4,
                        fontWeight: '500',
                      }}
                    >
                      Valid Excel file
                    </Text>
                  </View>
                )}
                {!validateExcelFile(selectedFile.name) && (
                  <Text style={{ fontSize: 11, color: '#D32F2F', marginTop: 4 }}>
                    Invalid file format. Please select .xlsx or .xls file
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleRemoveFile}
                style={styles.documentActionButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={28} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          )}

          {/* Change File Button */}
          {selectedFile && (
            <TouchableOpacity
              style={[styles.filePickerButton, { marginTop: 12 }]}
              onPress={handleSelectFile}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.filePickerText}>Change File</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <View
          style={{
            marginTop: 24,
            marginBottom: 30,
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                height: 50,
                borderRadius: 25,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              },
              !canSubmit && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" />
                <Text style={[styles.primaryButtonText, { fontSize: 16 }]}>
                  Upload Employee Data
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default BulkUploadEmployees;