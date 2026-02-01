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
  const [filterValue, setFilterValue] = useState('all');
  const [isSearchMode, setIsSearchMode] = useState(false);

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

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    onSearch('');
  };

  const handleTabPress = (tabId: string) => {
    if (tabId === 'all') {
      setFilterBy('');
      setFilterValue('all');
      onFilter('', '');
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
          ) : null}
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