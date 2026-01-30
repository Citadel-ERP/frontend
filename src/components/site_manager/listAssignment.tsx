import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';

const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
};

interface Assignment {
  id: number;
  site: {
    id: number;
    building_name: string;
    location: string;
    building_status: string;
    building_photos: any[];
  };
  assigned_to: {
    employee_id: string;
    first_name: string;
    last_name: string;
    profile_picture: string;
  };
  assigned_by: {
    employee_id: string;
    first_name: string;
    last_name: string;
  };
  status: 'pending' | 'scout_completed' | 'admin_completed' | 'cancelled';
  is_visible_to_scout: boolean;
  scout_completed_at: string | null;
  admin_completed_at: string | null;
  assign_date: string;
  created_at: string;
  updated_at: string;
  comments: any[];
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

interface ListAssignmentProps {
  assignments: Assignment[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  pagination: Pagination | null;
  searchQuery: string;
  filter: any;
  token: string | null;
  onEditAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (assignmentId: number) => void;
  onSearch: (query: string) => void;
  onFilter: (filter: any) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onCreateAssignment: () => void;
  theme: any;
}

interface FilterOption {
  value: string;
  label: string;
}

const ListAssignment: React.FC<ListAssignmentProps> = ({
  assignments,
  loading,
  loadingMore,
  refreshing,
  pagination,
  searchQuery,
  filter,
  token,
  onEditAssignment,
  onDeleteAssignment,
  onSearch,
  onFilter,
  onLoadMore,
  onRefresh,
  onCreateAssignment,
  theme,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showVisibilityFilter, setShowVisibilityFilter] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAssignments, setHistoryAssignments] = useState<Assignment[]>([]);
  const [historyPagination, setHistoryPagination] = useState<Pagination | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  const STATUS_OPTIONS: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'scout_completed', label: 'Scout Completed' },
    { value: 'admin_completed', label: 'Admin Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const VISIBILITY_OPTIONS: FilterOption[] = [
    { value: 'true', label: 'Visible' },
    { value: 'false', label: 'Hidden' },
  ];

