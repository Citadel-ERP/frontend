import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FuelLogsModalProps } from '../../types';
import { styles } from '../../styles';

export const FuelLogsModal: React.FC<FuelLogsModalProps> = ({
  isVisible,
  onClose,
  logs,
  formatDateTime,
}) => {
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Fuel Logs</Text>
            <View style={{ width: 40 }} />
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