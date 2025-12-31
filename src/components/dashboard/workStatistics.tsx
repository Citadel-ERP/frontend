import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

interface UserData {
  days_present: number;
  leaves_applied: number;
  holidays: number;
  late_arrivals: number;
}

interface WorkStatisticsProps {
  hoursWorked: number[];
  overtimeHours: number[];
  userData: UserData | null;
  theme: any;
  currentColors: any;
}

const WorkStatistics: React.FC<WorkStatisticsProps> = ({
  hoursWorked,
  overtimeHours,
  userData,
  theme,
  currentColors,
}) => {
  // Updated chart data with proper day alignment
  const getChartData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Pad arrays to ensure we have 7 days
    const paddedHoursWorked = [...hoursWorked];
    while (paddedHoursWorked.length < 7) {
      paddedHoursWorked.push(0);
    }
    const paddedOvertime = [...overtimeHours];
    while (paddedOvertime.length < 7) {
      paddedOvertime.push(0);
    }
    return days.map((day, index) => ({
      day,
      hours: paddedHoursWorked[index] === 0 ? 0.1 : paddedHoursWorked[index],
      target: paddedOvertime[index] === 0 ? 0.1 : paddedOvertime[index],
    }));
  };

  const chartData = getChartData();

  // Render chart
  const renderChart = () => {
    const maxValue = 10;
    const chartHeight = 100;
    return (
      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const hoursHeight = (item.hours / maxValue) * chartHeight;
          const targetHeight = (item.target / maxValue) * chartHeight;
          return (
            <View key={index} style={[styles.chartBar, { flex: 1 }]}>
              <Text style={[styles.chartDay, { color: theme.textSub, fontSize: 12, textAlign: 'center' }]}>
                {item.day}
              </Text>
              <View style={[styles.barWrapper, { height: chartHeight }]}>
                <View style={[styles.targetBar, {
                  height: targetHeight,
                  backgroundColor: 'rgba(255, 94, 122, 0.5)' // Pink for overtime
                }]} />
                <View style={[styles.hoursBar, {
                  height: hoursHeight,
                  backgroundColor: currentColors.primaryBlue // Blue for hours worked
                }]} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, marginTop: 15 }]}>
      <Text style={[styles.labelSmall, { color: theme.textSub, marginBottom: 10 }]}>WORK STATISTICS</Text>
      <View style={[styles.statsContent, { marginTop: 20 }]}>
        <View style={styles.chartContainer}>
          {renderChart()}
        </View>
        <View style={[styles.statsNumbers, { marginLeft: 20 }]}>
          <Text style={[styles.statsValue, { color: theme.textMain }]}>
            {userData?.days_present || 0}
          </Text>
          <Text style={[styles.statsLabel, { color: theme.textSub, textAlign: 'right' }]}>
            DAYS PRESENT
          </Text>
          <Text style={[styles.statsValue, { color: theme.textMain, marginTop: 15 }]}>
            {userData?.leaves_applied || 0}
          </Text>
          <Text style={[styles.statsLabel, { color: theme.textSub, textAlign: 'right' }]}>
            LEAVES APPLIED
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  labelSmall: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 90,
    alignItems: 'flex-end',
    flex: 1,
  },
  chartBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartDay: {
    marginBottom: 4,
    fontWeight: '500',
  },
  barWrapper: {
    width: 10,
    justifyContent: 'flex-end',
    position: 'relative',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  hoursBar: {
    width: '100%',
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
  },
  targetBar: {
    width: '100%',
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
  },
  statsNumbers: {
    alignItems: 'flex-end',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    fontWeight: '500',
  },
});

export default WorkStatistics;