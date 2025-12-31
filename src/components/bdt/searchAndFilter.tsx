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
  token: string | null;
  onSearch: (query: string) => void;
  onFilter: (filterBy: string, filterValue: string) => void;
  theme: ThemeColors;
  allPhases: FilterOption[];
  allSubphases: FilterOption[];
  fetchSubphases: (phase: string) => Promise<void>;
  totalLeads: number;
  statusCounts: Record<string, number>;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearch,
  onFilter,
  theme,
  allPhases,
  allSubphases,
  fetchSubphases,
  totalLeads,
  statusCounts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'filter' | 'status' | 'filter-phase' | 'filter-subphase' | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no-requirement', label: 'No Requirement' },
    { value: 'transaction-complete', label: 'Transaction Complete' },
    { value: 'non-responsive', label: 'Non Responsive' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Leads' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'phase', label: 'Filter by Phase' },
    { value: 'subphase', label: 'Filter by Subphase' }
  ];

  const tabs = [
    { id: 'all', label: `All leads (${totalLeads || 0})` },
    { id: 'active', label: `Active (${statusCounts.active || 0})` },
    { id: 'hold', label: `Hold (${statusCounts.hold || 0})` },
    { id: 'mandate', label: `Mandate (${statusCounts.mandate || 0})` },
    { id: 'closed', label: `Closed (${statusCounts.closed || 0})` },
    { id: 'no-requirement', label: `No Requirement (${statusCounts['no-requirement'] || 0})` },
    { id: 'transaction-complete', label: `Transaction Complete (${statusCounts['transaction-complete'] || 0})` },
    { id: 'non-responsive', label: `Non Responsive (${statusCounts['non-responsive'] || 0})` }
  ];

  const handleSearchSubmit = () => {
    onSearch(searchQuery);
    setIsSearchMode(true);
  };

  const handleFilterSelection = (filterType: string) => {
    setFilterBy(filterType);
    if (!filterType) {
      setFilterValue('');
      setSelectedPhase('');
      onFilter('', '');
    } else {
      setTimeout(() => {
        if (filterType === 'status') {
          setActiveDropdown('status');
        } else if (filterType === 'phase') {
          setActiveDropdown('filter-phase');
        } else if (filterType === 'subphase') {
          if (allPhases.length > 0) {
            setActiveDropdown('filter-phase');
          }
        }
      }, 300);
    }
  };

  const handlePhaseSelectionForFilter = async (phase: string) => {
    setSelectedPhase(phase);
    if (filterBy === 'phase') {
      setFilterValue(phase);
      onFilter('phase', phase);
      setActiveDropdown(null);
    } else if (filterBy === 'subphase') {
      await fetchSubphases(phase);
      setTimeout(() => {
        setActiveDropdown('filter-subphase');
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
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'phase': choices = allPhases; break;
      case 'subphase': choices = allSubphases; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  const clearFilters = () => {
    setFilterBy('');
    setFilterValue('');
    setSelectedPhase('');
    setActiveTab('all');
    onFilter('', '');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    onSearch('');
  };

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    
    if (tabId === 'all') {
      clearFilters();
    } else {
      setFilterBy('status');
      setFilterValue(tabId);
      onFilter('status', tabId);
    }
  };

  return (
    <>
      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#017bf9" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Leads"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholderTextColor="#666"
          />
          <TouchableOpacity 
            style={styles.gearButton}
            onPress={() => setActiveDropdown('filter')}
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsContainer, { backgroundColor: theme.cardBg }]}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab, 
              activeTab === tab.id && [styles.activeTab, { backgroundColor: theme.primary }]
            ]}
            onPress={() => handleTabPress(tab.id)}
          >
            <Text style={[
              styles.tabText, 
              { color: theme.textSecondary },
              activeTab === tab.id && [styles.activeTabText, { color: theme.white }]
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active Filter Indicator */}
      {filterBy && filterValue && activeTab !== filterValue && (
        <View style={[styles.activeFilterContainer, { backgroundColor: theme.info + '20' }]}>
          <Text style={[styles.activeFilterText, { color: theme.info }]}>
            {getFilterLabel(filterBy, filterValue)}
          </Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={[styles.clearFilterText, { color: theme.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Mode Indicator */}
      {isSearchMode && (
        <View style={[styles.searchModeIndicator, { backgroundColor: theme.success + '20' }]}>
          <Text style={[styles.searchModeText, { color: theme.success }]}>
            Search results for: "{searchQuery}"
          </Text>
          <TouchableOpacity onPress={clearSearch}>
            <Text style={[styles.clearSearchText, { color: theme.error }]}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modals */}
      <DropdownModal
        visible={activeDropdown === 'filter'}
        onClose={() => setActiveDropdown(null)}
        options={FILTER_OPTIONS}
        onSelect={handleFilterSelection}
        title="Filter Options"
        theme={theme}
      />

      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => {
          setFilterValue(value);
          setActiveTab(value);
          onFilter('status', value);
          setActiveDropdown(null);
        }}
        title="Select Status"
        theme={theme}
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelectionForFilter}
        title={filterBy === 'subphase' ? "Select Phase (for Subphase)" : "Select Phase"}
        theme={theme}
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => {
          setFilterValue(value);
          onFilter('subphase', value);
          setActiveDropdown(null);
        }}
        title="Select Subphase"
        theme={theme}
      />
    </>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  searchInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 25,
    paddingHorizontal: 45,
    paddingVertical: 15,
    fontSize: 16,
    flex: 1,
    color: '#333',
  },
  searchIcon: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
    fontSize: 20,
  },
  gearButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  gearIcon: {
    fontSize: 20,
  },
  tabsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 55,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  activeTab: {
    maxHeight: 30, 
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  activeFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchModeIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SearchAndFilter;