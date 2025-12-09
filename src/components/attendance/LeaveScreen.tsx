// LeaveScreen.tsx - Modern Leave Management Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import { LeaveBalance, LeaveApplication, LeaveForm } from './types';
import { BACKEND_URL } from '../../config/config';
import LeaveModal from './LeaveModal';
import LeaveInfoScreen from './LeaveInfoScreen';

interface LeaveScreenProps {
  onBack: () => void;
}

const TOKEN_2_KEY = 'token_2';

const LeaveScreen: React.FC<LeaveScreenProps> = ({ onBack }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    casual_leaves: 0,
    sick_leaves: 0,
    earned_leaves: 0
  });
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
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
  const [showLeaveInfo, setShowLeaveInfo] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        if (storedToken) {
          setToken(storedToken);
          await fetchLeaveBalance(storedToken);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    initializeApp();
  }, []);

  const fetchLeaveBalance = async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getLeaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToUse }),
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
      Alert.alert('Error', 'Failed to fetch leave data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchLeaveBalance();
  }, [token]);

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

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

  const handleApplyLeave = () => {
    setIsLeaveModalVisible(true);
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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { backgroundColor: '#10b981', color: '#fff' };
      case 'rejected':
        return { backgroundColor: '#ef4444', color: '#fff' };
      case 'pending':
        return { backgroundColor: '#f59e0b', color: '#fff' };
      default:
        return { backgroundColor: '#6b7280', color: '#fff' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  if (showLeaveInfo && selectedLeave) {
    return (
      <LeaveInfoScreen
        leave={selectedLeave}
        onBack={handleBackFromLeaveInfo}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" translucent={false} />
      
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}><BackIcon/></Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.contentPadding}>
          {/* Leave Balance Section */}
          <View style={styles.balanceSection}>
            <Text style={styles.sectionTitle}>Leave Balance</Text>
            <View style={styles.balanceGrid}>
              <View style={[styles.balanceCard, styles.sickLeaveCard]}>
                <View style={styles.balanceIconContainer}>
                  <Text style={styles.balanceIcon}>🤒</Text>
                </View>
                <Text style={styles.balanceNumber}>{leaveBalance.sick_leaves}</Text>
                <Text style={styles.balanceLabel}>Sick Leaves</Text>
              </View>
              
              <View style={[styles.balanceCard, styles.casualLeaveCard]}>
                <View style={styles.balanceIconContainer}>
                  <Text style={styles.balanceIcon}>☀️</Text>
                </View>
                <Text style={styles.balanceNumber}>{leaveBalance.casual_leaves}</Text>
                <Text style={styles.balanceLabel}>Casual Leaves</Text>
              </View>
              
              <View style={[styles.balanceCard, styles.earnedLeaveCard]}>
                <View style={styles.balanceIconContainer}>
                  <Text style={styles.balanceIcon}>⭐</Text>
                </View>
                <Text style={styles.balanceNumber}>{leaveBalance.earned_leaves}</Text>
                <Text style={styles.balanceLabel}>Earned Leaves</Text>
              </View>
            </View>
          </View>

          {/* Apply Leave Button */}
          <TouchableOpacity 
            style={styles.applyLeaveButton}
            onPress={handleApplyLeave}
          >
            <Text style={styles.applyLeaveButtonText}>Apply for leave</Text>
          </TouchableOpacity>

          {/* Leave Applications Section */}
          {loading && leaveApplications.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#1e1b4b" size="large" />
              <Text style={styles.loadingText}>Loading leave applications...</Text>
            </View>
          ) : leaveApplications.length > 0 ? (
            <View style={styles.applicationsSection}>
              <Text style={styles.sectionTitle}>Recent Applications</Text>
              {leaveApplications.map((leave) => (
                <TouchableOpacity
                  key={leave.id}
                  style={styles.leaveApplicationCard}
                  onPress={() => handleLeavePress(leave)}
                  activeOpacity={0.7}
                >
                  <View style={styles.leaveCardHeader}>
                    <View style={styles.leaveCardLeft}>
                      <Text style={styles.leaveType}>
                        {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave
                      </Text>
                      <Text style={styles.leaveDates}>
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadgeStyle(leave.status).backgroundColor }
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  {leave.total_number_of_days && (
                    <View style={styles.leaveCardFooter}>
                      <Text style={styles.leaveDuration}>
                        📅 {leave.total_number_of_days} {Number(leave.total_number_of_days) === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📋</Text>
              <Text style={styles.emptyStateTitle}>No Leave Applications</Text>
              <Text style={styles.emptyStateText}>
                You haven't applied for any leaves yet.{'\n'}Click "Apply for leave" to get started.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <LeaveModal
        visible={isLeaveModalVisible}
        onClose={handleCloseLeaveModal}
        leaveForm={leaveForm}
        onFormChange={setLeaveForm}
        onSubmit={submitLeaveApplication}
        loading={loading}
        onStartDatePress={() => setShowStartDatePicker(true)}
        onEndDatePress={() => setShowEndDatePicker(true)}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e1b4b',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 44,
  },
  scrollContainer: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
  },
  sickLeaveCard: {
    borderLeftColor: '#10b981',
  },
  casualLeaveCard: {
    borderLeftColor: '#ef4444',
  },
  earnedLeaveCard: {
    borderLeftColor: '#3b82f6',
  },
  balanceIconContainer: {
    marginBottom: 8,
  },
  balanceIcon: {
    fontSize: 24,
  },
  balanceNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  applyLeaveButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyLeaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  applicationsSection: {
    marginBottom: 16,
  },
  leaveApplicationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leaveCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  leaveDates: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  leaveCardFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  leaveDuration: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },backIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: colors.white, transform: [{ rotate: '-45deg' }],
  },
});

export default LeaveScreen;