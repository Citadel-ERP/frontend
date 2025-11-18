import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import { AttendanceRecord } from './types';

interface AttendanceTabProps {
  loading: boolean;
  todayAttendance: AttendanceRecord | null;
  attendanceRecords: AttendanceRecord[];
  onMarkAttendance: () => void;
  onCheckout: () => void;
  isDriver: boolean;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({
  loading,
  todayAttendance,
  attendanceRecords,
  onMarkAttendance,
  onCheckout,
  isDriver,
}) => {
  const canCheckout = isDriver && todayAttendance && todayAttendance.check_in_time && !todayAttendance.check_out_time;
  const hasCheckedOut = todayAttendance && todayAttendance.check_out_time;

  return (
    <View style={styles.container}>
      {/* Today's Status Card */}
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>Today's Attendance</Text>
        
        {todayAttendance ? (
          <View style={styles.attendanceInfo}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={styles.statusText}>{todayAttendance.status}</Text>
            </View>
            
            {todayAttendance.check_in_time && (
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Check-in:</Text>
                <Text style={styles.timeValue}>{todayAttendance.check_in_time}</Text>
              </View>
            )}
            
            {todayAttendance.check_out_time && (
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Check-out:</Text>
                <Text style={styles.timeValue}>{todayAttendance.check_out_time}</Text>
              </View>
            )}

            {/* Checkout Button for Drivers */}
            {canCheckout && (
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={onCheckout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.checkoutButtonText}>Mark Checkout</Text>
                )}
              </TouchableOpacity>
            )}

            {hasCheckedOut && (
              <View style={styles.checkedOutBadge}>
                <Text style={styles.checkedOutText}>✓ Checked Out</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noAttendanceContainer}>
            <Text style={styles.noAttendanceText}>No attendance marked yet</Text>
            <TouchableOpacity
              style={styles.markButton}
              onPress={onMarkAttendance}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.markButtonText}>Mark Attendance</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recent Records */}
      <View style={styles.recordsSection}>
        <Text style={styles.sectionTitle}>Recent Records</Text>
        
        {attendanceRecords.length > 0 ? (
          <View style={styles.recordsList}>
            {attendanceRecords.slice(0, 10).map((record, index) => (
              <View key={index} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordDate}>{record.date}</Text>
                  <View style={[
                    styles.recordStatus,
                    { backgroundColor: record.status === 'Present' ? colors.successLight : colors.errorLight }
                  ]}>
                    <Text style={[
                      styles.recordStatusText,
                      { color: record.status === 'Present' ? colors.success : colors.error }
                    ]}>
                      {record.status}
                    </Text>
                  </View>
                </View>
                
                {(record.check_in_time || record.check_out_time) && (
                  <View style={styles.recordTimes}>
                    {record.check_in_time && (
                      <Text style={styles.recordTime}>In: {record.check_in_time}</Text>
                    )}
                    {record.check_out_time && (
                      <Text style={styles.recordTime}>Out: {record.check_out_time}</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noRecordsText}>No attendance records found</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  todayCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  attendanceInfo: {
    gap: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  checkoutButton: {
    backgroundColor: colors.warning || '#f59e0b',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 44,
  },
  checkoutButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  checkedOutBadge: {
    backgroundColor: colors.successLight || '#d1fae5',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  checkedOutText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.success,
  },
  noAttendanceContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  noAttendanceText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  markButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    minHeight: 44,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  recordsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  recordsList: {
    gap: spacing.md,
  },
  recordCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordDate: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  recordStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  recordStatusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  recordTimes: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  recordTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noRecordsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

export default AttendanceTab;