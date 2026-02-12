// hr_employee_management/WorkStatisticsDownloadModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy'; // CHANGED: Use legacy API
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { WHATSAPP_COLORS } from './constants';
import { BACKEND_URL } from '../../config/config';

interface WorkStatisticsDownloadModalProps {
  visible: boolean;
  onClose: () => void;
  onDownload: (date: string) => void;
  token: string;
  currentDate?: string;
}

const WorkStatisticsDownloadModal: React.FC<WorkStatisticsDownloadModalProps> = ({
  visible,
  onClose,
  onDownload,
  token,
  currentDate,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const downloadWorkStatsPDF = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setLoading(true);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('Requesting PDF for date:', dateStr);
      
      const response = await fetch(`${BACKEND_URL}/manager/downloadWorkStats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          date: dateStr 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || 'Failed to download work statistics');
      }

      const data = await response.json();
      
      console.log('Server response:', data);
      
      if (!data.file_url) {
        throw new Error('Invalid response from server');
      }

      const fileUrl = data.file_url;
      const filename = data.filename || `work_stats_${dateStr}.pdf`;

      console.log('File URL:', fileUrl);
      console.log('Filename:', filename);

      Alert.alert(
        'Download Report',
        `Work statistics report for ${new Date(dateStr).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })} is ready.`,
        [
          {
            text: 'Open in Browser',
            onPress: async () => {
              try {
                await WebBrowser.openBrowserAsync(fileUrl);
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
                console.log('Starting download from:', fileUrl);
                
                const fileUri = FileSystem.documentDirectory + filename;
                console.log('Saving to:', fileUri);
                
                // Use FileSystem.downloadAsync from legacy API
                const downloadResult = await FileSystem.downloadAsync(
                  fileUrl,
                  fileUri
                );

                console.log('Download result:', downloadResult);

                if (downloadResult.status === 200) {
                  const canShare = await Sharing.isAvailableAsync();
                  if (canShare) {
                    await Sharing.shareAsync(downloadResult.uri, {
                      mimeType: 'application/pdf',
                      dialogTitle: 'Share Work Statistics Report',
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
        ]
      );

      onClose();
      onDownload(dateStr);

    } catch (error: any) {
      console.error('Download work stats error:', error);
      Alert.alert('Error', error.message || 'Failed to download work statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Work Statistics</Text>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Date Selection */}
            <View style={styles.dateSection}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Ionicons name="calendar-outline" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.dateText}>
                  {formatDate(selectedDate)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <Ionicons name="information-circle-outline" size={20} color="#4B5563" />
              <Text style={styles.infoText}>
                The report will include detailed attendance statistics for all employees on the selected date.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.downloadButton, loading && styles.buttonDisabled]}
                onPress={downloadWorkStatsPDF}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  dateSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    marginRight: 8,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  downloadButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkStatisticsDownloadModal;