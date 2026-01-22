// hr_employee_management/attendance.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Employee, AttendanceRecord } from './types';
import { WHATSAPP_COLORS, TOKEN_KEY } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AttendanceProps {
  employee: Employee;
  attendanceReport: AttendanceRecord[];
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  token: string;
}

const STATUS_COLORS = {
  present: 'rgb(148, 228, 164)',
  leave: 'rgb(255, 185, 114)',
  holiday: 'rgb(113, 220, 255)',
  checkout_missing: '#E6CC00',
  late_login: '#c99cf3',
  late_login_checkout_missing: '#C7907C',
  late_login_checkout_pending: '#D9BFDA',
  checkout_pending: '#D9F2D9',
  pending: '#ffffff',
  weekend: '#ffffff',
  absent: 'rgb(255, 96, 96)',
};

const STATUS_TEXT_COLORS = {
  present: '#ffffffff',
  leave: '#ffffffff',
  holiday: '#ffffffff',
  checkout_missing: '#ffffffff',
  late_login: '#ffffffff',
  late_login_checkout_missing: '#ffffffff',
  late_login_checkout_pending: '#363636ff',
  checkout_pending: '#363636ff',
  pending: '#363636ff',
  weekend: '#363636ff',
  absent: '#ffffffff',
};

const STATUS_NAMES: Record<string, string> = {
  present: 'Present',
  leave: 'Leave',
  holiday: 'Holiday',
  late_login: 'Late Login',
  pending: 'Pending',
  weekend: 'Weekend',
  absent: 'Absent',
  checkout_missing: 'Checkout Missing',
  late_login_checkout_missing: 'Late Login - Checkout Missing',
  checkout_pending: 'Checkout Pending',
  late_login_checkout_pending: 'Late Login - Checkout Pending',
};

const LEGEND_ITEMS = [
  { key: 'present', color: STATUS_COLORS.present, label: 'Present' },
  { key: 'absent', color: STATUS_COLORS.absent, label: 'Absent' },
  { key: 'late_login', color: STATUS_COLORS.late_login, label: 'Late Login' },
  { key: 'leave', color: STATUS_COLORS.leave, label: 'Leave' },
  { key: 'holiday', color: STATUS_COLORS.holiday, label: 'Holiday' },
  { key: 'checkout_missing', color: STATUS_COLORS.checkout_missing, label: 'Checkout Missing' },
  { key: 'checkout_pending', color: STATUS_COLORS.checkout_pending, label: 'Checkout Pending' },
];

