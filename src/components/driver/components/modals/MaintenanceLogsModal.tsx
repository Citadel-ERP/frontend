import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MaintenanceLogsModalProps } from '../../types';
import { styles } from '../../styles';

export const MaintenanceLogsModal: React.FC<MaintenanceLogsModalProps> = ({
  isVisible,
  onClose,
  logs,
  formatDate,
}) => {
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Maintenance Logs</Text>
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