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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [groupedPayslips, setGroupedPayslips] = useState<{ [key: string]: PayslipData[] }>({});

  useEffect(() => {
    if (visible) {
      fetchPayslips();
    }
  }, [visible]);

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
        Alert.alert('Error', errorData.message || 'Failed to fetch payslips');
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
      Alert.alert('Error', 'Network error occurred');
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
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a payslip file');
      return;
    }

    // Check if payslip already exists for this month/year
    const exists = payslips.some(
      p => p.month === selectedMonth && p.year === selectedYear
    );

    if (exists) {
      Alert.alert(
        'Payslip Exists',
        'A payslip for this month already exists. Do you want to replace it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => uploadPayslip() }
        ]
      );
      return;
    }

    uploadPayslip();
  };

  const uploadPayslip = async () => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('employee_id', employee.employee_id);
      formData.append('month', selectedMonth.toString());
      formData.append('year', selectedYear.toString());
      formData.append('payslip', {
        uri: selectedFile.uri,
        type: 'application/pdf',
        name: selectedFile.name || 'payslip.pdf',
      } as any);

      const response = await fetch(`${BACKEND_URL}/manager/uploadPayslip`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Payslip uploaded successfully');
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchPayslips();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to upload payslip');
      }
    } catch (error) {
      console.error('Error uploading payslip:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setUploading(false);
    }
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
        Alert.alert('Error', 'Cannot open this file');
      }
    } catch (error) {
      console.error('Error downloading payslip:', error);
      Alert.alert('Error', 'Failed to download payslip');
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

  return (
    <>
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
                  Payslips
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.uploadPayslipButton}
                onPress={() => setShowUploadModal(true)}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadPayslipButtonText}>Upload</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
                <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
                <Text style={styles.loadingText}>Loading payslips...</Text>
              </View>
            ) : (
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
            )}
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Payslip</Text>
            </View>

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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowUploadModal(false);
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
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PayslipModal;