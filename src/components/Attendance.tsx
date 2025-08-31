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
import { colors, spacing, fontSize, borderRadius, shadows, commonStyles } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Constants for attendance tracking
const TOKEN_2_KEY = 'token_2';
const ATTENDANCE_COOKIE_KEY = 'attendance_marked_date';
const ATTENDANCE_START_HOUR = 11; // 11 PM
const ATTENDANCE_END_MINUTES = 30; // 11:30 PM
const ATTENDANCE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const COOKIE_CLEAR_HOUR = 10; // 10:45 PM (45 minutes before 11:30)
const COOKIE_CLEAR_MINUTES = 45;

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
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'calendar' | 'reports'>('attendance');
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
      setupAttendanceTracking();
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

  const isAttendanceMarkedToday = async (): Promise<boolean> => {
    try {
      const markedDate = await AsyncStorage.getItem(ATTENDANCE_COOKIE_KEY);
      if (!markedDate) return false;

      const today = new Date().toDateString();
      return markedDate === today;
    } catch (error) {
      console.error('Error checking attendance cookie:', error);
      return false;
    }
  };

  const setAttendanceMarkedCookie = async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(ATTENDANCE_COOKIE_KEY, today);
    } catch (error) {
      console.error('Error setting attendance cookie:', error);
    }
  };

  const clearPreviousDayCookie = async () => {
    try {
      const markedDate = await AsyncStorage.getItem(ATTENDANCE_COOKIE_KEY);
      if (markedDate) {
        const today = new Date().toDateString();
        if (markedDate !== today) {
          await AsyncStorage.removeItem(ATTENDANCE_COOKIE_KEY);
        }
      }
    } catch (error) {
      console.error('Error clearing previous day cookie:', error);
    }
  };

  const markAttendanceWithLocation = async (): Promise<boolean> => {
    try {
      if (!token) {
        console.error('No token available');
        return false;
      }

      // Check if attendance already marked today
      const alreadyMarked = await isAttendanceMarkedToday();
      if (alreadyMarked) {
        console.log('Attendance already marked today');
        return true;
      }

      // Get current location
      const location = await getCurrentLocation();
      if (!location) {
        console.warn('Unable to get current location');
        return false;
      }

      // Call backend API
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

      const data = await response.json();

      if (response.ok) {
        if (data.message === 'Mark attendance successful') {
          await setAttendanceMarkedCookie();
          await fetchTodayAttendance(); // Refresh today's attendance
          console.log('Attendance marked successfully');
          return true;
        } else if (data.message === 'Attendance already marked') {
          await setAttendanceMarkedCookie();
          console.log('Attendance already marked on server');
          return true;
        }
      } else {
        console.warn('Attendance marking failed:', data.message);
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error marking attendance with location:', error);
      return false;
    }
  };

  const shouldStartAttendanceTracking = (): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;
    
    const startTime = ATTENDANCE_START_HOUR * 60; // 10:00 AM in minutes
    const endTime = ATTENDANCE_START_HOUR * 60 + ATTENDANCE_END_MINUTES; // 10:30 AM in minutes
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  const getNextAttendanceAttemptTime = (): Date | null => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // If before 10 AM, schedule for 10 AM
    if (currentHour < ATTENDANCE_START_HOUR) {
      const nextAttempt = new Date();
      nextAttempt.setHours(ATTENDANCE_START_HOUR, 0, 0, 0);
      return nextAttempt;
    }
    
    // If between 10:00 and 10:30, find next 5-minute interval
    if (currentHour === ATTENDANCE_START_HOUR && currentMinutes <= ATTENDANCE_END_MINUTES) {
      const nextMinute = Math.ceil(currentMinutes / 5) * 5;
      if (nextMinute <= ATTENDANCE_END_MINUTES) {
        const nextAttempt = new Date();
        nextAttempt.setHours(ATTENDANCE_START_HOUR, nextMinute, 0, 0);
        return nextAttempt;
      }
    }
    
    // If after 10:30, schedule for next day 10 AM
    const nextAttempt = new Date();
    nextAttempt.setDate(nextAttempt.getDate() + 1);
    nextAttempt.setHours(ATTENDANCE_START_HOUR, 0, 0, 0);
    return nextAttempt;
  };

  const scheduleNotification = async () => {
    // TODO: Implement notification when backend endpoint is ready
    // const response = await fetch(`${BACKEND_URL}/sendNotification`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ token }),
    // });
    console.log('Notification scheduled (backend endpoint not yet implemented)');
  };

  const setupAttendanceTracking = async () => {
    try {
      // Clear previous day cookie at 9:45 AM
      const now = new Date();
      if (now.getHours() === COOKIE_CLEAR_HOUR && now.getMinutes() >= COOKIE_CLEAR_MINUTES) {
        await clearPreviousDayCookie();
      }

      // Check if we should start attendance tracking
      if (!shouldStartAttendanceTracking()) {
        const nextAttempt = getNextAttendanceAttemptTime();
        if (nextAttempt) {
          const timeUntilNext = nextAttempt.getTime() - now.getTime();
          setTimeout(() => {
            setupAttendanceTracking();
          }, timeUntilNext);
        }
        return;
      }

      // Check if attendance already marked
      const alreadyMarked = await isAttendanceMarkedToday();
      if (alreadyMarked) {
        console.log('Attendance already marked today, skipping automatic tracking');
        return;
      }

      // Start periodic attendance attempts
      let attemptCount = 0;
      const maxAttempts = Math.floor(ATTENDANCE_END_MINUTES / 5) + 1; // 7 attempts (0, 5, 10, 15, 20, 25, 30)

      const attemptAttendance = async () => {
        if (attemptCount >= maxAttempts) {
          // All attempts exhausted, schedule notification
          await scheduleNotification();
          return;
        }

        const success = await markAttendanceWithLocation();
        if (success) {
          // Attendance marked successfully, clear timer
          if (attendanceTimer) {
            clearInterval(attendanceTimer);
            setAttendanceTimer(null);
          }
          return;
        }

        attemptCount++;
        console.log(`Attendance attempt ${attemptCount} failed, will try again in 5 minutes`);
      };

      // Make first attempt immediately
      await attemptAttendance();

      // Set up timer for subsequent attempts
      const timer = setInterval(attemptAttendance, ATTENDANCE_INTERVAL);
      setAttendanceTimer(timer);

      // Clear timer after final attempt time
      setTimeout(() => {
        if (timer) {
          clearInterval(timer);
          setAttendanceTimer(null);
        }
      }, (maxAttempts - 1) * ATTENDANCE_INTERVAL);

    } catch (error) {
      console.error('Error setting up attendance tracking:', error);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTodayAttendance(),
        fetchLeaveBalance(),
        fetchLeaveApplications(),
        fetchHolidays(),
        fetchAttendanceRecords()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/attendance/today`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data.attendance);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const markAttendance = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Error', 'Unable to get your location. Please check location permissions.');
        setLoading(false);
        return;
      }

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
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.message === 'Mark attendance successful') {
          Alert.alert('Success', 'Attendance marked successfully!');
          await setAttendanceMarkedCookie();
          await fetchTodayAttendance();
        } else if (data.message === 'Attendance already marked') {
          Alert.alert('Info', 'Attendance already marked for today');
          await setAttendanceMarkedCookie();
        }
      } else {
        let errorMessage = 'Failed to mark attendance';
        if (data.message === 'Mark attendance failed, You are not in office') {
          errorMessage = 'You are not in office location. Please ensure you are within the office premises.';
        } else if (data.message === 'Mark attendance failed, Invalid Token') {
          errorMessage = 'Invalid authentication. Please login again.';
        } else if (data.message) {
          errorMessage = data.message;
        }
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of the existing methods remain unchanged)
  const fetchLeaveBalance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/leave/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeaveBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    }
  };

  const fetchLeaveApplications = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/leave/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeaveApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    }
  };

  const submitLeaveApplication = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/leave/apply`, {
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
        await fetchLeaveApplications();
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
      const response = await fetch(`${BACKEND_URL}/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
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
      const response = await fetch(`${BACKEND_URL}/attendance/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          month: selectedMonth,
          year: selectedYear
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.records);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    }
  };

  const downloadAttendanceReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/attendance/report/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          month: selectedMonth,
          year: selectedYear,
          format: 'pdf'
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Attendance report download started!');
      } else {
        Alert.alert('Error', 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
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
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Apply for Leave</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.dateInput}
                value={leaveForm.startDate}
                onChangeText={(text) => setLeaveForm({...leaveForm, startDate: text})}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.dateInput}
                value={leaveForm.endDate}
                onChangeText={(text) => setLeaveForm({...leaveForm, endDate: text})}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
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
                    onPress={() => setLeaveForm({...leaveForm, leaveType: type})}
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
                onChangeText={(text) => setLeaveForm({...leaveForm, reason: text})}
                placeholder="Enter reason for leave"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          
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
        </View>
      </KeyboardAvoidingView>
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
            Auto attendance: {locationPermission ? 'Active (11:00-11:30 PM)' : 'Location permission required'}
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