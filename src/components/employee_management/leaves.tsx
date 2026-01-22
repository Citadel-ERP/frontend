import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee, LeaveRequest } from './types';
import { WHATSAPP_COLORS, formatDate } from './constants';
import { styles } from './styles';

interface LeavesProps {
  employee: Employee;
  leaves: LeaveRequest[];
  onApproveLeave: (leaveId: string) => Promise<void> | void;
  onRejectLeave: (leaveId: string) => Promise<void> | void;
}

export const Leaves: React.FC<LeavesProps> = ({
  employee,
  leaves,
  onApproveLeave,
  onRejectLeave,
}) => {
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  // Reset processing state when leaves array changes (after successful update)
  useEffect(() => {
    // If the processingLeaveId is no longer in the leaves array or its status changed,
    // reset the processing state
    if (processingLeaveId) {
      const currentLeave = leaves.find(leave => leave.id === processingLeaveId);
      if (!currentLeave || 
          (actionType === 'approve' && currentLeave.status === 'approved_by_manager') ||
          (actionType === 'reject' && currentLeave.status === 'rejected')) {
        setProcessingLeaveId(null);
        setActionType(null);
      }
    }
  }, [leaves, processingLeaveId, actionType]);

  const handleApprove = async (leaveId: string) => {
    setProcessingLeaveId(leaveId);
    setActionType('approve');
    try {
      await onApproveLeave(leaveId);
    } catch (error) {
      // Reset on error
      setProcessingLeaveId(null);
      setActionType(null);
      throw error; // Re-throw so parent can handle if needed
    }
  };

  const handleReject = async (leaveId: string) => {
    setProcessingLeaveId(leaveId);
    setActionType('reject');
    try {
      await onRejectLeave(leaveId);
    } catch (error) {
      // Reset on error
      setProcessingLeaveId(null);
      setActionType(null);
      throw error;
    }
  };

  const isProcessing = (leaveId: string) => processingLeaveId === leaveId;

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
      
      {leaves.map((leave, index) => {
        const processing = isProcessing(leave.id);
        
        return (
          <View key={leave.id} style={styles.leaveCard}>
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
                  {processing && actionType === 'approve' ? 'Approving...' :
                   processing && actionType === 'reject' ? 'Rejecting...' :
                   leave.status === 'approved_by_manager' ? 'Approved' : 
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
                  style={[
                    styles.leaveActionButton, 
                    { backgroundColor: '#4CAF50' },
                    processing && styles.disabledButton
                  ]}
                  onPress={() => handleApprove(leave.id)}
                  activeOpacity={processing ? 1 : 0.8}
                  disabled={processing}
                >
                  {processing && actionType === 'approve' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.leaveActionText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.leaveActionButton, 
                    { backgroundColor: '#F44336' },
                    processing && styles.disabledButton
                  ]}
                  onPress={() => handleReject(leave.id)}
                  activeOpacity={processing ? 1 : 0.8}
                  disabled={processing}
                >
                  {processing && actionType === 'reject' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="close" size={18} color="#FFFFFF" />
                      <Text style={styles.leaveActionText}>Reject</Text>
                    </>
                  )}
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
        );
      })}
    </ScrollView>
  );
};