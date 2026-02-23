import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReminderItem } from './types';
import { formatTime, getColorValue } from './utils';

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60; // Height of each hour slot in pixels
const TIME_LABEL_WIDTH = 78; // Width reserved for time labels (70px label + 8px padding)

interface DayViewProps {
  selectedDate: Date;
  reminders: ReminderItem[];
  onOpenDetailModal: (reminder: ReminderItem) => void;
  onCreateReminder: () => void;
  getRemindersForDate: (date: Date) => ReminderItem[];
  onBackToCalendar: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
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
  onBackToCalendar,
  refreshing = false,
  onRefresh,
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

  
  const getRemindersForHour = (hour: number): PositionedReminder[] => {
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;
    
    return allPositionedReminders.filter(reminder => {
      // ONLY include if reminder STARTS in this hour
      // This ensures each reminder is rendered exactly once
      return reminder.startMinutes >= hourStart && reminder.startMinutes < hourEnd;
    });
  };

  return (
    <View style={styles.dayViewContainer}>
      <View style={styles.dayViewHeader}>
        <View style={styles.dayViewHeaderRow}>
          <TouchableOpacity 
            onPress={onBackToCalendar}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={onCreateReminder}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dayViewDateContainer}>
          <Text style={styles.dayViewWeekday}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </Text>
          <Text style={styles.dayViewDate}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.timelineScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#25D366']}
              tintColor={'#25D366'}
            />
          ) : undefined
        }
      >
        <View style={styles.timeline}>
          {HOURS_24.map(hour => {
            const hourReminders = getRemindersForHour(hour);
            const hourStart = hour * 60;
            console.log(`Rendering hour ${hour} with ${hourReminders.length} reminders`, hourReminders);
            return (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
                <View style={styles.timeSlotLine} />
                
                {hourReminders.map((reminder) => {
                  
                  const reminderStartInHour = Math.max(0, reminder.startMinutes - hourStart);
                  const reminderEndInHour = Math.min(60, reminder.endMinutes - hourStart);
                  
                  const topOffset = (reminderStartInHour / 60) * SLOT_HEIGHT;
                  const height = Math.max(60, ((reminderEndInHour - reminderStartInHour) / 60) * SLOT_HEIGHT);
                  
                  // Calculate width and position for each column
                  const columnWidthPercent = 100 / reminder.totalColumns;
                  const columnLeftPercent = (reminder.column / reminder.totalColumns) * 100;
                  
                  return (
                    <View
                      key={reminder.id}
                      style={[
                        styles.reminderWrapper,
                        {
                          top: topOffset,
                          height: height,
                        }
                      ]}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          left: `${columnLeftPercent}%`,
                          width: `${columnWidthPercent}%`,
                          height: '100%',
                          paddingRight: 4,
                        }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.reminderBlock,
                            {
                              backgroundColor: getColorValue(reminder.color) + '20',
                              borderLeftColor: getColorValue(reminder.color),
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
                              <Ionicons name="checkmark-circle" size={14} color="#25D366" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
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
  },
  dayViewHeader: {
    backgroundColor: '#075E54',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
  },
  dayViewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  dayViewDateContainer: {
    marginBottom: 8,
  },
  dayViewWeekday: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayViewDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  timelineScroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  timelineContent: {
    paddingBottom: 100,
  },
  timeline: {
    paddingHorizontal: 8,
  },
  timeSlot: {
    height: SLOT_HEIGHT,
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    position: 'relative',
  },
  timeLabel: {
    width: 70,
    fontSize: 12,
    color: '#8E8E93',
    paddingTop: 4,
    paddingRight: 12,
    textAlign: 'right',
    fontWeight: '500',
  },
  timeSlotLine: {
    flex: 1,
  },
  reminderWrapper: {
    position: 'absolute',
    left: TIME_LABEL_WIDTH,
    right: 8,
  },
  reminderBlock: {
    flex: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
  },
  reminderBlockTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
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