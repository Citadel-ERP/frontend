import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Image,
  Dimensions,
  RefreshControl,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

interface EmployeeManagementProps {
  onBack: () => void;
}

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  designation: string;
  profile_picture: string | null;
  phone_number: string;
  joining_date: string;
  is_active: boolean;
  is_archived: boolean;
  earned_leaves: number;
  sick_leaves: number;
  casual_leaves: number;
  reporting_tags?: Array<any>;
}

// WhatsApp Color Theme
const WHATSAPP_COLORS = {
  primary: '#075E54', // WhatsApp dark green
  primaryLight: '#128C7E', // WhatsApp medium green
  accent: '#25D366', // WhatsApp light green
  background: '#ECE5DD', // WhatsApp chat background
  surface: '#FFFFFF', // White for cards
  chatBubbleSent: '#DCF8C6', // WhatsApp sent message bubble
  chatBubbleReceived: '#FFFFFF', // WhatsApp received message bubble
  textPrimary: '#000000', // Black for primary text
  textSecondary: '#667781', // WhatsApp secondary text
  textTertiary: '#8696A0', // WhatsApp tertiary text
  border: '#E0E0E0', // Light gray border
  statusOnline: '#25D366', // Online status green
  statusAway: '#FFB300', // Away status yellow
  statusOffline: '#9E9E9E', // Offline gray
  error: '#FF3B30', // Red for errors
  success: '#34C759', // Green for success
  warning: '#FF9500', // Orange for warnings
};

