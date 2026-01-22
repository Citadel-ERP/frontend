import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from './constants';
import { ReminderItem } from './types';
import { getColorValue, formatDateToYYYYMMDD } from './utils';

interface CalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  reminders: ReminderItem[];
  onMonthChange: (direction: number) => void;
  onDateSelect: (date: Date) => void;
  onDateLongPress: (date: Date) => void;
  onTodayPress: () => void;
  getRemindersForDate: (date: Date) => ReminderItem[];
}

const StatusTooltip: React.FC<{
  visible: boolean;
  reminderCount: number;
  day: number;
}> = ({ visible, reminderCount, day }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.statusTooltip,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        }
      ]}
    >
      <Text style={styles.statusTooltipText}>
        {reminderCount} reminder{reminderCount !== 1 ? 's' : ''}
      </Text>
      <View style={styles.tooltipArrow} />
    </Animated.View>
  );
};

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  selectedDate,
  reminders,
  onMonthChange,
  onDateSelect,
  onDateLongPress,
  onTodayPress,
  getRemindersForDate,
}) => {
  const [selectedDay, setSelectedDay] = useState<{ day: number; count: number } | null>(null);

  useEffect(() => {
    if (selectedDay) {
      const timer = setTimeout(() => {
        setSelectedDay(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [selectedDay]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const days = [];
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const handleDatePress = (day: number, date: Date, dayReminders: ReminderItem[]) => {
    if (dayReminders.length > 0) {
      setSelectedDay({ day, count: dayReminders.length });
    }
    onDateSelect(date);
  };

  // Empty days for start of month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(
      <View key={`empty-${i}`} style={styles.calendarDay} />
    );
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayReminders = getRemindersForDate(date);
    const isToday = day === currentDay && month === currentMonth && year === currentYear;
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isSelected = selectedDate && 
      date.getDate() === selectedDate.getDate() && 
      date.getMonth() === selectedDate.getMonth() && 
      date.getFullYear() === selectedDate.getFullYear();

    const reminderColor = dayReminders.length > 0 
      ? (dayReminders[0].color ? getColorValue(dayReminders[0].color) : WHATSAPP_COLORS.primary)
      : undefined;

    days.push(
      <TouchableOpacity
        key={day}
        style={styles.calendarDay}
        onPress={() => handleDatePress(day, date, dayReminders)}
        onLongPress={() => onDateLongPress(date)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.dayCircle,
          dayReminders.length > 0 && { backgroundColor: reminderColor },
          isToday && styles.todayCircle,
          isSelected && styles.selectedCircle
        ]}>
          <Text style={[
            styles.dayText,
            dayReminders.length > 0 && styles.dayTextActive,
            !dayReminders.length && styles.dayTextInactive,
            isPast && !dayReminders.length && styles.dayTextPast
          ]}>
            {day}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <View style={styles.calendarCard}>
      {selectedDay && (
        <StatusTooltip
          visible={true}
          reminderCount={selectedDay.count}
          day={selectedDay.day}
        />
      )}

      <View style={styles.calendarHeader}>
        <TouchableOpacity 
          onPress={() => onMonthChange(-1)} 
          style={styles.navButton}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <Text style={styles.monthYear}>
          {monthNames[month]} {year}
        </Text>
        
        <TouchableOpacity 
          onPress={() => onMonthChange(1)} 
          style={styles.navButton}
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.weekDay}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {days}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop:30,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  navButtonText: {
    fontSize: 24,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '300',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCircle: {
    width: '85%',
    aspectRatio: 1,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: '#1e1b4b',
  },
  selectedCircle: {
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.accent,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  dayTextActive: {
    fontWeight: '600',
    color: '#ffffff',
  },
  dayTextInactive: {
    color: '#9ca3af',
  },
  dayTextPast: {
    color: '#d1d5db',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  statusTooltip: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  statusTooltipText: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.9)',
    marginTop: -1,
  },
});

export default Calendar;