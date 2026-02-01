import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
  RefreshControl,
  Animated,
  LayoutAnimation,
  UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationService } from '../../services/locationService';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import { BACKEND_URL } from '../../config/config';
import LeaveInfoScreen from './LeaveInfoScreen';
import HolidayScreen from './HolidayScreen';
import LeaveScreen from './LeaveScreen';
import {
  AttendanceProps,
  LeaveBalance,
  LeaveApplication,
  Holiday,
  AttendanceRecord,
  LeaveForm,
  CHECKIN_REASONS,
  CHECKOUT_REASONS
} from './types';
import LeaveModal from './LeaveModal';
import ReasonModal from './ReasonModal';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TOKEN_2_KEY = 'token_2';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_PADDING = 32+40;
const DAY_WIDTH = Math.floor((SCREEN_WIDTH - CALENDAR_PADDING) / 7);
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
  // checkout_missing: 'Checkout Missing',
  late_login: 'Late Login',
  // late_login_checkout_missing: 'Late Login + Checkout Missing',
  // late_login_checkout_pending: 'Late Login + Checkout Pending',
  // checkout_pending: 'Checkout Pending',
  pending: 'Pending',
  weekend: 'Weekend',
  absent: 'Absent/LOP',
};

const LEGEND_ITEMS = [
  { key: 'present', color: STATUS_COLORS.present, label: 'Present' },
  { key: 'absent', color: STATUS_COLORS.absent, label: 'Absent' },
  { key: 'late_login', color: STATUS_COLORS.late_login, label: 'Late Login' },
  { key: 'leave', color: STATUS_COLORS.leave, label: 'Leave' },
  { key: 'holiday', color: STATUS_COLORS.holiday, label: 'Holiday' },
  // { key: 'checkout_missing', color: STATUS_COLORS.checkout_missing, label: 'Checkout Missing' },
  // { key: 'late_login_checkout_missing', color: STATUS_COLORS.late_login_checkout_missing, label: 'Late + Checkout Missing' },
  // { key: 'checkout_pending', color: STATUS_COLORS.checkout_pending, label: 'Checkout Pending' },
  // { key: 'late_login_checkout_pending', color: STATUS_COLORS.late_login_checkout_pending, label: 'Late + Checkout Pending' },
];

// Map backend status to display status
const mapStatusForDisplay = (status: string): string => {
  const statusMapping: Record<string, string> = {
    'checkout_missing': 'present',
    'late_login_checkout_missing': 'late_login',
    'late_login_checkout_pending': 'late_login',
    'checkout_pending': 'present',
  };

  return statusMapping[status.toLowerCase()] || status;
};

const AttendanceButtonSection: React.FC<{
  locationPermission: boolean;
  loading: boolean;
  onPress: () => void;
  token: string | null;
  todayAttendance: AttendanceRecord | null;
  attendanceRecords: AttendanceRecord[];
  hasSpecialPermission: boolean;
  canMarkAttendance: boolean;
  isLateLogin: boolean;
}> = ({ locationPermission, loading, onPress, token, todayAttendance, attendanceRecords, hasSpecialPermission, canMarkAttendance, isLateLogin }) => {
  const checkTodaysAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    if (todayAttendance && todayAttendance.check_in_time) {
      return true;
    }
    const todaysRecord = attendanceRecords.find(record => record.date === today);
    return todaysRecord && todaysRecord.check_in_time;
  };
  const attendanceMarked = checkTodaysAttendance();

  if (!canMarkAttendance && !attendanceMarked) {
    return null;
  }

  const buttonText = attendanceMarked
    ? 'Attendance Already Marked'
    : !locationPermission
      ? 'Enable Location to Mark Attendance'
      : isLateLogin
        ? 'Mark Late Attendance'
        : 'Mark Attendance';

  return (
    <TouchableOpacity
      style={[
        styles.markButton,
        !locationPermission && styles.disabledButton,
        isLateLogin && !attendanceMarked && styles.lateLoginButton
      ]}
      onPress={onPress}
      disabled={Boolean(loading || !locationPermission || attendanceMarked)}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.markButtonText}>{buttonText}</Text>
      )}
    </TouchableOpacity>
  );
};