  const handleSearch = useCallback((text: string) => {
    setLocalSearchQuery(text);
    onSearch(text);
  }, [onSearch]);

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    const newFilter = { ...filter };
    if (value === null) {
      delete newFilter[key];
    } else {
      newFilter[key] = value;
    }
    onFilter(newFilter);
  }, [filter, onFilter]);

  const clearFilters = useCallback(() => {
    onFilter({});
    setShowFilterModal(false);
  }, [onFilter]);

  const beautifyName = useCallback((name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const getInitials = useCallback((name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
  }, []);

  const getAvatarColor = useCallback((name: string): string => {
    if (!name) return '#00d285';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#00d285', '#ff5e7a', '#ffb157', '#1da1f2', '#007AFF'];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  }, []);

  const formatAssignDate = useCallback((dateString: string): string => {
    if (!dateString) return 'No date';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Invalid date';
    
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status) {
      case 'pending': return WHATSAPP_COLORS.warning;
      case 'scout_completed': return '#ffcc92';
      case 'admin_completed': return WHATSAPP_COLORS.success;
      case 'cancelled': return WHATSAPP_COLORS.danger;
      default: return WHATSAPP_COLORS.textSecondary;
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'pending':
        return { icon: 'time', color: WHATSAPP_COLORS.warning };
      case 'scout_completed':
        return { icon: 'checkmark-circle', color: '#ffcc92' };
      case 'admin_completed':
        return { icon: 'checkmark-done', color: WHATSAPP_COLORS.success };
      case 'cancelled':
        return { icon: 'close-circle', color: WHATSAPP_COLORS.danger };
      default:
        return { icon: 'help-circle', color: WHATSAPP_COLORS.textTertiary };
    }
  }, []);

  const fetchHistory = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!token) return;

    try {
      if (append) {
        setLoadingMoreHistory(true);
      } else {
        setLoadingHistory(true);
      }

      const response = await fetch(`${BACKEND_URL}/manager/getSiteVisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          page,
          page_size: 20,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.message !== "Past site visits fetched successfully") {
        throw new Error(data.message || 'Failed to fetch history');
      }

      if (append) {
        setHistoryAssignments(prev => [...prev, ...data.visits]);
      } else {
        setHistoryAssignments(data.visits);
      }
      setHistoryPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to fetch assignment history');
    } finally {
      setLoadingHistory(false);
      setLoadingMoreHistory(false);
    }
  }, [token]);

  const handleViewHistory = useCallback(async () => {
    setShowHistoryModal(true);
    await fetchHistory(1);
  }, [fetchHistory]);

  const handleLoadMoreHistory = useCallback(() => {
    if (historyPagination && historyPagination.has_next && !loadingMoreHistory) {
      fetchHistory(historyPagination.current_page + 1, true);
    }
  }, [historyPagination, loadingMoreHistory, fetchHistory]);

  const renderAssignmentItem = useCallback(({ item }: { item: Assignment }) => {
    const site = item.site;
    const scout = item.assigned_to;
    const assigner = item.assigned_by;
    
    const siteAvatarColor = getAvatarColor(site.building_name);
    const siteInitials = getInitials(site.building_name);
    const scoutAvatarColor = getAvatarColor(`${scout.first_name} ${scout.last_name}`);
    const scoutInitials = getInitials(`${scout.first_name} ${scout.last_name}`);
    
    const lastUpdated = formatDate(item.updated_at);
    const assignDate = formatAssignDate(item.assign_date);
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    
    return (
      <View style={styles.assignmentItem}>
        <View style={styles.assignmentAvatarContainer}>
          <View style={[styles.siteAvatar, { backgroundColor: siteAvatarColor }]}>
            {site.building_photos?.length > 0 ? (
              <Image
                source={{ uri: site.building_photos[0].file_url }}
                style={styles.assignmentImage}
              />
            ) : (
              <Text style={styles.assignmentAvatarText}>{siteInitials}</Text>
            )}
          </View>
          
          <View style={styles.scoutAvatarContainer}>
            <View style={[styles.scoutAvatar, { backgroundColor: scoutAvatarColor }]}>
              <Text style={styles.scoutAvatarText}>{scoutInitials}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.assignmentContent}>
          <View style={styles.assignmentHeader}>
            <View style={styles.assignmentTitleContainer}>
              <Text style={styles.assignmentTitle} numberOfLines={1}>
                {site.building_name || 'Unnamed Site'}
              </Text>
              <Ionicons 
                name={statusIcon.icon as any} 
                size={16} 
                color={statusIcon.color} 
              />
            </View>
          </View>
          
          <View style={styles.assignmentDetails}>
            <View style={styles.assignmentDetail}>
              <Ionicons name="person" size={12} color={WHATSAPP_COLORS.textSecondary} />
              <Text style={styles.assignmentDetailText}>
                {scout.first_name} {scout.last_name}
              </Text>
            </View>
            
            <View style={styles.assignmentDetail}>
              <Ionicons name="location" size={12} color={WHATSAPP_COLORS.textSecondary} />
              <Text style={styles.assignmentDetailText} numberOfLines={1}>
                {site.location || 'No location'}
              </Text>
            </View>
          </View>

          <View style={styles.assignmentDetail}>
            <Ionicons name="calendar" size={12} color={WHATSAPP_COLORS.primary} />
            <Text style={[styles.assignmentDetailText, { color: WHATSAPP_COLORS.primary, fontWeight: '600' }]}>
              {assignDate}
            </Text>
          </View>
          
          <View style={styles.assignmentStatusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {beautifyName(item.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.assignmentFooter}>
            <View style={styles.assignmentMeta}>
              <Ionicons name="person-add" size={12} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.assignmentMetaText}>
                By: {assigner.first_name} {assigner.last_name}
              </Text>
            </View>
            
            <Text style={styles.assignmentTime}>{lastUpdated}</Text>
          </View>
          
        </View>
      </View>
    );
  }, [onEditAssignment, onDeleteAssignment]);

  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="clipboard" size={64} color={WHATSAPP_COLORS.border} />
        <Text style={styles.emptyStateText}>No upcoming assignments</Text>
        <Text style={styles.emptyStateSubtext}>
          {searchQuery || Object.keys(filter).length > 0
            ? 'Try changing your search or filter criteria'
            : 'Create new assignments for future dates'}
        </Text>
        {!searchQuery && Object.keys(filter).length === 0 && (
          <TouchableOpacity style={styles.createFirstButton} onPress={onCreateAssignment}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createFirstButtonText}>Create Assignment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, searchQuery, filter, onCreateAssignment]);

  const renderFilterModal = useCallback(() => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Assignments</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterList}>
            {/* Status Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowStatusFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="flag" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Status</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {filter.status ? beautifyName(filter.status) : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* Scout Filter */}
            <View style={styles.filterOption}>
              <View style={styles.filterOptionLeft}>
                <Ionicons name="person" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Assigned To</Text>
              </View>
              <TextInput
                style={styles.scoutInput}
                value={filter.assigned_to || ''}
                onChangeText={(text) => handleFilterChange('assigned_to', text || null)}
                placeholder="Scout ID..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>

            {/* Site Filter */}
            <View style={styles.filterOption}>
              <View style={styles.filterOptionLeft}>
                <Ionicons name="business" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Site ID</Text>
              </View>
              <TextInput
                style={styles.siteInput}
                value={filter.site_id || ''}
                onChangeText={(text) => handleFilterChange('site_id', text || null)}
                placeholder="Site ID..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>

            {/* Visibility Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowVisibilityFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="eye" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Visibility</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {filter.is_visible_to_scout === 'true' ? 'Visible' : 
                   filter.is_visible_to_scout === 'false' ? 'Hidden' : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showFilterModal, filter, handleFilterChange, clearFilters]);

  const renderHistoryModal = useCallback(() => (
    <Modal
      visible={showHistoryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHistoryModal(false)}
    >
      <View style={styles.historyModalContainer}>
        <View style={styles.historyModalHeader}>
          <Text style={styles.historyModalTitle}>Assignment History</Text>
          <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
            <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        
        {loadingHistory && historyAssignments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : (
          <FlatList
            data={historyAssignments}
            renderItem={renderAssignmentItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.historyList}
            onEndReached={handleLoadMoreHistory}
            onEndReachedThreshold={0.1}
            ListEmptyComponent={() => (
              <View style={styles.emptyHistory}>
                <Ionicons name="time" size={48} color={WHATSAPP_COLORS.border} />
                <Text style={styles.emptyHistoryText}>No history found</Text>
                <Text style={styles.emptyHistorySubtext}>Past assignments will appear here</Text>
              </View>
            )}
            ListFooterComponent={
              loadingMoreHistory ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                  <Text style={styles.loadMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  ), [showHistoryModal, historyAssignments, loadingHistory, loadingMoreHistory, renderAssignmentItem, handleLoadMoreHistory]);

  const renderFilterDropdown = useCallback((
    visible: boolean,
    title: string,
    options: FilterOption[],
    currentValue: string | undefined,
    onSelect: (value: string) => void,
    onClose: () => void
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <ScrollView style={styles.dropdownScroll}>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={() => {
                onSelect('');
                onClose();
              }}
            >
              <Text style={styles.dropdownOptionText}>All</Text>
            </TouchableOpacity>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
                {currentValue === option.value && (
                  <Ionicons name="checkmark" size={16} color={WHATSAPP_COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  ), []);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filter).filter(key => filter[key] !== undefined && filter[key] !== '').length;
  }, [filter]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons 
            name="search" 
            size={20} 
            color={WHATSAPP_COLORS.textTertiary} 
            style={styles.searchIcon} 
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assignments..."
            value={localSearchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
          <View style={styles.searchActions}>
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              style={styles.filterButton}
            >
              <Ionicons 
                name="filter" 
                size={20} 
                color={activeFilterCount > 0 ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.textSecondary} 
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleViewHistory} style={styles.historyButton}>
              <Ionicons name="time" size={20} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(filter).map(([key, value]) => {
              if (!value && value !== false && value !== 0) return null;
              
              let label = '';
              let displayValue = '';
              
              switch (key) {
                case 'status':
                  label = 'Status';
                  displayValue = beautifyName(String(value));
                  break;
                case 'assigned_to':
                  label = 'Scout';
                  displayValue = String(value);
                  break;
                case 'site_id':
                  label = 'Site ID';
                  displayValue = String(value);
                  break;
                case 'is_visible_to_scout':
                  label = 'Visibility';
                  displayValue = value === 'true' ? 'Visible' : 'Hidden';
                  break;
                default:
                  label = key;
                  displayValue = String(value);
              }
              
              return (
                <View key={key} style={styles.activeFilter}>
                  <Text style={styles.activeFilterText}>
                    {label}: {displayValue}
                  </Text>
                  <TouchableOpacity onPress={() => handleFilterChange(key, null)}>
                    <Ionicons name="close" size={14} color={WHATSAPP_COLORS.textTertiary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Assignments List */}
      <FlatList
        data={assignments}
        renderItem={renderAssignmentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[WHATSAPP_COLORS.primary]}
            tintColor={WHATSAPP_COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.loadMoreText}>Loading more assignments...</Text>
            </View>
          ) : null
        }
      />

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* History Modal */}
      {renderHistoryModal()}

      {/* Filter Dropdowns */}
      {renderFilterDropdown(
        showStatusFilter,
        'Select Status',
        STATUS_OPTIONS,
        filter.status,
        (value) => handleFilterChange('status', value),
        () => setShowStatusFilter(false)
      )}

      {renderFilterDropdown(
        showVisibilityFilter,
        'Select Visibility',
        VISIBILITY_OPTIONS,
        filter.is_visible_to_scout,
        (value) => handleFilterChange('is_visible_to_scout', value),
        () => setShowVisibilityFilter(false)
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 45,
    paddingVertical: 12,
    fontSize: 16,
    flex: 1,
    color: WHATSAPP_COLORS.textPrimary,
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  searchActions: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    padding: 8,
  },
  historyButton: {
    padding: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: WHATSAPP_COLORS.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  siteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  assignmentImage: {
    width: '100%',
    height: '100%',
  },
  assignmentAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scoutAvatarContainer: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 2,
  },
  scoutAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoutAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignmentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  assignmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  assignmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentDetailText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  assignmentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentMetaText: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textTertiary,
  },
  assignmentTime: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textTertiary,
  },
  commentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: WHATSAPP_COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commentsText: {
    fontSize: 11,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createFirstButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  filterList: {
    maxHeight: 400,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionLabel: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  filterOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterOptionValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  scoutInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    padding: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 6,
    minWidth: 100,
  },
  siteInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    padding: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 6,
    minWidth: 100,
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    borderRadius: 8,
  },
  applyFiltersText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.white,
    fontWeight: '600',
  },
  historyModalContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.surface,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  historyList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 16,
    fontWeight: '600',
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
});

export default ListAssignment;