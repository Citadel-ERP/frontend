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
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  lightBlue: '#E0F2FE',
  lightGreen: '#D1FAE5',
  lightYellow: '#FEF3C7',
  lightRed: '#FEE2E2',
  lightPurple: '#EDE9FE',
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
  onUpdateAssignmentStatus: (visitId: number, newStatus: 'admin_completed' | 'cancelled') => Promise<any>;
  onBulkUpdateAssignments: (visitIds: number[], newStatus: 'admin_completed' | 'cancelled') => Promise<any>;
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
  onUpdateAssignmentStatus,
  onBulkUpdateAssignments,
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
  const [selectedAssignments, setSelectedAssignments] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showStatusEditModal, setShowStatusEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showMultipleStatusEditModal, setShowMultipleStatusEditModal] = useState(false);
  const [updatingMultipleStatus, setUpdatingMultipleStatus] = useState(false);

  const STATUS_OPTIONS: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'scout_completed', label: 'Scout Completed' },
    { value: 'admin_completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const VISIBILITY_OPTIONS: FilterOption[] = [
    { value: 'true', label: 'Visible' },
    { value: 'false', label: 'Hidden' },
  ];

  // UPDATED: Only admin_completed and cancelled - removed scout_completed
  const EDITABLE_STATUS_OPTIONS: FilterOption[] = [
    { value: 'admin_completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const MULTIPLE_STATUS_OPTIONS: FilterOption[] = [
    { value: 'admin_completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
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

  // Selection Handlers
  const handleLongPress = useCallback((assignmentId: number) => {
    setSelectionMode(true);
    setSelectedAssignments([assignmentId]);
  }, []);

  const handleAssignmentSelection = useCallback((assignmentId: number) => {
    if (!selectionMode) return;

    setSelectedAssignments(prev => {
      if (prev.includes(assignmentId)) {
        const newSelection = prev.filter(id => id !== assignmentId);
        if (newSelection.length === 0) {
          setSelectionMode(false);
        }
        return newSelection;
      } else {
        return [...prev, assignmentId];
      }
    });
  }, [selectionMode]);

  const cancelSelection = useCallback(() => {
    setSelectedAssignments([]);
    setSelectionMode(false);
  }, []);

  // UPDATED: Single Status Update using onUpdateAssignmentStatus prop
  const handleEditStatus = useCallback((assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowStatusEditModal(true);
  }, []);

  const handleUpdateStatus = useCallback(async (newStatus: 'admin_completed' | 'cancelled') => {
    if (!editingAssignment) return;

    setUpdatingStatus(true);
    try {
      await onUpdateAssignmentStatus(editingAssignment.id, newStatus);
      
      Alert.alert('Success', 'Status updated successfully');
      setShowStatusEditModal(false);
      setEditingAssignment(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  }, [editingAssignment, onUpdateAssignmentStatus, onRefresh]);

  // UPDATED: Bulk Status Update using onBulkUpdateAssignments prop
  const handleBulkStatusUpdate = useCallback(async (newStatus: 'admin_completed' | 'cancelled') => {
    if (selectedAssignments.length === 0) return;

    setShowMultipleStatusEditModal(false);
    setUpdatingMultipleStatus(true);

    try {
      await onBulkUpdateAssignments(selectedAssignments, newStatus);

      Alert.alert('Success', `${selectedAssignments.length} assignment(s) status updated successfully`);
      cancelSelection();
      onRefresh();
    } catch (error) {
      console.error('Error updating multiple assignments:', error);
      Alert.alert('Error', 'Failed to update status for some assignments. Please try again.');
    } finally {
      setUpdatingMultipleStatus(false);
    }
  }, [selectedAssignments, onBulkUpdateAssignments, cancelSelection, onRefresh]);

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

  const renderAssignmentItem = useCallback(({ item, isHistory = false }: { item: Assignment; isHistory?: boolean }) => {
    const site = item.site;
    const scout = item.assigned_to;
    const assigner = item.assigned_by;
    
    const lastUpdated = formatDate(item.updated_at);
    const assignDate = formatAssignDate(item.assign_date);
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const isSelected = selectedAssignments.includes(item.id);
    
    const handleCardPress = () => {
      if (selectionMode) {
        handleAssignmentSelection(item.id);
      }
    };

    const handleCardLongPress = () => {
      if (!isHistory) {
        handleLongPress(item.id);
      }
    };

    return (
      <View
        style={[
          styles.assignmentCard,
          isSelected && styles.assignmentCardSelected
        ]}
      >
        {/* Selection Checkbox */}
        {selectionMode && !isHistory && (
          <View style={styles.selectionCheckbox}>
            <View style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected
            ]}>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color={WHATSAPP_COLORS.white} />
              )}
            </View>
          </View>
        )}

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header Row - Tappable */}
          <TouchableOpacity
            onPress={handleCardPress}
            onLongPress={handleCardLongPress}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.siteName} numberOfLines={1}>
                  {site.building_name || 'Unnamed Site'}
                </Text>
                <Text style={styles.scoutName}>
                  {scout.first_name} {scout.last_name}
                </Text>
              </View>

              {!selectionMode && !isHistory && item.status === 'pending' && (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEditStatus(item);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="create-outline" size={20} color={WHATSAPP_COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Location Row - Tappable */}
            {site.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {site.location}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Details ScrollView - NOT Tappable (scrollable area) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.detailsScrollContainer}
            contentContainerStyle={styles.detailsGrid}
          >
            {/* Assign Date */}
            <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightPurple }]}>
              <Ionicons name="calendar" size={12} color="#7C3AED" />
              <Text style={[styles.detailChipText, { color: "#7C3AED" }]}>
                {assignDate}
              </Text>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {beautifyName(item.status)}
              </Text>
            </View>

            {/* Comments Indicator */}
            {item.comments && item.comments.length > 0 && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightBlue }]}>
                <Ionicons name="chatbubble" size={12} color={WHATSAPP_COLORS.info} />
                <Text style={[styles.detailChipText, { color: WHATSAPP_COLORS.info }]}>
                  {item.comments.length}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Row - Tappable */}
          <TouchableOpacity
            onPress={handleCardPress}
            onLongPress={handleCardLongPress}
            activeOpacity={0.7}
          >
            <View style={styles.assignmentFooter}>
              <View style={styles.assignmentMeta}>
                <Ionicons name="person-add" size={11} color={WHATSAPP_COLORS.textTertiary} />
                <Text style={styles.assignmentMetaText}>
                  By: {assigner.first_name} {assigner.last_name}
                </Text>
              </View>
              
              <Text style={styles.assignmentTime}>{lastUpdated}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    selectedAssignments,
    selectionMode,
    handleAssignmentSelection,
    handleLongPress,
    handleEditStatus,
    formatDate,
    formatAssignDate,
    getStatusColor,
    getStatusIcon,
    beautifyName
  ]);

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
        <View style={styles.emptyIconContainer}>
          <Ionicons name="clipboard-outline" size={64} color={WHATSAPP_COLORS.textTertiary} />
        </View>
        <Text style={styles.emptyStateTitle}>No upcoming assignments</Text>
        <Text style={styles.emptyStateText}>
          {searchQuery || Object.keys(filter).length > 0
            ? 'Try changing your search or filter criteria'
            : 'Create new assignments for future dates'}
        </Text>
        {!searchQuery && Object.keys(filter).length === 0 && (
          <TouchableOpacity style={styles.createButton} onPress={onCreateAssignment}>
            <Ionicons name="add" size={20} color={WHATSAPP_COLORS.white} />
            <Text style={styles.createButtonText}>Create Assignment</Text>
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
  ), [showFilterModal, filter, handleFilterChange, clearFilters, beautifyName]);

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
            renderItem={({ item }) => renderAssignmentItem({ item, isHistory: true })}
            keyExtractor={(item) => `history-${item.id}`}
            contentContainerStyle={styles.historyList}
            onEndReached={handleLoadMoreHistory}
            onEndReachedThreshold={0.1}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyHistory}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="time-outline" size={64} color={WHATSAPP_COLORS.textTertiary} />
                </View>
                <Text style={styles.emptyHistoryTitle}>No history found</Text>
                <Text style={styles.emptyHistoryText}>Past assignments will appear here</Text>
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

  const renderActionsModal = useCallback(() => (
    <Modal
      visible={showActionsModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowActionsModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowActionsModal(false)}
      >
        <View style={styles.actionsModal}>
          <Text style={styles.actionsModalTitle}>
            {selectedAssignments.length} assignment(s) selected
          </Text>

          <TouchableOpacity
            style={[styles.actionOption, styles.actionOptionPrimary]}
            onPress={() => {
              setShowActionsModal(false);
              setShowMultipleStatusEditModal(true);
            }}
          >
            <View style={styles.actionOptionLeft}>
              <Ionicons name="flag-outline" size={22} color={WHATSAPP_COLORS.primary} />
              <Text style={[styles.actionOptionText, styles.actionOptionTextPrimary]}>
                Update Status
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelActionButton}
            onPress={() => setShowActionsModal(false)}
          >
            <Text style={styles.cancelActionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showActionsModal, selectedAssignments]);

  const renderStatusEditModal = useCallback(() => (
    <Modal
      visible={showStatusEditModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStatusEditModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowStatusEditModal(false)}
      >
        <View style={styles.statusEditModal}>
          <Text style={styles.statusEditTitle}>Update Status</Text>
          <Text style={styles.statusEditSubtitle}>
            {editingAssignment?.site.building_name}
          </Text>

          <ScrollView style={styles.statusOptions}>
            {EDITABLE_STATUS_OPTIONS.map((option) => {
              const isCurrentStatus = editingAssignment?.status === option.value;
              const statusColor = getStatusColor(option.value);
              
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    isCurrentStatus && styles.statusOptionCurrent
                  ]}
                  onPress={() => !updatingStatus && handleUpdateStatus(option.value as 'admin_completed' | 'cancelled')}
                  disabled={updatingStatus || isCurrentStatus}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[
                      styles.statusOptionText,
                      isCurrentStatus && styles.statusOptionTextCurrent
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  {isCurrentStatus && (
                    <Text style={styles.currentBadge}>Current</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {updatingStatus && (
            <View style={styles.statusUpdatingOverlay}>
              <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.statusUpdatingText}>Updating...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelStatusButton}
            onPress={() => setShowStatusEditModal(false)}
            disabled={updatingStatus}
          >
            <Text style={styles.cancelStatusText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showStatusEditModal, editingAssignment, updatingStatus, handleUpdateStatus, getStatusColor]);

  const renderMultipleStatusEditModal = useCallback(() => (
    <Modal
      visible={showMultipleStatusEditModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMultipleStatusEditModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowMultipleStatusEditModal(false)}
      >
        <View style={styles.statusEditModal}>
          <Text style={styles.statusEditTitle}>Update Status</Text>
          <Text style={styles.statusEditSubtitle}>
            {selectedAssignments.length} assignment(s) selected
          </Text>

          <ScrollView style={styles.statusOptions}>
            {MULTIPLE_STATUS_OPTIONS.map((option) => {
              const statusColor = getStatusColor(option.value);
              
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.statusOption}
                  onPress={() => !updatingMultipleStatus && handleBulkStatusUpdate(option.value as 'admin_completed' | 'cancelled')}
                  disabled={updatingMultipleStatus}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.statusOptionText}>
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {updatingMultipleStatus && (
            <View style={styles.statusUpdatingOverlay}>
              <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.statusUpdatingText}>Updating...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelStatusButton}
            onPress={() => setShowMultipleStatusEditModal(false)}
            disabled={updatingMultipleStatus}
          >
            <Text style={styles.cancelStatusText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showMultipleStatusEditModal, selectedAssignments, updatingMultipleStatus, handleBulkStatusUpdate, getStatusColor]);

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
          {localSearchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => handleSearch('')}
              style={styles.clearSearchButton}
            >
              <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.textTertiary} />
            </TouchableOpacity>
          )}
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
            {selectionMode && (
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => setShowActionsModal(true)}
              >
                <Ionicons name="settings-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{selectedAssignments.length}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Selection Mode Bar */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedAssignments.length} assignment(s) selected
          </Text>
          <TouchableOpacity onPress={cancelSelection}>
            <Text style={styles.cancelSelectionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Filters */}
      {activeFilterCount > 0 && !selectionMode && (
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
                    <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
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
        renderItem={({ item }) => renderAssignmentItem({ item })}
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

      {/* Actions Modal */}
      {renderActionsModal()}

      {/* Single Status Edit Modal */}
      {renderStatusEditModal()}

      {/* Multiple Status Edit Modal */}
      {renderMultipleStatusEditModal()}

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

      {/* Loading Overlay */}
      {updatingMultipleStatus && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingOverlayText}>
              Updating status for {selectedAssignments.length} assignment(s)...
            </Text>
          </View>
        </View>
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
  clearSearchButton: {
    position: 'absolute',
    right: 120,
    zIndex: 1,
    padding: 8,
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
  actionIconButton: {
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
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.lightBlue,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.info,
  },
  selectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: WHATSAPP_COLORS.info,
  },
  cancelSelectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: WHATSAPP_COLORS.danger,
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
  assignmentCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  assignmentCardSelected: {
    borderColor: WHATSAPP_COLORS.info,
    backgroundColor: WHATSAPP_COLORS.lightBlue,
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: WHATSAPP_COLORS.info,
    borderColor: WHATSAPP_COLORS.info,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  scoutName: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  editIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: WHATSAPP_COLORS.primaryLight + '15',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    fontWeight: '500',
  },
  detailsScrollContainer: {
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: WHATSAPP_COLORS.background,
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
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyHistoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyHistoryText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsModal: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  actionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionOptionPrimary: {
    backgroundColor: WHATSAPP_COLORS.lightBlue,
  },
  actionOptionDanger: {
    backgroundColor: WHATSAPP_COLORS.lightRed,
  },
  actionOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  actionOptionTextPrimary: {
    color: WHATSAPP_COLORS.primary,
  },
  actionOptionTextDanger: {
    color: WHATSAPP_COLORS.danger,
  },
  cancelActionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelActionText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
  },
  statusEditModal: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  statusEditTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusEditSubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOptions: {
    maxHeight: 300,
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusOptionCurrent: {
    backgroundColor: WHATSAPP_COLORS.lightBlue,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.info,
  },
  statusOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  statusOptionTextCurrent: {
    color: WHATSAPP_COLORS.info,
  },
  currentBadge: {
    fontSize: 12,
    color: WHATSAPP_COLORS.info,
    fontWeight: '600',
  },
  statusUpdatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  statusUpdatingText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  cancelStatusButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelStatusText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '600',
  },
});

export default ListAssignment;