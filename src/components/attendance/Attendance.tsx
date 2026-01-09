import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import { BACKEND_URL } from '../../config/config';
import LeaveInfoScreen from './LeaveInfoScreen';
import HolidayScreen from './HolidayScreen';
import LeaveScreen from './LeaveScreen';
// import { ensureLocationReady, checkLocationPermissionStatus, showLocationAlert } from './../locationHelper';
import {
  AttendanceProps,
  LeaveBalance,
  LeaveApplication,
  Holiday,
  AttendanceRecord,
  LeaveForm,
  TabType,
  CHECKIN_REASONS,
  CHECKOUT_REASONS
} from './types';
import LeaveModal from './LeaveModal';
import { MonthDropdown, YearDropdown } from './DropdownComponents';
import ReasonModal from './ReasonModal';

const TOKEN_2_KEY = 'token_2';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AttendanceButtonSection: React.FC<{
  isAfter11AM: boolean;
  locationPermission: boolean;
  loading: boolean;
  onPress: () => void;
  token: string | null;
  todayAttendance: AttendanceRecord | null;
  attendanceRecords: AttendanceRecord[]; // Add this prop
}> = ({ isAfter11AM, locationPermission, loading, onPress, token, todayAttendance, attendanceRecords }) => {
  const [hasSpecialPermission, setHasSpecialPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);

  // Check if attendance is marked for today
  const checkTodaysAttendance = () => {
    const today = new Date().toISOString().split('T')[0];

    // First check todayAttendance
    if (todayAttendance && todayAttendance.check_in_time) {
      return true;
    }

    // Then check attendanceRecords
    const todaysRecord = attendanceRecords.find(record => record.date === today);
    return todaysRecord && todaysRecord.check_in_time;
  };

  const attendanceMarked = checkTodaysAttendance();
  console.log("Attendance Marked:", attendanceMarked, "TodayAttendance:", todayAttendance);

  useEffect(() => {
    if (isAfter11AM && token) {
      checkSpecialPermission();
    }
  }, [isAfter11AM, token]);

  const checkSpecialPermission = async () => {
    try {
      setCheckingPermission(true);
      const response = await fetch(`${BACKEND_URL}/core/checkSpecialAttendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const data = await response.json();
        setHasSpecialPermission(data.special_attendance === true);
      }
    } catch (error) {
      console.error('Error checking special attendance:', error);
      setHasSpecialPermission(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  // Before 11 AM or has special permission - show button
  if (!isAfter11AM || hasSpecialPermission) {
    return (
      <TouchableOpacity
        style={[
          styles.markButton,
          !locationPermission && styles.disabledButton
        ]}
        onPress={onPress}
        disabled={loading || !locationPermission || checkingPermission || attendanceMarked}
      >
        {loading || checkingPermission ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.markButtonText}>
            {attendanceMarked ? 'Attendance Already Marked' :
              !locationPermission ? 'Enable Location to Mark Attendance' : 'Mark Attendance'}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
  console.log(attendanceMarked);
  // After 11 AM and no special permission
  if (!attendanceMarked) {
    return null
    // return (
    //   <View style={styles.noActionContainer}>
    //     <Text style={styles.noActionText}>
    //       Attendance window has closed for today.{'\n'}
    //       Please contact HR if needed.
    //     </Text>
    //   </View>
    // );
  }

  // If attendance is marked, return null (parent will handle display)
  return null;
};


const Attendance: React.FC<AttendanceProps> = ({ onBack }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isDriver, setIsDriver] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    casual_leaves: 0,
    sick_leaves: 0,
    earned_leaves: 0
  });
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({
    startDate: '',
    endDate: '',
    leaveType: 'casual',
    reason: ''
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showLeaveInfo, setShowLeaveInfo] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonModalType, setReasonModalType] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showHolidayScreen, setShowHolidayScreen] = useState(false);
  const [showLeaveScreen, setShowLeaveScreen] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        const driverStatus = await AsyncStorage.getItem('is_driver');
        if (storedToken) {
          setToken(storedToken);
          if (driverStatus) {
            try {
              const isDriverBool = JSON.parse(driverStatus);
              setIsDriver(isDriverBool);
            } catch (parseError) {
              setIsDriver(false);
            }
          }
          await fetchInitialData(storedToken);
          await initializeLocationPermission();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    initializeApp();
  }, []);

  // Fetch attendance records when month/year changes
  useEffect(() => {
    if (token) {
      fetchAttendanceRecords(token, selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  const getCurrentTimeInIST = (): string => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (19800000));
    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const day = String(istTime.getDate()).padStart(2, '0');
    const hours = String(istTime.getHours()).padStart(2, '0');
    const minutes = String(istTime.getMinutes()).padStart(2, '0');
    const seconds = String(istTime.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
  };

  const isBeforeTimeIST = (hours: number, minutes: number): boolean => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + 19800000);
    const currentHours = istTime.getHours();
    const currentMinutes = istTime.getMinutes();
    if (currentHours < hours) return true;
    if (currentHours === hours && currentMinutes < minutes) return true;
    return false;
  };

  const checkSpecialAttendance = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/checkSpecialAttendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.special_attendance === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking special attendance:', error);
      return false;
    }
  };
  const getISTTime = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + 19800000);
  };
  const isAfterTimeIST = (hours: number, minutes: number): boolean => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + 19800000);
    const currentHours = istTime.getHours();
    const currentMinutes = istTime.getMinutes();

    if (currentHours > hours) return true;
    if (currentHours === hours && currentMinutes >= minutes) return true;
    return false;
  };

  const getAttendanceMessage = (todayAttendance: AttendanceRecord, hasSpecialPermission: boolean) => {
    const istTime = getISTTime();
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();

    // Before 10:15 AM
    if (hours < 10 || (hours === 10 && minutes < 15)) {
      return {
        message: "Mark your attendance between\n10:00 AM - 10:15 AM",
        type: 'normal',
        canMarkAttendance: true
      };
    }

    // Between 10:15 AM and 11:00 AM
    if (hours === 10 && minutes >= 15) {
      return {
        message: "Late Login Period\n10:15 AM - 11:00 AM\nContact HR if needed",
        type: 'warning',
        canMarkAttendance: true
      };
    }
    if (hours === 11 && minutes === 0) {
      console.log(hasSpecialPermission, todayAttendance);
      if (hasSpecialPermission) {
        return {
          message: "You have special permission to mark attendance today.",
          type: 'normal',
          canMarkAttendance: true
        }
      }
      // After 11:00 AM
      if (!todayAttendance) {
        return {
          message: "You can not mark attendance after 11:00 AM, kindly contact your HR",
          type: 'error',
          canMarkAttendance: false
        };
      }
    }

    return {
      message: "Kindly mark Attendance before 10:15 AM",
      type: 'normal',
      canMarkAttendance: false
    }
  };

  const initializeLocationPermission = async () => {
    try {
      setIsCheckingPermission(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      setLocationPermission(hasPermission);
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for marking attendance and checkout. Please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
      }
      return hasPermission;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
      return false;
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const checkLocationPermission = async (): Promise<boolean> => {
    try {
      setIsCheckingPermission(true);
      const { status } = await Location.getForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      setLocationPermission(hasPermission);

      if (!hasPermission) {
        const userResponse = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Location Access Required',
            'Location permission is required to mark attendance and checkout. Please enable location access to continue.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Enable Location',
                onPress: async () => {
                  const permissionGranted = await initializeLocationPermission();
                  resolve(permissionGranted);
                }
              }
            ]
          );
        });
        return userResponse;
      }

      return hasPermission;
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationPermission(false);
      return false;
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const getCurrentLocation = async (timeoutMs: number = 10000) => {
    try {
      // Check location permission first
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        return null;
      }

      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Location request timed out')), timeoutMs);
      });
      const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please check location permissions and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Check Permissions',
            onPress: async () => {
              await initializeLocationPermission();
            }
          }
        ]
      );
      return null;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} /><Text style={styles.backText}>Back</Text>
    </View>
  );
  const hasSpecialPermission = checkSpecialAttendance();
  const attendanceMsg = getAttendanceMessage(todayAttendance, hasSpecialPermission);

  const fetchInitialData = async (token?: string) => {
    setLoading(true);
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      await Promise.all([
        fetchLeaveBalance(token),
        fetchHolidays(token),
        fetchAttendanceRecords(token, currentMonth, currentYear)
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (token) {
      fetchInitialData(token);
    }
  }, [token]);

  const resetReasonModal = () => {
    setShowReasonModal(false);
    setSelectedReason('');
    setCustomReason('');
  };

  const handleReasonSubmit = () => {
    let finalReason = '';
    if (selectedReason === 'other') {
      if (!customReason.trim()) {
        Alert.alert('Error', 'Please specify your reason.');
        return;
      }
      finalReason = customReason.trim();
    } else {
      finalReason = reasonModalType === 'checkin'
        ? CHECKIN_REASONS.find(r => r.value === selectedReason)?.label || selectedReason
        : CHECKOUT_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    }
    if (reasonModalType === 'checkin') {
      markAttendance(finalReason);
    } else {
      markCheckout(finalReason);
    }
  };

  const markAttendance = async (description?: string) => {
    // Check location permission before proceeding
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    if (!isBeforeTimeIST(10, 15)) {
      setLoading(true);
      const hasSpecialPermission = await checkSpecialAttendance();
      setLoading(false);
      if (!hasSpecialPermission) {
        Alert.alert(
          'Late Attendance',
          'You cannot mark attendance after 10:15 AM. Kindly raise a request to your HR to allow you to mark late attendance.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation(10000);
      if (!location) {
        setLoading(false);
        return;
      }

      const requestBody: any = {
        token,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      };

      const checkInTimeIST = getCurrentTimeInIST();
      requestBody.check_in_time = checkInTimeIST;

      if (description && typeof description === 'string' && description.trim()) {
        requestBody.description = description.trim();
      }

      const response = await fetch(`${BACKEND_URL}/core/markAttendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (response.status === 200) {
        Alert.alert('Success', 'Attendance marked successfully!');
        resetReasonModal();
        const today = new Date().toISOString().split('T')[0];
        const currentTime = isDriver ? requestBody.check_in_time : new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        const newTodayAttendance = {
          date: today,
          status: 'Present',
          check_in_time: currentTime,
          check_out_time: null
        };
        setTodayAttendance(newTodayAttendance);
        setAttendanceRecords(prevRecords => {
          const updatedRecords = prevRecords.filter(record => record.date !== today);
          return [newTodayAttendance, ...updatedRecords];
        });
        await fetchAttendanceRecords(token, selectedMonth, selectedYear);
        setLoading(false);
      } else if (response.status === 400) {
        if (data.message === 'Mark attendance failed, You are not in office' ||
          data.message === 'description is required if you are not at office') {
          if (!description || typeof description !== 'string') {
            setReasonModalType('checkin');
            setShowReasonModal(true);
            setLoading(false);
            return;
          } else {
            Alert.alert('Error', 'Failed to mark remote attendance. Please try again.');
          }
        } else if (data.message === 'Attendance already marked') {
          Alert.alert('Already Marked', 'You have already marked today\'s attendance.');
        } else {
          Alert.alert('Error', data.message || 'Failed to mark attendance.');
        }
      } else {
        Alert.alert('Error', data.message || `Server error (${response.status}).`);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markCheckout = async (reason?: string) => {
    // Check location permission before proceeding
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    if (isBeforeTimeIST(18, 0)) {
      setLoading(true);
      const hasSpecialPermission = await checkSpecialAttendance();
      setLoading(false);
      if (!hasSpecialPermission) {
        Alert.alert(
          'Early Checkout',
          'You cannot mark checkout before 6:00 PM. Kindly raise a request to your HR to allow early checkout.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation(10000);
      if (!location) {
        setLoading(false);
        return;
      }

      const checkOutTimeIST = getCurrentTimeInIST();
      const requestBody: any = {
        token,
        checkout_time: checkOutTimeIST,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      };

      if (reason && typeof reason === 'string' && reason.trim()) {
        requestBody.reason_not_in_office = reason.trim();
      }

      const response = await fetch(`${BACKEND_URL}/core/markCheckoutTime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (response.status === 200) {
        Alert.alert('Success', 'Checkout time marked successfully!');
        resetReasonModal();
        const today = new Date().toISOString().split('T')[0];
        setTodayAttendance(prev => {
          if (prev && prev.date === today) {
            return {
              ...prev,
              check_out_time: checkOutTimeIST
            };
          }
          return prev;
        });
        setAttendanceRecords(prevRecords => {
          return prevRecords.map(record => {
            if (record.date === today) {
              return {
                ...record,
                check_out_time: checkOutTimeIST
              };
            }
            return record;
          });
        });
        await fetchAttendanceRecords(token, selectedMonth, selectedYear);
        setLoading(false);
      } else if (response.status === 400) {
        if (data.message === 'Mark checkout failed, You are not in office add a reason too') {
          if (!reason || typeof reason !== 'string') {
            setReasonModalType('checkout');
            setShowReasonModal(true);
            setLoading(false);
            return;
          } else {
            Alert.alert('Error', 'Failed to mark checkout. Please try again.');
          }
        } else {
          Alert.alert('Error', data.message || 'Failed to mark checkout time.');
        }
      } else {
        Alert.alert('Error', data.message || `Server error (${response.status}).`);
      }
    } catch (error) {
      console.error('Error marking checkout:', error);
      Alert.alert('Error', 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async (token?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getLeaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveBalance({
          casual_leaves: data.casual_leaves || 0,
          sick_leaves: data.sick_leaves || 0,
          earned_leaves: data.earned_leaves || 0
        });
        if (data.leaves && Array.isArray(data.leaves)) {
          const formattedLeaveApplications = data.leaves.map((leave: any) => ({
            id: leave.id,
            start_date: leave.start_date,
            end_date: leave.end_date,
            leave_type: leave.leave_type,
            reason: leave.reason,
            status: leave.status,
            approved_by: leave.approved_by,
            approved_at: leave.approved_at,
            rejected_at: leave.rejected_at,
            total_number_of_days: leave.total_number_of_days,
            is_sandwich: leave.is_sandwich,
            comment: leave.comment && leave.status === 'rejected' ? leave.comment : undefined
          }));
          setLeaveApplications(formattedLeaveApplications);
        }
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          start_date: leaveForm.startDate,
          end_date: leaveForm.endDate,
          leave_type: leaveForm.leaveType,
          reason: leaveForm.reason
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

  const fetchHolidays = async (token?: string, city?: string) => {
    try {
      let url = `${BACKEND_URL}/core/getHolidays`;
      if (city) {
        url += `?city=${encodeURIComponent(city)}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays || []);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const fetchAttendanceRecords = async (token?: string, month?: number, year?: number) => {
    try {
      // Format month as YYYY-MM
      const actualMonth = month !== undefined ? month : selectedMonth;
      const actualYear = year !== undefined ? year : selectedYear;
      const monthStr = `${actualYear}-${String(actualMonth + 1).padStart(2, '0')}`;

      const response = await fetch(`${BACKEND_URL}/core/getRecentRecords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          month: monthStr
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.attendances && Array.isArray(data.attendances)) {
          const formattedRecords = data.attendances.map((attendance: any) => ({
            date: attendance.date,
            status: attendance.day,
            check_in_time: attendance.check_in_time,
            check_out_time: attendance.check_out_time
          }));
          console.log('Fetched attendance records:', formattedRecords);
          setAttendanceRecords(formattedRecords);

          // Always check for today's attendance regardless of month
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const todaysRecord = data.attendances.find((attendance: any) => attendance.date === todayStr);

          if (todaysRecord && todaysRecord.check_in_time) {
            setTodayAttendance({
              date: todaysRecord.date,
              status: todaysRecord.day,
              check_in_time: todaysRecord.check_in_time,
              check_out_time: todaysRecord.check_out_time
            });
          } else {
            // Only clear todayAttendance if we're viewing current month
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            if (actualMonth === currentMonth && actualYear === currentYear) {
              setTodayAttendance(null);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAttendanceRecords([]);
    }
  };

  const downloadAttendanceReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          month: (selectedMonth + 1).toString().padStart(2, '0'),
          year: selectedYear.toString(),
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
      const filename = data.filename || `attendance_report_${selectedMonth + 1}_${selectedYear}.pdf`;

      Alert.alert(
        'Download Report',
        'Choose how you want to access your attendance report:',
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
                      Alert.alert(
                        'Success',
                        'Report downloaded successfully! You can now share it.'
                      );
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
      Alert.alert(
        'Error',
        error.message || 'Failed to generate report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setShowStartDatePicker(false);
    setStartDate(currentDate);
    const formattedDate = currentDate.toISOString().split('T')[0];
    setLeaveForm(prev => ({ ...prev, startDate: formattedDate }));
    if (endDate < currentDate) {
      setEndDate(currentDate);
      setLeaveForm(prev => ({ ...prev, startDate: formattedDate, endDate: formattedDate }));
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endDate;
    setShowEndDatePicker(false);
    setEndDate(currentDate);
    const formattedDate = currentDate.toISOString().split('T')[0];
    setLeaveForm(prev => ({ ...prev, endDate: formattedDate }));
  };

  const handleApplyLeave = () => {
    setShowLeaveScreen(true);
  };

  const handleCloseLeaveModal = () => {
    setIsLeaveModalVisible(false);
    setLeaveForm({ startDate: '', endDate: '', leaveType: 'casual', reason: '' });
  };

  const handleLeavePress = (leave: LeaveApplication) => {
    setSelectedLeave(leave);
    setShowLeaveInfo(true);
  };

  const handleBackFromLeaveInfo = () => {
    setShowLeaveInfo(false);
    setSelectedLeave(null);
  };

  const handleOpenHolidays = () => {
    setShowHolidayScreen(true);
  };

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
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

    // Check for holiday first
    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) return 'holiday';

    // Check for leave
    const leave = leaveApplications.find(l =>
      dateStr >= l.start_date &&
      dateStr <= l.end_date &&
      l.status === 'approved'
    );
    if (leave) {
      return leave.leave_type === 'Work From Home' ? 'wfh' : 'leave';
    }

    // Check attendance record
    const record = attendanceRecords.find(r => r.date === dateStr);
    if (record) {
      const status = record.status.toLowerCase();
      if (status === 'present') return 'present';
      if (status === 'absent') return 'absent';
      if (status === 'holiday') return 'holiday';
      if (status === 'leave') return 'leave';
      if (status === 'pending') return 'pending';
    }

    // Check if date is in the future
    const currentDate = new Date();
    const checkDate = new Date(selectedYear, selectedMonth, day);
    if (checkDate > currentDate) return null;

    return null;
  };

  const getDateColor = (status: string | null) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'leave': return '#f59e0b';
      case 'wfh': return '#a855f7';
      case 'holiday': return '#3b82f6';
      case 'absent': return '#ef4444';
      default: return '#e5e7eb';
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
        <View key={day} style={styles.calendarDay}>
          <View style={[
            styles.dayCircle,
            status && { backgroundColor: getDateColor(status) },
            isToday && styles.todayCircle
          ]}>
            <Text style={[
              styles.dayText,
              status && styles.dayTextActive,
              !status && styles.dayTextInactive
            ]}>
              {day}
            </Text>
          </View>
        </View>
      );
    }

    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  if (showHolidayScreen) {
    return <HolidayScreen onBack={() => setShowHolidayScreen(false)} token={token} />;
  }

  if (showLeaveScreen) {
    return <LeaveScreen onBack={() => setShowLeaveScreen(false)} />;
  }

  if (showLeaveInfo && selectedLeave) {
    return (
      <LeaveInfoScreen
        leave={selectedLeave}
        onBack={handleBackFromLeaveInfo}
        baseUrl={BACKEND_URL}
        token={token}
      />
    );
  }

  const handleAttendanceButtonPress = async () => {
    const hasPermission = await checkLocationPermission();
    if (hasPermission) {
      markAttendance();
    }
  };

  const handleCheckoutButtonPress = async () => {
    const hasPermission = await checkLocationPermission();
    if (hasPermission) {
      markCheckout();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" translucent={false} />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
      >
        {/* Header Section - Now inside ScrollView */}
        <View style={[styles.header, styles.headerBanner]}>
          <Image
            source={require('../../assets/attendance_bg.jpg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay} />

          <View style={[styles.headerContent, { marginTop: Platform.OS === 'ios' ? 20 : 0 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.logoText}>CITADEL</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>Attendance</Text>
          </View>
        </View>

        <View style={styles.contentPadding}>
          {/* Today's Attendance Card */}
          <View style={styles.todayCard}>
            <Text style={styles.todayTitle}>Today's Attendance</Text>
            <Text style={[
              styles.todaySubtitle,
              attendanceMsg.type === 'warning' && styles.warningText,
              attendanceMsg.type === 'error' && styles.errorText
            ]}>
              {attendanceMsg.message}
            </Text>

            {!locationPermission && (
              <View style={styles.permissionWarning}>
                <Text style={styles.permissionWarningText}>
                  ⚠️ Location permission required to mark attendance
                </Text>
                <TouchableOpacity
                  style={styles.enableLocationButton}
                  onPress={initializeLocationPermission}
                  disabled={isCheckingPermission}
                >
                  {isCheckingPermission ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.enableLocationButtonText}>Enable Location Access</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {todayAttendance ? (
              <View style={styles.markedContainer}>
                <View style={styles.checkmarkCircle}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={styles.markedText}>Attendance Marked</Text>
                {todayAttendance.check_in_time && (
                  <Text style={styles.markedTime}>Check-in: {todayAttendance.check_in_time}</Text>
                )}
                {todayAttendance.check_out_time && (
                  <Text style={styles.markedTime}>Check-out: {todayAttendance.check_out_time}</Text>
                )}
                {todayAttendance.check_in_time && !todayAttendance.check_out_time && (
                  <>
                    <Text style={styles.checkoutReminderText}>
                      Mark your checkout after 6:00 PM
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.markButton,
                        styles.checkoutButton,
                        !locationPermission && styles.disabledButton
                      ]}
                      onPress={handleCheckoutButtonPress}
                      disabled={loading || !locationPermission}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.markButtonText}>
                          {!locationPermission ? 'Enable Location for Checkout' : 'Checkout'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <AttendanceButtonSection
                isAfter11AM={isAfterTimeIST(11, 0)}
                locationPermission={locationPermission}
                loading={loading}
                onPress={handleAttendanceButtonPress}
                token={token}
                todayAttendance={todayAttendance}
                attendanceRecords={attendanceRecords} // Add this line
              />
            )}
          </View>

          {/* Calendar Section */}
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {monthNames[selectedMonth]} {selectedYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.weekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>Leave</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#a855f7' }]} />
                <Text style={styles.legendText}>Late Login</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.legendText}>Holiday</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
            </View>
          </View>

          {/* Bottom Actions - Now inside ScrollView at the end */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.applyLeaveButton]}
              onPress={handleApplyLeave}
            >
              <Text style={styles.actionButtonText}>Apply Leave</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.holidaysButton]}
              onPress={handleOpenHolidays}
            >
              <Text style={styles.actionButtonText}>Holidays</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.reportButton]}
              onPress={downloadAttendanceReport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <LeaveModal
        visible={isLeaveModalVisible}
        onClose={handleCloseLeaveModal}
        leaveForm={leaveForm}
        onFormChange={setLeaveForm}
        onSubmit={submitLeaveApplication}
        loading={loading}
        showStartDatePicker={showStartDatePicker}
        showEndDatePicker={showEndDatePicker}
        startDate={startDate}
        endDate={endDate}
        onStartDatePress={() => setShowStartDatePicker(true)}
        onEndDatePress={() => setShowEndDatePicker(true)}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

      <ReasonModal
        visible={showReasonModal}
        type={reasonModalType}
        title={reasonModalType === 'checkin' ? 'Remote Attendance' : 'Remote Checkout'}
        subtitle={
          reasonModalType === 'checkin'
            ? "You're not at the office location. Please select a reason for remote attendance:"
            : "You're not at the office location. Please select a reason for remote checkout:"
        }
        selectedReason={selectedReason}
        onReasonSelect={setSelectedReason}
        customReason={customReason}
        onCustomReasonChange={setCustomReason}
        onSubmit={handleReasonSubmit}
        onClose={resetReasonModal}
        loading={loading}
        reasons={reasonModalType === 'checkin' ? CHECKIN_REASONS : CHECKOUT_REASONS}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1b4b',
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 30,
    width: '96%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerBanner: {
    height: 250,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 100,
  },
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  todaySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  permissionWarning: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
    alignItems: 'center',
  },
  permissionWarningText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 12,
  },
  enableLocationButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 200,
  },
  enableLocationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  markedContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkmarkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkmark: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  markedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  markedTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  markButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  checkoutButton: {
    backgroundColor: '#FFC107',
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  markButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    color: '#111827',
    fontWeight: '300',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    color: '#6b7280',
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
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dayTextInactive: {
    color: '#9ca3af',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  applyLeaveButton: {
    backgroundColor: '#f59e0b',
  },
  holidaysButton: {
    backgroundColor: '#3b82f6',
  },
  reportButton: {
    backgroundColor: '#ec4899',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center'
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  warningText: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  noActionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  noActionText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  checkoutReminderText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default Attendance;