// Custom BackIcon Component (from your BUP header)
const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

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

  useEffect(() => {
    if (token) {
      fetchEmployees();
    }
  }, [token]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchQuery, employees]);

  const fetchEmployees = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/manager/getEmployees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        setFilteredEmployees(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateExperience = (joiningDate: string): string => {
    const joinDate = new Date(joiningDate);
    const today = new Date();

    let years = today.getFullYear() - joinDate.getFullYear();
    let months = today.getMonth() - joinDate.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0) {
      return `${years}yr ${months}mo`;
    }
    return `${months}mo`;
  };

  const handleEmployeePress = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const handleBackFromDetails = () => {
    setSelectedEmployee(null);
  };

  if (selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        onBack={handleBackFromDetails}
        token={token || ''}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />

      {/* BUP Style Header - Exact same as your provided header */}
      <View style={styles.headerBanner}>
        <LinearGradient
          colors={['#4A5568', '#2D3748']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBanner}
        >
          {/* Background Image */}
          <Image
            source={require('../assets/bg.jpeg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          
          {/* Dark overlay for better text visibility */}
          <View style={styles.headerOverlay} />
          
          {/* Header Content */}
          <View style={[styles.headerContent, { 
            paddingTop: Platform.OS === 'ios' ? 50 : 40 
          }]}>
            {/* Top row with back button, logo, and actions */}
            <View style={styles.headerTopRow}>
              {/* Left side - Back button */}
              <View style={styles.leftSection}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={onBack}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <BackIcon />
                </TouchableOpacity>
              </View>
              
              {/* Center - Logo */}
              <View style={styles.centerSection}>
                <Text style={styles.logoText}>CITADEL</Text>
              </View>
              
              {/* Right side - Action buttons */}
              <View style={styles.rightSection}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={fetchEmployees}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>Employee Management</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* WhatsApp-style Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[
              styles.searchInputContainer,
              searchFocused && styles.searchInputContainerFocused
            ]}>
              <Ionicons
                name="search"
                size={18}
                color={searchFocused ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.textTertiary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employees..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={18} color={WHATSAPP_COLORS.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* WhatsApp-style Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[WHATSAPP_COLORS.accent]}
            tintColor={WHATSAPP_COLORS.accent}
            progressBackgroundColor={WHATSAPP_COLORS.background}
          />
        }
      >
        {/* Stats Overview - WhatsApp-style */}
        {/* <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: WHATSAPP_COLORS.chatBubbleSent }]}>
              <Text style={styles.statValue}>{filteredEmployees.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#DCF8C6' }]}>
              <Text style={styles.statValue}>
                {filteredEmployees.filter(e => e.is_active).length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.statValue}>
                {filteredEmployees.reduce((sum, e) => sum + e.earned_leaves, 0)}
              </Text>
              <Text style={styles.statLabel}>Earned Leaves</Text>
            </View>
          </View>
        </View> */}

        {/* Employee List */}
        {loading && employees.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={64} color={WHATSAPP_COLORS.error} />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchEmployees}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredEmployees.length > 0 ? (
          <View style={styles.employeesList}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Team Members</Text>
              <Text style={styles.listSubtitle}>
                {searchQuery ? `Results for "${searchQuery}"` : 'All team members'}
              </Text>
            </View>
            
            {filteredEmployees.map((employee) => (
              <TouchableOpacity
                key={employee.employee_id}
                style={styles.employeeCard}
                onPress={() => handleEmployeePress(employee)}
                activeOpacity={0.7}
              >
                {/* WhatsApp-style contact card */}
                <View style={styles.employeeCardContent}>
                  <View style={styles.avatarContainer}>
                    {employee.profile_picture ? (
                      <Image
                        source={{ uri: employee.profile_picture }}
                        style={styles.avatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.avatarDefault, 
                        { backgroundColor: getAvatarColor(employee.employee_id) }
                      ]}>
                        <Text style={styles.avatarInitials}>
                          {getInitials(employee.full_name)}
                        </Text>
                      </View>
                    )}
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: employee.is_active ? WHATSAPP_COLORS.statusOnline : WHATSAPP_COLORS.statusOffline }
                    ]} />
                  </View>

                  <View style={styles.employeeInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.employeeName} numberOfLines={1}>
                        {employee.full_name}
                      </Text>
                      <Text style={styles.employeeTime}>
                        {calculateExperience(employee.joining_date)}
                      </Text>
                    </View>
                    
                    <Text style={styles.employeeDesignation} numberOfLines={1}>
                      {employee.designation || employee.role}
                    </Text>
                    
                    <Text style={styles.employeeLastMessage} numberOfLines={1}>
                      ID: {employee.employee_id} • {employee.email}
                    </Text>
                    
                    <View style={styles.leaveBadges}>
                      <View style={[styles.leaveBadge, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={[styles.leaveBadgeText, { color: '#2E7D32' }]}>
                          Earned: {employee.earned_leaves}
                        </Text>
                      </View>
                      <View style={[styles.leaveBadge, { backgroundColor: '#FFF3E0' }]}>
                        <Text style={[styles.leaveBadgeText, { color: '#EF6C00' }]}>
                          Sick: {employee.sick_leaves}
                        </Text>
                      </View>
                      <View style={[styles.leaveBadge, { backgroundColor: '#E3F2FD' }]}>
                        <Text style={[styles.leaveBadgeText, { color: '#1565C0' }]}>
                          Casual: {employee.casual_leaves}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={WHATSAPP_COLORS.textTertiary} 
                    style={styles.chevronIcon}
                  />
                </View>
              </TouchableOpacity>
            ))}
            
            <View style={styles.listFooter}>
              <Text style={styles.listFooterText}>
                End of list • {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="people-outline" size={80} color={WHATSAPP_COLORS.border} />
            </View>
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No employees found' : 'No employees'}
            </Text>
            <Text style={styles.emptyStateMessage}>
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'No employees are currently assigned under your management'}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.8}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Employee Details Component
interface EmployeeDetailsProps {
  employee: Employee;
  onBack: () => void;
  token: string;
}

