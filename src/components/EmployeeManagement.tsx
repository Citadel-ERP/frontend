import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, ActivityIndicator, TextInput, Image, Dimensions,
  RefreshControl, Modal, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
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

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
  </View>
);

const SearchIcon = ({ size = 20, color = '#6b7280' }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.6,
      height: size * 0.6,
      borderRadius: size * 0.3,
      borderWidth: 2,
      borderColor: color,
      position: 'relative'
    }} />
    <View style={{
      position: 'absolute',
      bottom: -size * 0.1,
      right: -size * 0.1,
      width: size * 0.4,
      height: 2,
      backgroundColor: color,
      transform: [{ rotate: '45deg' }]
    }} />
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
      return `${years}yr${years > 1 ? 's' : ''} ${months > 0 ? `${months}mo` : ''}`;
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
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" translucent={false} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Management</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <View style={styles.searchIconContainer}>
                <SearchIcon size={18} color="#6b7280" />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search employees by name, ID, or designation..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.searchHint}>
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
            </Text>
          </View>

          {loading && employees.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1e1b4b" />
              <Text style={styles.loadingText}>Loading employees...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchEmployees}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredEmployees.length > 0 ? (
            <View style={styles.employeesList}>
              {filteredEmployees.map((employee) => (
                <TouchableOpacity
                  key={employee.employee_id}
                  style={styles.employeeCard}
                  onPress={() => handleEmployeePress(employee)}
                  activeOpacity={0.7}
                >
                  <View style={styles.employeeCardHeader}>
                    <View style={styles.employeeAvatar}>
                      {employee.profile_picture ? (
                        <Image
                          source={{ uri: employee.profile_picture }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.avatarInitials}>
                          {getInitials(employee.full_name)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName} numberOfLines={1}>
                        {employee.full_name}
                      </Text>
                      <Text style={styles.employeeDesignation} numberOfLines={1}>
                        {employee.designation || employee.role}
                      </Text>
                      <View style={styles.employeeDetails}>
                        <Text style={styles.employeeId}>
                          ID: {employee.employee_id}
                        </Text>
                        <Text style={styles.employeeExperience}>
                          ⏳ {calculateExperience(employee.joining_date)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.employeeCardFooter}>
                    <View style={styles.leavesContainer}>
                      <View style={styles.leaveItem}>
                        <Text style={styles.leaveLabel}>Earned</Text>
                        <Text style={styles.leaveValue}>{employee.earned_leaves}</Text>
                      </View>
                      <View style={styles.leaveDivider} />
                      <View style={styles.leaveItem}>
                        <Text style={styles.leaveLabel}>Sick</Text>
                        <Text style={styles.leaveValue}>{employee.sick_leaves}</Text>
                      </View>
                      <View style={styles.leaveDivider} />
                      <View style={styles.leaveItem}>
                        <Text style={styles.leaveLabel}>Casual</Text>
                        <Text style={styles.leaveValue}>{employee.casual_leaves}</Text>
                      </View>
                    </View>
                    <View style={styles.viewDetailsButton}>
                      <Text style={styles.viewDetailsText}>View Details →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={styles.listFooter}>
                <Text style={styles.listFooterText}>
                  Showing {filteredEmployees.length} of {employees.length} employees
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png' }}
                style={styles.emptyStateImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'No employees found' : 'No employees'}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'No employees are currently assigned under your management'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={['#1e1b4b']}
        tintColor="#1e1b4b"
      />
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

  const getMonthName = (month: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
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

    const record = attendanceReport.find(r => r.date === dateStr);

    if (record) {
      return record.attendance_status;
    }

    return null;
  };

  const getDateColor = (status: string | null) => {
    switch (status) {
      case 'present': return '#10b981';      // Green
      case 'leave': return '#f59e0b';        // Yellow
      case 'wfh': return '#a855f7';          // Purple
      case 'holiday': return '#3b82f6';      // Blue
      case 'weekend': return '#f3f4f6';      // Gray for weekends
      case 'absent': return '#ef4444';       // Red
      case 'pending': return '#f3f4f6';      // Light gray for pending
      default: return '#f3f4f6';             // Default light gray
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
      const shouldShowText = !['pending'].includes(status || '');

      days.push(
        <View key={day} style={styles.calendarDay}>
          <View style={[
            styles.dayCircle,
            { backgroundColor: getDateColor(status) },
            isToday && styles.todayCircle,
            !shouldShowText && { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e5e7eb' }
          ]}>
            <Text style={[
              styles.dayText,
              (status === 'present' || status === 'leave' || status === 'wfh' ||
                status === 'holiday' || status === 'absent') && styles.dayTextActive,
              (status === 'weekend' || status === 'pending') && styles.dayTextInactive
            ]}>
              {day}
            </Text>
          </View>
        </View>
      );
    }

    return days;
  };

  const calculateSummary = () => {
    if (!attendanceReport || attendanceReport.length === 0) {
      return {
        present: 0,
        wfh: 0,
        leave: 0,
        absent: 0,
        holidays: 0,
        pending: 0,
        weekends: 0
      };
    }

    return {
      present: attendanceReport.filter(r => r.attendance_status === 'present').length,
      wfh: attendanceReport.filter(r => r.attendance_status === 'wfh').length,
      leave: attendanceReport.filter(r => r.attendance_status === 'leave').length,
      absent: attendanceReport.filter(r => r.attendance_status === 'absent').length,
      holidays: attendanceReport.filter(r => r.attendance_status === 'holiday').length,
      pending: attendanceReport.filter(r => r.attendance_status === 'pending').length,
      weekends: attendanceReport.filter(r => r.attendance_status === 'weekend').length
    };
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeAvatarLarge}>
          {employee.profile_picture ? (
            <Image
              source={{ uri: employee.profile_picture }}
              style={styles.avatarImageLarge}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarInitialsLarge}>
              {getInitials(employee.first_name, employee.last_name)}
            </Text>
          )}
        </View>
        <View style={styles.employeeHeaderInfo}>
          <Text style={styles.employeeNameLarge}>{employee.full_name}</Text>
          <Text style={styles.employeeDesignationLarge}>
            {employee.designation || employee.role}
          </Text>
          <Text style={styles.employeeIdLarge}>ID: {employee.employee_id}</Text>
        </View>
      </View>

      {employeeDetails && (
        <>
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{employee.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{employee.phone_number}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Joining Date</Text>
                <Text style={styles.infoValue}>
                  {formatDate(employee.joining_date)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Experience</Text>
                <Text style={styles.infoValue}>
                  {calculateExperience(employee.joining_date)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Leave Balance</Text>
            <View style={styles.leaveBalanceContainer}>
              <View style={[styles.leaveBalanceCard, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.leaveBalanceTitle}>Earned Leaves</Text>
                <Text style={[styles.leaveBalanceValue, { color: '#065F46' }]}>
                  {employeeDetails.earned_leaves}
                </Text>
              </View>
              <View style={[styles.leaveBalanceCard, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.leaveBalanceTitle}>Sick Leaves</Text>
                <Text style={[styles.leaveBalanceValue, { color: '#991B1B' }]}>
                  {employeeDetails.sick_leaves}
                </Text>
              </View>
              <View style={[styles.leaveBalanceCard, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.leaveBalanceTitle}>Casual Leaves</Text>
                <Text style={[styles.leaveBalanceValue, { color: '#92400E' }]}>
                  {employeeDetails.casual_leaves}
                </Text>
              </View>
            </View>
          </View>

          {employeeDetails.assigned_assets && employeeDetails.assigned_assets.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Assigned Assets ({employeeDetails.total_assigned_assets})</Text>
              {employeeDetails.assigned_assets.map((asset: any, index: number) => (
                <View key={index} style={styles.assetCard}>
                  <Text style={styles.assetName}>{asset.asset.name}</Text>
                  <Text style={styles.assetDetails}>
                    Type: {asset.asset.type} • Serial: {asset.asset.serial_number}
                  </Text>
                  <Text style={styles.assetAssignedDate}>
                    Assigned on: {formatDate(asset.assigned_at)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1e1b4b" />
        </View>
      )}
    </ScrollView>
  );

  const renderAttendanceTab = () => {
    const summary = calculateSummary();

    return (
      <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthYear}>
              {getMonthName(selectedMonth)} {selectedYear}
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
              <Text style={styles.legendText}>WFH</Text>
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

        <View style={styles.downloadSection}>
          <TouchableOpacity
            style={styles.downloadButtonNew}
            onPress={handleDownloadReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.downloadButtonIcon}>📥</Text>
                <Text style={styles.downloadButtonTextNew}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderLeavesTab = () => (
    <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
      {employeeDetails?.leaves && employeeDetails.leaves.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Leave Requests</Text>
          {employeeDetails.leaves.map((leave: any, index: number) => (
            <View key={index} style={styles.leaveCard}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveType}>{leave.leave_type}</Text>
                <View style={[
                  styles.leaveStatusBadge,
                  {
                    backgroundColor:
                      leave.status === 'approved_by_manager' ? '#10b981' :
                        leave.status === 'rejected' ? '#ef4444' :
                          '#f59e0b'
                  }
                ]}>
                  <Text style={styles.leaveStatusText}>
                    {leave.status.replaceAll('_', ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.leaveDates}>
                📅 {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                {leave.total_number_of_days && ` (${leave.total_number_of_days} day${leave.total_number_of_days > 1 ? 's' : ''})`}
              </Text>

              <Text style={styles.leaveReason}>
                {leave.reject_reason}
              </Text>

              {leave.status === 'pending' && (
                <View style={styles.leaveActions}>
                  <TouchableOpacity
                    style={[styles.leaveActionButton, { backgroundColor: '#10b981' }]}
                    onPress={() => handleApproveLeave(leave.id)}
                  >
                    <Text style={styles.leaveActionText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.leaveActionButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => handleRejectLeave(leave.id)}
                  >
                    <Text style={styles.leaveActionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {leave.manager_comment && (
                <Text style={styles.managerComment}>
                  <Text style={styles.commentLabel}>Manager Comment: </Text>
                  {leave.manager_comment}
                </Text>
              )}
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyLeaves}>
          <Text style={styles.emptyLeavesText}>No leave requests found</Text>
        </View>
      )}
    </ScrollView>
  );

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
      return `${adjustedYears}yr${adjustedYears > 1 ? 's' : ''} ${adjustedMonths > 0 ? `${adjustedMonths}mo` : ''}`;
    }
    return `${adjustedMonths}mo`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" translucent={false} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {employee.full_name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <View style={styles.tabNavigation}>
        {[
          { key: 'overview' as const, label: 'Overview' },
          { key: 'attendance' as const, label: 'Attendance' },
          { key: 'leaves' as const, label: 'Leaves' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
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

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'attendance' && renderAttendanceTab()}
          {activeTab === 'leaves' && renderLeavesTab()}
        </View>
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRejectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Reject Leave</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejecting this leave:</Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#9ca3af"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectionModalVisible(false);
                  setRejectionReason('');
                  setSelectedLeaveId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitRejection}
                disabled={!rejectionReason.trim()}
              >
                <Text style={styles.submitButtonText}>Reject Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1e1b4b" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  safeArea: {
    backgroundColor: '#1e1b4b',
  },
  scrollContainer: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e1b4b',
    marginTop: 30,
  },
  backButton: {
    padding: 8,
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
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 44,
  },

  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 14,
    minHeight: 48,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  searchHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },

  employeesList: {
    marginTop: 8,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  employeeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  employeeDesignation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  employeeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeId: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 12,
  },
  employeeExperience: {
    fontSize: 12,
    color: '#6b7280',
  },
  employeeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  leavesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaveItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  leaveLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  leaveValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  leaveDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
  },
  viewDetailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  errorText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyStateImage: {
    width: 120,
    height: 120,
    opacity: 0.5,
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  listFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  listFooterText: {
    fontSize: 12,
    color: '#6b7280',
  },

  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    marginTop: -16,
    zIndex: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#1e1b4b',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1e1b4b',
    fontWeight: '600',
  },

  detailsContent: {
    flex: 1,
  },

  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  employeeAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitialsLarge: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  employeeHeaderInfo: {
    flex: 1,
  },
  employeeNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  employeeDesignationLarge: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  employeeIdLarge: {
    fontSize: 14,
    color: '#6b7280',
  },

  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoGrid: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
  },

  leaveBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  leaveBalanceCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  leaveBalanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
    textAlign: 'center',
  },
  leaveBalanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },

  assetCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  assetDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  assetAssignedDate: {
    fontSize: 12,
    color: '#6b7280',
  },

  calendarCard: {
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

  downloadSection: {
    marginTop: 8,
  },
  downloadButtonNew: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  downloadButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  downloadButtonTextNew: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  leaveCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  leaveStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  leaveStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leaveDates: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  leaveReason: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
    lineHeight: 20,
  },
  leaveActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  leaveActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  leaveActionText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  managerComment: {
    fontSize: 14,
    color: '#111827',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontStyle: 'italic',
  },
  commentLabel: {
    fontWeight: '600',
  },

  emptyLeaves: {
    padding: 40,
    alignItems: 'center',
  },
  emptyLeavesText: {
    fontSize: 14,
    color: '#6b7280',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    marginBottom: 24,
    backgroundColor: '#f9fafb',
  },
  
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  
  submitButton: {
    backgroundColor: '#ef4444',
  },
  
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default EmployeeManagement;