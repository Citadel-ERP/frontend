import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOS_COLORS } from './constants';
import { ReminderItem } from './types';
import { formatDate, formatTime, getColorValue } from './utils';

interface ReminderInfoProps {
  visible: boolean;
  reminder: ReminderItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (reminderId: number) => void;
  onToggleComplete: (reminderId: number, currentStatus: boolean) => void;
}

const ReminderInfo: React.FC<ReminderInfoProps> = ({
  visible,
  reminder,
  onClose,
  onEdit,
  onDelete,
  onToggleComplete,
}) => {
  if (!reminder) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={onClose} 
            activeOpacity={0.7}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Reminder Details</Text>
          <TouchableOpacity 
            onPress={() => onDelete(reminder.id)} 
            activeOpacity={0.7}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.modalContent} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Title Card */}
          <View style={styles.titleCard}>
            <View style={[styles.colorIndicator, { backgroundColor: getColorValue(reminder.color) }]} />
            <View style={styles.titleContent}>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              {reminder.is_completed && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#25D366" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </View>
          </View>

          {/* Date & Time Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={22} color="#075E54" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {new Date(reminder.reminder_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time-outline" size={22} color="#075E54" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{formatTime(reminder.reminder_time)}</Text>
              </View>
            </View>
          </View>

          {/* Description Card */}
          {reminder.description && (
            <View style={styles.descriptionCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={20} color="#075E54" />
                <Text style={styles.cardHeaderText}>Notes</Text>
              </View>
              <Text style={styles.descriptionText}>{reminder.description}</Text>
            </View>
          )}

          {/* Shared With Card */}
          {reminder.also_share_with && reminder.also_share_with.length > 0 && (
            <View style={styles.sharedCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="people-outline" size={20} color="#075E54" />
                <Text style={styles.cardHeaderText}>Shared With</Text>
              </View>
              <View style={styles.sharedList}>
                {reminder.also_share_with.map((empId, idx) => (
                  <View key={idx} style={styles.sharedItem}>
                    <View style={styles.sharedAvatar}>
                      <Text style={styles.avatarText}>
                        {typeof empId === 'string' ? empId.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                    <Text style={styles.sharedName}>{empId}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#007AFF15' }]}>
                  <Ionicons name="pencil" size={20} color="#007AFF" />
                </View>
                <Text style={styles.actionButtonText}>Edit Reminder</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            {/* Only show mark as complete button if not already completed */}
            {!reminder.is_completed && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onToggleComplete(reminder.id, reminder.is_completed)}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionButtonLeft}>
                    <View style={[
                      styles.actionIconContainer, 
                      { backgroundColor: '#075E5415' }
                    ]}>
                      <Ionicons 
                        name="checkmark-circle-outline"
                        size={20} 
                        color="#075E54"
                      />
                    </View>
                    <Text style={styles.actionButtonText}>Mark as Complete</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#075E54',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: '5%',
    alignItems: 'center',
  },
  titleCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorIndicator: {
    height: 6,
    width: '100%',
  },
  titleContent: {
    padding: 20,
  },
  reminderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    lineHeight: 32,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#25D36615',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  completedText: {
    fontSize: 14,
    color: '#25D366',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#075E5410',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 24,
  },
  sharedCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sharedList: {
    gap: 12,
  },
  sharedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  sharedName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  actionsCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    flex: 1,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 20,
  },
});

export default ReminderInfo;