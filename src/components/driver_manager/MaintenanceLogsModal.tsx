import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaintenanceLogsModalProps } from './types';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';

const MaintenanceLogsModal: React.FC<MaintenanceLogsModalProps> = ({
  isVisible,
  onClose,
  logs,
  formatDate,
  token,
  vehicleId,
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!token || !vehicleId) return;

    setDownloading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadMaintainanceReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ token, vehicle_id: vehicleId }),
      });

      const text = await response.text();
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (response.ok && data.file_url) {
          // Download the PDF
          const downloadResumable = FileSystem.createDownloadResumable(
            data.file_url,
            FileSystem.documentDirectory + data.filename,
            {}
          );

          const { uri } = await downloadResumable.downloadAsync();
          
          // Share the downloaded file
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Maintenance Report',
            });
          } else {
            Alert.alert('Success', 'PDF downloaded successfully');
          }
        } else {
          Alert.alert('Error', data.message || 'Failed to download PDF');
        }
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = (url: string): "file-pdf-box" | "file-image" | "file-document" => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'file-pdf-box';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'file-image';
    return 'file-document';
  };

  const getFileName = (url: string): string => {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  };

  const handleOpenDocument = async (documentUrl: string) => {
    try {
      const supported = await Linking.canOpenURL(documentUrl);
      if (supported) {
        await Linking.openURL(documentUrl);
      } else {
        Alert.alert('Error', 'Cannot open this type of file');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Maintenance Logs</Text>
            {token && vehicleId && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#075E54" />
                ) : (
                  <MaterialIcons name="download" size={24} color="#075E54" />
                )}
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.logHeaderLeft}>
                      <MaterialCommunityIcons name="toolbox" size={20} color="#075E54" />
                      <Text style={styles.logCost}>₹{log.cost}</Text>
                    </View>
                    <Text style={styles.logDate}>{formatDate(log.maintenance_date)}</Text>
                  </View>
                  
                  <Text style={styles.logDescription}>{log.description}</Text>
                  
                  <View style={styles.logDetails}>
                    <View style={styles.logDetailRow}>
                      <MaterialIcons name="calendar-today" size={14} color="#666" />
                      <Text style={styles.logDetail}>
                        {formatDate(log.start_date)} - {formatDate(log.end_date)}
                      </Text>
                    </View>
                    <View style={styles.logDetailRow}>
                      <Ionicons name="person" size={14} color="#666" />
                      <Text style={styles.logDetail}>{log.logged_by.full_name}</Text>
                    </View>
                  </View>

                  {log.document && (
                    <View style={[styles.documentSection]}>
                      <View style={[styles.documentCard]}>
                        <View style={[styles.documentInfo, { width: '80%' }]}>
                          <MaterialCommunityIcons 
                            name={getFileIcon(log.document)} 
                            size={24} 
                            color="#075E54" 
                          />
                          <View style={styles.documentTextContainer}>
                            <Text style={styles.documentName} numberOfLines={1}>
                              {getFileName(log.document)}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.documentActions}>
                          <TouchableOpacity
                            style={styles.viewButton}
                            onPress={() => handleOpenDocument(log.document as string)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="eye-outline" size={14} color="#075E54" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="toolbox-outline" size={60} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>No maintenance records</Text>
                <Text style={styles.emptyStateSubtext}>Maintenance history will appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default MaintenanceLogsModal;