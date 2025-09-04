// CalendarTab.tsx - Holiday Calendar Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { Holiday } from './types';
import { formatDate } from './utils';

interface CalendarTabProps {
  holidays: Holiday[];
}

const CalendarTab: React.FC<CalendarTabProps> = ({ holidays }) => {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Holiday Calendar</Text>
        {holidays.length > 0 ? (
          holidays.map((holiday) => (
            <View key={holiday.id} style={styles.holidayItem}>
              <View style={styles.holidayLeft}>
                <View style={styles.holidayDateContainer}>
                  <Text style={styles.holidayDateText}>{formatDate(holiday.date)}</Text>
                </View>
                <View style={styles.holidayDetails}>
                  <Text style={styles.holidayName}>{holiday.name}</Text>
                  <Text style={styles.holidayType}>{holiday.type}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No holidays found</Text>
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
  holidayItem: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holidayDateContainer: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  holidayDateText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  holidayDetails: {
    flex: 1,
  },
  holidayName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  holidayType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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

export default CalendarTab;