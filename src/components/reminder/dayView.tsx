import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOS_COLORS } from './constants';
import { ReminderItem } from './types';
import { formatTime, getColorValue } from './utils';

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60; // Height of each hour slot in pixels

interface DayViewProps {
  selectedDate: Date;
  reminders: ReminderItem[];
  onOpenDetailModal: (reminder: ReminderItem) => void;
  onCreateReminder: () => void;
  getRemindersForDate: (date: Date) => ReminderItem[];
}

interface PositionedReminder extends ReminderItem {
  startMinutes: number;
  endMinutes: number;
  column: number;
  totalColumns: number;
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

  // Convert time string to minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check if two reminders overlap
  const remindersOverlap = (r1: PositionedReminder, r2: PositionedReminder): boolean => {
    return r1.startMinutes < r2.endMinutes && r2.startMinutes < r1.endMinutes;
  };

  // Calculate all positioned reminders for the entire day with conflict resolution
  const calculateAllReminderPositions = (): PositionedReminder[] => {
    if (dayReminders.length === 0) return [];

    // Assign each reminder a start and end time in minutes
    const remindersWithTimes: PositionedReminder[] = dayReminders.map(reminder => {
      const startMinutes = timeToMinutes(reminder.reminder_time);
      // Default to 1 hour duration
      const endMinutes = startMinutes + 60;
      return {
        ...reminder,
        startMinutes,
        endMinutes,
        column: 0,
        totalColumns: 1,
      };
    });

    // Sort by start time
    remindersWithTimes.sort((a, b) => a.startMinutes - b.startMinutes);

    // Assign columns - each reminder gets placed in the first available column
    remindersWithTimes.forEach((reminder, index) => {
      // Find all reminders that overlap with this one
      const overlapping = remindersWithTimes.slice(0, index).filter(other => 
        remindersOverlap(reminder, other)
      );

      // Find the first available column (checking which columns are occupied)
      const occupiedColumns = new Set(overlapping.map(r => r.column));
      let column = 0;
      while (occupiedColumns.has(column)) {
        column++;
      }
      
      reminder.column = column;
    });

    // Calculate totalColumns for each reminder (max columns among overlapping reminders)
    remindersWithTimes.forEach(reminder => {
      // Find all reminders that overlap with this one
      const overlapping = remindersWithTimes.filter(other => 
        other.id !== reminder.id && remindersOverlap(reminder, other)
      );

      // Include this reminder's column too
      const allColumns = [reminder.column, ...overlapping.map(r => r.column)];
      reminder.totalColumns = Math.max(...allColumns) + 1;
    });

    return remindersWithTimes;
  };

  // Get all positioned reminders once
  const allPositionedReminders = calculateAllReminderPositions();

  // Filter reminders by hour for rendering
  const getRemindersForHour = (hour: number): PositionedReminder[] => {
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;
    
    return allPositionedReminders.filter(reminder => {
      // Include reminder if it starts in this hour or overlaps with this hour
      return (
        (reminder.startMinutes >= hourStart && reminder.startMinutes < hourEnd) ||
        (reminder.startMinutes < hourStart && reminder.endMinutes > hourStart)
      );
    });
  };

  return (
    <View style={styles.dayViewContainer}>
      <View style={styles.dayViewHeader}>
        <View>
          <Text style={styles.dayViewDate}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
          </Text>
          <Text style={styles.dayViewDay}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
            const hourReminders = getRemindersForHour(hour);
            const hourStart = hour * 60;

            return (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
                <View style={styles.timeSlotLine} />
                
                {hourReminders.map((reminder) => {
                  // Calculate position within this hour slot
                  const reminderStartInHour = Math.max(0, reminder.startMinutes - hourStart);
                  const reminderEndInHour = Math.min(60, reminder.endMinutes - hourStart);
                  
                  const topOffset = (reminderStartInHour / 60) * SLOT_HEIGHT;
                  const height = Math.max(40, ((reminderEndInHour - reminderStartInHour) / 60) * SLOT_HEIGHT);
                  
                  // Calculate width as percentage of available space
                  const widthPercentage = (1 / reminder.totalColumns) * 100;
                  // Calculate left position as percentage
                  const leftPercentage = (reminder.column / reminder.totalColumns) * 100;

                  return (
                    <TouchableOpacity
                      key={reminder.id}
                      style={[
                        styles.reminderBlock,
                        {
                          backgroundColor: getColorValue(reminder.color) + '20',
                          borderLeftColor: getColorValue(reminder.color),
                          top: topOffset,
                          height: height,
                          left: `${leftPercentage}%`,
                          width: `${widthPercentage - 0.5}%`, // Small gap
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
                        numberOfLines={2}
                      >
                        {reminder.title}
                      </Text>
                      <Text style={styles.reminderBlockTime}>
                        {formatTime(reminder.reminder_time)}
                      </Text>
                      {reminder.is_completed && (
                        <View style={styles.completedIndicator}>
                          <Ionicons name="checkmark-circle" size={14} color={IOS_COLORS.success} />
                        </View>
                      )}
                    </TouchableOpacity>
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
  reminderBlock: {
    position: 'absolute',
    left: 70, // Will be overridden by percentage
    right: 8,
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 10,
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
});

export default DayView;