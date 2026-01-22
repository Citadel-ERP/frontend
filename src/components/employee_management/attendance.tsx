import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Employee, AttendanceRecord } from './types';
import { WHATSAPP_COLORS,TOKEN_KEY } from './constants';
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
}

const STATUS_COLORS = {
  present: 'rgb(148, 228, 164)',
  leave: 'rgb(255, 185, 114)',
  holiday: 'rgb(113, 220, 255)',
  checkout_missed: 'rgb(148, 228, 164)',
  late_login: '#c99cf3',
  late_login_checkout_missing: '#c99cf3',
  late_login_checkout_pending: '#c99cf3',
  checkout_pending: 'rgb(148, 228, 164)',
  pending: '#efefef',
  weekend: '#ffffff',
  absent: 'rgb(255, 96, 96)',
};

const STATUS_TEXT_COLORS = {
  present: '#ffffffff',
  leave: '#ffffffff',
  holiday: '#ffffffff',
  checkout_missed: '#ffffffff',
  late_login: '#ffffffff',
  late_login_checkout_missing: '#ffffffff',
  late_login_checkout_pending: '#ffffffff',
  checkout_pending: '#ffffffff',
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
};

const LEGEND_ITEMS = [
  { key: 'present', color: STATUS_COLORS.present, label: 'Present' },
  { key: 'absent', color: STATUS_COLORS.absent, label: 'Absent' },
  { key: 'late_login', color: STATUS_COLORS.late_login, label: 'Late Login' },
  { key: 'leave', color: STATUS_COLORS.leave, label: 'Leave' },
  { key: 'holiday', color: STATUS_COLORS.holiday, label: 'Holiday' },
];

// This function maps backend status to display status
const mapStatusForDisplay = (status: string): string => {
  const statusMapping: Record<string, string> = {
    'checkout_missed': 'present',
    'checkout_missing': 'present',
    'checkout_pending': 'present',
    'late_login_checkout_missing': 'late_login',
    'late_login_checkout_missed': 'late_login',
    'late_login_checkout_pending': 'late_login',
  };
  
  return statusMapping[status.toLowerCase()] || status;
};

export const Attendance: React.FC<AttendanceProps> = ({
  employee,
  attendanceReport,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [showAllLegend, setShowAllLegend] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ day: number; status: string } | null>(null);
  const legendHeight = useRef(new Animated.Value(0)).current;
  const [token, setToken] = useState<string | null>(null);

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
        weekends: 0,
        lateLogin: 0
      };
    }

    // Map each status to its display category for counting
    const presentStatuses = ['present', 'checkout_missing', 'checkout_missed', 'checkout_pending'];
    const lateLoginStatuses = ['late_login', 'late_login_checkout_missing', 'late_login_checkout_missed', 'late_login_checkout_pending'];

    return {
      present: attendanceReport.filter(r => presentStatuses.includes(r.attendance_status.toLowerCase())).length,
      lateLogin: attendanceReport.filter(r => lateLoginStatuses.includes(r.attendance_status.toLowerCase())).length,
      leave: attendanceReport.filter(r => r.attendance_status.toLowerCase() === 'leave').length,
      absent: attendanceReport.filter(r => r.attendance_status.toLowerCase() === 'absent').length,
      holidays: attendanceReport.filter(r => r.attendance_status.toLowerCase() === 'holiday').length,
      pending: attendanceReport.filter(r => r.attendance_status.toLowerCase() === 'pending').length,
      weekends: attendanceReport.filter(r => r.attendance_status.toLowerCase() === 'weekend').length
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
    if (record) {
      return mapStatusForDisplay(record.attendance_status);
    }
    return null;
  };

  const getDateColor = (status: string | null) => {
    if (!status) return '#e5e7eb';
    const statusKey = status.toLowerCase().replace(/ /g, '_');
    return STATUS_COLORS[statusKey as keyof typeof STATUS_COLORS] || '#e5e7eb';
  };

  const getDateTextColor = (status: string | null) => {
    if (!status) return '#9ca3af';
    const statusKey = status.toLowerCase().replace(/ /g, '_');
    return STATUS_TEXT_COLORS[statusKey as keyof typeof STATUS_TEXT_COLORS] || '#9ca3af';
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

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Actual days
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
  
  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  const downloadAttendanceReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || '',
          employee_id: employee.employee_id,
          month_year: `${String(selectedMonth + 1).padStart(2, '0')}/${String(selectedYear).slice(-2)}`
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

  const visibleLegendItems = showAllLegend ? LEGEND_ITEMS : LEGEND_ITEMS.slice(0, 3);

  return (
    <ScrollView 
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
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
                  
          <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.summaryValue, { color: '#EF6C00' }]}>
              {summary.leave}
            </Text>
            <Text style={[styles.summaryLabel, { color: '#EF6C00' }]}>
              Leave
            </Text>
          </View>
        </View>
        
        {/* Add Late Login card in second row */}
        {summary.lateLogin > 0 && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.summaryValue, { color: '#7B1FA2' }]}>
                {summary.lateLogin}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#7B1FA2' }]}>
                Late Login
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Month Navigation */}
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

        {/* Legend */}
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

      {/* Download Report Button */}
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

      {/* Status Tooltip */}
      {selectedDate && (
        <View style={styles.statusTooltip}>
          <Text style={styles.statusTooltipText}>
            {STATUS_NAMES[selectedDate.status.toLowerCase()] || selectedDate.status}
          </Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}
    </ScrollView>
  );
};