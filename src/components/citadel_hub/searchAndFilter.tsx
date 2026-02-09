import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: 'all' | 'unread' | 'groups';
  onFilterChange: (type: 'all' | 'unread' | 'groups') => void;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
}) => {
  return (
    <View style={styles.searchFilterContainer}>
      {/* Search Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#8696a0" style={styles.searchIcon} />
        <TextInput
          placeholder="Search or start new chat"
          placeholderTextColor="#8696a0"
          value={searchQuery}
          onChangeText={onSearchChange}
          style={styles.searchInput}
        />
        {searchQuery ? (
          <TouchableOpacity 
            style={styles.clearSearch}
            onPress={() => onSearchChange('')}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#8696a0" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'all' && styles.filterTabActive,
          ]}
          onPress={() => onFilterChange('all')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.filterTabText,
            filterType === 'all' && styles.filterTabTextActive,
          ]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'unread' && styles.filterTabActive,
          ]}
          onPress={() => onFilterChange('unread')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.filterTabText,
            filterType === 'unread' && styles.filterTabTextActive,
          ]}>
            Unread
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filterType === 'groups' && styles.filterTabActive,
          ]}
          onPress={() => onFilterChange('groups')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.filterTabText,
            filterType === 'groups' && styles.filterTabTextActive,
          ]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchFilterContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111b21',
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f2f5',
  },
  filterTabActive: {
    backgroundColor: '#d1f4cc',
  },
  filterTabText: {
    fontSize: 14,
    color: '#54656f',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#008069',
  },
});