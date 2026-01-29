import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { ThemeColors, FilterOption } from './types';
import DropdownModal from './dropdownModal';
import { Ionicons } from '@expo/vector-icons';

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filterBy: string, filterValue: string) => void;
  theme: ThemeColors;
}

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
} as const;

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearch,
  onFilter,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'filter' | 'status' | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'scout_completed', label: 'Scout Completed' },
    { value: 'admin_completed', label: 'Admin Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Visits' },
    { value: 'status', label: 'Filter by Status' },
  ];

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'scout_completed', label: 'Completed' },
  ];

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      setIsSearchMode(true);
    }
  };

  const handleFilterSelection = (filterType: string) => {
    setFilterBy(filterType);
    if (!filterType) {
      setFilterValue('');
      onFilter('', '');
    } else if (filterType === 'status') {
      setTimeout(() => {
        setActiveDropdown('status');
      }, 300);
    }
  };

  const beautifyName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    if (filterKey === 'status') {
      const option = STATUS_CHOICES.find(choice => choice.value === value);
      return option ? option.label : beautifyName(value);
    }
    return beautifyName(value);
  };

  const clearFilters = () => {
    setFilterBy('');
    setFilterValue('');
    onFilter('', '');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    onSearch('');
  };

  const handleTabPress = (tabId: string) => {
    if (tabId === 'all') {
      clearFilters();
    } else {
      setFilterBy('status');
      setFilterValue(tabId);
      onFilter('status', tabId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Section */}
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
            placeholder="Search visits..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={WHATSAPP_COLORS.textTertiary} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setActiveDropdown('filter')}
              style={styles.filterButton}
            >
              <Ionicons 
                name="filter" 
                size={20} 
                color={WHATSAPP_COLORS.primary} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              filterValue === tab.id && [
                styles.activeTab, 
                { backgroundColor: WHATSAPP_COLORS.primary }
              ]
            ]}
            onPress={() => handleTabPress(tab.id)}
          >
            <Text style={[
              styles.tabText,
              { color: WHATSAPP_COLORS.textSecondary },
              filterValue === tab.id && [
                styles.activeTabText, 
                { color: WHATSAPP_COLORS.white }
              ]
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active Filter Indicator */}
      {filterBy && filterValue && (
        <View style={styles.activeFilterContainer}>
          <View style={styles.activeFilterBadge}>
            <Ionicons 
              name="funnel" 
              size={14} 
              color={WHATSAPP_COLORS.primary} 
            />
            <Text style={styles.activeFilterText}>
              {getFilterLabel(filterBy, filterValue)}
            </Text>
            <TouchableOpacity 
              onPress={clearFilters} 
              style={styles.clearFilterButton}
            >
              <Ionicons 
                name="close" 
                size={14} 
                color={WHATSAPP_COLORS.textTertiary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Mode Indicator */}
      {isSearchMode && (
        <View style={styles.searchModeIndicator}>
          <View style={styles.searchModeBadge}>
            <Ionicons 
              name="search" 
              size={14} 
              color={WHATSAPP_COLORS.success} 
            />
            <Text style={styles.searchModeText}>
              Search: "{searchQuery}"
            </Text>
            <TouchableOpacity onPress={clearSearch}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter Modals */}
      <DropdownModal
        visible={activeDropdown === 'filter'}
        onClose={() => setActiveDropdown(null)}
        options={FILTER_OPTIONS}
        onSelect={handleFilterSelection}
        title="Filter Options"
        theme={{
          ...theme,
          primary: WHATSAPP_COLORS.primary,
          background: WHATSAPP_COLORS.background,
          cardBg: WHATSAPP_COLORS.surface,
          text: WHATSAPP_COLORS.textPrimary,
          border: WHATSAPP_COLORS.border,
        }}
      />

      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => {
          setFilterValue(value);
          onFilter('status', value);
          setActiveDropdown(null);
        }}
        title="Select Status"
        theme={{
          ...theme,
          primary: WHATSAPP_COLORS.primary,
          background: WHATSAPP_COLORS.background,
          cardBg: WHATSAPP_COLORS.surface,
          text: WHATSAPP_COLORS.textPrimary,
          border: WHATSAPP_COLORS.border,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: WHATSAPP_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 45,
    paddingVertical: 12,
    fontSize: 16,
    flex: 1,
    color: WHATSAPP_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  searchIcon: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    padding: 4,
  },
  filterButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    padding: 4,
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  activeTab: {
    borderColor: WHATSAPP_COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  activeFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.primary,
  },
  clearFilterButton: {
    marginLeft: 4,
    padding: 2,
  },
  searchModeIndicator: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.success + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  searchModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.success,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.danger,
    marginLeft: 8,
  },
});

export default SearchAndFilter;