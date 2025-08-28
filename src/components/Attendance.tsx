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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth } = Dimensions.get('window');

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
  
  // Attendance states
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  
  // Leave states
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
  
  // Holiday states
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  // Report states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token_2');
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
    }
  }, [token]);

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
      const response = await fetch(`${BACKEND_URL}/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', 'Attendance marked successfully!');
        await fetchTodayAttendance();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

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

  const LeaveApplicationModal = () => (
    <Modal
      visible={isLeaveModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsLeaveModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Apply for Leave</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.dateInput}
              value={leaveForm.startDate}
              onChangeText={(text) => setLeaveForm({...leaveForm, startDate: text})}
              placeholder="YYYY-MM-DD"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.dateInput}
              value={leaveForm.endDate}
              onChangeText={(text) => setLeaveForm({...leaveForm, endDate: text})}
              placeholder="YYYY-MM-DD"
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
              multiline
              numberOfLines={3}
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
        </View>
      </View>
    </Modal>
  );

  const renderAttendanceTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Today's Attendance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <View style={styles.attendanceCard}>
          {todayAttendance ? (
            <View style={styles.attendanceInfo}>
              <Text style={styles.attendanceStatus}>
                Status: <Text style={styles.statusText}>{todayAttendance.status}</Text>
              </Text>
              {todayAttendance.check_in_time && (
                <Text style={styles.timeText}>
                  Check In: {formatTime(todayAttendance.check_in_time)}
                </Text>
              )}
              {todayAttendance.check_out_time && (
                <Text style={styles.timeText}>
                  Check Out: {formatTime(todayAttendance.check_out_time)}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.noAttendanceContainer}>
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
      </View>

      {/* Recent Attendance Records */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Records</Text>
        {attendanceRecords.slice(0, 5).map((record, index) => (
          <View key={index} style={styles.recordItem}>
            <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
            <Text style={[styles.recordStatus, { color: getStatusColor(record.status) }]}>
              {record.status}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderLeaveTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Leave Balance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Balance</Text>
        <View style={styles.leaveBalanceContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.casual_leaves}</Text>
            <Text style={styles.balanceLabel}>Casual</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.sick_leaves}</Text>
            <Text style={styles.balanceLabel}>Sick</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.earned_leaves}</Text>
            <Text style={styles.balanceLabel}>Earned</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.applyLeaveButton}
          onPress={() => setIsLeaveModalVisible(true)}
        >
          <Text style={styles.applyLeaveText}>Apply for Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Leave Applications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Applications</Text>
        {leaveApplications.length > 0 ? (
          leaveApplications.map((application) => (
            <View key={application.id} style={styles.leaveItem}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveDateRange}>
                  {formatDate(application.start_date)} - {formatDate(application.end_date)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(application.status) }]}>
                  <Text style={styles.statusBadgeText}>{application.status}</Text>
                </View>
              </View>
              <Text style={styles.leaveType}>{application.leave_type} Leave</Text>
              <Text style={styles.leaveReason}>{application.leave_reason}</Text>
              {application.rejection_reason && (
                <Text style={styles.rejectionReason}>
                  Rejection Reason: {application.rejection_reason}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No leave applications found</Text>
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
              <Text style={styles.holidayName}>{holiday.name}</Text>
              <Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
              <Text style={styles.holidayType}>{holiday.type}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No holidays found</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderReportsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Report</Text>
        
        <View style={styles.reportFilters}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Month</Text>
            <TextInput
              style={styles.filterInput}
              value={selectedMonth.toString()}
              onChangeText={(text) => setSelectedMonth(parseInt(text) || 1)}
              keyboardType="numeric"
              placeholder="Month (1-12)"
            />
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Year</Text>
            <TextInput
              style={styles.filterInput}
              value={selectedYear.toString()}
              onChangeText={(text) => setSelectedYear(parseInt(text) || new Date().getFullYear())}
              keyboardType="numeric"
              placeholder="Year"
            />
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
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'attendance' && renderAttendanceTab()}
        {activeTab === 'leave' && renderLeaveTab()}
        {activeTab === 'calendar' && renderCalendarTab()}
        {activeTab === 'reports' && renderReportsTab()}
      </View>

      {/* Leave Application Modal */}
      <LeaveApplicationModal />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#2D3748',
  },
  backButton: {
    padding: spacing.sm,
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
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
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
    padding: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendanceInfo: {
    alignItems: 'center',
  },
  attendanceStatus: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  noAttendanceContainer: {
    alignItems: 'center',
  },
  noAttendanceText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  markAttendanceButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  markAttendanceText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordDate: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  recordStatus: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leaveBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  balanceNumber: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  applyLeaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  applyLeaveText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  leaveItem: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leaveDateRange: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
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
  },
  rejectionReason: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  holidayItem: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  holidayName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  holidayDate: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  holidayType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reportFilters: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  filterGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  downloadButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  downloadText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  },
  leaveTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leaveTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  leaveTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  leaveTypeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginRight: spacing.sm,
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
    marginLeft: spacing.sm,
  },
  modalSubmitText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default Attendance;