export const Attendance: React.FC<AttendanceProps> = ({
  employee,
  attendanceReport,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  token,
}) => {
  const [loading, setLoading] = useState(false);
  const [showAllLegend, setShowAllLegend] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ day: number; status: string } | null>(null);
  const legendHeight = React.useRef(new Animated.Value(0)).current;
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [showMarkCheckoutModal, setShowMarkCheckoutModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    date: new Date(),
    check_in_time: '09:00',
    check_out_time: '18:00',
    description: '',
  });

  useEffect(() => {
    if (selectedDate) {
      const timer = setTimeout(() => {
        setSelectedDate(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [selectedDate]);

  useEffect(() => {
    Animated.spring(legendHeight, {
      toValue: showAllLegend ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [showAllLegend]);

  const calculateAttendanceSummary = () => {
    if (!attendanceReport || attendanceReport.length === 0) {
      return {
        present: 0,
        leave: 0,
        absent: 0,
        holidays: 0,
        pending: 0,
        weekends: 0
      };
    }

    const summary = {
      present: 0,
      leave: 0,
      absent: 0,
      holidays: 0,
      pending: 0,
      weekends: 0
    };

    attendanceReport.forEach(record => {
      const status = record.day || record.attendance_status;
      if (status === 'present' || status === 'checkout_missing' || status === 'checkout_pending') {
        summary.present++;
      } else if (status === 'leave') {
        summary.leave++;
      } else if (status === 'absent') {
        summary.absent++;
      } else if (status === 'holiday') {
        summary.holidays++;
      } else if (status === 'pending') {
        summary.pending++;
      } else if (status === 'weekend') {
        summary.weekends++;
      }
    });

    return summary;
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
      return record.day || record.attendance_status;
    }
    return null;
  };

  const getDateColor = (status: string | null) => {
    if (!status) return '#e5e7eb';
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#e5e7eb';
  };

  const getDateTextColor = (status: string | null) => {
    if (!status) return '#9ca3af';
    return STATUS_TEXT_COLORS[status as keyof typeof STATUS_TEXT_COLORS] || '#9ca3af';
  };

  const handleDatePress = (day: number, status: string | null) => {
    if (status) {
      setSelectedDate({ day, status });
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDateStatus(day);
      const isToday = day === currentDay && selectedMonth === currentMonth && selectedYear === currentYear;

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.calendarDay}
          onPress={() => handleDatePress(day, status)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.dayCircle,
            status && { backgroundColor: getDateColor(status) },
            isToday && styles.todayCircle
          ]}>
            <Text style={[
              styles.dayText,
              status && { color: getDateTextColor(status) },
              status && styles.dayTextActive,
              !status && styles.dayTextInactive
            ]}>
              {day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const downloadAttendanceReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/downloadAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          month: selectedMonth + 1,
          year: selectedYear
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }

      const data = await response.json();
      if (!data.file_url) {
        throw new Error('Invalid response from server');
      }

      const fileUrl = data.file_url;
      const filename = data.filename || `attendance_report_${employee.employee_id}_${selectedMonth + 1}_${selectedYear}.pdf`;

      Alert.alert(
        'Download Report',
        'Choose how you want to access the attendance report:',
        [
          {
            text: 'Open in Browser',
            onPress: async () => {
              await WebBrowser.openBrowserAsync(fileUrl);
            },
          },
          {
            text: 'Download & Share',
            onPress: async () => {
              try {
                setLoading(true);
                const pdfResponse = await fetch(fileUrl);
                if (!pdfResponse.ok) {
                  throw new Error('Failed to fetch PDF from server');
                }
                const blob = await pdfResponse.blob();
                const reader = new FileReader();
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result as string;
                    const base64Content = base64data.split(',')[1];
                    const fileUri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(fileUri, base64Content, {
                      encoding: FileSystem.EncodingType.Base64,
                    });

                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                      await Sharing.shareAsync(fileUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Attendance Report',
                        UTI: 'com.adobe.pdf',
                      });
                      Alert.alert('Success', 'Report downloaded successfully!');
                    } else {
                      Alert.alert('Info', 'File saved to app directory');
                    }
                  } catch (shareError) {
                    console.error('Share error:', shareError);
                    Alert.alert('Error', 'Failed to share PDF');
                  } finally {
                    setLoading(false);
                  }
                };
                reader.onerror = () => {
                  console.error('FileReader error');
                  Alert.alert('Error', 'Failed to process PDF');
                  setLoading(false);
                };
                reader.readAsDataURL(blob);
              } catch (err) {
                console.error('Download error:', err);
                Alert.alert('Error', 'Failed to download PDF');
                setLoading(false);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', error.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAttendanceForEmployee = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/markAttendanceForEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          date: attendanceData.date.toISOString().split('T')[0],
          check_in_time: attendanceData.check_in_time,
          description: attendanceData.description
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Attendance marked successfully');
        setShowMarkAttendanceModal(false);
      } else {
        Alert.alert('Error', 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const markCheckoutForEmployee = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/markCheckoutForEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          date: attendanceData.date.toISOString().split('T')[0],
          check_out_time: attendanceData.check_out_time,
          description: attendanceData.description
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Checkout marked successfully');
        setShowMarkCheckoutModal(false);
      } else {
        Alert.alert('Error', 'Failed to mark checkout');
      }
    } catch (error) {
      console.error('Error marking checkout:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const visibleLegendItems = showAllLegend ? LEGEND_ITEMS : LEGEND_ITEMS.slice(0, 3);

  return (
    <ScrollView 
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
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

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthYearText}>
            {getMonthName(selectedMonth)} {selectedYear}
          </Text>
          
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {renderCalendar()}
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendVisible}>
            {visibleLegendItems.map((item, index) => (
              <View key={item.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          {!showAllLegend && LEGEND_ITEMS.length > 3 && (
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => setShowAllLegend(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreText}>View More</Text>
              <Text style={styles.viewMoreIcon}>▼</Text>
            </TouchableOpacity>
          )}

          {showAllLegend && (
            <Animated.View
              style={[
                styles.legendExpanded,
                {
                  opacity: legendHeight,
                  transform: [{
                    translateY: legendHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.viewLessButton}
                onPress={() => setShowAllLegend(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewMoreText}>View Less</Text>
                <Text style={styles.viewLessIcon}>▲</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.attendanceActions}>
        <TouchableOpacity
          style={styles.attendanceActionButton}
          onPress={() => setShowMarkAttendanceModal(true)}
        >
          <Ionicons name="time-outline" size={20} color="#fff" />
          <Text style={styles.attendanceActionText}>Mark Attendance</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.attendanceActionButton}
          onPress={() => setShowMarkCheckoutModal(true)}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.attendanceActionText}>Mark Checkout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.downloadContainer}>
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={downloadAttendanceReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>Download Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {selectedDate && (
        <View style={styles.statusTooltip}>
          <Text style={styles.statusTooltipText}>
            {STATUS_NAMES[selectedDate.status] || selectedDate.status}
          </Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}

      <Modal
        visible={showMarkAttendanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMarkAttendanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Attendance</Text>
            </View>
            
            <Text style={styles.modalLabel}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                // Show date picker
              }}
            >
              <Text style={styles.datePickerText}>
                {attendanceData.date.toDateString()}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.modalLabel}>Check-in Time</Text>
            <TextInput
              style={styles.modalInput}
              value={attendanceData.check_in_time}
              onChangeText={(text) => setAttendanceData({...attendanceData, check_in_time: text})}
              placeholder="HH:MM"
            />
            
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              value={attendanceData.description}
              onChangeText={(text) => setAttendanceData({...attendanceData, description: text})}
              placeholder="Enter description"
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMarkAttendanceModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={markAttendanceForEmployee}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Mark Attendance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMarkCheckoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMarkCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Checkout</Text>
            </View>
            
            <Text style={styles.modalLabel}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                // Show date picker
              }}
            >
              <Text style={styles.datePickerText}>
                {attendanceData.date.toDateString()}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.modalLabel}>Check-out Time</Text>
            <TextInput
              style={styles.modalInput}
              value={attendanceData.check_out_time}
              onChangeText={(text) => setAttendanceData({...attendanceData, check_out_time: text})}
              placeholder="HH:MM"
            />
            
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              value={attendanceData.description}
              onChangeText={(text) => setAttendanceData({...attendanceData, description: text})}
              placeholder="Enter description"
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMarkCheckoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={markCheckoutForEmployee}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Mark Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};