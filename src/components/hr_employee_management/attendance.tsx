// hr_employee_management/attendance.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
  type TouchableOpacity as TouchableOpacityType
} from 'react-native';

import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Employee, AttendanceRecord } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import alert from '../../utils/Alert';

interface AttendanceProps {
  employee: Employee;
  attendanceReport: AttendanceRecord[];
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  token: string;
}

interface DayData {
  user: any;
  date: string;
  attendance: any;
  login_time: string | null;
  logout_time: string | null;
  login_location: {
    id: number;
    reason: string;
  } | null;
  logout_location: {
    id: number;
    reason: string;
  } | null;
  user_login_reason?: string | null;
  user_logout_reason?: string | null;
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
  const legendHeight = React.useRef(new Animated.Value(0)).current;
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Time picker states
  const [showLoginTimePicker, setShowLoginTimePicker] = useState(false);
  const [showLogoutTimePicker, setShowLogoutTimePicker] = useState(false);
  const [loginTime, setLoginTime] = useState<Date>(new Date());
  const [logoutTime, setLogoutTime] = useState<Date>(new Date());
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const [activePicker, setActivePicker] = useState<'login' | 'logout' | null>(null);

  // Form data
  const [editData, setEditData] = useState({
    login_time: '',
    logout_time: '',
    login_reason: '',
    logout_reason: '',
  });

  const loginTimeRef = useRef<View>(null);
  const logoutTimeRef = useRef<View>(null);

