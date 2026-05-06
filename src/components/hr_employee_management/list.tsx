// hr_employee_management/list.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from './types';
import { WHATSAPP_COLORS, getAvatarColor, getInitials, calculateExperience } from './constants';
import { styles } from './styles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CityGroup {
  city: string;
  employees: Employee[];
}

interface EmployeeListProps {
  employeesByCity: CityGroup[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  searchQuery: string;
  onRefresh: () => void;
  onEmployeePress: (employee: Employee) => void;
  onClearSearch: () => void;
  onEndReached: () => void;
  totalEmployees?: number;
  displayedEmployees?: number;
}

const additionalStyles = {
  quickActionsSection: { marginBottom: 16 },
  quickActionsHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  actionIndicatorDot: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.background,
  },
  actionBadgeContainer: { marginTop: 4, marginBottom: 2 },
  actionBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionBadgeText: { fontSize: 12, fontWeight: '600' as const },
  employeeMetaRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  employeeMetaDot: { fontSize: 12, color: WHATSAPP_COLORS.textTertiary },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employeesByCity,
  loading,
  refreshing,
  loadingMore,
  error,
  searchQuery,
  onRefresh,
  onEmployeePress,
  onClearSearch,
  onEndReached,
  totalEmployees = 0,
  displayedEmployees = 0,
}) => {
  const [collapsedCities, setCollapsedCities] = useState<Set<string>>(new Set());
  const [collapsedQuickActions, setCollapsedQuickActions] = useState(false);

  // ── KEY FIX: prevent onEndReached from firing repeatedly while the parent
  //    is already fetching or during the 1-second cooldown after a trigger ──
  const isCallingLoadMoreRef = useRef(false);

  const toggleCity = (city: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedCities(prev => {
      const newSet = new Set(prev);
      newSet.has(city) ? newSet.delete(city) : newSet.add(city);
      return newSet;
    });
  };

  const toggleQuickActions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedQuickActions(prev => !prev);
  };

  const getTotalEmployeesInView = () =>
    employeesByCity.reduce((sum, group) => sum + (group.employees?.length || 0), 0);

  // ── Scroll-based end detection with cooldown debounce ─────────────────────
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;

    if (distanceFromBottom < 300 && !isCallingLoadMoreRef.current) {
      isCallingLoadMoreRef.current = true;
      onEndReached();
      // Reset cooldown after 1 s — enough time for the fetch to start and
      // for loadingMoreRef in the parent to flip to true, which then acts
      // as the authoritative guard against double-fetching.
      setTimeout(() => {
        isCallingLoadMoreRef.current = false;
      }, 1000);
    }
  };

  const getEmployeesWithActions = (): Employee[] =>
    employeesByCity
      .flatMap(g => g.employees || [])
      .filter(e => e.any_action && e.action_type)
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const hasPendingLeaveActions = (employee: Employee): boolean =>
    (employee.leaves || []).some(
      l => l.status === 'pending' || l.status === 'approved_by_manager'
    );

  const getActionIcon  = (t: string) => t.toLowerCase() === 'leaves' ? 'calendar-outline'     : 'alert-circle-outline';
  const getActionLabel = (t: string) => t.toLowerCase() === 'leaves' ? 'Pending Leave'        : 'Action Required';
  const getActionColor = (t: string) => t.toLowerCase() === 'leaves' ? '#FF9800'              : '#F44336';

  const renderEmployeeCard = (employee: Employee, showCity = false) => {
    const hasActions = hasPendingLeaveActions(employee);
    return (
      <TouchableOpacity
        key={employee.employee_id}
        style={styles.employeeCard}
        onPress={() => onEmployeePress(employee)}
        activeOpacity={0.7}
      >
        <View style={styles.employeeCardContent}>
          <View style={styles.avatarContainer}>
            {employee.profile_picture ? (
              <Image source={{ uri: employee.profile_picture }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarDefault, { backgroundColor: getAvatarColor(employee.employee_id) }]}>
                <Text style={styles.avatarInitials}>{getInitials(employee.full_name)}</Text>
              </View>
            )}
            <View style={[
              styles.statusIndicator,
              { backgroundColor: employee.is_active ? WHATSAPP_COLORS.statusOnline : WHATSAPP_COLORS.statusOffline }
            ]} />
            {hasActions && (
              <View style={[
                additionalStyles.actionIndicatorDot,
                { backgroundColor: getActionColor(employee.action_type || 'leaves') }
              ]} />
            )}
          </View>

          <View style={styles.employeeInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.employeeName} numberOfLines={1}>{employee.full_name}</Text>
              <Text style={styles.employeeTime}>{calculateExperience(employee.joining_date)}</Text>
            </View>
            <Text style={styles.employeeDesignation} numberOfLines={1}>
              {employee.designation || employee.role || 'No designation'}
            </Text>
            <View style={additionalStyles.employeeMetaRow}>
              <Text style={styles.employeeLastMessage} numberOfLines={1}>
                ID: {employee.employee_id}
              </Text>
              {showCity && employee.office?.address?.city && (
                <>
                  <Text style={additionalStyles.employeeMetaDot}> • </Text>
                  <Text style={styles.employeeLastMessage} numberOfLines={1}>
                    {employee.office.address.city}
                  </Text>
                </>
              )}
            </View>
            {hasActions && employee.action_type && (
              <View style={additionalStyles.actionBadgeContainer}>
                <View style={[additionalStyles.actionBadge, { backgroundColor: `${getActionColor(employee.action_type)}15` }]}>
                  <Ionicons name={getActionIcon(employee.action_type)} size={14} color={getActionColor(employee.action_type)} style={{ marginRight: 4 }} />
                  <Text style={[additionalStyles.actionBadgeText, { color: getActionColor(employee.action_type) }]}>
                    {getActionLabel(employee.action_type)}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.leaveBadges}>
              <View style={[styles.leaveBadge, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.leaveBadgeText, { color: '#2E7D32' }]}>E: {employee.earned_leaves || 0}</Text>
              </View>
              <View style={[styles.leaveBadge, { backgroundColor: '#FFF3E0' }]}>
                <Text style={[styles.leaveBadgeText, { color: '#EF6C00' }]}>S: {employee.sick_leaves || 0}</Text>
              </View>
              <View style={[styles.leaveBadge, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.leaveBadgeText, { color: '#1565C0' }]}>C: {employee.casual_leaves || 0}</Text>
              </View>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && employeesByCity.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={64} color={WHATSAPP_COLORS.error} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (employeesByCity.length === 0 || getTotalEmployeesInView() === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIcon}>
          <Ionicons name="people-outline" size={80} color={WHATSAPP_COLORS.border} />
        </View>
        <Text style={styles.emptyStateTitle}>{searchQuery ? 'No employees found' : 'No employees'}</Text>
        <Text style={styles.emptyStateMessage}>
          {searchQuery
            ? `No employees found for "${searchQuery}". Try adjusting your search terms.`
            : 'No employees are currently in the system'}
        </Text>
        {searchQuery && (
          <TouchableOpacity style={styles.clearSearchButton} onPress={onClearSearch} activeOpacity={0.8}>
            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  let employeesWithActions = getEmployeesWithActions();
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    employeesWithActions = employeesWithActions.filter(emp =>
      emp.full_name?.toLowerCase().includes(q) ||
      emp.employee_id?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q)
    );
  }

  const quickActionIds = new Set(employeesWithActions.map(e => e.employee_id));
  const cityGroupsWithoutQuickActions = employeesByCity
    .map(g => ({ ...g, employees: g.employees.filter(e => !quickActionIds.has(e.employee_id)) }))
    .filter(g => g.employees.length > 0);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[WHATSAPP_COLORS.accent]}
          tintColor={WHATSAPP_COLORS.accent}
          progressBackgroundColor={WHATSAPP_COLORS.background}
        />
      }
    >
      <View style={styles.employeesList}>

        {/* Quick Actions */}
        {employeesWithActions.length > 0 && (
          <View style={additionalStyles.quickActionsSection}>
            <TouchableOpacity style={additionalStyles.quickActionsHeader} onPress={toggleQuickActions} activeOpacity={0.7}>
              <View style={styles.cityHeaderLeft}>
                <Ionicons name="notifications" size={20} color="#FF9800" style={styles.cityIcon} />
                <View>
                  <Text style={[styles.cityName, { color: '#FF9800' }]}>Quick Actions</Text>
                  <Text style={[styles.cityEmployeeCount, { color: '#0000008a' }]}>
                    {employeesWithActions.length} employee{employeesWithActions.length !== 1 ? 's' : ''} require{employeesWithActions.length === 1 ? 's' : ''} attention
                  </Text>
                </View>
              </View>
              <Ionicons name={collapsedQuickActions ? 'chevron-down' : 'chevron-up'} size={24} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
            {!collapsedQuickActions && (
              <View style={styles.cityEmployeesContainer}>
                {employeesWithActions.map(e => renderEmployeeCard(e, true))}
              </View>
            )}
          </View>
        )}

        {/* City Sections */}
        {cityGroupsWithoutQuickActions.map(cityGroup => (
          <View key={cityGroup.city} style={styles.citySection}>
            <TouchableOpacity style={styles.cityHeader} onPress={() => toggleCity(cityGroup.city)} activeOpacity={0.7}>
              <View style={styles.cityHeaderLeft}>
                <Ionicons name="location" size={20} color="#FFFFFF" style={styles.cityIcon} />
                <View>
                  <Text style={styles.cityName}>{cityGroup.city || 'Unknown City'}</Text>
                  <Text style={styles.cityEmployeeCount}>
                    {cityGroup.employees.length} employee{cityGroup.employees.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Ionicons name={collapsedCities.has(cityGroup.city) ? 'chevron-down' : 'chevron-up'} size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {!collapsedCities.has(cityGroup.city) && (
              <View style={styles.cityEmployeesContainer}>
                {cityGroup.employees.map(e => renderEmployeeCard(e, false))}
              </View>
            )}
          </View>
        ))}

        {/* Load-more spinner */}
        {loadingMore && (
          <View style={additionalStyles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={WHATSAPP_COLORS.accent} />
            <Text style={{ marginTop: 8, fontSize: 13, color: WHATSAPP_COLORS.textSecondary }}>
              Loading more employees…
            </Text>
          </View>
        )}

        {/* End-of-list footer */}
        {!loadingMore && getTotalEmployeesInView() > 0 && (
          <View style={styles.listFooter}>
            <Text style={styles.listFooterText}>
              {searchQuery
                ? `End of search results • ${getTotalEmployeesInView()} found`
                : `${displayedEmployees} of ${totalEmployees} employees loaded`}
            </Text>
          </View>
        )}

      </View>
    </ScrollView>
  );
};