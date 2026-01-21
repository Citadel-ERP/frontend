import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee, LeaveRequest } from './types';
import { WHATSAPP_COLORS, formatDate } from './constants';
import { styles } from './styles';

interface LeavesProps {
  employee: Employee;
  leaves: LeaveRequest[];
  onApproveLeave: (leaveId: string) => void;
  onRejectLeave: (leaveId: string) => void;
}

export const Leaves: React.FC<LeavesProps> = ({
  employee,
  leaves,
  onApproveLeave,
  onRejectLeave,
}) => {
  if (leaves.length === 0) {
    return (
      <View style={styles.emptyLeaves}>
        <Ionicons name="calendar-outline" size={64} color={WHATSAPP_COLORS.border} />
        <Text style={styles.emptyLeavesTitle}>No leave requests</Text>
        <Text style={styles.emptyLeavesText}>
          {employee.full_name} hasn't submitted any leave requests yet
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.leavesHeader}>
        <Text style={styles.leavesTitle}>Leave Requests</Text>
        <Text style={styles.leavesSubtitle}>
          {leaves.length} request{leaves.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {leaves.map((leave, index) => (
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
                onPress={() => onApproveLeave(leave.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.leaveActionText}>Approve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.leaveActionButton, { backgroundColor: '#F44336' }]}
                onPress={() => onRejectLeave(leave.id)}
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
    </ScrollView>
  );
};