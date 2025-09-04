// LeaveTab.tsx - Leave Management Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { LeaveBalance, LeaveApplication } from './types';
import { formatDate, getStatusBadgeColor } from './utils';

interface LeaveTabProps {
  leaveBalance: LeaveBalance;
  leaveApplications: LeaveApplication[];
  onApplyLeave: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const LeaveTab: React.FC<LeaveTabProps> = ({
  leaveBalance,
  leaveApplications,
  onApplyLeave,
}) => {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Balance</Text>
        <View style={styles.leaveBalanceGrid}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.casual_leaves}</Text>
            <Text style={styles.balanceLabel}>Casual</Text>
            <View style={[styles.balanceIndicator, { backgroundColor: colors.info }]} />
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.sick_leaves}</Text>
            <Text style={styles.balanceLabel}>Sick</Text>
            <View style={[styles.balanceIndicator, { backgroundColor: colors.error }]} />
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceNumber}>{leaveBalance.earned_leaves}</Text>
            <Text style={styles.balanceLabel}>Earned</Text>
            <View style={[styles.balanceIndicator, { backgroundColor: colors.success }]} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.applyLeaveButton}
          onPress={onApplyLeave}
        >
          <Text style={styles.applyLeaveText}>Apply for Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Applications</Text>
        {leaveApplications.length > 0 ? (
          leaveApplications.map((application) => (
            <View key={application.id} style={styles.leaveItem}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveDateRange}>
                  {formatDate(application.start_date)} - {formatDate(application.end_date)}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBadgeColor(application.status) }
                ]}>
                  <Text style={styles.statusBadgeText}>{application.status}</Text>
                </View>
              </View>
              <Text style={styles.leaveType}>{application.leave_type} Leave</Text>
              <Text style={styles.leaveReason}>{application.leave_reason}</Text>
              {application.rejection_reason && (
                <View style={styles.rejectionContainer}>
                  <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                  <Text style={styles.rejectionReason}>{application.rejection_reason}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No leave applications found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  leaveBalanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  balanceCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  balanceNumber: {
    fontSize: Math.min(screenWidth * 0.08, 32),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  applyLeaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.sm,
  },
  applyLeaveText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  leaveItem: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  leaveDateRange: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 70,
    alignItems: 'center',
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
    lineHeight: 20,
  },
  rejectionContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rejectionLabel: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  rejectionReason: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default LeaveTab;