import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FuelLogsModalProps } from './types';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';

export const FuelLogsModal: React.FC<FuelLogsModalProps> = ({
  isVisible,
  onClose,
  logs,
  formatDateTime,
  token,
  vehicleId,
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!token || !vehicleId) return;

    setDownloading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadFuelLogs`, {
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
          try {
            const downloadResumable = FileSystem.createDownloadResumable(
              data.file_url,
              FileSystem.documentDirectory + data.filename,
              {}
            );

            const { uri } = await downloadResumable.downloadAsync();
            
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Fuel Logs Report',
              });
            } else {
              Alert.alert('Success', 'PDF downloaded successfully');
            }
          } catch (error) {
            console.error('Error downloading PDF:', error);
            Alert.alert('Error', 'Failed to download PDF');
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

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Fuel Logs</Text>
            {token && vehicleId && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#075E54" />
                ) : (
                  <MaterialCommunityIcons name="file-pdf-box" size={24} color="#075E54" />
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
                      <MaterialCommunityIcons name="fuel" size={20} color="#075E54" />
                      <View>
                        <Text style={styles.logCost}>₹{log.cost}</Text>
                        <Text style={styles.logQuantity}>{log.quantity}L</Text>
                      </View>
                    </View>
                    <Text style={styles.logDate}>{formatDateTime(log.fuel_date)}</Text>
                  </View>
                  <View style={styles.fuelDetails}>
                    <View style={styles.fuelDetailItem}>
                      <MaterialCommunityIcons name="speedometer" size={16} color="#666" />
                      <Text style={styles.fuelDetailValue}>{log.odometer_reading} km</Text>
                    </View>
                  </View>
                  <View style={styles.logDetails}>
                    <View style={styles.logDetailRow}>
                      <Ionicons name="person" size={14} color="#666" />
                      <Text style={styles.logDetail}>{log.logged_by.full_name}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="fuel" size={60} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>No fuel logs</Text>
                <Text style={styles.emptyStateSubtext}>Fuel consumption history will appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};