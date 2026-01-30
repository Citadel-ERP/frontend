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
  Image,
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

interface Site {
  id: number;
  building_name: string;
  location: string;
  building_status: string;
  floor_condition: string;
  total_area: string;
  rent: string;
  managed_property: boolean;
  conventional_property: boolean;
  created_at: string;
  updated_at: string;
  created_by: any;
  active: boolean;
  building_photos: any[];
  meta: any;
  nearest_metro_station: any;
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
  onSearch,
  onFilter,
  onLoadMore,
  onRefresh,
  onCreateSite,
  theme,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showBuildingStatusFilter, setShowBuildingStatusFilter] = useState(false);
  const [showFloorConditionFilter, setShowFloorConditionFilter] = useState(false);
  const [showCityFilter, setShowCityFilter] = useState(false);
  const [showManagedFilter, setShowManagedFilter] = useState(false);
  const [showConventionalFilter, setShowConventionalFilter] = useState(false);

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
    { value: 'fully_furnished', label: 'Fully Furnished' },
    { value: 'semi_furnished', label: 'Semi Furnished' },
  ];

  const BOOLEAN_OPTIONS: FilterOption[] = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
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
    switch (status) {
      case 'available': return WHATSAPP_COLORS.success;
      case 'leased_out': return WHATSAPP_COLORS.danger;
      case 'readily_available': return WHATSAPP_COLORS.info;
      case 'ready_to_move_in': return WHATSAPP_COLORS.warning;
      case 'ready_for_fitouts': return WHATSAPP_COLORS.accent;
      default: return WHATSAPP_COLORS.textSecondary;
    }
  }, []);

  const renderSiteItem = useCallback((item: Site, index: number) => {
    const avatarColor = getAvatarColor(item.building_name);
    const initials = getInitials(item.building_name);
    const lastUpdated = formatDate(item.updated_at);
    const statusColor = getStatusColor(item.building_status);
    const isManaged = item.managed_property;
    
    const pricingText = isManaged && item.rent_per_seat 
      ? `₹${item.rent_per_seat}/seat`
      : item.rent && item.total_area 
        ? `₹${(parseFloat(item.rent) / parseFloat(item.total_area)).toFixed(2)}/sq-ft`
        : item.rent ? `₹${item.rent}` : '';

    return (
      <TouchableOpacity 
        key={item.id}
        style={styles.siteItem} 
        onPress={() => onSitePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.siteAvatar, { backgroundColor: avatarColor }]}>
          {item.building_photos?.length > 0 ? (
            <Image
              source={{ uri: item.building_photos[0].file_url }}
              style={styles.siteImage}
            />
          ) : (
            <Text style={styles.siteAvatarText}>{initials}</Text>
          )}
          {item.building_photos?.length > 0 && (
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>{item.building_photos.length}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.siteContent}>
          <View style={styles.siteHeader}>
            <Text style={styles.siteName} numberOfLines={1}>
              {item.building_name || 'Unnamed Site'}
            </Text>
            <View style={styles.siteActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEditSite(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="create-outline" size={18} color={WHATSAPP_COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDeleteSite(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={WHATSAPP_COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.siteLocation}>
            <Ionicons name="location" size={12} color={WHATSAPP_COLORS.textSecondary} />
            <Text style={styles.siteLocationText} numberOfLines={1}>
              {item.location || 'No location'}
            </Text>
          </View>
          
          <View style={styles.siteStatusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {beautifyName(item.building_status)}
              </Text>
            </View>
            
            <Text style={styles.siteTime}>{lastUpdated}</Text>
          </View>
          
          <View style={styles.siteDetails}>
            <View style={styles.siteDetail}>
              <Ionicons name="business" size={12} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.siteDetailText}>
                {isManaged ? '💼 Managed' : '🏛️ Conventional'}
              </Text>
            </View>
            
            {item.floor_condition && (
              <View style={styles.siteDetail}>
                <Ionicons name="layers" size={12} color={WHATSAPP_COLORS.textTertiary} />
                <Text style={styles.siteDetailText}>
                  {beautifyName(item.floor_condition)}
                </Text>
              </View>
            )}
            
            {item.total_area && (
              <View style={styles.siteDetail}>
                <Ionicons name="expand" size={12} color={WHATSAPP_COLORS.textTertiary} />
                <Text style={styles.siteDetailText}>
                  {item.total_area} sq ft
                </Text>
              </View>
            )}
          </View>
          
          {pricingText && (
            <View style={styles.sitePricing}>
              <Ionicons name="cash" size={12} color={WHATSAPP_COLORS.success} />
              <Text style={styles.sitePricingText}>{pricingText}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.siteArrow}>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }, [onSitePress, onEditSite, onDeleteSite]);

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
        <Ionicons name="business" size={64} color={WHATSAPP_COLORS.border} />
        <Text style={styles.emptyStateText}>No sites found</Text>
        <Text style={styles.emptyStateSubtext}>
          {searchQuery || Object.keys(filter).length > 0
            ? 'Try changing your search or filter criteria'
            : 'Create your first site to get started'}
        </Text>
        {!searchQuery && Object.keys(filter).length === 0 && (
          <TouchableOpacity style={styles.createFirstButton} onPress={onCreateSite}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createFirstButtonText}>Create First Site</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, searchQuery, filter, onCreateSite]);

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
            {/* Building Status Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowBuildingStatusFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="flag" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Building Status</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {filter.building_status ? beautifyName(filter.building_status) : 'All'}
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
                  {filter.floor_condition ? beautifyName(filter.floor_condition) : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* City Filter */}
            <View style={styles.filterOption}>
              <View style={styles.filterOptionLeft}>
                <Ionicons name="location" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>City</Text>
              </View>
              <TextInput
                style={styles.cityInput}
                value={filter.city || ''}
                onChangeText={(text) => handleFilterChange('city', text || null)}
                placeholder="Enter city..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              />
            </View>

            {/* Managed Property Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowManagedFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="people" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Managed Property</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {filter.managed_property === 'true' ? 'Yes' : filter.managed_property === 'false' ? 'No' : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* Conventional Property Filter */}
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowConventionalFilter(true)}
            >
              <View style={styles.filterOptionLeft}>
                <Ionicons name="business" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.filterOptionLabel}>Conventional Property</Text>
              </View>
              <View style={styles.filterOptionRight}>
                <Text style={styles.filterOptionValue}>
                  {filter.conventional_property === 'true' ? 'Yes' : filter.conventional_property === 'false' ? 'No' : 'All'}
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
            placeholder="Search sites..."
            value={localSearchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
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
                case 'building_status':
                  label = 'Status';
                  displayValue = beautifyName(String(value));
                  break;
                case 'floor_condition':
                  label = 'Floor';
                  displayValue = beautifyName(String(value));
                  break;
                case 'city':
                  label = 'City';
                  displayValue = String(value);
                  break;
                case 'managed_property':
                  label = 'Managed';
                  displayValue = value === 'true' ? 'Yes' : 'No';
                  break;
                case 'conventional_property':
                  label = 'Conventional';
                  displayValue = value === 'true' ? 'Yes' : 'No';
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

      {/* Sites List - Now just rendering items without FlatList */}
      <View style={styles.listContainer}>
        {sites.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {sites.map((item, index) => renderSiteItem(item, index))}
            
            {/* Load More Button */}
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
                    <Ionicons name="refresh" size={20} color={WHATSAPP_COLORS.primary} />
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* Filter Dropdowns */}
      {renderFilterDropdown(
        showBuildingStatusFilter,
        'Select Building Status',
        BUILDING_STATUS_OPTIONS,
        filter.building_status,
        (value) => handleFilterChange('building_status', value),
        () => setShowBuildingStatusFilter(false)
      )}

      {renderFilterDropdown(
        showFloorConditionFilter,
        'Select Floor Condition',
        FLOOR_CONDITION_OPTIONS,
        filter.floor_condition,
        (value) => handleFilterChange('floor_condition', value),
        () => setShowFloorConditionFilter(false)
      )}

      {renderFilterDropdown(
        showManagedFilter,
        'Managed Property',
        BOOLEAN_OPTIONS,
        filter.managed_property,
        (value) => handleFilterChange('managed_property', value),
        () => setShowManagedFilter(false)
      )}

      {renderFilterDropdown(
        showConventionalFilter,
        'Conventional Property',
        BOOLEAN_OPTIONS,
        filter.conventional_property,
        (value) => handleFilterChange('conventional_property', value),
        () => setShowConventionalFilter(false)
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
  filterButton: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
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
  },
  siteItem: {
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
  siteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  siteImage: {
    width: '100%',
    height: '100%',
  },
  siteAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  photoCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  siteContent: {
    flex: 1,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  siteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  siteLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  siteLocationText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
  },
  siteStatusRow: {
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
  siteTime: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textTertiary,
  },
  siteDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  siteDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  siteDetailText: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textSecondary,
  },
  sitePricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sitePricingText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.success,
    fontWeight: '600',
  },
  siteArrow: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  emptyState: {
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
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
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
  cityInput: {
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

export default ListSite;