// hr_employee_management/payslip.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../config/config';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import alert from '../../utils/Alert';

interface Employee {
  employee_id: string;
  full_name: string;
}

interface PayslipProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
}

interface PayslipData {
  id: string;
  month: number;
  year: number;
  payslip: string;
  created_at: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayslipModal: React.FC<PayslipProps> = ({
  visible,
  onClose,
  employee,
  token,
}) => {
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalMode, setModalMode] = useState<'list' | 'upload'>('list');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [groupedPayslips, setGroupedPayslips] = useState<{ [key: string]: PayslipData[] }>({});

  useEffect(() => {
    if (visible) {
      fetchPayslips();
      // Reset to list mode when modal opens
      setModalMode('list');
    }
  }, [visible]);

  useEffect(() => {
    // Reset file selection when switching back to list mode
    if (modalMode === 'list') {
      setSelectedFile(null);
    }
  }, [modalMode]);

  useEffect(() => {
    // Group payslips by year
    const grouped = payslips.reduce((acc, payslip) => {
      const year = payslip.year.toString();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(payslip);
      return acc;
    }, {} as { [key: string]: PayslipData[] });

    // Sort each year's payslips by month (descending)
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => b.month - a.month);
    });

    setGroupedPayslips(grouped);
  }, [payslips]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getPayslips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPayslips(data.payslips || []);
      } else {
        const errorData = await response.json();
        alert('Error', errorData.message || 'Failed to fetch payslips');
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      // Handle both old and new API versions
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // New API (expo-document-picker v11+)
        setSelectedFile(result.assets[0]);
      } else if (result.type === 'success') {
        // Old API (expo-document-picker v10 and below)
        setSelectedFile(result);
      } else {
        console.log('Document selection cancelled');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error', 'Failed to pick document');
    }
  };

  const uploadPayslip = async () => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('employee_id', employee.employee_id);
      formData.append('month', selectedMonth.toString());
      formData.append('year', selectedYear.toString());
      
      // Handle file upload differently for web
      if (Platform.OS === 'web') {
        // For web, we need to fetch the file and append it as a Blob
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('payslip', blob, selectedFile.name || 'payslip.pdf');
      } else {
        // For mobile (iOS/Android)
        formData.append('payslip', {
          uri: selectedFile.uri,
          type: 'application/pdf',
          name: selectedFile.name || 'payslip.pdf',
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/manager/uploadPayslip`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header for FormData on web - let browser set it with boundary
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        alert('Success', 'Payslip uploaded successfully');
        setModalMode('list');
        setSelectedFile(null);
        fetchPayslips();
      } else {
        const errorData = await response.json();
        alert('Error', errorData.message || 'Failed to upload payslip');
      }
    } catch (error) {
      console.error('Error uploading payslip:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Error', 'Please select a payslip file');
      return;
    }

    // Check if payslip already exists for this month/year
    const exists = payslips.some(
      p => p.month === selectedMonth && p.year === selectedYear
    );

    if (exists) {
      alert(
        'Payslip Exists',
        'A payslip for this month already exists. Do you want to replace it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Replace', 
            onPress: async () => {
              await uploadPayslip();
            }
          }
        ]
      );
      return;
    }

    await uploadPayslip();
  };

  const handleDownload = async (payslipUrl: string, month: number, year: number) => {
    try {
      const monthName = MONTHS[month - 1];
      const fileName = `Payslip_${monthName}_${year}.pdf`;
      
      // Open the PDF in browser/external viewer
      const supported = await Linking.canOpenURL(payslipUrl);
      if (supported) {
        await Linking.openURL(payslipUrl);
      } else {
        alert('Error', 'Cannot open this file');
      }
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Error', 'Failed to download payslip');
    }
  };

  const renderYearSection = (year: string) => {
    const yearPayslips = groupedPayslips[year];
    
    return (
      <View key={year} style={styles.yearSection}>
        <View style={styles.yearHeader}>
          <Ionicons name="calendar" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.yearHeaderText}>{year}</Text>
          <View style={styles.yearBadge}>
            <Text style={styles.yearBadgeText}>{yearPayslips.length}</Text>
          </View>
        </View>

        {yearPayslips.map((payslip) => (
          <View key={payslip.id} style={styles.payslipCard}>
            <View style={styles.payslipIconContainer}>
              <Ionicons name="document-text" size={32} color={WHATSAPP_COLORS.primary} />
            </View>
            
            <View style={styles.payslipInfo}>
              <Text style={styles.payslipMonth}>
                {MONTHS[payslip.month - 1]} {payslip.year}
              </Text>
              <Text style={styles.payslipDate}>
                Uploaded: {new Date(payslip.created_at).toLocaleDateString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.downloadButtonAlt}
              onPress={() => handleDownload(payslip.payslip, payslip.month, payslip.year)}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderUploadForm = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 16 }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.editLabel}>Month</Text>
          <View style={styles.pickerContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.monthPicker}
            >
              {MONTHS.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.monthButton,
                    selectedMonth === index + 1 && styles.monthButtonActive
                  ]}
                  onPress={() => setSelectedMonth(index + 1)}
                >
                  <Text style={[
                    styles.monthButtonText,
                    selectedMonth === index + 1 && styles.monthButtonTextActive
                  ]}>
                    {month.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.editLabel}>Year</Text>
          <View style={styles.yearPickerContainer}>
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  selectedYear === year && styles.yearButtonActive
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[
                  styles.yearButtonText,
                  selectedYear === year && styles.yearButtonTextActive
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.editLabel}>Payslip File (PDF)</Text>
          <TouchableOpacity
            style={styles.filePickerButton}
            onPress={pickDocument}
          >
            <Ionicons name="document-attach-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.filePickerText}>
              {selectedFile ? (selectedFile.name || 'Selected file') : 'Select PDF file'}
            </Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.selectedFileContainer}>
              <Ionicons name="document-text" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.selectedFileName} numberOfLines={1}>
                {selectedFile.name || selectedFile.fileName || 'payslip.pdf'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={20} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderListContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading payslips...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedPayslips).length > 0 ? (
          <View style={{ padding: 16 }}>
            {Object.keys(groupedPayslips)
              .sort((a, b) => parseInt(b) - parseInt(a))
              .map(renderYearSection)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={WHATSAPP_COLORS.textTertiary} />
            <Text style={styles.emptyStateTitle}>No Payslips Found</Text>
            <Text style={styles.emptyStateMessage}>
              Upload payslips to get started
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.assetsModalOverlay}>
        <View style={styles.assetsModalContainer}>
          <View style={styles.assetsModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="document-text-outline" size={24} color={WHATSAPP_COLORS.primary} />
              <Text style={[styles.assetsModalTitle, { marginLeft: 8 }]}>
                {modalMode === 'upload' ? 'Upload Payslip' : 'Payslips'}
              </Text>
            </View>
            
            {modalMode === 'list' ? (
              <TouchableOpacity
                style={styles.uploadPayslipButton}
                onPress={() => setModalMode('upload')}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadPayslipButtonText}>Upload</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
              <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {modalMode === 'list' ? renderListContent() : renderUploadForm()}

          {modalMode === 'upload' && (
            <View style={[styles.modalButtons, { marginBottom: 20, marginRight:20, marginLeft:20 }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalMode('list');
                  setSelectedFile(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  (!selectedFile || uploading) && styles.disabledButton
                ]}
                onPress={handleUpload}
                disabled={!selectedFile || uploading}
                activeOpacity={0.7}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PayslipModal;