import React from 'react';
import {
  View,
  Text,
} from 'react-native';
import { AttendanceRecord } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface AttendanceCalendarProps {
  attendanceReport: AttendanceRecord[];
  selectedMonth: number;
  selectedYear: number;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  attendanceReport,
  selectedMonth,
  selectedYear,
}) => {
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getDateStatus = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const record = attendanceReport.find(r => r.date === dateStr);
    
    if (record) {
      return record.attendance_status;
    }
    
    return null;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Empty days for start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDateStatus(day);
      const isToday = day === currentDay && selectedMonth === currentMonth && selectedYear === currentYear;
      
      let backgroundColor = '#FFFFFF';
      let textColor = WHATSAPP_COLORS.textPrimary;
      
      switch (status) {
        case 'present':
          backgroundColor = '#E8F5E9';
          textColor = '#2E7D32';
          break;
        case 'leave':
          backgroundColor = '#FFF3E0';
          textColor = '#EF6C00';
          break;
        case 'wfh':
          backgroundColor = '#E3F2FD';
          textColor = '#1565C0';
          break;
        case 'holiday':
          backgroundColor = '#E8EAF6';
          textColor = '#5C6BC0';
          break;
        case 'absent':
          backgroundColor = '#FFEBEE';
          textColor = '#D32F2F';
          break;
        case 'weekend':
          backgroundColor = '#F5F5F5';
          textColor = '#9E9E9E';
          break;
        default:
          backgroundColor = '#FFFFFF';
          textColor = WHATSAPP_COLORS.textPrimary;
      }

      days.push(
        <View key={day} style={styles.calendarDay}>
          <View style={[
            styles.dayCircle,
            { backgroundColor, borderColor: textColor },
            isToday && styles.todayCircle
          ]}>
            <Text style={[styles.dayText, { color: textColor }]}>
              {day}
            </Text>
          </View>
        </View>
      );
    }

    return days;
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.weekDays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>
      
      <View style={styles.calendarGrid}>
        {renderCalendar()}
      </View>
    </View>
  );
};