  useEffect(() => {
    Animated.spring(legendHeight, {
      toValue: showAllLegend ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [showAllLegend]);

  useEffect(() => {
    if (!showDayDetailsModal) {
      setIsEditMode(false);
      setActivePicker(null);
      setPickerPosition(null);
    }
  }, [showDayDetailsModal]);

  const calculateAttendanceSummary = () => {
    if (!attendanceReport || attendanceReport.length === 0) {
      return { present: 0, leave: 0, absent: 0, holidays: 0, pending: 0, weekends: 0 };
    }
    const summary = { present: 0, leave: 0, absent: 0, holidays: 0, pending: 0, weekends: 0 };
    attendanceReport.forEach(record => {
      const rawStatus = record.day || record.attendance_status;
      const status = rawStatus?.toLowerCase().startsWith('lop_')
        ? rawStatus.toLowerCase().replace('lop_', '')
        : rawStatus;

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
      const status = record.day || record.attendance_status;
      return status?.toLowerCase().startsWith('lop_')
        ? status.toLowerCase().replace('lop_', '')
        : status;
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

  const parseTimeString = (timeStr: string | null): Date => {
    const now = new Date();
    if (!timeStr) return new Date();

    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, seconds || 0);
    return date;
  };

  const formatTimeForDisplay = (timeStr: string | null): string => {
    if (!timeStr) return 'Not marked';

    const [hours, minutes, seconds] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const minuteStr = minutes || '00';
    return `${displayHour}:${minuteStr} ${ampm}`;
  };

  const formatTimeForAPI = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const fetchDayData = async (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getDayData`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          date: dateStr
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDayData(result.data);

        // Initialize edit data and time pickers
        setEditData({
          login_time: result.data.login_time || '',
          logout_time: result.data.logout_time || '',
          login_reason: result.data.login_location?.reason || '',
          logout_reason: result.data.logout_location?.reason || '',
        });

        setLoginTime(result.data.login_time ? parseTimeString(result.data.login_time) : new Date());
        setLogoutTime(result.data.logout_time ? parseTimeString(result.data.logout_time) : new Date());

        setShowDayDetailsModal(true);
        setIsEditMode(false);
        setActivePicker(null);
        setPickerPosition(null);
      } else {
        alert('Error', 'Failed to fetch day data');
      }
    } catch (error) {
      console.error('Error fetching day data:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDatePress = (day: number) => {
    fetchDayData(day);
  };

  const handleLoginTimePress = () => {
    loginTimeRef.current?.measure((_fx: number, _fy: number, width: number, height: number, pageX: number, pageY: number) => {
      setPickerPosition({
        top: pageY + height + 5,
        left: pageX
      });
      setActivePicker('login');
      setShowLoginTimePicker(true);
    });
  };

  const handleLogoutTimePress = () => {
    logoutTimeRef.current?.measure((_fx: number, _fy: number, width: number, height: number, pageX: number, pageY: number) => {
      setPickerPosition({
        top: pageY + height + 5,
        left: pageX
      });
      setActivePicker('logout');
      setShowLogoutTimePicker(true);
    });
  };

  const handleLoginTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowLoginTimePicker(false);
      setActivePicker(null);
      setPickerPosition(null);
      return;
    }

    setShowLoginTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLoginTime(selectedDate);
      setEditData({
        ...editData,
        login_time: formatTimeForAPI(selectedDate)
      });

      // On iOS, keep the picker open. On Android, close it after selection
      if (Platform.OS === 'android') {
        setShowLoginTimePicker(false);
        setActivePicker(null);
        setPickerPosition(null);
      }
    }
  };

  const handleLogoutTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowLogoutTimePicker(false);
      setActivePicker(null);
      setPickerPosition(null);
      return;
    }

    setShowLogoutTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLogoutTime(selectedDate);
      setEditData({
        ...editData,
        logout_time: formatTimeForAPI(selectedDate)
      });

      // On iOS, keep the picker open. On Android, close it after selection
      if (Platform.OS === 'android') {
        setShowLogoutTimePicker(false);
        setActivePicker(null);
        setPickerPosition(null);
      }
    }
  };

  const handleClearLoginTime = () => {
    setEditData({
      ...editData,
      login_time: '',
      login_reason: '',
    });
    setLoginTime(new Date());
  };

  const handleClearLogoutTime = () => {
    setEditData({
      ...editData,
      logout_time: '',
      logout_reason: '',
    });
    setLogoutTime(new Date());
  };

  const validateAndUpdateDayData = async () => {
    // Fix TypeScript error by handling undefined values
    const loginReason = editData.login_reason || '';
    const logoutReason = editData.logout_reason || '';

    // Validation: If login_time is provided, login_reason should be provided
    if (editData.login_time && editData.login_time.trim() !== '') {
      if (!loginReason.trim()) {
        alert('Validation Error', 'Login reason is required when login time is provided');
        return;
      }
    }

    // Validation: If logout_time is provided, logout_reason should be provided
    if (editData.logout_time && editData.logout_time.trim() !== '') {
      if (!logoutReason.trim()) {
        alert('Validation Error', 'Logout reason is required when logout time is provided');
        return;
      }
    }

    setActionLoading(true);
    try {
      const payload: any = {
        token,
        employee_id: employee.employee_id,
        date: dayData?.date || null,
      };

      // Add login time and location if provided
      if (editData.login_time && editData.login_time.trim() !== '') {
        payload.login_time = editData.login_time;
        payload.login_location = {
          reason: loginReason.trim(),
        };
      } else {
        // If empty, set to null to delete
        payload.login_time = '';
        payload.login_location = null;
      }

      // Add logout time and location if provided
      if (editData.logout_time && editData.logout_time.trim() !== '') {
        payload.logout_time = editData.logout_time;
        payload.logout_location = {
          reason: logoutReason.trim(),
        };
      } else {
        // If empty, set to null to delete
        payload.logout_time = '';
        payload.logout_location = null;
      }

      const response = await fetch(`${BACKEND_URL}/manager/updateDayData`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Success', 'Attendance updated successfully', [{
          text: 'OK',
          onPress: () => {
            setIsEditMode(false);
            if (dayData?.date) {
              const day = parseInt(dayData.date.split('-')[2]);
              fetchDayData(day);
            }
          }
        }]);
      } else {
        const errorData = await response.json();
        alert('Error', errorData.message || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error updating day data:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setActivePicker(null);
    setPickerPosition(null);
    // Reset to original data
    if (dayData) {
      setEditData({
        login_time: dayData.login_time || '',
        logout_time: dayData.logout_time || '',
        login_reason: dayData.login_location?.reason || '',
        logout_reason: dayData.logout_location?.reason || '',
      });
      setLoginTime(dayData.login_time ? parseTimeString(dayData.login_time) : new Date());
      setLogoutTime(dayData.logout_time ? parseTimeString(dayData.logout_time) : new Date());
    }
  };

  const handleDoneButtonPress = () => {
    if (activePicker === 'login') {
      setShowLoginTimePicker(false);
    } else if (activePicker === 'logout') {
      setShowLogoutTimePicker(false);
    }
    setActivePicker(null);
    setPickerPosition(null);
  };

  const handleBackdropPress = () => {
    setShowLoginTimePicker(false);
    setShowLogoutTimePicker(false);
    setActivePicker(null);
    setPickerPosition(null);
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
          onPress={() => handleDatePress(day)}
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
      const response = await fetch(`${BACKEND_URL}/manager/HrdownloadAttendanceReport`, {
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

      alert(
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
                      alert('Success', 'Report downloaded successfully!');
                    } else {
                      alert('Info', 'File saved to app directory');
                    }
                  } catch (shareError) {
                    console.error('Share error:', shareError);
                    alert('Error', 'Failed to share PDF');
                  } finally {
                    setLoading(false);
                  }
                };
                reader.onerror = () => {
                  console.error('FileReader error');
                  alert('Error', 'Failed to process PDF');
                  setLoading(false);
                };
                reader.readAsDataURL(blob);
              } catch (err) {
                console.error('Download error:', err);
                alert('Error', 'Failed to download PDF');
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
      alert('Error', error.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const visibleLegendItems = showAllLegend ? LEGEND_ITEMS : LEGEND_ITEMS.slice(0, 3);

  const renderDayDetailsModal = () => {
    return (
      <Modal
        visible={showDayDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDayDetailsModal(false);
          setIsEditMode(false);
          setActivePicker(null);
          setPickerPosition(null);
        }}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.assetsModalOverlay}>
            <View style={styles.assetsModalContainer}>
              {/* Modal Header */}
              <View style={styles.assetsModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <MaterialIcons name="event" size={24} color={WHATSAPP_COLORS.primary} />
                  <Text style={[styles.assetsModalTitle, { marginLeft: 8 }]}>
                    {dayData?.date ? formatDate(dayData.date) : 'Attendance Details'}
                  </Text>
                </View>
                {!isEditMode && (
                  <TouchableOpacity
                    style={{ marginRight: 12 }}
                    onPress={() => setIsEditMode(true)}
                  >
                    <MaterialIcons name="edit" size={24} color={WHATSAPP_COLORS.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setShowDayDetailsModal(false);
                    setIsEditMode(false);
                    setActivePicker(null);
                    setPickerPosition(null);
                  }}
                >
                  <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {isEditMode ? (
                  // Edit Mode
                  <>
                    {/* Login Section */}
                    <View style={styles.sectionAlt}>
                      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                        <MaterialIcons name="login" size={20} color="#25D366" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Check-in Details</Text>
                      </View>

                      <View style={styles.detailCard}>
                        <Text style={styles.editLabel}>Login Time</Text>
                        <TouchableOpacity
                          ref={loginTimeRef}
                          style={[styles.editInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                          onPress={handleLoginTimePress}
                        >
                          <Text style={{ color: editData.login_time ? WHATSAPP_COLORS.textPrimary : '#888', fontSize: 16 }}>
                            {editData.login_time ? formatTimeForDisplay(editData.login_time) : 'Select time'}
                          </Text>
                          <MaterialIcons name="access-time" size={20} color={WHATSAPP_COLORS.primary} />
                        </TouchableOpacity>

                        {editData.login_time && (
                          <TouchableOpacity
                            onPress={handleClearLoginTime}
                            style={{ marginTop: 8, alignSelf: 'flex-start' }}
                          >
                            <Text style={{ color: '#D32F2F', fontSize: 14, fontWeight: '500' }}>Clear Login Time</Text>
                          </TouchableOpacity>
                        )}

                        {(editData.login_time || dayData?.login_time) && (
                          <>
                            <Text style={[styles.editLabel, { marginTop: 16, color: '#000000' }]}>Login Location *</Text>
                            <TextInput
                              style={[styles.editInput, { height: 80 }]}
                              value={editData.login_reason}
                              onChangeText={(text) => setEditData({ ...editData, login_reason: text })}
                              placeholder="Enter reason for check-in location"
                              placeholderTextColor="#888"
                              multiline
                              textAlignVertical="top"
                            />
                          </>
                        )}
                      </View>
                    </View>

                    {/* Logout Section */}
                    <View style={styles.sectionAlt}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="logout" size={20} color="#FF6B6B" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Check-out Details</Text>
                      </View>

                      <View style={styles.detailCard}>
                        <Text style={styles.editLabel}>Logout Time</Text>
                        <TouchableOpacity
                          ref={logoutTimeRef}
                          style={[styles.editInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                          onPress={handleLogoutTimePress}
                        >
                          <Text style={{ color: editData.logout_time ? WHATSAPP_COLORS.textPrimary : '#888', fontSize: 16 }}>
                            {editData.logout_time ? formatTimeForDisplay(editData.logout_time) : 'Select time'}
                          </Text>
                          <MaterialIcons name="access-time" size={20} color={WHATSAPP_COLORS.primary} />
                        </TouchableOpacity>

                        {editData.logout_time && (
                          <TouchableOpacity
                            onPress={handleClearLogoutTime}
                            style={{ marginTop: 8, alignSelf: 'flex-start' }}
                          >
                            <Text style={{ color: '#D32F2F', fontSize: 14, fontWeight: '500' }}>Clear Logout Time</Text>
                          </TouchableOpacity>
                        )}

                        {(editData.logout_time || dayData?.logout_time) && (
                          <>
                            <Text style={[styles.editLabel, { marginTop: 16, color: '#000000' }]}>Logout Location *</Text>
                            <TextInput
                              style={[styles.editInput, { height: 80 }]}
                              value={editData.logout_reason}
                              onChangeText={(text) => setEditData({ ...editData, logout_reason: text })}
                              placeholder="Enter reason for check-out location"
                              placeholderTextColor="#888"
                              multiline
                              textAlignVertical="top"
                            />
                          </>
                        )}
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionContainer}>
                      <TouchableOpacity
                        onPress={handleCancelEdit}
                        style={[styles.actionButtonLarge, styles.cancelButton]}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={validateAndUpdateDayData}
                        style={[
                          styles.actionButtonLarge,
                          styles.saveButton,
                          actionLoading && styles.disabledButton
                        ]}
                        disabled={actionLoading}
                        activeOpacity={0.7}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="save" size={20} color="#fff" />
                            <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>Save Changes</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    <View style={styles.bottomSpacer} />
                  </>
                ) : (
                  // View Mode
                  <>
                    {/* Login Section */}
                    <View style={styles.sectionAlt}>
                      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                        <MaterialIcons name="login" size={20} color="#25D366" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Check-in Details</Text>
                      </View>

                      <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="access-time" size={20} color="#666" />
                          <Text style={styles.detailLabel}>Login Time</Text>
                          <Text style={[styles.detailValue, { color: '#25D366', fontWeight: '700' }]}>
                            {formatTimeForDisplay(dayData?.login_time || null)}
                          </Text>
                        </View>

                        {/* Show location reason if it exists */}
                        {dayData?.login_location?.reason && (
                          <>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <MaterialIcons name="location-on" size={20} color="#666" />
                              <Text style={styles.detailLabel}>Location Reason</Text>
                              <Text style={[styles.detailValue, { color: WHATSAPP_COLORS.textPrimary }]}>
                                {dayData.login_location.reason}
                              </Text>
                            </View>
                          </>
                        )}

                        {/* Show user comment if it exists */}
                        {dayData?.user_login_reason && (
                          <>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <MaterialIcons name="comment" size={20} color="#666" />
                              <Text style={styles.detailLabel}>Employee Comment</Text>
                              <Text style={[styles.detailValue, { fontStyle: 'italic', color: '#666' }]}>
                                {dayData.user_login_reason}
                              </Text>
                            </View>
                          </>
                        )}

                        {!dayData?.login_time && (
                          <View style={styles.warningCard}>
                            <MaterialIcons name="info-outline" size={20} color="#FF9500" />
                            <Text style={[styles.warningText, { color: '#FF9500' }]}>
                              No check-in recorded for this date
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Logout Section */}
                    <View style={styles.sectionAlt}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="logout" size={20} color="#FF6B6B" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={[styles.sectionTitleAlt, { fontSize: 20 }]}>Check-out Details</Text>
                      </View>

                      <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="access-time" size={20} color="#666" />
                          <Text style={styles.detailLabel}>Logout Time</Text>
                          <Text style={[styles.detailValue, { color: '#FF6B6B', fontWeight: '700' }]}>
                            {formatTimeForDisplay(dayData?.logout_time || null)}
                          </Text>
                        </View>

                        {/* Show location reason if it exists */}
                        {dayData?.logout_location?.reason && (
                          <>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <MaterialIcons name="location-on" size={20} color="#666" />
                              <Text style={styles.detailLabel}>Location Reason</Text>
                              <Text style={[styles.detailValue, { color: WHATSAPP_COLORS.textPrimary }]}>
                                {dayData.logout_location.reason}
                              </Text>
                            </View>
                          </>
                        )}

                        {/* Show user comment if it exists */}
                        {dayData?.user_logout_reason && (
                          <>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <MaterialIcons name="comment" size={20} color="#666" />
                              <Text style={styles.detailLabel}>Employee Comment</Text>
                              <Text style={[styles.detailValue, { fontStyle: 'italic', color: '#666' }]}>
                                {dayData.user_logout_reason}
                              </Text>
                            </View>
                          </>
                        )}

                        {!dayData?.logout_time && (
                          <View style={styles.warningCard}>
                            <MaterialIcons name="info-outline" size={20} color="#FF9500" />
                            <Text style={[styles.warningText, { color: '#FF9500' }]}>
                              No check-out recorded for this date
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.bottomSpacer} />
                  </>
                )}
              </ScrollView>

              {/* Custom Time Picker Overlay */}
              {(showLoginTimePicker || showLogoutTimePicker) && pickerPosition && (
                <View
                  style={{
                    top: pickerPosition.top,
                    left: pickerPosition.left,
                    position: 'absolute',
                    backgroundColor: 'white',
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                    zIndex: 1000,
                    minWidth: 200,
                  }}
                >
                  <DateTimePicker
                    value={activePicker === 'login' ? loginTime : logoutTime}
                    mode="time"
                    display="spinner"
                    onChange={activePicker === 'login' ? handleLoginTimeChange : handleLogoutTimeChange}
                    style={{ backgroundColor: 'white' }}
                  />
                  <TouchableOpacity
                    onPress={handleDoneButtonPress}
                    style={{
                      padding: 10,
                      backgroundColor: WHATSAPP_COLORS.primary,
                      borderBottomLeftRadius: 8,
                      borderBottomRightRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Android Time Pickers (fallback) */}
              {Platform.OS === 'android' && showLoginTimePicker && (
                <DateTimePicker
                  value={loginTime}
                  mode="time"
                  display="default"
                  onChange={handleLoginTimeChange}
                />
              )}

              {Platform.OS === 'android' && showLogoutTimePicker && (
                <DateTimePicker
                  value={logoutTime}
                  mode="time"
                  display="default"
                  onChange={handleLogoutTimeChange}
                />
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <ScrollView
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Attendance Summary */}
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

      {/* Calendar */}
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
            {visibleLegendItems.map((item) => (
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

      {/* Download Button */}
      <View style={styles.downloadContainer}>
        <TouchableOpacity
          style={[styles.downloadButton, { alignSelf: 'center', paddingHorizontal: 24, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }]}
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

      {/* Day Details Modal */}
      {renderDayDetailsModal()}
    </ScrollView>
  );
};