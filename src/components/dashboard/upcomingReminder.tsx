import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReminderItem {
  id: string;
  title: string;
  reminder_date: string;
  reminder_time?: string; // Add this field
  description?: string;
  created_by?: any;
  color?: string;
  is_completed?: boolean;
}

interface UpcomingReminderProps {
  reminders: ReminderItem[];
  theme: any;
  currentColors: any;
  onPress?: () => void; 
}

const UpcomingReminder: React.FC<UpcomingReminderProps> = ({
  reminders,
  theme,
  currentColors,
  onPress, 
}) => {
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Helper function to combine date and time
  const getFormattedDateTime = (reminder: ReminderItem) => {
    const date = new Date(reminder.reminder_date);
    
    // If reminder_time exists, combine it with the date
    if (reminder.reminder_time) {
      const [hours, minutes] = reminder.reminder_time.split(':');
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
    }
    
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.sectionCard, styles.reminderCard, { backgroundColor: theme.cardBg }]}
      onPress={handlePress}
      activeOpacity={0.7} 
    >
      <View style={styles.reminderContent}>
        <View style={[styles.reminderBorder, { backgroundColor: currentColors.primaryBlue }]} />
        <View style={styles.reminderText}>
          <Text style={[styles.labelSmall, { color: theme.textSub, marginBottom: 20 }]}>
            UPCOMING REMINDERS
          </Text>
          {reminders && reminders.length > 0 ? (
            reminders.map((reminder, index) => (
              <View key={reminder.id || index} style={index > 0 ? { marginTop: 10 } : null}>
                <Text style={[styles.reminderTitle, { color: theme.textMain }]}>
                  {reminder.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={12} />
                  <Text style={[styles.reminderTime, { color: theme.textSub, marginLeft: 2 }]}>
                    {getFormattedDateTime(reminder)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <>
              <Text style={[styles.reminderTitle, { color: theme.textMain, marginBottom: 5 }]}>
                No upcoming Reminders
              </Text>
              <Text style={[styles.reminderTime, { color: theme.textSub }]}>
                Kickback and Relax
              </Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.calendarIcon}>
        <Ionicons name="calendar-outline" size={40} color={currentColors.primaryBlue} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: Platform.OS === 'web' ? 0 : 20,
    marginBottom: 15,
    marginTop:10,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 125,
  },
  reminderContent: {
    flexDirection: 'row',
    flex: 1,
    height: '75%',
  },
  reminderBorder: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  reminderText: {
    flex: 1,
  },
  labelSmall: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  reminderTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  reminderTime: {
    fontSize: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
});

export default UpcomingReminder;