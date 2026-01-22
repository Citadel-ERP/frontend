import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOS_COLORS } from './constants';
import { ReminderItem } from './types';
import { formatTime, getColorValue } from './utils';

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

interface DayViewProps {
  selectedDate: Date;
  reminders: ReminderItem[];
  onOpenDetailModal: (reminder: ReminderItem) => void;
  onCreateReminder: () => void;
  getRemindersForDate: (date: Date) => ReminderItem[];
}

const DayView: React.FC<DayViewProps> = ({
  selectedDate,
  reminders,
  onOpenDetailModal,
  onCreateReminder,
  getRemindersForDate,
}) => {
  const dayReminders = getRemindersForDate(selectedDate);

  const formatHourLabel = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Group reminders by hour and minute for better layout
  const getRemindersByHourAndMinute = (hour: number) => {
    const hourReminders = dayReminders.filter(r => {
      const startHour = parseInt(r.reminder_time.split(':')[0]);
      return startHour === hour;
    });

    // Group by minute
    const groupedByMinute: { [key: string]: ReminderItem[] } = {};
    hourReminders.forEach(reminder => {
      const minute = reminder.reminder_time.split(':')[1];
      if (!groupedByMinute[minute]) {
        groupedByMinute[minute] = [];
      }
      groupedByMinute[minute].push(reminder);
    });

    return groupedByMinute;
  };

  return (
    <View style={styles.dayViewContainer}>
      <View style={styles.dayViewHeader}>
        <View>
          <Text style={styles.dayViewDate}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </Text>
          <Text style={styles.dayViewDay}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={onCreateReminder}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.timelineScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        <View style={styles.timeline}>
          {HOURS_24.map(hour => {
            const remindersByMinute = getRemindersByHourAndMinute(hour);
            const hasReminders = Object.keys(remindersByMinute).length > 0;

            return (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
                <View style={styles.timeSlotLine} />
                
                {hasReminders && Object.entries(remindersByMinute).map(([minute, reminders]) => {
                  const topOffset = (parseInt(minute) / 60) * 60;
                  const reminderCount = reminders.length;
                  
                  // Calculate width for each reminder based on count
                  const getWidthPercentage = () => {
                    if (reminderCount === 1) return '100%';
                    if (reminderCount === 2) return '49%';
                    if (reminderCount === 3) return '32%';
                    return '24%'; // For 4 or more
                  };

                  return (
                    <View 
                      key={`${hour}-${minute}`}
                      style={[styles.reminderRow, { top: topOffset }]}
                    >
                      {reminders.slice(0, 4).map((reminder, index) => (
                        <TouchableOpacity
                          key={reminder.id}
                          style={[
                            styles.reminderBlock,
                            {
                              backgroundColor: getColorValue(reminder.color) + '20',
                              borderLeftColor: getColorValue(reminder.color),
                              width: getWidthPercentage(),
                              marginRight: index < reminderCount - 1 ? 4 : 0,
                            }
                          ]}
                          onPress={() => onOpenDetailModal(reminder)}
                          activeOpacity={0.8}
                        >
                          <Text 
                            style={[
                              styles.reminderBlockTitle, 
                              { color: getColorValue(reminder.color) }
                            ]}
                            numberOfLines={reminderCount > 2 ? 1 : 2}
                          >
                            {reminder.title}
                          </Text>
                          {reminderCount <= 2 && (
                            <Text style={styles.reminderBlockTime}>
                              {formatTime(reminder.reminder_time)}
                            </Text>
                          )}
                          {reminder.is_completed && (
                            <View style={styles.completedIndicator}>
                              <Ionicons name="checkmark-circle" size={14} color={IOS_COLORS.success} />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                      {reminders.length > 4 && (
                        <View style={styles.moreIndicator}>
                          <Text style={styles.moreIndicatorText}>
                            +{reminders.length - 4}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  dayViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dayViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
    backgroundColor: '#fff',
  },
  dayViewDate: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayViewDay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 100,
  },
  timeline: {
    paddingHorizontal: 8,
  },
  timeSlot: {
    height: 60,
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    position: 'relative',
  },
  timeLabel: {
    width: 60,
    fontSize: 11,
    color: '#8E8E93',
    paddingTop: 4,
    paddingRight: 8,
    textAlign: 'right',
    fontWeight: '500',
  },
  timeSlotLine: {
    flex: 1,
  },
  reminderRow: {
    position: 'absolute',
    left: 70,
    right: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderBlock: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 10,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'space-between',
  },
  reminderBlockTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
    lineHeight: 16,
  },
  reminderBlockTime: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  completedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  moreIndicator: {
    width: 40,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreIndicatorText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
});

export default DayView;