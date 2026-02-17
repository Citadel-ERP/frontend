import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import alert from '../../utils/Alert';

interface BulkUploadPayslipsProps {
  token: string;
  onBack: () => void;
}

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2024 + i);

const BulkUploadPayslips: React.FC<BulkUploadPayslipsProps> = ({ token, onBack }) => {
  // Auto-select current month and year
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSample = async () => {
    if (!token) {
      alert('Error', 'Authentication required');
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadSamplePayslip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to download sample payslip');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const fileUrl = URL.createObjectURL(blob);

      // Open in browser
      await WebBrowser.openBrowserAsync(fileUrl);
      
      alert('Success', 'Sample payslip downloaded successfully');
    } catch (error: any) {
      console.error('Download sample error:', error);
      alert('Error', error.message || 'Failed to download sample payslip');
    } finally {
      setDownloading(false);
    }
  };

  const handleSelectFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      // Handle both old and new API versions
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // New API (expo-document-picker v11+)
        const newFiles: SelectedFile[] = result.assets.map((asset: any) => ({
          uri: asset.uri,
          name: asset.name || 'Unknown',
          size: asset.size || 0,
          mimeType: asset.mimeType || 'application/pdf',
        }));
        setSelectedFiles(prev => [...prev, ...newFiles]);
        console.log('Added files (new API):', newFiles);
      } else if (result.type === 'success') {
        // Old API (expo-document-picker v10 and below)
        const newFile: SelectedFile = {
          uri: result.uri,
          name: result.name || 'Unknown',
          size: result.size || 0,
          mimeType: result.mimeType || 'application/pdf',
        };
        setSelectedFiles(prev => [...prev, newFile]);
        console.log('Added file (old API):', newFile);
      } else {
        console.log('Document selection cancelled');
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      alert('Error', 'Failed to select files');
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFileName = (fileName: string): { valid: boolean; employeeId: string } => {
    const nameWithoutExt = fileName.replace(/\.(pdf|docx)$/i, '');
    const isValid = /^[a-zA-Z0-9_-]+$/.test(nameWithoutExt);

    return {
      valid: isValid,
      employeeId: nameWithoutExt,
    };
  };

  const handleSubmit = async () => {
    if (!selectedMonth || !selectedYear) {
      alert('Validation Error', 'Please select both month and year');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Validation Error', 'Please select at least one payslip file');
      return;
    }

    const invalidFiles = selectedFiles.filter(file => !validateFileName(file.name).valid);
    if (invalidFiles.length > 0) {
      alert(
        'Invalid File Names',
        `The following files have invalid names:\n${invalidFiles.map(f => f.name).join('\n')}\n\nFile names should only contain the employee ID (e.g., EMP001.pdf)`
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('month', selectedMonth.toString());
      formData.append('year', selectedYear.toString());

      // Handle file upload for both web and mobile
      for (const file of selectedFiles) {
        if (Platform.OS === 'web') {
          // For web, fetch the file and append it as a Blob
          const response = await fetch(file.uri);
          const blob = await response.blob();
          formData.append('payslips', blob, file.name);
        } else {
          // For mobile (iOS/Android)
          formData.append('payslips', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType,
          } as any);
        }
      }

      const response = await fetch(`${BACKEND_URL}/manager/bulkUploadPayslip`, {
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
        throw new Error(errorData.message || 'Failed to upload payslips');
      }

      const data = await response.json();

      const successMsg = `Successfully uploaded ${data.successful || 0} payslips${data.failed > 0 ? `\n${data.failed} files failed to upload` : ''
        }`;

      alert(
        'Upload Complete',
        successMsg,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedFiles([]);
              // Reset to current month and year
              const currentDate = new Date();
              setSelectedMonth(currentDate.getMonth() + 1);
              setSelectedYear(currentDate.getFullYear());
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Upload Failed', error.message || 'Failed to upload payslips');
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = selectedMonth && selectedYear && selectedFiles.length > 0 && !uploading;

  const getMonthName = (monthValue: number) => {
    const month = MONTHS.find(m => m.value === monthValue);
    return month ? month.label : '';
  };

  const totalFileSize = selectedFiles.reduce((total, file) => total + file.size, 0);

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <Header
        title="Bulk Upload Payslips"
        subtitle="Upload multiple payslips at once"
        onBack={onBack}
        showBack={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={[styles.infoCard, { marginTop: 16, marginRight: 16, marginLeft: 16 }]}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Instructions</Text>
          </View>
          <View style={styles.infoCardContent}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>•</Text>
              <Text style={styles.infoText}>
                Ensure all payslip files are named with only the Employee ID (e.g., EMP001.pdf)
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>•</Text>
              <Text style={styles.infoText}>
                Only PDF and DOCX files are supported
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>•</Text>
              <Text style={styles.infoText}>
                Select the month and year for all uploaded payslips
              </Text>
            </View>
          </View>
        </View>

        {/* Period Selection */}
        <View style={[styles.infoCard, { marginRight: 16, marginLeft: 16 }]}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="calendar-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Select Period</Text>
          </View>

          {/* Month Selection */}
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.label}>Month</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 2,
              }}
            >
              {MONTHS.map((month) => (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.monthButton,
                    selectedMonth === month.value && styles.monthButtonActive,
                  ]}
                  onPress={() => setSelectedMonth(month.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.monthButtonText,
                      selectedMonth === month.value && styles.monthButtonTextActive,
                    ]}
                  >
                    {month.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Year Selection */}
          <View>
            <Text style={styles.label}>Year</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 2,
              }}
            >
              {YEARS.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearButton,
                    selectedYear === year && styles.yearButtonActive,
                    { padding: 12 }
                  ]}
                  onPress={() => setSelectedYear(year)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.yearButtonText,
                      selectedYear === year && styles.yearButtonTextActive,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Selected Period Display */}
          {selectedMonth && selectedYear && (
            <View style={[styles.selectedFileContainer, { marginTop: 16 }]}>
              <Ionicons name="calendar" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.selectedFileName}>
                {getMonthName(selectedMonth)} {selectedYear}
              </Text>
            </View>
          )}
        </View>

        {/* File Selection */}
        <View style={[styles.infoCard, { marginRight: 16, marginLeft: 16 }]}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="documents-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Payslip Files</Text>
          </View>

          <TouchableOpacity
            style={styles.filePickerButton}
            onPress={handleSelectFiles}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.filePickerText}>Select Payslip Files</Text>
          </TouchableOpacity>

          {/* Selected Files Summary */}
          {selectedFiles.length > 0 && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              marginBottom: 8,
              paddingHorizontal: 4
            }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>
                Selected Files ({selectedFiles.length})
              </Text>
              <Text style={{
                fontSize: 12,
                color: WHATSAPP_COLORS.textSecondary,
                fontWeight: '500'
              }}>
                Total: {formatFileSize(totalFileSize)}
              </Text>
            </View>
          )}

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <ScrollView
              style={{
                maxHeight: 300,
                marginTop: 8,
              }}
              showsVerticalScrollIndicator={true}
            >
              {selectedFiles.map((file, index) => {
                const validation = validateFileName(file.name);
                return (
                  <View
                    key={index}
                    style={[
                      styles.documentCard,
                      !validation.valid && { borderColor: '#D32F2F', borderWidth: 1 },
                    ]}
                  >
                    <View style={styles.documentIconContainer}>
                      <Ionicons
                        name={file.name.endsWith('.pdf') ? 'document-text' : 'document'}
                        size={24}
                        color={validation.valid ? WHATSAPP_COLORS.primary : '#D32F2F'}
                      />
                    </View>
                    <View style={[styles.documentInfo, { flex: 1 }]}>
                      <Text
                        style={[
                          styles.documentName,
                          !validation.valid && { color: '#D32F2F' },
                        ]}
                        numberOfLines={1}
                      >
                        {file.name}
                      </Text>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap'
                      }}>
                        <Text style={styles.documentDate}>
                          {formatFileSize(file.size)}
                        </Text>
                        {validation.valid ? (
                          <>
                            <Text style={styles.documentDate}>•</Text>
                            <Text style={{
                              fontSize: 12,
                              color: WHATSAPP_COLORS.primary,
                              fontWeight: '500'
                            }}>
                              ID: {validation.employeeId}
                            </Text>
                          </>
                        ) : (
                          <Text style={{
                            fontSize: 12,
                            color: '#D32F2F',
                            fontWeight: '500',
                            flex: 1
                          }}>
                            Invalid file name format
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveFile(index)}
                      style={styles.documentActionButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={24} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Submit Button */}
        <View style={{
          marginTop: 24,
          marginBottom: 30,
          paddingHorizontal: 16
        }}>
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
                  Upload Payslips ({selectedFiles.length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default BulkUploadPayslips;