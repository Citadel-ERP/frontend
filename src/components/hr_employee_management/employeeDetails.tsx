// hr_employee_management/employeeDetails.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Header } from './header';
import { TabNavigation } from './tabNavigation';
import { Overview } from './overview';
import { Attendance } from './attendance';
import { Leaves } from './leaves';
import { EmployeeDetailsProps, ActiveTab, LeaveRequest } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';

const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employee, onBack, token }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
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
      const response = await fetch(`${BACKEND_URL}/hr_manager/getEmployee`, {
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
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      
      const response = await fetch(`${BACKEND_URL}/hr_manager/attendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceReport(data.attendance_records || []);
      }
    } catch (error) {
      console.error('Error fetching attendance report:', error);
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
              const response = await fetch(`${BACKEND_URL}/hr_manager/approveLeave`, {
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
      const response = await fetch(`${BACKEND_URL}/hr_manager/rejectLeave`, {
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

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            employee={employee}
            employeeDetails={employeeDetails}
            token={token}
            onRefresh={fetchEmployeeDetails}
          />
        );
      case 'attendance':
        return (
          <Attendance
            employee={employee}
            attendanceReport={attendanceReport}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            token={token}
          />
        );
      case 'leaves':
        return (
          <Leaves
            employee={employee}
            leaves={employeeDetails?.leaves || []}
            onApproveLeave={handleApproveLeave}
            onRejectLeave={handleRejectLeave}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />

      <Header
        title={employee.full_name}
        subtitle={employee.designation || employee.role}
        onBack={onBack}
        onRefresh={fetchEmployeeDetails}
        showRefresh={true}
        variant="details"
      />

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {renderActiveTab()}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
        </View>
      )}

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

export default EmployeeDetails;