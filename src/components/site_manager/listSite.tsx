import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  token: string | null;
  onSitePress: (site: Site) => void;
  onEditSite: (site: Site) => void;
  onDeleteSite: (siteId: number) => void;
  onCreateSite: () => void;
  onRefreshParent?: () => void;
  theme: any;
}

interface FilterOption {
  value: string;
  label: string;
}

const ListSite: React.FC<ListSiteProps> = ({
  token,
  onSitePress,
  onEditSite,
  onDeleteSite,
  onCreateSite,
  onRefreshParent,
  theme,
}) => {
  // State Management
  const [sites, setSites] = useState<Site[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSites, setSelectedSites] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showFloorConditionFilter, setShowFloorConditionFilter] = useState(false);
  const [showPropertyTypeFilter, setShowPropertyTypeFilter] = useState(false);
  
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

  // API Call: Search and Filter Sites
  const searchAndFilterSites = useCallback(async (
    tags: string[] = [],
    filters: any = {},
    page: number = 1,
    append: boolean = false
  ) => {
    if (!token) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Build filters object for API
      const apiFilters: any = {};
      
      if (filters.building_status && filters.building_status.length > 0) {
        apiFilters.building_status = filters.building_status.join(',');
      }
      if (filters.floor_condition && filters.floor_condition.length > 0) {
        apiFilters.floor_condition = filters.floor_condition.join(',');
      }
      if (filters.property_type && filters.property_type.length > 0) {
        apiFilters.property_type = filters.property_type.join(',');
      }

      const response = await fetch(`${BACKEND_URL}/manager/searchAndFilterSites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          queries: tags, // Send array of search queries
          page,
          page_size: 20,
          filters: apiFilters
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.message !== "Sites search successful") {
        throw new Error(data.message || 'Failed to fetch sites');
      }

      if (append) {
        setSites(prev => [...prev, ...data.sites]);
      } else {
        setSites(data.sites);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching sites:', error);
      Alert.alert('Error', 'Failed to fetch sites. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (token) {
      searchAndFilterSites([], localFilters, 1, false);
    }
  }, [token]);

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

  // Search Tag Handlers
  const addSearchTag = useCallback(() => {
    const trimmedQuery = localSearchQuery.trim();
    if (trimmedQuery && !searchTags.includes(trimmedQuery)) {
      const newTags = [...searchTags, trimmedQuery];
      setSearchTags(newTags);
      setLocalSearchQuery('');
      searchAndFilterSites(newTags, localFilters, 1, false);
    }
  }, [localSearchQuery, searchTags, localFilters, searchAndFilterSites]);

  const removeSearchTag = useCallback((tagToRemove: string) => {
    const newTags = searchTags.filter(tag => tag !== tagToRemove);
    setSearchTags(newTags);
    searchAndFilterSites(newTags, localFilters, 1, false);
  }, [searchTags, localFilters, searchAndFilterSites]);

  const clearAllSearchTags = useCallback(() => {
    setSearchTags([]);
    setLocalSearchQuery('');
    searchAndFilterSites([], localFilters, 1, false);
  }, [localFilters, searchAndFilterSites]);

  // Handle Enter key press to add tag
  const handleSearchKeyPress = useCallback((e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      addSearchTag();
    }
  }, [addSearchTag]);

  // Filter Handlers
  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: values
    }));
  }, []);

  const applyFilters = useCallback(() => {
    searchAndFilterSites(searchTags, localFilters, 1, false);
    setShowFilterModal(false);
  }, [localFilters, searchTags, searchAndFilterSites]);

  const clearFilters = useCallback(() => {
    const emptyFilters = {
      building_status: [],
      floor_condition: [],
      property_type: [],
    };
    setLocalFilters(emptyFilters);
    searchAndFilterSites(searchTags, emptyFilters, 1, false);
    setShowFilterModal(false);
  }, [searchTags, searchAndFilterSites]);

  // Remove individual filter
  const removeFilter = useCallback((filterKey: string, value: string) => {
    const newFilters = {
      ...localFilters,
      [filterKey]: localFilters[filterKey].filter((v: string) => v !== value)
    };
    setLocalFilters(newFilters);
    searchAndFilterSites(searchTags, newFilters, 1, false);
  }, [localFilters, searchTags, searchAndFilterSites]);

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

  // Bulk Delete Handler
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
              if (!token) return;
              
              const response = await fetch(`${BACKEND_URL}/manager/deleteSite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  site_ids: selectedSites
                })
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const data = await response.json();

              if (data.message !== "Site deleted successfully") {
                throw new Error(data.message || 'Failed to delete sites');
              }

              Alert.alert('Success', `${selectedSites.length} site(s) deleted successfully`);
              cancelSelection();
              searchAndFilterSites(searchTags, localFilters, 1, false);
              onRefreshParent?.();
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
  }, [selectedSites, token, cancelSelection, searchAndFilterSites, searchTags, localFilters, onRefreshParent]);

  // Load More Handler
  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore) {
      searchAndFilterSites(searchTags, localFilters, pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, searchAndFilterSites, searchTags, localFilters]);

  // Refresh Handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    searchAndFilterSites(searchTags, localFilters, 1, false);
  }, [searchAndFilterSites, searchTags, localFilters]);

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
          {searchTags.length > 0 || activeFilterCount > 0
            ? 'Try adjusting your search or filter criteria'
            : 'Get started by creating your first site'}
        </Text>
        {searchTags.length === 0 && activeFilterCount === 0 && (
          <TouchableOpacity style={styles.createButton} onPress={onCreateSite}>
            <Ionicons name="add" size={20} color={WHATSAPP_COLORS.white} />
            <Text style={styles.createButtonText}>Create First Site</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, searchTags, onCreateSite]);

  // Render Filter Dropdown
  const renderFilterDropdown = useCallback((
    visible: boolean,
    title: string,
    options: FilterOption[],
    currentValues: string[],
    onToggle: (value: string) => void,
    onClose: () => void
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <ScrollView style={styles.dropdownScroll}>
            {options.map((option) => {
              const isSelected = currentValues.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.dropdownOption}
                  onPress={() => onToggle(option.value)}
                >
                  <Text style={styles.dropdownOptionText}>{option.label}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={WHATSAPP_COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  ), []);

  // Render Filter Modal
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
            <Text style={styles.filterModalTitle}>Filter Sites</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterList}>
            {/* Property Type Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowPropertyTypeFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="business" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Property Type</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {localFilters.property_type.length > 0 
                    ? `${localFilters.property_type.length} selected` 
                    : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* Building Status Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowStatusFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="flag" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Building Status</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {localFilters.building_status.length > 0 
                    ? `${localFilters.building_status.length} selected` 
                    : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* Floor Condition Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowFloorConditionFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="layers" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Floor Condition</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {localFilters.floor_condition.length > 0 
                    ? `${localFilters.floor_condition.length} selected` 
                    : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFiltersButton} onPress={applyFilters}>
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showFilterModal, localFilters, clearFilters, applyFilters]);

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
            placeholder="Add search term "
            value={localSearchQuery}
            onChangeText={setLocalSearchQuery}
            onSubmitEditing={addSearchTag}
            onKeyPress={handleSearchKeyPress}
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            returnKeyType="search"
          />
          {localSearchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={addSearchTag}
              style={styles.addSearchButton}
            >
              <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.primary} />
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
            {selectionMode && (
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => setShowActionsModal(true)}
              >
                <Ionicons name="settings-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{selectedSites.length}</Text>
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
            {selectedSites.length} site(s) selected
          </Text>
          <TouchableOpacity onPress={cancelSelection}>
            <Text style={styles.cancelSelectionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Tags */}
      {searchTags.length > 0 && !selectionMode && (
        <View style={styles.searchTagsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.searchTagsContent}>
              {searchTags.map((tag, index) => (
                <View key={`search-tag-${index}`} style={styles.searchTag}>
                  <Ionicons name="search" size={12} color={WHATSAPP_COLORS.primary} />
                  <Text style={styles.searchTagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeSearchTag(tag)}>
                    <Ionicons name="close-circle" size={16} color={WHATSAPP_COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={clearAllSearchTags} style={styles.clearAllTagsButton}>
                <Text style={styles.clearAllTagsText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Active Filters */}
      {activeFilterCount > 0 && !selectionMode && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {localFilters.property_type.map((value) => {
              const option = PROPERTY_TYPE_OPTIONS.find(o => o.value === value);
              return (
                <View key={`prop-${value}`} style={styles.activeFilter}>
                  <Text style={styles.activeFilterText}>
                    {option?.label || value}
                  </Text>
                  <TouchableOpacity onPress={() => removeFilter('property_type', value)}>
                    <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                  </TouchableOpacity>
                </View>
              );
            })}
            {localFilters.building_status.map((value) => (
              <View key={`status-${value}`} style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>
                  {beautifyName(value)}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('building_status', value)}>
                  <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
            {localFilters.floor_condition.map((value) => (
              <View key={`floor-${value}`} style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>
                  {beautifyName(value)}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('floor_condition', value)}>
                  <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
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
                onPress={handleLoadMore}
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

      {/* Filter Dropdowns */}
      {renderFilterDropdown(
        showPropertyTypeFilter,
        'Select Property Type',
        PROPERTY_TYPE_OPTIONS,
        localFilters.property_type,
        (value) => {
          const newValues = localFilters.property_type.includes(value)
            ? localFilters.property_type.filter(v => v !== value)
            : [...localFilters.property_type, value];
          handleFilterChange('property_type', newValues);
        },
        () => setShowPropertyTypeFilter(false)
      )}
      {renderFilterDropdown(
        showStatusFilter,
        'Select Building Status',
        BUILDING_STATUS_OPTIONS,
        localFilters.building_status,
        (value) => {
          const newValues = localFilters.building_status.includes(value)
            ? localFilters.building_status.filter(v => v !== value)
            : [...localFilters.building_status, value];
          handleFilterChange('building_status', newValues);
        },
        () => setShowStatusFilter(false)
      )}
      {renderFilterDropdown(
        showFloorConditionFilter,
        'Select Floor Condition',
        FLOOR_CONDITION_OPTIONS,
        localFilters.floor_condition,
        (value) => {
          const newValues = localFilters.floor_condition.includes(value)
            ? localFilters.floor_condition.filter(v => v !== value)
            : [...localFilters.floor_condition, value];
          handleFilterChange('floor_condition', newValues);
        },
        () => setShowFloorConditionFilter(false)
      )}

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
  addSearchButton: {
    position: 'absolute',
    right: 50,
    zIndex: 1,
    padding: 4,
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
  searchTagsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  searchTagsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.primary + '30',
  },
  searchTagText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  clearAllTagsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: WHATSAPP_COLORS.danger + '10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.danger + '30',
  },
  clearAllTagsText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.danger,
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