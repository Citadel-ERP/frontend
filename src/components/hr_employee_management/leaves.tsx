// hr_employee_management/leaves.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
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

  // ── Reject-reason modal state ─────────────────────────────────────────────
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [pendingRejectLeaveId, setPendingRejectLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (processingLeaveId) {
      const currentLeave = leaves.find(leave => leave.id === processingLeaveId);
      if (
        !currentLeave ||
        (actionType === 'approve' && currentLeave.status === 'approved') ||
        (actionType === 'reject' && currentLeave.status === 'rejected')
      ) {
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
      setProcessingLeaveId(null);
      setActionType(null);
      throw error;
    }
  };

  // ── Step 1: open the reason modal instead of firing immediately ───────────
  const openRejectModal = (leaveId: string) => {
    setPendingRejectLeaveId(leaveId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  // ── Step 2: user confirms inside modal ────────────────────────────────────
  const handleRejectConfirm = async () => {
    if (!pendingRejectLeaveId) return;
    const leaveId = pendingRejectLeaveId;

    // Dismiss keyboard & modal before starting the async action
    Keyboard.dismiss();
    setRejectModalVisible(false);
    setPendingRejectLeaveId(null);
    setRejectReason('');

    setProcessingLeaveId(leaveId);
    setActionType('reject');
    try {
      await onRejectLeave(leaveId);
    } catch (error) {
      setProcessingLeaveId(null);
      setActionType(null);
      throw error;
    }
  };

  const handleRejectCancel = () => {
    Keyboard.dismiss();
    setRejectModalVisible(false);
    setPendingRejectLeaveId(null);
    setRejectReason('');
  };

  const isProcessing = (leaveId: string) => processingLeaveId === leaveId;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#2E7D32';
      case 'rejected': return '#D32F2F';
      case 'pending':  return '#EF6C00';
      default:         return '#9E9E9E';
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'approved': return '#E8F5E9';
      case 'rejected': return '#FFEBEE';
      case 'pending':  return '#FFF3E0';
      default:         return '#F5F5F5';
    }
  };

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
    <>
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

        {leaves.map((leave) => {
          const processing = isProcessing(leave.id);

          return (
            <View key={leave.id} style={styles.leaveCard}>
              <View style={styles.leaveCardHeader}>
                <View style={styles.leaveHeaderInfo}>
                  <Text style={styles.leaveType}>{leave.leave_type}</Text>
                  <Text style={styles.leaveDates}>
                    {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    {leave.total_number_of_days &&
                      ` (${leave.total_number_of_days} day${leave.total_number_of_days > 1 ? 's' : ''})`}
                  </Text>
                </View>

                <View style={[
                  styles.leaveStatus,
                  { backgroundColor: getStatusBackgroundColor(leave.status) },
                ]}>
                  <Text style={[
                    styles.leaveStatusText,
                    { color: getStatusColor(leave.status) },
                  ]}>
                    {processing && actionType === 'approve' ? 'Approving...' :
                     processing && actionType === 'reject'  ? 'Rejecting...' :
                     leave.status === 'rejected' ? 'Rejected' :
                     leave.status === 'approved' ? 'Approved' : 'Pending'}
                  </Text>
                </View>
              </View>

              {leave.reason && (
                <Text style={styles.leaveReason}>
                  <Text style={styles.leaveReasonLabel}>Reason: </Text>
                  {leave.reason}
                </Text>
              )}

              {/* PENDING — Approve + Reject */}
              {leave.status === 'pending' && (
                <View style={styles.leaveActions}>
                  <TouchableOpacity
                    style={[
                      styles.leaveActionButton,
                      { backgroundColor: '#4CAF50' },
                      processing && styles.disabledButton,
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
                      processing && styles.disabledButton,
                    ]}
                    onPress={() => openRejectModal(leave.id)}
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

              {/* APPROVED — Cancel Approval */}
              {leave.status === 'approved' && (
                <View style={styles.leaveActions}>
                  <TouchableOpacity
                    style={[
                      styles.leaveActionButton,
                      { backgroundColor: '#FF9800' },
                      processing && styles.disabledButton,
                    ]}
                    onPress={() => openRejectModal(leave.id)}
                    activeOpacity={processing ? 1 : 0.8}
                    disabled={processing}
                  >
                    {processing && actionType === 'reject' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.leaveActionText}>Cancel Approval</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* REJECTED — Approve */}
              {leave.status === 'rejected' && (
                <View style={styles.leaveActions}>
                  <TouchableOpacity
                    style={[
                      styles.leaveActionButton,
                      { backgroundColor: '#4CAF50' },
                      processing && styles.disabledButton,
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
                </View>
              )}

              {leave.manager_comment && (
                <View style={styles.managerComment}>
                  <Text style={styles.managerCommentLabel}>Manager Comment: </Text>
                  <Text style={styles.managerCommentText}>{leave.manager_comment}</Text>
                </View>
              )}

              {leave.admin_comment && (
                <View style={styles.managerComment}>
                  <Text style={styles.managerCommentLabel}>Admin Comment: </Text>
                  <Text style={styles.managerCommentText}>{leave.admin_comment}</Text>
                </View>
              )}

              {leave.reject_reason && (
                <View style={styles.managerComment}>
                  <Text style={styles.managerCommentLabel}>Rejection Reason: </Text>
                  <Text style={styles.managerCommentText}>{leave.reject_reason}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ── Reject Reason Modal ─────────────────────────────────────────────
       *
       *  iOS keyboard fix:
       *  KeyboardAvoidingView with behavior="padding" sits INSIDE the modal's
       *  semi-transparent backdrop. On iOS this shifts only the white card
       *  (not the dimmed overlay) upward by exactly the keyboard height, so
       *  the Confirm/Cancel buttons always stay above the keyboard.
       *
       *  On Android the keyboard already pushes the window by default
       *  (windowSoftInputMode=adjustResize / adjustPan), so we use
       *  behavior="height" which is a no-op unless the window resizing mode
       *  is overridden, keeping Android behaviour identical to before.
       *
       *  TouchableWithoutFeedback around the backdrop lets users tap outside
       *  to dismiss — consistent with common modal UX and harmless on both
       *  platforms.
       */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleRejectCancel}
      >
        {/* Backdrop — tapping it dismisses without rejecting */}
        <TouchableWithoutFeedback onPress={handleRejectCancel}>
          <View style={rejectModalStyles.backdrop}>
            {/* Stop backdrop tap propagating into the card */}
            <TouchableWithoutFeedback onPress={() => {}}>
              {/*
               * KeyboardAvoidingView is the ONLY change needed for the
               * iOS keyboard-overlap bug.
               *
               * • iOS   → behavior="padding": adds bottom padding equal to
               *           the keyboard height, nudging the card up.
               * • Android → behavior="height": shrinks the view height so
               *           nothing shifts unexpectedly on Android.
               */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={rejectModalStyles.kavWrapper}
              >
                <View style={rejectModalStyles.card}>
                  {/* Header */}
                  <View style={rejectModalStyles.cardHeader}>
                    <Ionicons name="close-circle-outline" size={24} color="#D32F2F" />
                    <Text style={rejectModalStyles.cardTitle}>Reject Leave</Text>
                  </View>

                  {/* Reason input */}
                  <Text style={rejectModalStyles.inputLabel}>
                    Reason for rejection
                    <Text style={rejectModalStyles.optionalTag}> (optional)</Text>
                  </Text>
                  <TextInput
                    style={rejectModalStyles.reasonInput}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    placeholder="Enter reason…"
                    placeholderTextColor="#9E9E9E"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit
                  />

                  {/* Action buttons — these are what was previously hidden */}
                  <View style={rejectModalStyles.buttonRow}>
                    <TouchableOpacity
                      style={[rejectModalStyles.button, rejectModalStyles.cancelButton]}
                      onPress={handleRejectCancel}
                      activeOpacity={0.8}
                    >
                      <Text style={rejectModalStyles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[rejectModalStyles.button, rejectModalStyles.confirmButton]}
                      onPress={handleRejectConfirm}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={rejectModalStyles.confirmButtonText}>Confirm Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

// ── Reject modal styles — self-contained, no changes to existing `styles` ────

const rejectModalStyles = {
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,  // sheet slides up from bottom — keeps card close to keyboard
  },
  /**
   * kavWrapper must NOT have flex:1 here.
   * If it stretches to fill the screen the padding calculation becomes wrong.
   * Letting it size to its content means KeyboardAvoidingView only adds the
   * precise padding needed to clear the keyboard.
   */
  kavWrapper: {
    width: '100%' as const,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,     // extra bottom breathing room on devices without safe area
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#212121',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#616161',
    marginBottom: 8,
  },
  optionalTag: {
    fontWeight: '400' as const,
    color: '#9E9E9E',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#FAFAFA',
    minHeight: 80,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 13,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#616161',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
};