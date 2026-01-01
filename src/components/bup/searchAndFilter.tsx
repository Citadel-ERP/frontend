import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, FilterOption } from './types';
import DropdownModal from './dropdownModal';

interface SearchAndFilterProps {
  token: string | null;
  onSearch: (query: string) => void;
  onFilter: (filterBy: string, filterValue: string) => void;
  theme: ThemeColors;
  allPhases: FilterOption[];
  allSubphases: FilterOption[];
  fetchSubphases: (phase: string) => Promise<void>;
  selectedCity: string;
  onCreateLead: () => void;
  onBack: () => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearch,
  onFilter,
  theme,
  allPhases,
  allSubphases,
  fetchSubphases,
  selectedCity,
  onCreateLead,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<'filter' | 'status' | 'filter-phase' | 'filter-subphase' | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' },
    { value: 'no_requirement', label: 'No Requirement' },
    { value: 'transaction_complete', label: 'Transaction Complete' },
    { value: 'non_responsive', label: 'Non Responsive' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Leads' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'phase', label: 'Filter by Phase' },
    { value: 'subphase', label: 'Filter by Subphase' }
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
    onFilter('', '');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    onSearch('');
  };

  return (
    <>
      {/* City Header */}
      <View style={[styles.cityHeader, { backgroundColor: theme.info + '10' }]}>
        <Text style={[styles.cityText, { color: theme.info }]}>
          📍 {selectedCity}
        </Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#017bf9" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads..."
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

      {/* Active Filter Indicator */}
      {filterBy && filterValue && (
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
  cityHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cityText: {
    fontSize: 18,
    fontWeight: '600',
  },
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