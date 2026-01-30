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
  Animated,
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
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  overlay: 'rgba(0, 0, 0, 0.5)',
  chipBackground: '#F3F4F6',
  selected: '#EBF5FF',
  selectedBorder: '#3B82F6',
  lightBlue: '#E0F2FE',
  lightGreen: '#D1FAE5',
  lightYellow: '#FEF3C7',
  lightRed: '#FEE2E2',
  lightPurple: '#EDE9FE',
};

interface Site {
  id: number;
  building_name: string;
  location: string;
  building_status: string;
  floor_condition: string;
  total_area: string;
  rent: string;
  rent_per_seat?: string;
  managed_property: boolean;
  conventional_property: boolean;
  for_sale_property?: boolean;
  created_at: string;
  updated_at: string;
  created_by: any;
  active: boolean;
  building_photos: any[];
  meta: any;
  nearest_metro_station: any;
  total_floors?: string;
  number_of_basements?: string;
  availble_floors?: string;
  cam?: string;
  oc?: boolean;
  lease_term?: string;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

interface ListSiteProps {
  sites: Site[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  pagination: Pagination | null;
  searchQuery: string;
  filter: any;
  onSitePress: (site: Site) => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (siteId: number) => void;
  onBulkDeleteSites: (siteIds: number[]) => Promise<void>; // NEW: Bulk delete handler
  onSearch: (query: string) => void;
  onFilter: (filter: any) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onCreateSite: () => void;
  theme: any;
}

interface FilterOption {
  value: string;
  label: string;
}

const ListSite: React.FC<ListSiteProps> = ({
  sites,
  loading,
  loadingMore,
  refreshing,
  pagination,
  searchQuery,
  filter,
  onSitePress,
  onEditSite,
  onDeleteSite,
  onBulkDeleteSites, // NEW
  onSearch,
  onFilter,
  onLoadMore,
  onRefresh,
  onCreateSite,
  theme,
}) => {
  // State Management
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSites, setSelectedSites] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  // Local filter state
  const [localFilters, setLocalFilters] = useState({
    building_status: [] as string[],
    floor_condition: [] as string[],
    property_type: [] as string[],
  });

  // Filter Options
  const BUILDING_STATUS_OPTIONS: FilterOption[] = [
    { value: 'available', label: 'Available' },
    { value: 'leased_out', label: 'Leased Out' },
    { value: 'readily_available', label: 'Readily Available' },
    { value: 'ready_to_move_in', label: 'Ready to Move In' },
    { value: 'ready_for_fitouts', label: 'Ready for Fitouts' },
  ];

  const FLOOR_CONDITION_OPTIONS: FilterOption[] = [
    { value: 'bareshell', label: 'Bareshell' },
    { value: 'warmshell', label: 'Warmshell' },
    { value: 'extended_warmshell', label: 'Extended Warmshell' },
    { value: 'fully_furnished', label: 'Fully Furnished' },
    { value: 'semi_furnished', label: 'Semi Furnished' },
  ];

  const PROPERTY_TYPE_OPTIONS: FilterOption[] = [
    { value: 'managed', label: 'Managed Office' },
    { value: 'conventional', label: 'Conventional Office' },
    { value: 'for_sale', label: 'For Sale' },
  ];

