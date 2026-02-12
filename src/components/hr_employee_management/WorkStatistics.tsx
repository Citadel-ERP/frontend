// hr_employee_management/workStatistics.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from './header';
import WorkStatisticsDownloadModal from './WorkStatisticsDownloadModal';
import { WHATSAPP_COLORS } from './constants';
import { BACKEND_URL } from '../../config/config';

interface WorkStatisticsProps {
  token: string;
  onBack: () => void;
}

interface UserStat {
  employee_id: string;
  name: string;
  designation: string;
  has_logged_in: boolean;
  is_late_login: boolean;
  login_time: string | null;
  login_location: string | null;
  has_logged_out: boolean;
  logout_time: string | null;
  logout_location: string | null;
}

interface SummaryData {
  total_users: number;
  total_logged_in: number;
  total_late_login: number;
  total_not_logged_in: number;
  total_logged_out: number;
  total_not_logged_out: number;
}

type FilterType = 'all' | 'logged_in' | 'late_login' | 'not_logged_in';

const WorkStatistics: React.FC<WorkStatisticsProps> = ({ token, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  const fetchWorkStats = async (targetDate?: string) => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/manager/getWorkStats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token,
          date: targetDate || date
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        console.log('Fetched user stats:', data.users);
        setUserStats(data.users);
        setDate(data.date);
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        setError(errorData.message || 'Failed to fetch work statistics');
      }
    } catch (error: any) {
      console.error('Fetch work stats error:', error);
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkStats();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Memoize filtered users for better performance
  const filteredUsers = useMemo(() => {
    switch (selectedFilter) {
      case 'logged_in':
        return userStats.filter(user => user.has_logged_in);
      case 'late_login':
        return userStats.filter(user => user.is_late_login);
      case 'not_logged_in':
        return userStats.filter(user => !user.has_logged_in);
      case 'all':
      default:
        return userStats;
    }
  }, [userStats, selectedFilter]);

  const StatCard = ({
    title,
    value,
    icon,
    color,
    iconColor,
    filterType,
    isSelected
  }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    iconColor: string;
    filterType: FilterType;
    isSelected: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.statCard,
        { backgroundColor: color },
        isSelected && styles.statCardSelected
      ]}
      onPress={() => setSelectedFilter(filterType)}
      activeOpacity={0.7}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={16} color={WHATSAPP_COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderTableRow = (user: UserStat, index: number) => {
    return (
      <View
        key={user.employee_id}
        style={[
          styles.tableRow,
          index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
        ]}
      >
        <View style={[styles.tableCell, styles.nameCell]}>
          <View>
            <Text style={styles.nameText}>{user.name}</Text>
            <Text style={styles.designationText}>{user.designation}</Text>
          </View>
        </View>

        <View style={[styles.tableCell, styles.centerCell]}>
          {user.has_logged_in ? (
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.timeText}>{user.login_time || 'N/A'}</Text>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.absentText}>Absent</Text>
            </View>
          )}
          {user.is_late_login && (
            <View style={styles.lateBadge}>
              <Text style={styles.lateBadgeText}>Late</Text>
            </View>
          )}
        </View>

        <View style={[styles.tableCell, styles.centerCell]}>
          {user.has_logged_out ? (
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.timeText}>{user.logout_time || 'N/A'}</Text>
            </View>
          ) : user.has_logged_in ? (
            <View style={styles.statusContainer}>
              <Ionicons name="close-circle" size={20} color="#F59E0B" />
              <Text style={styles.activeText}>Active</Text>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
              <Text style={styles.absentText}>-</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing && !summary) {
    return (
      <View style={styles.container}>
        <Header
          title="Work Statistics"
          subtitle="Loading..."
          onBack={onBack}
          variant="details"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading work statistics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Work Statistics"
        subtitle={date ? formatDate(date) : "Today's Statistics"}
        onBack={onBack}
        variant="details"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[WHATSAPP_COLORS.accent]}
            tintColor={WHATSAPP_COLORS.accent}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color={WHATSAPP_COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRefresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : summary && (
          <>
            {/* Summary Cards - Now with 4 boxes including All */}
            <View style={styles.summaryContainer}>
              <StatCard
                title="All"
                value={summary.total_users}
                icon="account-group"
                color="#bae7be"
                iconColor="#6B7280"
                filterType="all"
                isSelected={selectedFilter === 'all'}
              />

              <StatCard
                title="Total Logged In"
                value={summary.total_logged_in}
                icon="account-check"
                color="#f4e2bc"
                iconColor="#2E7D32"
                filterType="logged_in"
                isSelected={selectedFilter === 'logged_in'}
              />

              <StatCard
                title="Late Logins"
                value={summary.total_late_login}
                icon="clock-alert"
                color="#bde6f3"
                iconColor="#1976D2"
                filterType="late_login"
                isSelected={selectedFilter === 'late_login'}
              />

              <StatCard
                title="Not Logged In"
                value={summary.total_not_logged_in}
                icon="account-remove"
                color="#fdd3d9"
                iconColor="#D32F2F"
                filterType="not_logged_in"
                isSelected={selectedFilter === 'not_logged_in'}
              />
            </View>

            {/* Filter Info */}
            <View style={styles.filterInfoContainer}>
              <Text style={styles.filterInfoText}>
                Showing {filteredUsers.length} of {summary.total_users} employees
                {selectedFilter !== 'all' && (
                  <Text style={styles.filterInfoBold}>
                    {' '}• {selectedFilter === 'logged_in' ? 'Logged In' :
                      selectedFilter === 'late_login' ? 'Late Login' :
                      'Not Logged In'}
                  </Text>
                )}
              </Text>
              {selectedFilter !== 'all' && (
                <TouchableOpacity
                  onPress={() => setSelectedFilter('all')}
                  style={styles.clearFilterButton}
                >
                  <Text style={styles.clearFilterText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Table Container with internal scrolling */}
            <View style={styles.tableWrapper}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.nameHeader]}>Employee</Text>
                <Text style={styles.tableHeaderText}>Login Status</Text>
                <Text style={styles.tableHeaderText}>Logout Status</Text>
              </View>

              <ScrollView
                style={styles.tableScrollView}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => renderTableRow(user, index))
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyStateText}>
                      No employees match this filter
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Download Button */}
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => setShowDownloadModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>Download Statistics</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Download Modal */}
      <WorkStatisticsDownloadModal
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={async (selectedDate) => {
          setShowDownloadModal(false);
          await fetchWorkStats(selectedDate);
        }}
        token={token}
        currentDate={date}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 90,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statCardSelected: {
    borderColor: WHATSAPP_COLORS.primary,
    elevation: 4,
    shadowOpacity: 0.2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 13,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  filterInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterInfoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterInfoBold: {
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  clearFilterText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  tableWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
  },
  tableScrollView: {
    maxHeight: 350,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#075E54',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  nameHeader: {
    flex: 2,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 70,
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    flex: 1,
    justifyContent: 'center',
  },
  nameCell: {
    flex: 2,
  },
  centerCell: {
    alignItems: 'center',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  designationText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  absentText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  activeText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
    fontWeight: '500',
  },
  lateBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lateBadgeText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default WorkStatistics;