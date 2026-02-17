import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from './constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

interface AttendanceDownloadModalProps {
  visible: boolean;
  onClose: () => void;
  onDownload: (month: number, year: number, employeeId?: string) => Promise<void>;
  employeeId?: string;
  employeeName?: string;
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

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i);
  }
  return years;
};

const AttendanceDownloadModal: React.FC<AttendanceDownloadModalProps> = ({
  visible,
  onClose,
  onDownload,
  employeeId,
  employeeName,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [loading, setLoading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [downloadResult, setDownloadResult] = useState<{ fileUrl: string; filename: string } | null>(null);

  const years = generateYears();

  const handleDownload = async () => {
    setLoading(true);
    try {
      // This should now return file_url and filename from the backend
      const result = await onDownload(selectedMonth, selectedYear, employeeId);
      
      // Assuming the backend returns file_url and filename
      // If your current backend doesn't return this, you'll need to modify it
      if (result && (result as any).file_url) {
        const { file_url, filename } = result as any;
        
        const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth.toString();
        const dateStr = `${monthName} ${selectedYear}`;
        
        // Using React Native's Alert API instead of custom alert utility
        Alert.alert(
          'Download Report',
          `Attendance report for ${dateStr}${employeeName ? ` - ${employeeName}` : ''} is ready.`,
          [
            {
              text: 'Open in Browser',
              onPress: async () => {
                try {
                  await WebBrowser.openBrowserAsync(file_url);
                } catch (err) {
                  console.error('Failed to open browser:', err);
                  Alert.alert('Error', 'Could not open the file in browser');
                }
              },
            },
            {
              text: 'Download & Share',
              onPress: async () => {
                try {
                  console.log('Starting download from:', file_url);
                  
                  const fileUri = FileSystem.documentDirectory + filename;
                  console.log('Saving to:', fileUri);
                  
                  const downloadResult = await FileSystem.downloadAsync(
                    file_url,
                    fileUri
                  );

                  console.log('Download result:', downloadResult);

                  if (downloadResult.status === 200) {
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                      await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Attendance Report',
                        UTI: 'com.adobe.pdf',
                      });
                      Alert.alert('Success', 'Report downloaded successfully!');
                    } else {
                      Alert.alert('Info', `File saved to: ${fileUri}`);
                    }
                  } else {
                    throw new Error(`Download failed with status: ${downloadResult.status}`);
                  }
                } catch (err: any) {
                  console.error('Download error:', err);
                  Alert.alert(
                    'Download Error', 
                    err.message || 'Failed to download PDF. Please try "Open in Browser" instead.'
                  );
                }
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
          { cancelable: true }
        );
      }
      
      // Don't close the modal immediately after showing alert
      // The modal should be closed manually by the user or after action
      
    } catch (error: any) {
      console.error('Download error in modal:', error);
      // Only show alert if error wasn't already handled by parent
      if (!error.message?.includes('Authentication required')) {
        Alert.alert('Error', error.message || 'Failed to download report');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMonthLabel = (monthValue: number) => {
    return MONTHS.find(m => m.value === monthValue)?.label || '';
  };

  const handleClose = () => {
    if (!loading) {
      setShowMonthPicker(false);
      setShowYearPicker(false);
      setDownloadResult(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar-outline" size={24} color={WHATSAPP_COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Download Attendance Report</Text>
            {employeeName && (
              <Text style={styles.employeeName}>{employeeName}</Text>
            )}
            <Text style={styles.modalSubtitle}>Select the month and year for the report</Text>
          </View>

          {/* Month Picker */}
          <View style={[styles.pickerSection, { zIndex: showMonthPicker ? 10 : 1 }]}>
            <Text style={styles.pickerLabel}>Month</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                showMonthPicker && styles.pickerButtonActive
              ]}
              onPress={() => {
                setShowMonthPicker(!showMonthPicker);
                setShowYearPicker(false);
              }}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.pickerButtonText}>{getMonthLabel(selectedMonth)}</Text>
              <Ionicons
                name={showMonthPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={WHATSAPP_COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showMonthPicker && (
              <View style={styles.pickerDropdown}>
                <ScrollView
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  style={styles.pickerScrollView}
                >
                  {MONTHS.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.pickerOption,
                        selectedMonth === month.value && styles.pickerOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedMonth(month.value);
                        setShowMonthPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        selectedMonth === month.value && styles.pickerOptionTextSelected
                      ]}>
                        {month.label}
                      </Text>
                      {selectedMonth === month.value && (
                        <Ionicons name="checkmark" size={20} color={WHATSAPP_COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Year Picker */}
          <View style={[styles.pickerSection, { zIndex: showYearPicker ? 10 : 1 }]}>
            <Text style={styles.pickerLabel}>Year</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                showYearPicker && styles.pickerButtonActive
              ]}
              onPress={() => {
                setShowYearPicker(!showYearPicker);
                setShowMonthPicker(false);
              }}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.pickerButtonText}>{selectedYear}</Text>
              <Ionicons
                name={showYearPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={WHATSAPP_COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showYearPicker && (
              <View style={styles.pickerDropdown}>
                <ScrollView
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  style={styles.pickerScrollView}
                >
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerOption,
                        selectedYear === year && styles.pickerOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedYear(year);
                        setShowYearPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        selectedYear === year && styles.pickerOptionTextSelected
                      ]}>
                        {year}
                      </Text>
                      {selectedYear === year && (
                        <Ionicons name="checkmark" size={20} color={WHATSAPP_COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={20} color="#4B5563" />
            <Text style={styles.infoText}>
              The report will include detailed attendance statistics for {employeeName ? 'this employee' : 'all employees'} for the selected month and year.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleClose}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.downloadButton,
                loading && styles.disabledButton
              ]}
              onPress={handleDownload}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadButtonText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadButtonText}>Generate Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 10,
    padding: 14,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  pickerButtonActive: {
    borderColor: WHATSAPP_COLORS.primary,
    backgroundColor: '#F8FFF9',
  },
  pickerButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  pickerDropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 10,
    backgroundColor: WHATSAPP_COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  pickerScrollView: {
    maxHeight: 200,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  pickerOptionSelected: {
    backgroundColor: '#E8F5E9',
  },
  pickerOptionText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: WHATSAPP_COLORS.border,
  },
  cancelButtonText: {
    color: WHATSAPP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default AttendanceDownloadModal;