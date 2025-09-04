// AttendanceTab.tsx - Attendance Tab Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { AttendanceRecord } from './types';
import { formatDate, formatTime, getStatusColor } from './utils';

interface AttendanceTabProps {
  todayAttendance: AttendanceRecord | null;
  attendanceRecords: AttendanceRecord[];
  loading: boolean;
  locationPermission: boolean;
  markAttendance: () => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({
  todayAttendance,
  attendanceRecords,
  loading,
  locationPermission,
  markAttendance,
}) => {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <View style={styles.attendanceCard}>
          {todayAttendance ? (
            <View style={styles.attendanceInfo}>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(todayAttendance.status) }
                ]} />
                <Text style={styles.attendanceStatus}>
                  Status: <Text style={[styles.statusText, { color: getStatusColor(todayAttendance.status) }]}>
                    {todayAttendance.status.replace('_', ' ')}
                  </Text>
                </Text>
              </View>
              {todayAttendance.check_in_time && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Check In:</Text>
                  <Text style={styles.timeValue}>{formatTime(todayAttendance.check_in_time)}</Text>
                </View>
              )}
              {todayAttendance.check_out_time && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Check Out:</Text>
                  <Text style={styles.timeValue}>{formatTime(todayAttendance.check_out_time)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noAttendanceContainer}>
              <View style={styles.noAttendanceIconContainer}>
                <Text style={styles.noAttendanceIcon}>📅</Text>
              </View>
              <Text style={styles.noAttendanceText}>No attendance marked today</Text>
              <TouchableOpacity
                style={styles.markAttendanceButton}
                onPress={markAttendance}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.markAttendanceText}>Mark Attendance</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.autoAttendanceStatus}>
          <Text style={styles.autoAttendanceText}>
            Auto attendance: {locationPermission ? 'Active (10:00-10:30 AM)' : 'Location permission required'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Records</Text>
        <View style={styles.recordsContainer}>
          {attendanceRecords.length > 0 ? (
            attendanceRecords.slice(0, 5).map((record, index) => (
              <View key={index} style={styles.recordItem}>
                <View style={styles.recordLeft}>
                  <View style={[
                    styles.recordStatusDot,
                    { backgroundColor: getStatusColor(record.status) }
                  ]} />
                  <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                </View>
                <Text style={[
                  styles.recordStatus,
                  { color: getStatusColor(record.status) }
                ]}>
                  {record.status.replace('_', ' ')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No attendance records found</Text>
            </View>
          )}
        </View>
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
  attendanceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  attendanceInfo: {
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  attendanceStatus: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '500',
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
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
  noAttendanceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noAttendanceIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  noAttendanceIcon: {
    fontSize: 24,
  },
  noAttendanceText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  markAttendanceButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  markAttendanceText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  autoAttendanceStatus: {
    backgroundColor: colors.info + '20',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  autoAttendanceText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
  recordsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  recordDate: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  recordStatus: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
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

export default AttendanceTab;