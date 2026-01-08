import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
  Alert
} from 'react-native';
const TOKEN_2_KEY = 'token_2';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';

// Theme colors matching your app
const colors = {
  primary: '#f59e0b',
  secondary: '#1e1b4b',
  white: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6b7280',
  background: '#f3f4f6',
  backgroundSecondary: '#F5F5F5',
  border: '#e5e7eb',
  success: '#10b981',
  error: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20 };
const borderRadius = { sm: 8, md: 12, lg: 16, xl: 20 };

interface LeaveApplication {
  id: number;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  status: string;
  approved_by?: any;
  approved_at?: string;
  rejected_at?: string;
  total_number_of_days?: number;
  is_sandwich?: boolean;
  comment?: string;
  user?: {
    full_name: string;
    employee_id: string;
    email: string;
    designation?: string;
  };
}

interface LeaveInfoScreenProps {
  leave: LeaveApplication;
  onBack: () => void;
  baseUrl: string;
  token: string;
}

const LeaveInfoScreen: React.FC<LeaveInfoScreenProps> = ({ leave, onBack, baseUrl, token }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${displayHours}:${displayMinutes} ${ampm}`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      case 'pending':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✓';
      case 'rejected':
        return '✕';
      case 'pending':
        return '⏳';
      default:
        return '•';
    }
  };

  const formatLeaveType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getLeaveTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('sick')) return '🤒';
    if (lowerType.includes('casual')) return '☀️';
    if (lowerType.includes('earned')) return '⭐';
    return '📋';
  };

  const openCancelModal = () => {
    setShowCancelModal(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const closeCancelModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCancelModal(false);
    });
  };

  const handleCancelLeave = async () => {
    setIsCancelling(true);

    try {
      // Fetch token directly from AsyncStorage
      const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);

      if (!storedToken) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        setIsCancelling(false);
        return;
      }
      baseUrl  = BACKEND_URL
      console.log("Cancel Leave Request:", { baseUrl, token: storedToken, leave_id: leave.id });
      const response = await fetch(`${baseUrl}/core/cancelLeave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: storedToken,
          leave_id: leave.id,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Leave request has been cancelled.');
        setIsCancelling(false);
        onBack();
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setIsCancelling(false);
        Alert.alert('Error', errorData.message || 'Failed to cancel leave. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling leave:', error);
      setIsCancelling(false);
      Alert.alert('Error', 'Failed to cancel leave. Please try again.');
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" translucent={false} />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header inside ScrollView */}
        <View style={[styles.header, styles.headerBanner]}>
          <Image
            source={require('../../assets/attendance_bg.jpg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay} />
          <View style={[styles.headerContent, { marginTop: Platform.OS === 'ios' ? 20 : 0 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.logoText}>CITADEL</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>Leave Details</Text>
          </View>
        </View>

        <View style={styles.contentPadding}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusBadgeContainer}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusBadgeColor(leave.status) }
              ]}>
                <Text style={styles.statusIcon}>{getStatusIcon(leave.status)}</Text>
                <Text style={styles.statusText}>
                  {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.leaveTypeHeader}>
              <Text style={styles.leaveTypeIcon}>{getLeaveTypeIcon(leave.leave_type)}</Text>
              <Text style={styles.leaveTypeTitle}>{formatLeaveType(leave.leave_type)} Leave</Text>
            </View>

            <View style={styles.dateRangeContainer}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>From</Text>
                <Text style={styles.dateValue}>{formatDate(leave.start_date)}</Text>
              </View>
              <View style={styles.dateDivider}>
                <Text style={styles.dateDividerText}>→</Text>
              </View>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>To</Text>
                <Text style={styles.dateValue}>{formatDate(leave.end_date)}</Text>
              </View>
            </View>

            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                📅 {leave.total_number_of_days || calculateDuration(leave.start_date, leave.end_date)} {' '}
                {(leave.total_number_of_days || calculateDuration(leave.start_date, leave.end_date)) === 1 ? 'day' : 'days'}
              </Text>
            </View>

            {/* Cancel Leave Button - Only show if status is pending */}
            {leave.status === 'pending' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={openCancelModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>✕ Cancel Leave Request</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reason Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitleAlt}>Reason for Leave</Text>
            <View style={styles.card}>
              <Text style={styles.reasonText}>{leave.reason}</Text>
            </View>
          </View>

          {/* Leave Information Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitleAlt}>Leave Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Leave Type</Text>
                <Text style={styles.infoValue}>{formatLeaveType(leave.leave_type)}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>
                  {leave.total_number_of_days || calculateDuration(leave.start_date, leave.end_date)} days
                </Text>
              </View>
              {leave.is_sandwich !== undefined && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Sandwich Leave</Text>
                  <Text style={[styles.infoValue, { color: leave.is_sandwich ? colors.error : colors.success }]}>
                    {leave.is_sandwich ? 'Yes' : 'No'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Approval/Rejection Details */}
          {(leave.status === 'approved' || leave.status === 'rejected') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitleAlt}>
                {leave.status === 'approved' ? 'Approval Details' : 'Rejection Details'}
              </Text>
              <View style={styles.card}>
                {leave.approved_by && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {leave.status === 'approved' ? 'Approved by' : 'Rejected by'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {leave.approved_by?.first_name || `User ID: ${leave.approved_by}`}
                    </Text>
                  </View>
                )}
                {(leave.approved_at || leave.rejected_at) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {leave.status === 'approved' ? 'Approved on' : 'Rejected on'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(leave.approved_at || leave.rejected_at || '')}
                    </Text>
                  </View>
                )}
                {leave.comment && (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>
                      {leave.status === 'approved' ? 'Comment' : 'Rejection Reason'}
                    </Text>
                    <View style={[
                      styles.commentBox,
                      {
                        borderLeftColor: leave.status === 'approved' ? colors.success : colors.error,
                        backgroundColor: leave.status === 'approved' ? colors.success + '10' : colors.error + '10'
                      }
                    ]}>
                      <Text style={styles.commentText}>{leave.comment}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Employee Information */}
          {leave.user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitleAlt}>Employee Details</Text>
              <View style={styles.card}>
                <View style={styles.employeeHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {leave.user.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{leave.user.full_name}</Text>
                    {leave.user.designation && (
                      <Text style={styles.employeeDesignation}>{leave.user.designation}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.employeeDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Employee ID</Text>
                    <Text style={styles.detailValue}>{leave.user.employee_id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{leave.user.email}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeCancelModal}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>⚠️</Text>
            </View>

            <Text style={styles.modalTitle}>Cancel Leave Request?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this leave request? This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={closeCancelModal}
                disabled={isCancelling}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextSecondary}>No, Keep It</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCancelLeave}
                disabled={isCancelling}
                activeOpacity={0.7}
              >
                {isCancelling ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary,
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 30,
    width: '96%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerBanner: {
    height: 250,
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
    opacity: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 32,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusIcon: {
    fontSize: 16,
    color: colors.white,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
  },
  leaveTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  leaveTypeIcon: {
    fontSize: 24,
  },
  leaveTypeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  dateDivider: {
    paddingHorizontal: 8,
  },
  dateDividerText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: colors.success + '15',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  durationText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reasonText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  commentContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  commentLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  commentBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  commentText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  employeeDesignation: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  employeeDetails: {
    gap: 0,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center'
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: colors.white,
    fontSize: 14,
    marginLeft: 2,
  },
  sectionTitleAlt: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalIconText: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  modalButtonPrimary: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modalButtonTextPrimary: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modalButtonTextSecondary: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default LeaveInfoScreen;