const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employee, onBack, token }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'leaves'>('overview');
  const [loading, setLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [attendanceReport, setAttendanceReport] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchEmployeeDetails();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceReport();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeDetails(data);
      } else {
        Alert.alert('Error', 'Failed to fetch employee details');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceReport = async () => {
    try {
      const monthYear = `${String(selectedMonth + 1).padStart(2, '0')}/${String(selectedYear).slice(-2)}`;
      const response = await fetch(`${BACKEND_URL}/manager/getAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          month_year: monthYear
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceReport(data.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching attendance report:', error);
    }
  };

  const handleDownloadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          month: selectedMonth + 1,
          year: selectedYear
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.file_url) {
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
        }
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

  const handleApproveLeave = async (leaveId: string) => {
    Alert.alert(
      'Approve Leave',
      'Are you sure you want to approve this leave request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/manager/approveLeave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  leave_id: leaveId
                }),
              });

              if (response.ok) {
                Alert.alert('Success', 'Leave approved successfully');
                fetchEmployeeDetails();
              } else {
                Alert.alert('Error', 'Failed to approve leave');
              }
            } catch (error) {
              console.error('Error approving leave:', error);
              Alert.alert('Error', 'Network error occurred');
            }
          }
        }
      ]
    );
  };

  const handleRejectLeave = async (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setRejectionReason('');
    setRejectionModalVisible(true);
  };
  
  const submitRejection = async () => {
    if (!selectedLeaveId || !rejectionReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for rejection');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/manager/rejectLeave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          leave_id: selectedLeaveId,
          reject_reason: rejectionReason.trim()
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Leave rejected successfully');
        setRejectionModalVisible(false);
        setRejectionReason('');
        setSelectedLeaveId(null);
        fetchEmployeeDetails();
      } else {
        Alert.alert('Error', 'Failed to reject leave');
      }
    } catch (error) {
      console.error('Error rejecting leave:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateExperience = (joiningDate: string): string => {
    const today = new Date();
    const joinDate = new Date(joiningDate);
    const years = today.getFullYear() - joinDate.getFullYear();
    const months = today.getMonth() - joinDate.getMonth();
    const adjustedMonths = months < 0 ? months + 12 : months;
    const adjustedYears = months < 0 ? years - 1 : years;

    if (adjustedYears > 0) {
      return `${adjustedYears}yr ${adjustedMonths}mo`;
    }
    return `${adjustedMonths}mo`;
  };

  // Helper functions for attendance calendar
  const getMonthName = (month: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
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
      return record.attendance_status;
    }
    
    return null;
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

  const calculateAttendanceSummary = () => {
    if (!attendanceReport || attendanceReport.length === 0) {
      return {
        present: 0,
        leave: 0,
        wfh: 0,
        absent: 0,
        holidays: 0,
        pending: 0,
        weekends: 0
      };
    }

    return {
      present: attendanceReport.filter(r => r.attendance_status === 'present').length,
      leave: attendanceReport.filter(r => r.attendance_status === 'leave').length,
      wfh: attendanceReport.filter(r => r.attendance_status === 'wfh').length,
      absent: attendanceReport.filter(r => r.attendance_status === 'absent').length,
      holidays: attendanceReport.filter(r => r.attendance_status === 'holiday').length,
      pending: attendanceReport.filter(r => r.attendance_status === 'pending').length,
      weekends: attendanceReport.filter(r => r.attendance_status === 'weekend').length
    };
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Empty days for start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDateStatus(day);
      const isToday = day === currentDay && selectedMonth === currentMonth && selectedYear === currentYear;
      
      let backgroundColor = '#FFFFFF';
      let textColor = WHATSAPP_COLORS.textPrimary;
      
      switch (status) {
        case 'present':
          backgroundColor = '#E8F5E9';
          textColor = '#2E7D32';
          break;
        case 'leave':
          backgroundColor = '#FFF3E0';
          textColor = '#EF6C00';
          break;
        case 'wfh':
          backgroundColor = '#E3F2FD';
          textColor = '#1565C0';
          break;
        case 'holiday':
          backgroundColor = '#E8EAF6';
          textColor = '#5C6BC0';
          break;
        case 'absent':
          backgroundColor = '#FFEBEE';
          textColor = '#D32F2F';
          break;
        case 'weekend':
          backgroundColor = '#F5F5F5';
          textColor = '#9E9E9E';
          break;
        default:
          backgroundColor = '#FFFFFF';
          textColor = WHATSAPP_COLORS.textPrimary;
      }

      days.push(
        <View key={day} style={styles.calendarDay}>
          <View style={[
            styles.dayCircle,
            { backgroundColor, borderColor: textColor },
            isToday && styles.todayCircle
          ]}>
            <Text style={[styles.dayText, { color: textColor }]}>
              {day}
            </Text>
          </View>
        </View>
      );
    }

    return days;
  };

  const renderOverviewTab = () => (
    <ScrollView 
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* BUP Style Header for Employee Details */}
      <View style={styles.detailsHeaderBanner}>
        <LinearGradient
          colors={['#4A5568', '#2D3748']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailsHeaderBanner}
        >
          <Image
            source={require('../../assets/cars.jpeg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          
          <View style={styles.headerOverlay} />
          
          <View style={[styles.headerContent, { 
            paddingTop: Platform.OS === 'ios' ? 50 : 40 
          }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.leftSection}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={onBack}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <BackIcon />
                </TouchableOpacity>
              </View>
              
              <View style={styles.centerSection}>
                <Text style={styles.logoText}>CITADEL</Text>
              </View>
              
              <View style={styles.rightSection}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={fetchEmployeeDetails}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.detailsTitleSection}>
            <Text style={styles.detailsSectionTitle}>{employee.full_name}</Text>
            <Text style={styles.detailsSectionSubtitle}>
              {employee.designation || employee.role}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'Overview', icon: 'person-outline' },
          { key: 'attendance', label: 'Attendance', icon: 'calendar-outline' },
          { key: 'leaves', label: 'Leaves', icon: 'leaf-outline' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.textTertiary}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* WhatsApp-style Profile Info */}
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderContent}>
          <View style={styles.profileAvatarContainer}>
            {employee.profile_picture ? (
              <Image
                source={{ uri: employee.profile_picture }}
                style={styles.profileAvatarImage}
              />
            ) : (
              <View style={[styles.profileAvatarDefault, 
                { backgroundColor: getAvatarColor(employee.employee_id) }
              ]}>
                <Text style={styles.profileAvatarInitials}>
                  {getInitials(employee.first_name, employee.last_name)}
                </Text>
              </View>
            )}
            <View style={[
              styles.profileStatusIndicator,
              { backgroundColor: employee.is_active ? WHATSAPP_COLORS.statusOnline : WHATSAPP_COLORS.statusOffline }
            ]} />
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{employee.full_name}</Text>
            <Text style={styles.profileDesignation}>
              {employee.designation || employee.role}
            </Text>
            <Text style={styles.profileId}>ID: {employee.employee_id}</Text>
          </View>
        </View>
      </View>

      {/* WhatsApp-style Info Cards */}
      <View style={styles.infoCardsContainer}>
        {/* Contact Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{employee.email}</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{employee.phone_number}</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Joining Date</Text>
              <Text style={styles.infoValue}>{formatDate(employee.joining_date)}</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Experience</Text>
              <Text style={styles.infoValue}>{calculateExperience(employee.joining_date)}</Text>
            </View>
          </View>
        </View>

        {/* Leave Balance Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="leaf-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Leave Balance</Text>
          </View>
          
          <View style={styles.leaveBalanceContainer}>
            <View style={[styles.leaveBalanceItem, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.leaveBalanceValue, { color: '#2E7D32' }]}>
                {employee.earned_leaves}
              </Text>
              <Text style={[styles.leaveBalanceLabel, { color: '#2E7D32' }]}>
                Earned
              </Text>
            </View>
            
            <View style={[styles.leaveBalanceItem, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.leaveBalanceValue, { color: '#EF6C00' }]}>
                {employee.sick_leaves}
              </Text>
              <Text style={[styles.leaveBalanceLabel, { color: '#EF6C00' }]}>
                Sick
              </Text>
            </View>
            
            <View style={[styles.leaveBalanceItem, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.leaveBalanceValue, { color: '#1565C0' }]}>
                {employee.casual_leaves}
              </Text>
              <Text style={[styles.leaveBalanceLabel, { color: '#1565C0' }]}>
                Casual
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        {employeeDetails && employeeDetails.assigned_assets && employeeDetails.assigned_assets.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="briefcase-outline" size={24} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.infoCardTitle}>
                Assigned Assets ({employeeDetails.total_assigned_assets})
              </Text>
            </View>
            
            {employeeDetails.assigned_assets.map((asset: any, index: number) => (
              <View key={index}>
                {index > 0 && <View style={styles.infoDivider} />}
                <View style={styles.infoItem}>
                  <Ionicons name="cube-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{asset.asset.name}</Text>
                    <Text style={styles.infoValue}>
                      {asset.asset.type} • Serial: {asset.asset.serial_number}
                    </Text>
                    <Text style={styles.infoSubtext}>
                      Assigned on {formatDate(asset.assigned_at)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderAttendanceTab = () => {
    const summary = calculateAttendanceSummary();
    
    return (
      <ScrollView 
        style={styles.detailsContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BUP Style Header for Employee Details */}
        <View style={styles.detailsHeaderBanner}>
          <LinearGradient
            colors={['#4A5568', '#2D3748']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.detailsHeaderBanner}
          >
            <Image
              source={require('../assets/cars.jpeg')}
              style={styles.headerImage}
              resizeMode="cover"
            />
            
            <View style={styles.headerOverlay} />
            
            <View style={[styles.headerContent, { 
              paddingTop: Platform.OS === 'ios' ? 50 : 40 
            }]}>
              <View style={styles.headerTopRow}>
                <View style={styles.leftSection}>
                  <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={onBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <BackIcon />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.centerSection}>
                  <Text style={styles.logoText}>CITADEL</Text>
                </View>
                
                <View style={styles.rightSection}>
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={fetchEmployeeDetails}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.detailsTitleSection}>
              <Text style={styles.detailsSectionTitle}>{employee.full_name}</Text>
              <Text style={styles.detailsSectionSubtitle}>
                {employee.designation || employee.role}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {[
            { key: 'overview', label: 'Overview', icon: 'person-outline' },
            { key: 'attendance', label: 'Attendance', icon: 'calendar-outline' },
            { key: 'leaves', label: 'Leaves', icon: 'leaf-outline' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.textTertiary}
              />
              <Text style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceTitle}>Attendance Report</Text>
          <Text style={styles.attendanceSubtitle}>
            View and download attendance records
          </Text>
        </View>

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
            
            <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.summaryValue, { color: '#EF6C00' }]}>
                {summary.leave}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#EF6C00' }]}>
                Leave
              </Text>
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.summaryValue, { color: '#1565C0' }]}>
                {summary.wfh}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#1565C0' }]}>
                WFH
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
          </View>
        </View>

        {/* Month Navigation */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthNavButton}>
            <Ionicons name="chevron-back" size={20} color={WHATSAPP_COLORS.primary} />
          </TouchableOpacity>
          
          <Text style={styles.monthYearText}>
            {getMonthName(selectedMonth)} {selectedYear}
          </Text>
          
          <TouchableOpacity onPress={nextMonth} style={styles.monthNavButton}>
            <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar View */}
        <View style={styles.calendarContainer}>
          <View style={styles.weekDays}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.calendarGrid}>
            {renderCalendar()}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
              <Text style={styles.legendText}>WFH</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>Holiday</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={styles.legendText}>Weekend</Text>
            </View>
          </View>
        </View>

        {/* Download Report Card */}
        <View style={styles.downloadCard}>
          <View style={styles.downloadCardContent}>
            <Ionicons name="document-text" size={40} color={WHATSAPP_COLORS.primary} />
            <View style={styles.downloadInfo}>
              <Text style={styles.downloadTitle}>Download Attendance Report</Text>
              <Text style={styles.downloadDescription}>
                Get a detailed PDF report of {employee.full_name}'s attendance
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadReport}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#FFFFFF" />
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderLeavesTab = () => (
    <ScrollView 
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* BUP Style Header for Employee Details */}
      <View style={styles.detailsHeaderBanner}>
        <LinearGradient
          colors={['#4A5568', '#2D3748']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailsHeaderBanner}
        >
          <Image
            source={require('../../assets/cars.jpeg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          
          <View style={styles.headerOverlay} />
          
          <View style={[styles.headerContent, { 
            paddingTop: Platform.OS === 'ios' ? 50 : 40 
          }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.leftSection}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={onBack}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <BackIcon />
                </TouchableOpacity>
              </View>
              
              <View style={styles.centerSection}>
                <Text style={styles.logoText}>CITADEL</Text>
              </View>
              
              <View style={styles.rightSection}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={fetchEmployeeDetails}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.detailsTitleSection}>
            <Text style={styles.detailsSectionTitle}>{employee.full_name}</Text>
            <Text style={styles.detailsSectionSubtitle}>
              {employee.designation || employee.role}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'Overview', icon: 'person-outline' },
          { key: 'attendance', label: 'Attendance', icon: 'calendar-outline' },
          { key: 'leaves', label: 'Leaves', icon: 'leaf-outline' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.textTertiary}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {employeeDetails?.leaves && employeeDetails.leaves.length > 0 ? (
        <>
          <View style={styles.leavesHeader}>
            <Text style={styles.leavesTitle}>Leave Requests</Text>
            <Text style={styles.leavesSubtitle}>
              {employeeDetails.leaves.length} request{employeeDetails.leaves.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          {employeeDetails.leaves.map((leave: any, index: number) => (
            <View key={index} style={styles.leaveCard}>
              <View style={styles.leaveCardHeader}>
                <View style={styles.leaveHeaderInfo}>
                  <Text style={styles.leaveType}>{leave.leave_type}</Text>
                  <Text style={styles.leaveDates}>
                    {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    {leave.total_number_of_days && ` (${leave.total_number_of_days} day${leave.total_number_of_days > 1 ? 's' : ''})`}
                  </Text>
                </View>
                
                <View style={[
                  styles.leaveStatus,
                  { backgroundColor: 
                    leave.status === 'approved_by_manager' ? '#E8F5E9' :
                    leave.status === 'rejected' ? '#FFEBEE' :
                    '#FFF3E0'
                  }
                ]}>
                  <Text style={[
                    styles.leaveStatusText,
                    { color: 
                      leave.status === 'approved_by_manager' ? '#2E7D32' :
                      leave.status === 'rejected' ? '#D32F2F' :
                      '#EF6C00'
                    }
                  ]}>
                    {leave.status === 'approved_by_manager' ? 'Approved' : 
                     leave.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </Text>
                </View>
              </View>
              
              {leave.reason && (
                <Text style={styles.leaveReason}>
                  <Text style={styles.leaveReasonLabel}>Reason: </Text>
                  {leave.reason}
                </Text>
              )}
              
              {leave.status === 'pending' && (
                <View style={styles.leaveActions}>
                  <TouchableOpacity
                    style={[styles.leaveActionButton, { backgroundColor: '#4CAF50' }]}
                    onPress={() => handleApproveLeave(leave.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.leaveActionText}>Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.leaveActionButton, { backgroundColor: '#F44336' }]}
                    onPress={() => handleRejectLeave(leave.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                    <Text style={styles.leaveActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {leave.manager_comment && (
                <View style={styles.managerComment}>
                  <Text style={styles.managerCommentLabel}>Manager Comment: </Text>
                  <Text style={styles.managerCommentText}>{leave.manager_comment}</Text>
                </View>
              )}
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyLeaves}>
          <Ionicons name="calendar-outline" size={64} color={WHATSAPP_COLORS.border} />
          <Text style={styles.emptyLeavesTitle}>No leave requests</Text>
          <Text style={styles.emptyLeavesText}>
            {employee.full_name} hasn't submitted any leave requests yet
          </Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />

      {/* Render active tab content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'attendance' && renderAttendanceTab()}
      {activeTab === 'leaves' && renderLeavesTab()}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
        </View>
      )}

      {/* Rejection Modal */}
      <Modal
        visible={rejectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Leave Request</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Please provide a reason for rejecting this leave:
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRejectionModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitRejection}
                disabled={!rejectionReason.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Reject Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper function for avatar colors
const getAvatarColor = (id: string): string => {
  const colors = [
    '#075E54', // WhatsApp green
    '#128C7E', // WhatsApp medium green
    '#25D366', // WhatsApp light green
    '#34B7F1', // WhatsApp blue
    '#ED4C67', // Pink
    '#FFC312', // Yellow
    '#EE5A24', // Orange
    '#A3CB38', // Lime green
    '#1289A7', // Teal
    '#D980FA', // Purple
  ];
  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  
  // BUP Header Styles - Exact same as your provided header
  headerBanner: {
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  detailsHeaderBanner: {
    height: 220,
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
    opacity: 0.8,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    width: 80,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 32,
    justifyContent: 'center',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    zIndex: 1,
  },
  detailsTitleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  detailsSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  detailsSectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  backIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  
  // Search (Added to header)
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInputContainerFocused: {
    borderColor: WHATSAPP_COLORS.accent,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  
  // Scroll & Content
  scrollView: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // Stats Container
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Employee List
  employeesList: {
    paddingHorizontal: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  
  // Employee Card
  employeeCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  employeeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarDefault: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.surface,
  },
  employeeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  employeeTime: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginLeft: 8,
  },
  employeeDesignation: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  employeeLastMessage: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginBottom: 6,
  },
  leaveBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  leaveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  leaveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  
  // List Footer
  listFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  listFooterText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Details Content
  detailsContent: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  
  // Tab Navigation (for details screen)
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.surface,
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: WHATSAPP_COLORS.chatBubbleSent,
  },
  tabLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 4,
  },
  activeTabLabel: {
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  
  // Profile Header in Details
  profileHeader: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileAvatarDefault: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileStatusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.surface,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  profileDesignation: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4,
  },
  profileId: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  
  // Info Cards
  infoCardsContainer: {
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginLeft: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },
  infoSubtext: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: WHATSAPP_COLORS.border,
    marginVertical: 8,
  },
  
  // Leave Balance
  leaveBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  leaveBalanceItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  leaveBalanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  leaveBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Attendance
  attendanceHeader: {
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  attendanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  attendanceSubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  attendanceSummary: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  calendarContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.accent,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  legendContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  downloadCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  downloadInfo: {
    flex: 1,
    marginLeft: 16,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  downloadDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    lineHeight: 20,
  },
  downloadButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Leaves
  leavesHeader: {
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  leavesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  leavesSubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  leaveCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leaveHeaderInfo: {
    flex: 1,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  leaveDates: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  leaveStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  leaveStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaveReason: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
    lineHeight: 20,
  },
  leaveReasonLabel: {
    fontWeight: '600',
  },
  leaveActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  leaveActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  leaveActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  managerComment: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  managerCommentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  managerCommentText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyLeaves: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 24,
  },
  emptyLeavesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLeavesText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: WHATSAPP_COLORS.textPrimary,
  },
  modalDescription: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    minHeight: 120,
    marginBottom: 24,
    backgroundColor: WHATSAPP_COLORS.background,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: WHATSAPP_COLORS.border,
  },
  cancelButtonText: {
    color: WHATSAPP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: WHATSAPP_COLORS.error,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EmployeeManagement;