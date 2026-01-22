import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee, AttendanceRecord } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface AttendanceProps {
  employee: Employee;
  attendanceReport: AttendanceRecord[];
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export const Attendance: React.FC<AttendanceProps> = ({
  employee,
  attendanceReport,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}) => {
  const calculateAttendanceSummary = () => {
    if (!attendanceReport || attendanceReport.length === 0) {
      return {
        present: 0,
        leave: 0,
        wfh: 0,
        absent: 0,
        holidays: 0,
        pending: 0,
        weekends: 0
      };
    }

    return {
      present: attendanceReport.filter(r => r.attendance_status === 'present').length,
      leave: attendanceReport.filter(r => r.attendance_status === 'leave').length,
      wfh: attendanceReport.filter(r => r.attendance_status === 'wfh').length,
      absent: attendanceReport.filter(r => r.attendance_status === 'absent').length,
      holidays: attendanceReport.filter(r => r.attendance_status === 'holiday').length,
      pending: attendanceReport.filter(r => r.attendance_status === 'pending').length,
      weekends: attendanceReport.filter(r => r.attendance_status === 'weekend').length
    };
  };

  const summary = calculateAttendanceSummary();
  
  const getMonthName = (month: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const prevMonth = () => {
    if (selectedMonth === 0) {
      onMonthChange(11);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      onMonthChange(0);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(selectedMonth + 1);
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getDateStatus = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = attendanceReport.find(r => r.date === dateStr);
    return record ? record.attendance_status : null;
  };

  const getDateColor = (status: string | null) => {
    if (!status) return 'transparent';
    
    const statusColors: Record<string, string> = {
      'present': '#4ADE80',      // Green
      'leave': '#FB923C',        // Orange
      'wfh': '#9C27B0',          // Purple
      'absent': '#EF5350',       // Red/Coral
      'holiday': '#60A5FA',      // Blue
      'late_login': '#C084FC',   // Purple/Lavender
      'weekend': 'transparent',
      'pending': 'transparent'
    };
    
    return statusColors[status] || 'transparent';
  };

  const getDateTextColor = (status: string | null) => {
    if (!status || status === 'weekend' || status === 'pending') {
      return '#9CA3AF'; // Gray for non-status days
    }
    return '#FFFFFF'; // White for status days
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDateStatus(day);
      const isToday = day === currentDay && selectedMonth === currentMonth && selectedYear === currentYear;
      const bgColor = getDateColor(status);
      const textColor = getDateTextColor(status);

      days.push(
        <View
          key={day}
          style={styles.calendarDay}
        >
          <View style={[
            styles.dayCircle,
            { backgroundColor: bgColor },
            isToday && styles.todayCircle
          ]}>
            <Text style={[
              styles.dayText,
              { color: textColor },
              isToday && !status && { color: '#000000' }
            ]}>
              {day}
            </Text>
          </View>
        </View>
      );
    }

    return days;
  };

  return (
    <ScrollView 
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.attendanceHeader}>
        <Text style={styles.attendanceTitle}>Attendance Report</Text>
        <Text style={styles.attendanceSubtitle}>
          View and download attendance records
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.downloadButton}
        onPress={() => {/* Add download report logic */}}
      >
        <Ionicons name="download-outline" size={20} color="#FFFFFF" />
        <Text style={styles.downloadButtonText}>Download Report</Text>
      </TouchableOpacity>

      {/* Attendance Summary Cards */}
      <View style={styles.attendanceSummary}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>
              {summary.present}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#2E7D32' }]}>
              Present
            </Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.summaryValue, { color: '#D32F2F' }]}>
              {summary.absent}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#D32F2F' }]}>
              Absent
            </Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
            <Text style={[styles.summaryValue, { color: '#7B1FA2' }]}>
              {summary.wfh}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#7B1FA2' }]}>
              Late Login
            </Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.summaryValue, { color: '#EF6C00' }]}>
              {summary.leave}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#EF6C00' }]}>
              Leave
            </Text>
          </View>
        </View>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthNavButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <Text style={styles.monthYearText}>
          {getMonthName(selectedMonth)} {selectedYear}
        </Text>
        
        <TouchableOpacity onPress={nextMonth} style={styles.monthNavButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar View */}
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

      {/* Legend */}
<View style={styles.legendContainer}>
  <View style={styles.legendRow}>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#4ADE80' }]} />
      <Text style={styles.legendText}>Present</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#EF5350' }]} />
      <Text style={styles.legendText}>Absent</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#C084FC' }]} />
      <Text style={styles.legendText}>Late Login</Text>
    </View>
  </View>
  <View style={styles.legendRow}>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#FB923C' }]} />
      <Text style={styles.legendText}>Leave</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
      <Text style={styles.legendText}>Holiday</Text>
    </View>
    {/* Empty view for alignment */}
    <View style={[styles.legendItem, { opacity: 0 }]}>
      <View style={styles.legendDot} />
      <Text style={styles.legendText}>Placeholder</Text>
    </View>
  </View>
</View>
    </ScrollView>
  );
};