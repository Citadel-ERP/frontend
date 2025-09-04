// ReportsTab.tsx - Attendance Reports Component
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
import { monthNames } from './utils';

interface ReportsTabProps {
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;
  onMonthSelect: () => void;
  onYearSelect: () => void;
  onDownloadReport: () => void;
}

const ReportsTab: React.FC<ReportsTabProps> = ({
  selectedMonth,
  selectedYear,
  loading,
  onMonthSelect,
  onYearSelect,
  onDownloadReport,
}) => {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Report</Text>

        <View style={styles.reportCard}>
          <View style={styles.reportFilters}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Month</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={onMonthSelect}
              >
                <Text style={styles.dropdownButtonText}>
                  {monthNames[selectedMonth - 1]}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Year</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={onYearSelect}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedYear}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={onDownloadReport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.downloadText}>Download PDF Report</Text>
            )}
          </TouchableOpacity>
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
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportFilters: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  dropdownButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  downloadButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    ...shadows.sm,
  },
  downloadText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default ReportsTab;