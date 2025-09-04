// LeaveInfoScreen.tsx - Detailed Leave Information Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { LeaveApplication } from './types';
import { formatDate, getStatusBadgeColor, formatDateTime } from './utils';

interface LeaveInfoScreenProps {
  leave: LeaveApplication;
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const LeaveInfoScreen: React.FC<LeaveInfoScreenProps> = ({ leave, onBack }) => {
  const insets = useSafeAreaInsets();

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

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusIcon}>{getStatusIcon(leave.status)}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusBadgeColor(leave.status) }
            ]}>
              <Text style={styles.statusBadgeText}>{leave.status}</Text>
            </View>
          </View>
          <Text style={styles.leaveTypeTitle}>{formatLeaveType(leave.leave_type)} Leave</Text>
          <Text style={styles.dateRange}>
            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
          </Text>
        </View>

        {/* Leave Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Leave Information</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {leave.total_number_of_days || calculateDuration(leave.start_date, leave.end_date)} days
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Leave Type</Text>
              <Text style={styles.infoValue}>{formatLeaveType(leave.leave_type)}</Text>
            </View>
            
            {leave.is_sandwich !== undefined && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Sandwich Leave</Text>
                <Text style={styles.infoValue}>{leave.is_sandwich ? 'Yes' : 'No'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Reason */}
        <View style={styles.reasonSection}>
          <Text style={styles.sectionTitle}>Reason</Text>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonText}>{leave.reason}</Text>
          </View>
        </View>

        {/* Approval Information */}
        {(leave.status === 'approved' || leave.status === 'rejected') && (
          <View style={styles.approvalSection}>
            <Text style={styles.sectionTitle}>
              {leave.status === 'approved' ? 'Approval Details' : 'Rejection Details'}
            </Text>
            
            <View style={styles.approvalCard}>
              {leave.approved_by && (
                <View style={styles.approvalItem}>
                  <Text style={styles.approvalLabel}>
                    {leave.status === 'approved' ? 'Approved by' : 'Rejected by'}
                  </Text>
                  <Text style={styles.approvalValue}>
                    {leave.approved_by?.first_name  || `User ID: ${leave.approved_by}`}
                  </Text>
                </View>
              )}
              
              {leave.approved_at && (
                <View style={styles.approvalItem}>
                  <Text style={styles.approvalLabel}>
                    {leave.status === 'approved' ? 'Approved on' : 'Rejected on'}
                  </Text>
                  <Text style={styles.approvalValue}>
                    {formatDateTime(leave.approved_at)}
                  </Text>
                </View>
              )}

              {leave.rejected_at && (
                <View style={styles.approvalItem}>
                  <Text style={styles.approvalLabel}>Rejected on</Text>
                  <Text style={styles.approvalValue}>
                    {formatDateTime(leave.rejected_at)}
                  </Text>
                </View>
              )}
              
              {leave.comment && (
                <View style={styles.commentSection}>
                  <Text style={styles.commentLabel}>
                    {leave.status === 'approved' ? 'Approval Comment' : 'Rejection Reason'}
                  </Text>
                  <View style={[
                    styles.commentCard,
                    { 
                      borderLeftColor: leave.status === 'approved' ? colors.success : colors.error,
                      backgroundColor: leave.status === 'approved' ? 
                        `${colors.success}10` : `${colors.error}10`
                    }
                  ]}>
                    <Text style={[
                      styles.commentText,
                      { color: leave.status === 'approved' ? colors.success : colors.error }
                    ]}>
                      {leave.comment}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Employee Information */}
        {leave.user && (
          <View style={styles.employeeSection}>
            <Text style={styles.sectionTitle}>Employee Details</Text>
            <View style={styles.employeeCard}>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{leave.user.full_name}</Text>
                <Text style={styles.employeeDetails}>{leave.user.employee_id}</Text>
                <Text style={styles.employeeDetails}>{leave.user.email}</Text>
                {leave.user.designation && (
                  <Text style={styles.employeeDesignation}>{leave.user.designation}</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
    ...shadows.sm,
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statusIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  leaveTypeTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  dateRange: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoGrid: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  reasonSection: {
    marginBottom: spacing.lg,
  },
  reasonCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  approvalSection: {
    marginBottom: spacing.lg,
  },
  approvalCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  approvalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
  },
  approvalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  approvalValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  commentSection: {
    marginTop: spacing.md,
  },
  commentLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  commentCard: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 4,
  },
  commentText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
  employeeSection: {
    marginBottom: spacing.xl,
  },
  employeeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  employeeInfo: {
    alignItems: 'flex-start',
  },
  employeeName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  employeeDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  employeeDesignation: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});

export default LeaveInfoScreen;