  // Helper Functions
  const beautifyName = useCallback((name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      return 'Today';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });
    }
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status?.toLowerCase()) {
      case 'available': return WHATSAPP_COLORS.success;
      case 'leased_out': return WHATSAPP_COLORS.danger;
      case 'readily_available': return WHATSAPP_COLORS.info;
      case 'ready_to_move_in': return WHATSAPP_COLORS.warning;
      case 'ready_for_fitouts': return WHATSAPP_COLORS.accent;
      default: return WHATSAPP_COLORS.textSecondary;
    }
  }, []);

  const getPropertyType = useCallback((site: Site): string => {
    if (site.for_sale_property) return '🏢 For Sale';
    if (site.managed_property) return '💼 Managed';
    if (site.conventional_property) return '🏛️ Conventional';
    return '🏢 Office';
  }, []);

  const formatCurrency = useCallback((value: string | number): string => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)}Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(2)}K`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  }, []);

  // Search & Filter Handlers
  const handleSearch = useCallback((text: string) => {
    setLocalSearchQuery(text);
    onSearch(text);
  }, [onSearch]);

  const toggleFilterOption = useCallback((filterType: 'building_status' | 'floor_condition' | 'property_type', value: string) => {
    setLocalFilters(prev => {
      const current = prev[filterType];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];

      return {
        ...prev,
        [filterType]: newValues
      };
    });
  }, []);

  const applyFilters = useCallback(() => {
    const newFilter: any = {};

    if (localFilters.building_status.length > 0) {
      newFilter.building_status = localFilters.building_status.join(',');
    }

    if (localFilters.floor_condition.length > 0) {
      newFilter.floor_condition = localFilters.floor_condition.join(',');
    }

    if (localFilters.property_type.length > 0) {
      newFilter.property_type = localFilters.property_type.join(',');
    }

    onFilter(newFilter);
    setShowFilterModal(false);
  }, [localFilters, onFilter]);

  const clearFilters = useCallback(() => {
    setLocalFilters({
      building_status: [],
      floor_condition: [],
      property_type: [],
    });
    onFilter({});
    setShowFilterModal(false);
  }, [onFilter]);

  // Initialize local filters from props
  React.useEffect(() => {
    setLocalFilters({
      building_status: filter.building_status ? filter.building_status.split(',') : [],
      floor_condition: filter.floor_condition ? filter.floor_condition.split(',') : [],
      property_type: filter.property_type ? filter.property_type.split(',') : [],
    });
  }, [filter]);

  // Selection Handlers
  const handleLongPress = useCallback((siteId: number) => {
    setSelectionMode(true);
    setSelectedSites([siteId]);
  }, []);

  const handleSiteSelection = useCallback((siteId: number) => {
    if (!selectionMode) return;

    setSelectedSites(prev => {
      if (prev.includes(siteId)) {
        const newSelection = prev.filter(id => id !== siteId);
        if (newSelection.length === 0) {
          setSelectionMode(false);
        }
        return newSelection;
      } else {
        return [...prev, siteId];
      }
    });
  }, [selectionMode]);

  const cancelSelection = useCallback(() => {
    setSelectedSites([]);
    setSelectionMode(false);
  }, []);

  // UPDATED: Bulk Delete Handler
  const handleBulkDelete = useCallback(async () => {
    setShowActionsModal(false);

    Alert.alert(
      'Delete Sites',
      `Are you sure you want to delete ${selectedSites.length} site(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingMultiple(true);
            try {
              // Call the bulk delete function once with all site IDs
              await onBulkDeleteSites(selectedSites);
              Alert.alert('Success', `${selectedSites.length} site(s) deleted successfully`);
              cancelSelection();
            } catch (error) {
              console.error('Error deleting sites:', error);
              Alert.alert('Error', 'Failed to delete sites. Please try again.');
            } finally {
              setDeletingMultiple(false);
            }
          }
        }
      ]
    );
  }, [selectedSites, onBulkDeleteSites, cancelSelection]);

  // Render Site Item
  const renderSiteItem = useCallback((item: Site, index: number) => {
    const lastUpdated = formatDate(item.updated_at);
    const statusColor = getStatusColor(item.building_status);
    const propertyType = getPropertyType(item);
    const isSelected = selectedSites.includes(item.id);

    const pricingText = item.managed_property && item.rent_per_seat
      ? `${formatCurrency(item.rent_per_seat)}/seat`
      : item.rent && item.total_area
        ? `${formatCurrency(parseFloat(item.rent) / parseFloat(item.total_area))}/sq-ft`
        : item.rent ? formatCurrency(item.rent) : '';

    const handleCardPress = () => {
      if (selectionMode) {
        handleSiteSelection(item.id);
      } else {
        onSitePress(item);
      }
    };

    const handleCardLongPress = () => {
      handleLongPress(item.id);
    };

    return (
      <View
        key={item.id}
        style={[
          styles.siteCard,
          isSelected && styles.siteCardSelected
        ]}
      >
        {/* Selection Checkbox */}
        {selectionMode && (
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
                  {item.building_name || 'Unnamed Site'}
                </Text>
              </View>

              {!selectionMode && (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEditSite(item);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="create-outline" size={20} color={WHATSAPP_COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Location Row - Tappable */}
            {item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location}
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
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {beautifyName(item.building_status || 'unknown')}
              </Text>
            </View>

            {/* Property Type Badge */}
            <View style={[styles.propertyTypeBadge, { backgroundColor: getPropertyTypeBadgeColor(item) }]}>
              <Text style={styles.propertyTypeText}>{propertyType}</Text>
            </View>

            {/* Floor Condition */}
            {item.floor_condition && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightBlue }]}>
                <Ionicons name="layers-outline" size={12} color={WHATSAPP_COLORS.info} />
                <Text style={[styles.detailChipText, { color: WHATSAPP_COLORS.info }]}>
                  {beautifyName(item.floor_condition)}
                </Text>
              </View>
            )}

            {/* Total Area */}
            {item.total_area && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightPurple }]}>
                <Ionicons name="expand-outline" size={12} color="#7C3AED" />
                <Text style={[styles.detailChipText, { color: "#7C3AED" }]}>
                  {parseFloat(item.total_area).toLocaleString('en-IN')} sq ft
                </Text>
              </View>
            )}

            {/* Total Floors */}
            {item.total_floors && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightYellow }]}>
                <Ionicons name="business-outline" size={12} color="#D97706" />
                <Text style={[styles.detailChipText, { color: "#D97706" }]}>
                  {item.total_floors} floors
                </Text>
              </View>
            )}

            {/* OC Available */}
            {item.oc && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightGreen }]}>
                <Ionicons name="checkmark-circle-outline" size={12} color={WHATSAPP_COLORS.success} />
                <Text style={[styles.detailChipText, { color: WHATSAPP_COLORS.success }]}>
                  OC Available
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Pricing Row - Tappable */}
          {pricingText && (
            <TouchableOpacity
              onPress={handleCardPress}
              onLongPress={handleCardLongPress}
              activeOpacity={0.7}
            >
              <View style={styles.pricingRow}>
                <View style={styles.pricingBadge}>
                  <Ionicons name="cash-outline" size={16} color={WHATSAPP_COLORS.success} />
                  <Text style={styles.pricingText}>{pricingText}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [
    selectedSites,
    selectionMode,
    onSitePress,
    onEditSite,
    handleSiteSelection,
    handleLongPress,
    formatDate,
    getStatusColor,
    getPropertyType,
    beautifyName,
    formatCurrency
  ]);

  // Helper function for property type badge color
  const getPropertyTypeBadgeColor = (site: Site): string => {
    if (site.for_sale_property) return WHATSAPP_COLORS.lightRed;
    if (site.managed_property) return WHATSAPP_COLORS.lightBlue;
    if (site.conventional_property) return WHATSAPP_COLORS.lightGreen;
    return WHATSAPP_COLORS.chipBackground;
  };

  // Render Empty State
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading sites...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="business-outline" size={64} color={WHATSAPP_COLORS.textTertiary} />
        </View>
        <Text style={styles.emptyStateTitle}>No sites found</Text>
        <Text style={styles.emptyStateText}>
          {searchQuery || Object.keys(filter).length > 0
            ? 'Try adjusting your search or filter criteria'
            : 'Get started by creating your first site'}
        </Text>
        {!searchQuery && Object.keys(filter).length === 0 && (
          <TouchableOpacity style={styles.createButton} onPress={onCreateSite}>
            <Ionicons name="add" size={20} color={WHATSAPP_COLORS.white} />
            <Text style={styles.createButtonText}>Create First Site</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, searchQuery, filter, onCreateSite]);

  // Render Filter Modal
  const renderFilterModal = useCallback(() => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Sites</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            {/* Property Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Property Type</Text>
              <View style={styles.filterOptionsGrid}>
                {PROPERTY_TYPE_OPTIONS.map((option) => {
                  const isSelected = localFilters.property_type.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChipButton,
                        isSelected && styles.filterChipButtonActive
                      ]}
                      onPress={() => toggleFilterOption('property_type', option.value)}
                    >
                      <Text style={[
                        styles.filterChipButtonText,
                        isSelected && styles.filterChipButtonTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={WHATSAPP_COLORS.white} style={{ marginLeft: 6 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Building Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Building Status</Text>
              <View style={styles.filterOptionsGrid}>
                {BUILDING_STATUS_OPTIONS.map((option) => {
                  const isSelected = localFilters.building_status.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChipButton,
                        isSelected && styles.filterChipButtonActive
                      ]}
                      onPress={() => toggleFilterOption('building_status', option.value)}
                    >
                      <Text style={[
                        styles.filterChipButtonText,
                        isSelected && styles.filterChipButtonTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={WHATSAPP_COLORS.white} style={{ marginLeft: 6 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Floor Condition Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Floor Condition</Text>
              <View style={styles.filterOptionsGrid}>
                {FLOOR_CONDITION_OPTIONS.map((option) => {
                  const isSelected = localFilters.floor_condition.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChipButton,
                        isSelected && styles.filterChipButtonActive
                      ]}
                      onPress={() => toggleFilterOption('floor_condition', option.value)}
                    >
                      <Text style={[
                        styles.filterChipButtonText,
                        isSelected && styles.filterChipButtonTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={WHATSAPP_COLORS.white} style={{ marginLeft: 6 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [showFilterModal, localFilters, toggleFilterOption, clearFilters, applyFilters]);

  // Render Actions Modal
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
            {selectedSites.length} site(s) selected
          </Text>

          <TouchableOpacity
            style={[styles.actionOption, styles.actionOptionDanger]}
            onPress={handleBulkDelete}
          >
            <View style={styles.actionOptionLeft}>
              <Ionicons name="trash-outline" size={22} color={WHATSAPP_COLORS.danger} />
              <Text style={[styles.actionOptionText, styles.actionOptionTextDanger]}>
                Delete Sites
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
  ), [showActionsModal, selectedSites, handleBulkDelete]);

  // Active Filter Count
  const activeFilterCount = useMemo(() => {
    return localFilters.building_status.length +
      localFilters.floor_condition.length +
      localFilters.property_type.length;
  }, [localFilters]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={WHATSAPP_COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, location..."
            value={localSearchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
          {localSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.iconButton, activeFilterCount > 0 && styles.iconButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="funnel"
              size={20}
              color={activeFilterCount > 0 ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.textSecondary}
            />
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {selectionMode && (
            <TouchableOpacity
              style={[styles.iconButton, styles.iconButtonActive]}
              onPress={() => setShowActionsModal(true)}
            >
              <Ionicons name="settings-outline" size={20} color={WHATSAPP_COLORS.white} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selectedSites.length}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Selection Mode Bar */}
      {selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedSites.length} site(s) selected
          </Text>
          <TouchableOpacity onPress={cancelSelection}>
            <Text style={styles.cancelSelectionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Filters Chips */}
      {activeFilterCount > 0 && !selectionMode && (
        <View style={styles.filtersChipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {localFilters.building_status.map((value) => (
              <View key={`status-${value}`} style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  {beautifyName(value)}
                </Text>
                <TouchableOpacity onPress={() => toggleFilterOption('building_status', value)}>
                  <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
            {localFilters.floor_condition.map((value) => (
              <View key={`floor-${value}`} style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  {beautifyName(value)}
                </Text>
                <TouchableOpacity onPress={() => toggleFilterOption('floor_condition', value)}>
                  <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
            {localFilters.property_type.map((value) => {
              const option = PROPERTY_TYPE_OPTIONS.find(o => o.value === value);
              return (
                <View key={`prop-${value}`} style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {option?.label || value}
                  </Text>
                  <TouchableOpacity onPress={() => toggleFilterOption('property_type', value)}>
                    <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Sites List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {sites.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {sites.map((item, index) => renderSiteItem(item, index))}

            {/* Load More */}
            {pagination && pagination.has_next && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="chevron-down-circle-outline" size={20} color={WHATSAPP_COLORS.primary} />
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      {renderFilterModal()}
      {renderActionsModal()}

      {/* Loading Overlay for Bulk Delete */}
      {deletingMultiple && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingOverlayText}>Deleting {selectedSites.length} site(s)...</Text>
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: WHATSAPP_COLORS.border,
    marginHorizontal: 16,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: WHATSAPP_COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.surface,
  },
  badgeText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 11,
    fontWeight: '700',
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
  filtersChipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primaryLight + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.primaryLight + '30',
  },
  filterChipText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  siteCard: {
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
  siteCardSelected: {
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
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  propertyTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  propertyTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
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
  statusTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  timeText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    fontWeight: '500',
  },
  detailsScrollContainer: {
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16, // Add padding for better scroll experience
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
  pricingRow: {
    marginTop: 4,
  },
  pricingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  pricingText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.success,
    fontWeight: '700',
  },
  arrowIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
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
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  loadMoreText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.overlay,
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
  },
  filterContent: {
    maxHeight: 450,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 16,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterChipButtonActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderColor: WHATSAPP_COLORS.primaryDark,
  },
  filterChipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  filterChipButtonTextActive: {
    color: WHATSAPP_COLORS.white,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    borderRadius: 12,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.white,
    fontWeight: '700',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHATSAPP_COLORS.overlay,
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

export default ListSite;