const StatusTooltip: React.FC<{
  visible: boolean;
  status: string;
  day: number;
}> = ({ visible, status, day }) => {
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

  const statusKey = status.toLowerCase().replace(/ /g, '_');
  const displayName = STATUS_NAMES[statusKey] || status;

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
      <Text style={styles.statusTooltipText}>{displayName}</Text>
      <View style={styles.tooltipArrow} />
    </Animated.View>
  );
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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
  const [hasSpecialPermission, setHasSpecialPermission] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ day: number; status: string } | null>(null);
  const [showAllLegend, setShowAllLegend] = useState(false);
  const [attendanceForTodayMarked, setAttendanceForTodayMarked] = useState(false);
  const [checkoutForTodayMarked, setCheckoutForTodayMarked] = useState(false);
  const legendHeight = useRef(new Animated.Value(0)).current;

  const [attendanceTimings, setAttendanceTimings] = useState({
    login_time: '09:00:00',
    login_allowed_till: '',
    late_login_allowed_till: '',
    time_not_allowed: '',
    logout_time: '18:00:00'
  });

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
          await checkSpecialPermission(storedToken);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const timer = setTimeout(() => {
        setSelectedDate(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [selectedDate]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(legendHeight, {
      toValue: showAllLegend ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [showAllLegend]);

  const checkSpecialPermission = async (token: string) => {
    try {
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
    }
  };

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

  const getISTTime = () => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utcTime + 19800000);
    return istDate;
  };

  const isCurrentTimeAfter = (dateTimeString: string): boolean => {
    if (!dateTimeString) return false;
    const targetTime = new Date(dateTimeString);
    const now = getISTTime();
    return now >= targetTime;
  };

  const isCurrentTimeBetween = (startDateTime: string, endDateTime: string): boolean => {
    if (!startDateTime || !endDateTime) return false;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const now = getISTTime();
    return now >= start && now <= end;
  };

  // Helper function to format time string (HH:MM:SS) to readable format
  const formatTimeString = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getAttendanceMessage = (todayAttendance: AttendanceRecord | null, hasSpecialPermission: boolean) => {
    if (todayAttendance && todayAttendance.check_in_time) {
      return {
        message: "Attendance marked successfully",
        type: 'normal',
        canMarkAttendance: false,
        isLateLogin: false
      };
    }

    const now = getISTTime();

    // Before login allowed time
    if (!isCurrentTimeAfter(attendanceTimings.login_allowed_till)) {
      const loginTime = new Date(attendanceTimings.login_allowed_till).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return {
        message: `Mark your attendance before\n${loginTime}`,
        type: 'normal',
        canMarkAttendance: true,
        isLateLogin: false
      };
    }

    // Between login_allowed_till and late_login_allowed_till (Late login period)
    if (isCurrentTimeBetween(attendanceTimings.login_allowed_till, attendanceTimings.late_login_allowed_till)) {
      const lateLoginTime = new Date(attendanceTimings.late_login_allowed_till).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return {
        message: `Late Login Period\nYou can still mark attendance until ${lateLoginTime}`,
        type: 'warning',
        canMarkAttendance: true,
        isLateLogin: true
      };
    }

    // After time_not_allowed
    if (isCurrentTimeAfter(attendanceTimings.time_not_allowed)) {
      if (hasSpecialPermission) {
        return {
          message: "You have special permission to mark attendance today.",
          type: 'normal',
          canMarkAttendance: true,
          isLateLogin: true
        };
      }
      const notAllowedTime = new Date(attendanceTimings.time_not_allowed).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return {
        message: `You cannot mark attendance after ${notAllowedTime}\nKindly contact your HR`,
        type: 'error',
        canMarkAttendance: false,
        isLateLogin: false
      };
    }

    return {
      message: "Kindly mark Attendance on time",
      type: 'normal',
      canMarkAttendance: false,
      isLateLogin: false
    };
  };

  const initializeLocationPermission = async () => {
    try {
      setIsCheckingPermission(true);
      const hasPermission = await LocationService.requestPermissions();
      setLocationPermission(hasPermission);
      if (!hasPermission) {
        LocationService.showLocationAlert(
          'Location permission is required for marking attendance. Please enable location access in your device settings.'
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
      const permissions = await LocationService.checkPermissionStatus();
      const hasPermission = permissions.foreground;
      setLocationPermission(hasPermission);

      if (!hasPermission) {
        const userResponse = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Location Access Required',
            'Location permission is required to mark attendance. Please enable location access to continue.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Enable Location',
                onPress: async () => {
                  const granted = await LocationService.requestPermissions();
                  setLocationPermission(granted);
                  resolve(granted);
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
      Alert.alert('Location Error', String(error), [{ text: 'OK' }]);
      setLocationPermission(false);
      return false;
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('📍 Getting location for attendance...');
      const result = await LocationService.getCurrentLocation();
      if (result.success && result.coordinates) {
        console.log('✅ Location obtained successfully');
        return result.coordinates;
      }
      Alert.alert(
        'Location Error',
        result.error || 'Unable to get your location. Please check location settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Help',
            onPress: () => {
              Alert.alert(
                'Enable Location',
                'Please ensure:\n\n1. Location Services are ON\n2. App has location permission\n3. "Precise Location" is enabled (iOS)\n\nGo to Settings > Privacy > Location Services',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
      return null;
    } catch (error) {
      console.error('❌ Location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please check location permissions and try again.',
        [{ text: 'OK' }]
      );
      return null;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  );

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
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    // Check if it's after time_not_allowed and user doesn't have special permission
    if (isCurrentTimeAfter(attendanceTimings.time_not_allowed)) {
      setLoading(true);
      await checkSpecialPermission(token);
      setLoading(false);
      if (!hasSpecialPermission) {
        const notAllowedTime = new Date(attendanceTimings.time_not_allowed).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        Alert.alert(
          'Late Attendance',
          `You cannot mark attendance after ${notAllowedTime}. Kindly raise a request to your HR to allow you to mark late attendance.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation();
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

      // Check if it's late login period
      const isLateLoginPeriod = isCurrentTimeBetween(
        attendanceTimings.login_allowed_till,
        attendanceTimings.late_login_allowed_till
      );

      if (isLateLoginPeriod || isCurrentTimeAfter(attendanceTimings.time_not_allowed)) {
        requestBody.late_login = true;
      }

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
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    // Parse logout time properly
    const logoutTimeStr = attendanceTimings.logout_time || '18:00:00';
    const [logoutHours, logoutMinutes] = logoutTimeStr.split(':').map(Number);

    const now = getISTTime();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    if (currentHours < logoutHours || (currentHours === logoutHours && currentMinutes < logoutMinutes)) {
      setLoading(true);
      await checkSpecialPermission(token);
      setLoading(false);
      if (!hasSpecialPermission) {
        const formattedLogoutTime = formatTimeString(logoutTimeStr);
        Alert.alert(
          'Checkout',
          `You cannot mark checkout before ${formattedLogoutTime}. Kindly raise a request to your HR to allow early checkout.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation();
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

        // Store attendance timings
        if (data.login_allowed_till && data.late_login_allowed_till && data.time_not_allowed) {
          setAttendanceTimings({
            login_time: data.login_time || '09:00:00',
            login_allowed_till: data.login_allowed_till,
            late_login_allowed_till: data.late_login_allowed_till,
            time_not_allowed: data.time_not_allowed,
            logout_time: data.logout_time || '18:00:00'
          });
        }

        // Store today's attendance status flags
        if (typeof data.attendance_for_today_marked !== 'undefined') {
          setAttendanceForTodayMarked(data.attendance_for_today_marked);
        }
        if (typeof data.checkout_for_today_marked !== 'undefined') {
          setCheckoutForTodayMarked(data.checkout_for_today_marked);
        }

        if (data.attendances && Array.isArray(data.attendances)) {
          const formattedRecords = data.attendances.map((attendance: any) => ({
            date: attendance.date,
            status: attendance.day,
            check_in_time: attendance.check_in_time,
            check_out_time: attendance.check_out_time,
            holiday_name: attendance.holiday_name,
            leave_type: attendance.leave_type
          }));
          setAttendanceRecords(formattedRecords);

          const istTime = getISTTime();
          const year = istTime.getFullYear();
          const month = String(istTime.getMonth() + 1).padStart(2, '0');
          const day = String(istTime.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;
          const todaysRecord = data.attendances.find((attendance: any) => attendance.date === todayStr);

          if (todaysRecord && todaysRecord.check_in_time) {
            setTodayAttendance({
              date: todaysRecord.date,
              status: todaysRecord.day,
              check_in_time: todaysRecord.check_in_time,
              check_out_time: todaysRecord.check_out_time
            });
          } else {
            const currentMonth = istTime.getMonth();
            const currentYear = istTime.getFullYear();
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

  const getDateStatus = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = attendanceRecords.find(r => r.date === dateStr);
    if (record) {
      return mapStatusForDisplay(record.status);
    }
    return null;
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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  if (showHolidayScreen) {
    return <HolidayScreen onBack={() => setShowHolidayScreen(false)} token={token} />;
  }

  if (showLeaveScreen) {
    return <LeaveScreen onBack={() => setShowLeaveScreen(false)} />;
  }

  if (showLeaveInfo && selectedLeave && token) {
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

  const toggleLegend = () => {
    setShowAllLegend(!showAllLegend);
  };

  const visibleLegendItems = showAllLegend ? LEGEND_ITEMS : LEGEND_ITEMS.slice(0, 6);

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

            {(todayAttendance || attendanceForTodayMarked) ? (
              <View style={styles.markedContainer}>
                <View style={styles.checkmarkCircle}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={styles.markedText}>Attendance Marked</Text>
                {todayAttendance?.check_in_time && (
                  <Text style={styles.markedTime}>Check-in: {todayAttendance.check_in_time}</Text>
                )}
                {todayAttendance?.check_out_time && (
                  <Text style={styles.markedTime}>Check-out: {todayAttendance.check_out_time}</Text>
                )}

                {/* Show appropriate message/button based on checkout status */}
                {checkoutForTodayMarked ? (
                  <Text style={styles.checkoutCompletedText}>
                    You have already marked your attendance for today
                  </Text>
                ) : attendanceForTodayMarked && !todayAttendance?.check_out_time ? (
                  <>
                    <Text style={styles.checkoutReminderText}>
                      Mark your checkout after {formatTimeString(attendanceTimings.logout_time)}
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
                ) : null}
              </View>
            ) : (
              <AttendanceButtonSection
                locationPermission={locationPermission}
                loading={loading}
                onPress={handleAttendanceButtonPress}
                token={token}
                todayAttendance={todayAttendance}
                attendanceRecords={attendanceRecords}
                hasSpecialPermission={hasSpecialPermission}
                canMarkAttendance={attendanceMsg.canMarkAttendance}
                isLateLogin={attendanceMsg.isLateLogin}
              />
            )}
          </View>

          <View style={styles.calendarCard}>
            {selectedDate && (
              <StatusTooltip
                visible={true}
                status={selectedDate.status}
                day={selectedDate.day}
              />
            )}

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

            <View style={styles.legendContainer}>
              <View style={styles.legendVisible}>
                {visibleLegendItems.map((item, index) => (
                  <View key={item.key} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {!showAllLegend && LEGEND_ITEMS.length > 6 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={toggleLegend}
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
                    onPress={toggleLegend}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewMoreText}>View Less</Text>
                    <Text style={styles.viewLessIcon}>▲</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </View>

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
    backgroundColor: '#e7e6e5',
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
  lateLoginButton: {
    backgroundColor: '#f59e0b',
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
    width:DAY_WIDTH
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: DAY_WIDTH,
    height:DAY_WIDTH,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    minWidth: 0,
  },
  dayCircle: {
    width: DAY_WIDTH - 8,
    height : DAY_WIDTH-8,
    aspectRatio: 1,
    borderRadius: (DAY_WIDTH - 8) / 2,
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
    color: '#ffffffff',
  },
  dayTextActive: {
    fontWeight: '600',
  },
  dayTextInactive: {
    color: '#9ca3af',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
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
  checkoutReminderText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  checkoutCompletedText: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: 8,
  },
  legendVisible: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 4,
  },
  viewMoreIcon: {
    fontSize: 10,
    color: '#3b82f6',
    marginLeft: 2,
  },
  legendExpanded: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewLessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  viewLessIcon: {
    fontSize: 10,
    color: '#3b82f6',
    marginLeft: 4,
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

export default Attendance;