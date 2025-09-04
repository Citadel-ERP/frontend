// Attendance.tsx - Main Attendance Component (Complete)
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as IntentLauncher from 'expo-intent-launcher';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import { BACKEND_URL } from '../../config/config';
import LeaveInfoScreen from './LeaveInfoScreen';

// Import types
import {
  AttendanceProps,
  LeaveBalance,
  LeaveApplication,
  Holiday,
  AttendanceRecord,
  LeaveForm,
  TabType
} from './types';

// Import components
import AttendanceTab from './AttendanceTab';
import LeaveTab from './LeaveTab';
import CalendarTab from './CalendarTab';
import ReportsTab from './ReportsTab';
import LeaveModal from './LeaveModal';
import { MonthDropdown, YearDropdown } from './DropdownComponents';

const TOKEN_2_KEY = 'token_2';

const Attendance: React.FC<AttendanceProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();

  // State variables
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [loading, setLoading] = useState(false);

  // Attendance states
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  // Leave states
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

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  // Holiday and report states
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const [showLeaveInfo, setShowLeaveInfo] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);

  // Initialize token and location permission
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        console.log('Stored token:', storedToken); // Debug log

        if (storedToken) {
          setToken(storedToken);
          // Pass the storedToken directly to functions instead of relying on state
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

  // API Functions
  const markAttendance = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication token not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation(10000);
      if (!location) {
        Alert.alert('Error', 'Unable to get your location. Please check location permissions.');
        return;
      }
      console.log(token);
      console.log(location);
      const response = await fetch(`${BACKEND_URL}/core/markAttendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
        }),
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (response.status === 200) {
        Alert.alert('Success', 'Attendance marked successfully!');
        await fetchAttendanceRecords();
      } else if (response.status === 400) {
        if (data.message === 'Mark attendance failed, You are not in office') {
          Alert.alert('Cannot Mark Attendance', 'You are not at the office location.');
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

  const fetchLeaveBalance = async (token?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getLeaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data)
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
            approved_by : leave.approved_by,
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

  const fetchHolidays = async (token?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getHolidays`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays);
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

      if (response.ok) {
        const pdfBlob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = async () => {
          if (reader.result) {
            const base64data = (reader.result as string).split(',')[1];
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = monthNames[selectedMonth - 1];
            const filename = `attendance_report_${monthName}_${selectedYear}.pdf`;
            const fileUri = FileSystem.documentDirectory + filename;

            try {
              await FileSystem.writeAsStringAsync(fileUri, base64data, {
                encoding: FileSystem.EncodingType.Base64,
              });

              Alert.alert('Report Generated', 'Your attendance report has been generated!', [
                {
                  text: 'Open PDF',
                  onPress: () => {
                    // Try to share/open the PDF
                    sharePDF(fileUri, filename);
                  }
                },
                {
                  text: 'Save to Downloads',
                  onPress: async () => {
                    try {
                      // For Android, you might want to save to Downloads folder
                      if (Platform.OS === 'android') {
                        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                        if (permissions.granted) {
                          const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                            encoding: FileSystem.EncodingType.Base64,
                          });

                          await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'application/pdf')
                            .then(async (uri) => {
                              await FileSystem.writeAsStringAsync(uri, base64Data, {
                                encoding: FileSystem.EncodingType.Base64,
                              });
                              Alert.alert('Success', 'PDF saved to Downloads folder!');
                            });
                        } else {
                          Alert.alert('Permission Denied', 'Cannot save to Downloads folder without permission.');
                        }
                      } else {
                        // For iOS, the file is already in the app's document directory
                        Alert.alert('Info', 'PDF is saved in the app directory and can be shared using the share option.');
                      }
                    } catch (error) {
                      console.error('Error saving to downloads:', error);
                      Alert.alert('Error', 'Could not save to Downloads folder.');
                    }
                  }
                },
                { text: 'Cancel', style: 'cancel' }
              ]);
            } catch (fileError) {
              console.error('Error saving file:', fileError);
              Alert.alert('Error', 'Failed to save the report file.');
            }
          }
        };

        reader.readAsDataURL(pdfBlob);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Network error occurred while generating report');
    } finally {
      setLoading(false);
    }
  };

  const openPDF = async (fileUri: string) => {
    try {
      if (Platform.OS === 'ios') {
        await WebBrowser.openBrowserAsync(fileUri);
      } else {
        // For Android, use Sharing.shareAsync which handles FileProvider internally
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open PDF',
            UTI: 'com.adobe.pdf'
          });
        } else {
          // Fallback: try to open with WebBrowser
          await WebBrowser.openBrowserAsync(fileUri);
        }
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Could not open PDF file. You can try sharing it to a PDF viewer app instead.');
    }
  };

  // Alternative solution: Create a separate function that copies the file to a shareable location
  const openPDFAlternative = async (fileUri: string) => {
    try {
      if (Platform.OS === 'ios') {
        await WebBrowser.openBrowserAsync(fileUri);
      } else {
        // For Android, copy file to cache directory which is more accessible
        const filename = fileUri.split('/').pop() || 'attendance_report.pdf';
        const cacheUri = FileSystem.cacheDirectory + filename;

        // Copy file to cache directory
        await FileSystem.copyAsync({
          from: fileUri,
          to: cacheUri
        });

        // Try to open with an intent
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: cacheUri,
            flags: 1,
            type: 'application/pdf',
          });
        } catch (intentError) {
          // If intent fails, use sharing
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(cacheUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Open PDF with...',
              UTI: 'com.adobe.pdf'
            });
          } else {
            throw new Error('No PDF viewer available');
          }
        }
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Could not open PDF file. Please install a PDF viewer app or try the share option.');
    }
  };

  const sharePDF = async (fileUri: string, filename: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${filename}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Could not share PDF file');
    }
  };

  // Date picker handlers
  const onStartDateChange = (event: any, date?: Date) => {
    setShowStartDatePicker(false);
    if (date) {
      setStartDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setLeaveForm({ ...leaveForm, startDate: formattedDate });

      // Reset end date if it's before the new start date
      if (endDate < date) {
        setEndDate(date);
        setLeaveForm({ ...leaveForm, startDate: formattedDate, endDate: formattedDate });
      }
    }
  };

  const onEndDateChange = (event: any, date?: Date) => {
    setShowEndDatePicker(false);
    if (date) {
      setEndDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setLeaveForm({ ...leaveForm, endDate: formattedDate });
    }
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

  // If showing leave info screen, render it instead of main content
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
            markAttendance={markAttendance}
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
          <CalendarTab holidays={holidays} />
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>

      {/* Leave Modal */}
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

      {/* Month Dropdown */}
      <MonthDropdown
        visible={showMonthDropdown}
        selectedMonth={selectedMonth}
        onClose={() => setShowMonthDropdown(false)}
        onSelect={handleMonthChange}
      />

      {/* Year Dropdown */}
      <YearDropdown
        visible={showYearDropdown}
        selectedYear={selectedYear}
        onClose={() => setShowYearDropdown(false)}
        onSelect={handleYearChange}
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