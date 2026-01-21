import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee, AttendanceRecord } from './types';
import { WHATSAPP_COLORS } from './constants';
import { AttendanceCalendar } from './attendanceCalendar';
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
          
          <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.summaryValue, { color: '#EF6C00' }]}>
              {summary.leave}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#EF6C00' }]}>
              Leave
            </Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={[styles.summaryValue, { color: '#1565C0' }]}>
              {summary.wfh}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#1565C0' }]}>
              WFH
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
        </View>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-back" size={20} color={WHATSAPP_COLORS.primary} />
        </TouchableOpacity>
        
        <Text style={styles.monthYearText}>
          {getMonthName(selectedMonth)} {selectedYear}
        </Text>
        
        <TouchableOpacity onPress={nextMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Calendar View */}
      <AttendanceCalendar
        attendanceReport={attendanceReport}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Leave</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.legendText}>WFH</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Holiday</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9E9E9E' }]} />
            <Text style={styles.legendText}>Weekend</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};