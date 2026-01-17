import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
          const canOpen = await Linking.canOpenURL(data.file_url);
          if (canOpen) {
            await Linking.openURL(data.file_url);
          } else {
            Alert.alert(
              'Download Report',
              `Report is available at: ${data.file_url}`,
              [
                { text: 'Copy URL', onPress: () => {
                  console.log('URL to copy:', data.file_url);
                }},
                { text: 'OK' }
              ]
            );
          }
        } else {
          Alert.alert('Error', data.message || 'Failed to generate PDF');
        }
      } else {
        Alert.alert('Error', 'Invalid response from server');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal 
      visible={isVisible} 
      transparent 
      animationType="slide" 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.detailBackButton} 
                onPress={onClose}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.modalTitle}>Fuel Logs</Text>
                <Text style={styles.modalSubtitle}>
                  {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                </Text>
              </View>
            </View>
            {token && vehicleId && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="file-pdf-box" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={styles.section}>
                  <View style={styles.logHeader}>
                    <View style={styles.logHeaderLeft}>
                      <View style={[styles.selectedUserAvatar, { marginRight: 12 }]}>
                        <MaterialCommunityIcons name="fuel" size={24} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.logCost}>₹{log.cost}</Text>
                        <Text style={styles.logQuantity}>{log.quantity}L</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.logDate}>{formatDateTime(log.fuel_date)}</Text>
                    </View>
                  </View>

                  <View style={styles.fuelDetails}>
                    <View style={styles.fuelDetailItem}>
                      <MaterialCommunityIcons name="speedometer" size={18} color="#008069" />
                      <Text style={styles.fuelDetailValue}>{log.odometer_reading} km</Text>
                    </View>
                  </View>

                  <View style={styles.logDetails}>
                    <View style={styles.logDetailRow}>
                      <View style={[styles.resultAvatar, { width: 32, height: 32, marginRight: 8 }]}>
                        <Ionicons name="person" size={16} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={[styles.logDetail, { fontSize: 14, fontWeight: '600', color: '#333' }]}>
                          {log.logged_by.full_name}
                        </Text>
                        <Text style={[styles.logDetail, { fontSize: 12, color: '#999' }]}>
                          Logged by
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="fuel" size={48} color="#008069" />
                </View>
                <Text style={styles.emptyStateTitle}>No Fuel Logs</Text>
                <Text style={styles.emptyStateText}>
                  Fuel consumption history will appear here once you add fuel entries
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};