
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, fontSize, borderRadius, shadows, commonStyles } from '../styles/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as IntentLauncher from 'expo-intent-launcher';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Constants for attendance tracking
const TOKEN_2_KEY = 'token_2';

interface AttendanceProps {
  onBack: () => void;
}

interface LeaveBalance {
  casual_leaves: number;
  sick_leaves: number;
  earned_leaves: number;
}

interface LeaveApplication {
  id: number;
  start_date: string;
  end_date: string;
  leave_type: string;
  leave_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_date: string;
  rejection_reason?: string;
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  type: string;
}

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  check_in_time?: string;
  check_out_time?: string;
}

const Attendance: React.FC<AttendanceProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'Holidays' | 'reports'>('attendance');
  const [loading, setLoading] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    casual_leaves: 0,
    sick_leaves: 0,
    earned_leaves: 0
  });
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'casual',
    reason: ''
  });

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Auto attendance tracking state
  const [attendanceTimer, setAttendanceTimer] = useState<NodeJS.Timeout | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };

    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchInitialData();
      initializeLocationPermission();
    }
  }, [token]);

  useEffect(() => {
    // Cleanup timer on component unmount
    return () => {
      if (attendanceTimer) {
        clearInterval(attendanceTimer);
      }
    };
  }, [attendanceTimer]);

  const initializeLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for automatic attendance marking.'
        );
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    }
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      if (!locationPermission) {
        console.warn('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeaveBalance(),
        fetchHolidays(),
        fetchAttendanceRecords()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Error', 'Unable to get your location. Please check location permissions.');
        setLoading(false);
        return;
      }

      console.log('Marking attendance with:', {
        token,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      });

      const response = await fetch(`${BACKEND_URL}/core/markAttendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response has content before parsing JSON
      const responseText = await response.text();
      console.log('Response text:', responseText);

      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        Alert.alert('Error', 'Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      console.log('Parsed data:', data);

      if (response.status === 200) {
        // Success - attendance marked successfully
        Alert.alert('Success', 'Attendance marked successfully!');

        // Refresh attendance records
        await fetchAttendanceRecords();

        // Also refresh today's attendance status by fetching recent records
        // The today's attendance should be updated in the UI

      } else if (response.status === 400) {
        // Handle specific 400 error cases
        if (data.message === 'Mark attendance failed, You are not in office') {
          Alert.alert('Cannot Mark Attendance', 'You are not at the office location. Please ensure you are within the office premises to mark attendance.');
        } else if (data.message === 'Attendance already marked') {
          Alert.alert('Already Marked', 'You have already marked today\'s attendance.');
        } else {
          // Other 400 errors
          Alert.alert('Error', data.message || 'Failed to mark attendance. Please try again.');
        }
      } else if (response.status === 401) {
        // Unauthorized - invalid token
        Alert.alert('Authentication Error', 'Invalid authentication. Please login again.');
      } else {
        // Other error status codes
        Alert.alert('Error', data.message || `Server error (${response.status}). Please try again.`);
      }

    } catch (error) {
      console.error('Error marking attendance:', error);

      // Check if it's a network error
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        Alert.alert('Network Error', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of the existing methods remain unchanged)
  const fetchLeaveBalance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getLeaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data);

        // Update leave balance from root level properties
        setLeaveBalance({
          casual_leaves: data.casual_leaves || 0,
          sick_leaves: data.sick_leaves || 0,
          earned_leaves: data.earned_leaves || 0
        });

        // Update leave applications from the leaves array
        if (data.leaves && Array.isArray(data.leaves)) {
          const formattedLeaveApplications = data.leaves.map(leave => ({
            id: leave.id,
            start_date: leave.start_date,
            end_date: leave.end_date,
            leave_type: leave.leave_type,
            leave_reason: leave.reason, // Note: API uses 'reason', component expects 'leave_reason'
            status: leave.status,
            applied_date: leave.requested_at,
            rejection_reason: leave.comment && leave.status === 'rejected' ? leave.comment : undefined
          }));
          setLeaveApplications(formattedLeaveApplications);
        } else {
          // Ensure leaveApplications is always an array
          setLeaveApplications([]);
        }
      } else {
        // Set default values on error response
        setLeaveApplications([]);
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      // Set default values on network error
      setLeaveApplications([]);
    }
  };

  const submitLeaveApplication = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/applyLeave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          start_date: leaveForm.startDate,
          end_date: leaveForm.endDate,
          leave_type: leaveForm.leaveType,
          leave_reason: leaveForm.reason
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Leave application submitted successfully!');
        setIsLeaveModalVisible(false);
        setLeaveForm({ startDate: '', endDate: '', leaveType: 'casual', reason: '' });
        await fetchLeaveBalance();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to submit leave application');
      }
    } catch (error) {
      console.error('Error submitting leave application:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getHolidays`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getRecentRecords`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Attendance records data:', data);

        if (data.attendances && Array.isArray(data.attendances)) {
          // Map the attendance data to match your AttendanceRecord interface
          const formattedRecords = data.attendances.map(attendance => ({
            date: attendance.date,
            status: attendance.day, // 'present' or 'absent'
            check_in_time: attendance.check_in_time,
            check_out_time: attendance.check_out_time
          }));

          setAttendanceRecords(formattedRecords);

          // Check for today's attendance
          const today = new Date();
          const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

          const todaysRecord = data.attendances.find(attendance =>
            attendance.date === todayString
          );

          if (todaysRecord) {

            setTodayAttendance({
              date: todaysRecord.date,
              status: todaysRecord.day,
              check_in_time: todaysRecord.check_in_time,
              check_out_time: todaysRecord.check_out_time
            });
          } else {
            // No attendance marked for today - show mark attendance button
            setTodayAttendance(null);
          }
        } else {
          setAttendanceRecords([]);
          setTodayAttendance(null);
        }
      } else {
        console.error('Failed to fetch attendance records:', response.status);
        setAttendanceRecords([]);
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAttendanceRecords([]);
      setTodayAttendance(null);
    }
  };

  // Helper function to determine attendance status
  const getAttendanceStatus = (attendance: any): 'present' | 'absent' | 'late' | 'half_day' => {
    if (!attendance.check_in_time && !attendance.check_out_time) {
      return 'absent';
    }

    if (attendance.check_in_time && attendance.check_out_time) {
      // You can add logic here to determine if late or half_day based on times
      // For now, assuming present if both times exist
      return 'present';
    }

    return 'half_day'; // If only one time exists
  };

  const downloadAttendanceReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getAttendanceReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          month: selectedMonth.toString().padStart(2, '0'), // Ensure 2-digit format
          year: selectedYear.toString(),
        }),
      });

      if (response.ok) {
        // Get the PDF blob
        const pdfBlob = await response.blob();

        // Convert blob to base64 for React Native
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          const base64data = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix

          // Generate filename
          const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
          const filename = `attendance_report_${monthName}_${selectedYear}.pdf`;

          // Define file path
          const fileUri = FileSystem.documentDirectory + filename;

          try {
            // Save PDF to device
            await FileSystem.writeAsStringAsync(fileUri, base64data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Show options to user
            Alert.alert(
              'Report Generated',
              'Your attendance report has been generated successfully!',
              [
                {
                  text: 'View PDF',
                  onPress: () => openPDF(fileUri),
                },
                {
                  text: 'Share/Download',
                  onPress: () => sharePDF(fileUri, filename),
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ]
            );

          } catch (fileError) {
            console.error('Error saving PDF:', fileError);
            Alert.alert('Error', 'Failed to save PDF file');
          }
        };

        reader.onerror = (error) => {
          console.error('Error reading PDF blob:', error);
          Alert.alert('Error', 'Failed to process PDF file');
        };

      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to open PDF in device's default PDF viewer
  const openPDF = async (fileUri) => {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, use WebBrowser to open PDF
        await WebBrowser.openBrowserAsync(fileUri, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      } else if (Platform.OS === 'android') {
        // On Android, use IntentLauncher to open PDF with system apps
        try {
          const contentUri = await FileSystem.getContentUriAsync(fileUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: 'application/pdf',
          });
        } catch (intentError) {
          console.log('Intent launcher failed, trying sharing:', intentError);
          // Fallback to sharing if IntentLauncher fails
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open PDF with...',
          });
        }
      } else {
        // Fallback for other platforms
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open PDF with...',
        });
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      // Ultimate fallback - just share the file
      try {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open PDF with...',
        });
      } catch (shareError) {
        Alert.alert('Error', 'Could not open or share PDF file');
      }
    }
  };

  // Function to share/download PDF
  const sharePDF = async (fileUri, filename) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Share Attendance Report',
          UTI: 'com.adobe.pdf', // For iOS
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF file');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string): string => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Date picker handlers
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      setLeaveForm({ ...leaveForm, startDate: formattedDate });
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      setLeaveForm({ ...leaveForm, endDate: formattedDate });
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const MonthDropdown = () => (
    <Modal
      visible={showMonthDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMonthDropdown(false)}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        onPress={() => setShowMonthDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdownContent}>
            {monthNames.map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  selectedMonth === index + 1 && styles.selectedDropdownItem
                ]}
                onPress={() => {
                  setSelectedMonth(index + 1);
                  setShowMonthDropdown(false);
                  fetchAttendanceRecords();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedMonth === index + 1 && styles.selectedDropdownItemText
                ]}>
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const YearDropdown = () => (
    <Modal
      visible={showYearDropdown}
      transparent
      animationType="fade"
      onRequestClose={() => setShowYearDropdown(false)}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        onPress={() => setShowYearDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdownContent}>
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.dropdownItem,
                  selectedYear === year && styles.selectedDropdownItem
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearDropdown(false);
                  fetchAttendanceRecords();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedYear === year && styles.selectedDropdownItemText
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const LeaveApplicationModal = () => (
    <Modal
      visible={isLeaveModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsLeaveModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsLeaveModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[
                    styles.datePickerText,
                    !leaveForm.startDate && styles.datePickerPlaceholder
                  ]}>
                    {leaveForm.startDate || 'Select start date'}
                  </Text>
                  <Text style={styles.datePickerIcon}>📅</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={[
                    styles.datePickerText,
                    !leaveForm.endDate && styles.datePickerPlaceholder
                  ]}>
                    {leaveForm.endDate || 'Select end date'}
                  </Text>
                  <Text style={styles.datePickerIcon}>📅</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Leave Type</Text>
                <View style={styles.leaveTypeContainer}>
                  {['casual', 'sick', 'earned'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.leaveTypeButton,
                        leaveForm.leaveType === type && styles.leaveTypeButtonActive
                      ]}
                      onPress={() => setLeaveForm({ ...leaveForm, leaveType: type })}
                    >
                      <Text style={[
                        styles.leaveTypeText,
                        leaveForm.leaveType === type && styles.leaveTypeTextActive
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Reason</Text>
                <TextInput
                  style={styles.reasonInput}
                  value={leaveForm.reason}
                  onChangeText={(text) => setLeaveForm({ ...leaveForm, reason: text })}
                  placeholder="Enter reason for leave"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setIsLeaveModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmitButton}
                  onPress={submitLeaveApplication}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartDateChange}
            minimumDate={new Date()}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndDateChange}
            minimumDate={startDate || new Date()}
          />
        )}
      </View>
    </Modal>
  );

  const renderAttendanceTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <View style={styles.attendanceCard}>
          {todayAttendance ? (
            <View style={styles.attendanceInfo}>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(todayAttendance.status) }
                ]} />
                <Text style={styles.attendanceStatus}>
                  Status: <Text style={[styles.statusText, { color: getStatusColor(todayAttendance.status) }]}>
                    {todayAttendance.status.replace('_', ' ')}
                  </Text>
                </Text>
              </View>
              {todayAttendance.check_in_time && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Check In:</Text>
                  <Text style={styles.timeValue}>{formatTime(todayAttendance.check_in_time)}</Text>
                </View>
              )}
              {todayAttendance.check_out_time && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Check Out:</Text>
                  <Text style={styles.timeValue}>{formatTime(todayAttendance.check_out_time)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noAttendanceContainer}>
              <View style={styles.noAttendanceIconContainer}>
                <Text style={styles.noAttendanceIcon}>📅</Text>
              </View>
              <Text style={styles.noAttendanceText}>No attendance marked today</Text>
              <TouchableOpacity
                style={styles.markAttendanceButton}
                onPress={markAttendance}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.markAttendanceText}>Mark Attendance</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Auto attendance status */}
        <View style={styles.autoAttendanceStatus}>
          <Text style={styles.autoAttendanceText}>
            Auto attendance: {locationPermission ? 'Active (10:00-10:30 AM)' : 'Location permission required'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Records</Text>
        <View style={styles.recordsContainer}>
          {attendanceRecords.length > 0 ? (
            attendanceRecords.slice(0, 5).map((record, index) => (
              <View key={index} style={styles.recordItem}>
                <View style={styles.recordLeft}>
                  <View style={[
                    styles.recordStatusDot,
                    { backgroundColor: getStatusColor(record.status) }
                  ]} />
                  <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                </View>
                <Text style={[
                  styles.recordStatus,
                  { color: getStatusColor(record.status) }
                ]}>
                  {record.status.replace('_', ' ')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No attendance records found</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderLeaveTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Balance</Text>
        <View style={styles.leaveBalanceGrid}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.casual_leaves}</Text>
            <Text style={styles.balanceLabel}>Casual</Text>
            <View style={[styles.balanceIndicator, { backgroundColor: colors.info }]} />
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.sick_leaves}</Text>
            <Text style={styles.balanceLabel}>Sick</Text>
            <View style={[styles.balanceIndicator, { backgroundColor: colors.error }]} />
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.earned_leaves}</Text>
            <Text style={styles.balanceLabel}>Earned</Text>
            <View style={[styles.balanceIndicator, { backgroundColor: colors.success }]} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.applyLeaveButton}
          onPress={() => setIsLeaveModalVisible(true)}
        >
          <Text style={styles.applyLeaveText}>Apply for Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Applications</Text>
        {leaveApplications.length > 0 ? (
          leaveApplications.map((application) => (
            <View key={application.id} style={styles.leaveItem}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveDateRange}>
                  {formatDate(application.start_date)} - {formatDate(application.end_date)}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBadgeColor(application.status) }
                ]}>
                  <Text style={styles.statusBadgeText}>{application.status}</Text>
                </View>
              </View>
              <Text style={styles.leaveType}>{application.leave_type} Leave</Text>
              <Text style={styles.leaveReason}>{application.leave_reason}</Text>
              {application.rejection_reason && (
                <View style={styles.rejectionContainer}>
                  <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                  <Text style={styles.rejectionReason}>{application.rejection_reason}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No leave applications found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderCalendarTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Holiday Calendar</Text>
        {holidays.length > 0 ? (
          holidays.map((holiday) => (
            <View key={holiday.id} style={styles.holidayItem}>
              <View style={styles.holidayLeft}>
                <View style={styles.holidayDateContainer}>
                  <Text style={styles.holidayDateText}>{formatDate(holiday.date)}</Text>
                </View>
                <View style={styles.holidayDetails}>
                  <Text style={styles.holidayName}>{holiday.name}</Text>
                  <Text style={styles.holidayType}>{holiday.type}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No holidays found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderReportsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Report</Text>

        <View style={styles.reportCard}>
          <View style={styles.reportFilters}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Month</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowMonthDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {monthNames[selectedMonth - 1]}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Year</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowYearDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedYear}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={downloadAttendanceReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.downloadText}>Download PDF Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'present': return colors.success;
      case 'absent': return colors.error;
      case 'late': return colors.warning;
      case 'half_day': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'approved': return colors.success;
      case 'rejected': return colors.error;
      case 'pending': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabNavigation}>
        {[
          { key: 'attendance', label: 'Attendance' },
          { key: 'leave', label: 'Leave' },
          { key: 'calendar', label: 'Calendar' },
          { key: 'reports', label: 'Reports' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        {activeTab === 'attendance' && renderAttendanceTab()}
        {activeTab === 'leave' && renderLeaveTab()}
        {activeTab === 'calendar' && renderCalendarTab()}
        {activeTab === 'reports' && renderReportsTab()}
      </View>

      <LeaveApplicationModal />
      <MonthDropdown />
      <YearDropdown />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  autoAttendanceStatus: {
    backgroundColor: colors.info + '20',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  autoAttendanceText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  backIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
    backgroundColor: colors.backgroundSecondary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },

  attendanceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  attendanceInfo: {
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  attendanceStatus: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '500',
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  timeLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  noAttendanceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noAttendanceIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  noAttendanceIcon: {
    fontSize: 24,
  },
  noAttendanceText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  markAttendanceButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  markAttendanceText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  recordsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  recordDate: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  recordStatus: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  leaveBalanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  balanceCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  balanceNumber: {
    fontSize: Math.min(screenWidth * 0.08, 32),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  applyLeaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.sm,
  },
  applyLeaveText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  leaveItem: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  leaveDateRange: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  leaveType: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  leaveReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rejectionContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rejectionLabel: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  rejectionReason: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  holidayItem: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holidayDateContainer: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  holidayDateText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  holidayDetails: {
    flex: 1,
  },
  holidayName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  holidayType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },

  reportCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportFilters: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  dropdownButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '80%',
    maxHeight: screenHeight * 0.6,
    ...shadows.lg,
  },
  dropdownContent: {
    maxHeight: screenHeight * 0.5,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedDropdownItem: {
    backgroundColor: colors.backgroundSecondary,
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  selectedDropdownItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.sm,
  },
  downloadText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  leaveTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  leaveTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  leaveTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  leaveTypeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  leaveTypeTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    height: 100,
    backgroundColor: colors.backgroundSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  modalSubmitText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default Attendance;