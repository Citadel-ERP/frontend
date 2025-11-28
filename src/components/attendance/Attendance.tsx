import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as IntentLauncher from 'expo-intent-launcher';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import { BACKEND_URL } from '../../config/config';
import LeaveInfoScreen from './LeaveInfoScreen';
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
import AttendanceTab from './AttendanceTab';
import LeaveTab from './LeaveTab';
import CalendarTab from './CalendarTab';
import ReportsTab from './ReportsTab';
import LeaveModal from './LeaveModal';
import { MonthDropdown, YearDropdown } from './DropdownComponents';
import ReasonModal from './ReasonModal';

const TOKEN_2_KEY = 'token_2';

const Attendance: React.FC<AttendanceProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [isDriver, setIsDriver] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showLeaveInfo, setShowLeaveInfo] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);

  // Reason Modal States
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonModalType, setReasonModalType] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        const driverStatus = await AsyncStorage.getItem('is_driver');

        console.log('Stored token:', storedToken);
        console.log('Driver status from storage:', driverStatus);

        if (storedToken) {
          setToken(storedToken);

          // Parse and set driver status
          if (driverStatus) {
            try {
              const isDriverBool = JSON.parse(driverStatus);
              setIsDriver(isDriverBool);
              console.log('User is driver:', isDriverBool);
            } catch (parseError) {
              console.error('Error parsing driver status:', parseError);
              setIsDriver(false);
            }
          }

          await fetchInitialData(storedToken);
          await initializeLocationPermission();
        } else {
          console.log('No token found in storage');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    initializeApp();
  }, []);

  /**
   * Converts current time to IST and returns in ISO format
   * IST is UTC+5:30
   */
  const getCurrentTimeInIST = (): string => {
    const now = new Date();

    // Get current UTC time
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);

    // IST is UTC + 5 hours 30 minutes (19800000 milliseconds)
    const istTime = new Date(utcTime + (19800000));

    // Format: YYYY-MM-DDTHH:MM:SSZ
    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const day = String(istTime.getDate()).padStart(2, '0');
    const hours = String(istTime.getHours()).padStart(2, '0');
    const minutes = String(istTime.getMinutes()).padStart(2, '0');
    const seconds = String(istTime.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
  };

  const initializeLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for automatic attendance marking.'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
    }
  };

  const getCurrentLocation = async (timeoutMs: number = 10000) => {
    try {
      if (!locationPermission) return null;
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
      return null;
    }
  };

  const fetchInitialData = async (token?: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeaveBalance(token),
        fetchHolidays(token),
        fetchAttendanceRecords(token)
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to reset reason modal state
  const resetReasonModal = () => {
    setShowReasonModal(false);
    setSelectedReason('');
    setCustomReason('');
  };

  // Handler for reason modal submission
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
    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation(10000);
      if (!location) {
        Alert.alert('Error', 'Unable to get your location. Please check location permissions.');
        setLoading(false);
        return;
      }

      // Create request body
      const requestBody: any = {
        token,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      };

      // For drivers, automatically capture current time in IST
      if (isDriver) {
        const checkInTimeIST = getCurrentTimeInIST();
        requestBody.check_in_time = checkInTimeIST;
        console.log('Driver check-in time (IST):', checkInTimeIST);
      }

      // Add description if provided
      if (description && typeof description === 'string' && description.trim()) {
        requestBody.description = description.trim();
      }

      console.log('Marking attendance with payload:', requestBody);

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

        // Real-time update
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

        await fetchAttendanceRecords();
        setLoading(false);
      } else if (response.status === 400) {
        if (data.message === 'Mark attendance failed, You are not in office' ||
          data.message === 'description is required if you are not at office') {
          if (!description || typeof description !== 'string') {
            // Show reason modal for check-in
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
    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation(10000);
      if (!location) {
        Alert.alert('Error', 'Unable to get your location. Please check location permissions.');
        setLoading(false);
        return;
      }

      // Auto-capture checkout time in IST
      const checkOutTimeIST = getCurrentTimeInIST();
      console.log('Checkout time (IST):', checkOutTimeIST);

      // Create request body
      const requestBody: any = {
        token,
        checkout_time: checkOutTimeIST,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
      };

      // Add reason if provided
      if (reason && typeof reason === 'string' && reason.trim()) {
        requestBody.reason_not_in_office = reason.trim();
      }

      console.log('Marking checkout with payload:', requestBody);

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

        // Update today's attendance with checkout time
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

        // Update attendance records
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

        await fetchAttendanceRecords();
        setLoading(false);
      } else if (response.status === 400) {
        if (data.message === 'Mark checkout failed, You are not in office add a reason too') {
          if (!reason || typeof reason !== 'string') {
            // Show reason modal for checkout
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
        console.log(data);
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

  const fetchAttendanceRecords = async (token?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getRecentRecords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
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
          setAttendanceRecords(formattedRecords);
          const today = new Date().toISOString().split('T')[0];
          const todaysRecord = data.attendances.find((attendance: any) => attendance.date === today);
          if (todaysRecord) {
            setTodayAttendance({
              date: todaysRecord.date,
              status: todaysRecord.day,
              check_in_time: todaysRecord.check_in_time,
              check_out_time: todaysRecord.check_out_time
            });
          } else {
            setTodayAttendance(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAttendanceRecords([]);
      setTodayAttendance(null);
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
          month: selectedMonth.toString().padStart(2, '0'),
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
      const filename = data.filename || `attendance_report_${selectedMonth}_${selectedYear}.pdf`;

      // Show options to user
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

                // Fetch the PDF file
                const pdfResponse = await fetch(fileUrl);
                if (!pdfResponse.ok) {
                  throw new Error('Failed to fetch PDF from server');
                }

                // Get the blob and convert to base64
                const blob = await pdfResponse.blob();
                const reader = new FileReader();

                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result as string;
                    // Remove the data URL prefix (data:application/pdf;base64,)
                    const base64Content = base64data.split(',')[1];

                    // Save to local file system
                    const fileUri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(fileUri, base64Content, {
                      encoding: FileSystem.EncodingType.Base64,
                    });

                    // Share the file
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

  // Helper function to share PDF
  const sharePDF = async (fileUri: string, filename: string) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Attendance Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Info', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Could not open the PDF file.');
    }
  };

  const saveToDownloads = async (
    fileUri: string,
    filename: string,
    base64Data: string
  ) => {
    try {
      if (Platform.OS === 'android') {
        // Request directory permissions on Android using new API
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          Alert.alert(
            'Permission Denied',
            'Cannot save to Downloads folder without permission.'
          );
          return;
        }

        // Create file in selected directory
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          'application/pdf'
        );

        // Write base64 data to the file
        await FileSystem.writeAsStringAsync(uri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert('Success', 'PDF saved to Downloads folder successfully!');

      } else if (Platform.OS === 'ios') {
        // For iOS, use share sheet as direct Downloads access is restricted
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Attendance Report',
            UTI: 'com.adobe.pdf',
          });
          Alert.alert(
            'Info',
            'Use the share menu to save the PDF to Files app or other locations.'
          );
        } else {
          Alert.alert(
            'Info',
            'PDF is saved in the app directory. Use the "Open PDF" option to share it.'
          );
        }
      }
    } catch (error) {
      console.error('Error saving to downloads:', error);
      Alert.alert('Error', 'Could not save to Downloads folder. Please try again.');
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

  const handleStartDatePress = () => {
    setShowStartDatePicker(true);
  };

  const handleEndDatePress = () => {
    setShowEndDatePicker(true);
  };

  const handleApplyLeave = () => {
    setIsLeaveModalVisible(true);
  };

  const handleCloseLeaveModal = () => {
    setIsLeaveModalVisible(false);
    setLeaveForm({ startDate: '', endDate: '', leaveType: 'casual', reason: '' });
  };

  const handleMonthSelect = () => {
    setShowMonthDropdown(true);
  };

  const handleYearSelect = () => {
    setShowYearDropdown(true);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleLeavePress = (leave: LeaveApplication) => {
    setSelectedLeave(leave);
    setShowLeaveInfo(true);
  };

  const handleBackFromLeaveInfo = () => {
    setShowLeaveInfo(false);
    setSelectedLeave(null);
  };

  const handleHolidaysUpdate = (updatedHolidays: Holiday[]) => {
    setHolidays(updatedHolidays);
  };

  const handleCheckout = () => {
    Alert.alert(
      'Confirm Checkout',
      'Are you sure you want to mark checkout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Checkout', onPress: () => markCheckout() }
      ]
    );
  };

  if (showLeaveInfo && selectedLeave) {
    return (
      <LeaveInfoScreen
        leave={selectedLeave}
        onBack={handleBackFromLeaveInfo}
      />
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'attendance':
        return (
          <AttendanceTab
            todayAttendance={todayAttendance}
            attendanceRecords={attendanceRecords}
            loading={loading}
            locationPermission={locationPermission}
            onMarkAttendance={() => markAttendance()}
            onCheckout={handleCheckout}
            isDriver={isDriver}  // Keep this for display purposes only
          />
        );
      case 'leave':
        return (
          <LeaveTab
            leaveBalance={leaveBalance}
            leaveApplications={leaveApplications}
            onApplyLeave={handleApplyLeave}
            onLeavePress={handleLeavePress}
          />
        );
      case 'calendar':
        return (
          <CalendarTab
            holidays={holidays}
            token={token}
            onHolidaysUpdate={handleHolidaysUpdate}
          />
        );
      case 'reports':
        return (
          <ReportsTab
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            loading={loading}
            onMonthSelect={handleMonthSelect}
            onYearSelect={handleYearSelect}
            onDownloadReport={downloadAttendanceReport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Attendance {isDriver && '(Driver)'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabContainer}>
        {[
          { key: 'attendance', label: 'Attendance' },
          { key: 'leave', label: 'Leave' },
          { key: 'calendar', label: 'Calendar' },
          { key: 'reports', label: 'Reports' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key as TabType)}
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
        {renderTabContent()}
      </View>

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
        onStartDatePress={handleStartDatePress}
        onEndDatePress={handleEndDatePress}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

      <MonthDropdown
        visible={showMonthDropdown}
        selectedMonth={selectedMonth}
        onClose={() => setShowMonthDropdown(false)}
        onSelect={handleMonthChange}
      />

      <YearDropdown
        visible={showYearDropdown}
        selectedYear={selectedYear}
        onClose={() => setShowYearDropdown(false)}
        onSelect={handleYearChange}
      />

      {/* Unified Reason Modal for both Check-in and Checkout */}
      <ReasonModal
        visible={showReasonModal}
        type={reasonModalType}
        title={reasonModalType === 'checkin' ? 'Remote Attendance' : 'Early Checkout'}
        subtitle={
          reasonModalType === 'checkin' 
            ? "You're not at the office location. Please select a reason for remote attendance:" 
            : "You're not at the office location. Please select a reason for early checkout:"
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: fontSize.xl,
    color: colors.text,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
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
  },
});

export default Attendance;