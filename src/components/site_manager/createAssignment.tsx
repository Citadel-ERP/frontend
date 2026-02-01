import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_IOS = Platform.OS === 'ios';
const IS_WEB = Platform.OS === 'web';

interface Site {
  id: number;
  building_name: string;
  location: string;
  building_status: string;
  floor_condition?: string;
  total_area?: string;
  rent?: string;
  rent_per_seat?: string;
  managed_property: boolean;
  conventional_property: boolean;
  for_sale_property?: boolean;
}

interface Scout {
  employee_id: string;
  first_name: string;
  last_name: string;
  profile_picture: string;
}

interface CreateAssignmentProps {
  token: string | null;
  sites: Site[];
  onBack: () => void;
  onAssignmentCreated: () => void;
  theme: any;
}

const CreateAssignment: React.FC<CreateAssignmentProps> = ({
  token,
  sites,
  onBack,
  onAssignmentCreated,
  theme,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingScouts, setLoadingScouts] = useState(false);
  const [selectedSites, setSelectedSites] = useState<Site[]>([]);
  const [selectedScout, setSelectedScout] = useState<Scout | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [showSiteSearch, setShowSiteSearch] = useState(false);
  const [showScoutSearch, setShowScoutSearch] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [scoutSearchQuery, setScoutSearchQuery] = useState('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showFloorConditionFilter, setShowFloorConditionFilter] = useState(false);
  const [showPropertyTypeFilter, setShowPropertyTypeFilter] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    building_status: [] as string[],
    floor_condition: [] as string[],
    property_type: [] as string[],
  });

  // Filter options
  const BUILDING_STATUS_OPTIONS = [
    { value: 'available', label: 'Available' },
    { value: 'leased_out', label: 'Leased Out' },
    { value: 'readily_available', label: 'Readily Available' },
    { value: 'ready_to_move_in', label: 'Ready to Move In' },
    { value: 'ready_for_fitouts', label: 'Ready for Fitouts' },
  ];

  const FLOOR_CONDITION_OPTIONS = [
    { value: 'bareshell', label: 'Bareshell' },
    { value: 'warmshell', label: 'Warmshell' },
    { value: 'extended_warmshell', label: 'Extended Warmshell' },
    { value: 'fully_furnished', label: 'Fully Furnished' },
    { value: 'semi_furnished', label: 'Semi Furnished' },
  ];

  const PROPERTY_TYPE_OPTIONS = [
    { value: 'managed', label: 'Managed Office' },
    { value: 'conventional', label: 'Conventional Office' },
    { value: 'for_sale', label: 'For Sale' },
  ];

  // Helper functions
  const beautifyName = useCallback((name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

  const getPropertyTypeBadgeColor = useCallback((site: Site): string => {
    if (site.for_sale_property) return WHATSAPP_COLORS.lightRed;
    if (site.managed_property) return WHATSAPP_COLORS.lightBlue;
    if (site.conventional_property) return WHATSAPP_COLORS.lightGreen;
    return WHATSAPP_COLORS.chipBackground;
  }, []);

  const getPropertyTypeText = useCallback((site: Site): string => {
    if (site.for_sale_property) return '🏢 For Sale';
    if (site.managed_property) return '💼 Managed';
    if (site.conventional_property) return '🏛️ Conventional';
    return '🏢 Office';
  }, []);

  // Filter sites based on search query and active filters
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      // Search filter
      const matchesSearch = 
        site.building_name.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
        site.location.toLowerCase().includes(siteSearchQuery.toLowerCase());

      // Status filter
      const matchesStatus = activeFilters.building_status.length === 0 ||
        activeFilters.building_status.includes(site.building_status);

      // Floor condition filter
      const matchesFloorCondition = activeFilters.floor_condition.length === 0 ||
        (site.floor_condition && activeFilters.floor_condition.includes(site.floor_condition));

      // Property type filter
      const matchesPropertyType = activeFilters.property_type.length === 0 ||
        (site.for_sale_property && activeFilters.property_type.includes('for_sale')) ||
        (site.managed_property && activeFilters.property_type.includes('managed')) ||
        (site.conventional_property && activeFilters.property_type.includes('conventional'));

      return matchesSearch && matchesStatus && matchesFloorCondition && matchesPropertyType;
    });
  }, [sites, siteSearchQuery, activeFilters]);

  const filteredScouts = scouts.filter(scout => 
    scout.first_name.toLowerCase().includes(scoutSearchQuery.toLowerCase()) ||
    scout.last_name.toLowerCase().includes(scoutSearchQuery.toLowerCase()) ||
    scout.employee_id.toLowerCase().includes(scoutSearchQuery.toLowerCase())
  );

  const fetchScouts = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingScouts(true);
      const response = await fetch(`${BACKEND_URL}/manager/getScoutBoys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setScouts(data);
    } catch (error) {
      console.error('Error fetching scouts:', error);
      Alert.alert('Error', 'Failed to fetch scouts');
    } finally {
      setLoadingScouts(false);
    }
  }, [token]);

  useEffect(() => {
    fetchScouts();
  }, [fetchScouts]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleCreateAssignment = async () => {
    if (!token || selectedSites.length === 0 || !selectedScout || !selectedDate) {
      Alert.alert('Error', 'Please select at least one site, a scout, and a date');
      return;
    }

    // Combine date and time
    const dateString = formatDate(selectedDate);
    const dateTime = `${dateString} ${selectedTime}:00`;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/assignSiteVisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          site_ids: selectedSites.map(site => site.id),
          scout_id: selectedScout.employee_id,
          date: dateTime
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.message || !data.message.includes('Successfully assigned')) {
        throw new Error(data.message || 'Failed to create assignment');
      }

      Alert.alert('Success', data.message);
      onAssignmentCreated();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      Alert.alert('Error', error.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSite = (site: Site) => {
    setSelectedSites(prev => {
      if (prev.some(s => s.id === site.id)) {
        return prev.filter(s => s.id !== site.id);
      } else {
        return [...prev, site];
      }
    });
  };

  const handleSelectAllSites = () => {
    if (selectedSites.length === filteredSites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites([...filteredSites]);
    }
  };

  const handleSelectScout = (scout: Scout) => {
    setSelectedScout(scout);
    setShowScoutSearch(false);
    setScoutSearchQuery('');
  };

  const handleFilterChange = (key: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const currentValues = prev[key];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [key]: newValues };
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      building_status: [],
      floor_condition: [],
      property_type: [],
    });
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
  };

  const getAvatarColor = (name: string): string => {
    if (!name) return '#00d285';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#00d285', '#ff5e7a', '#ffb157', '#1da1f2', '#007AFF'];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const renderDatePickerModal = () => {
    const today = new Date();
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const goToPreviousMonth = () => {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setSelectedDate(newDate);
    };

    const goToNextMonth = () => {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setSelectedDate(newDate);
    };

    const selectDate = (day: number) => {
      const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      setSelectedDate(newDate);
      setShowDatePicker(false);
    };

    const renderCalendarDays = () => {
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      // Day headers
      dayNames.forEach(day => {
        days.push(
          <View key={`header-${day}`} style={styles.calendarDayHeader}>
            <Text style={styles.calendarDayHeaderText}>{day}</Text>
          </View>
        );
      });

      // Empty cells for days before the first day of month
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
      }

      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
        const isSelected = day === selectedDate.getDate();
        const isPast = currentDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        days.push(
          <TouchableOpacity
            key={`day-${day}`}
            style={[
              styles.calendarDay,
              isSelected && styles.calendarDaySelected,
              isPast && styles.calendarDayPast
            ]}
            onPress={() => !isPast && selectDate(day)}
            disabled={isPast}
          >
            <Text style={[
              styles.calendarDayText,
              isSelected && styles.calendarDayTextSelected,
              isPast && styles.calendarDayTextPast
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        );
      }

      return days;
    };

    return (
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
        statusBarTranslucent
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.monthNavigator}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
                <Ionicons name="chevron-back" size={24} color={WHATSAPP_COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.monthYearText}>
                {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
                <Ionicons name="chevron-forward" size={24} color={WHATSAPP_COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTimePickerModal = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const [selectedHour, selectedMinute] = selectedTime.split(':');

    return (
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
        statusBarTranslucent
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timePickerContent}>
              <ScrollView style={styles.timeColumn}>
                {hours.map(hour => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.timeOption,
                      selectedHour === hour && styles.timeOptionSelected
                    ]}
                    onPress={() => setSelectedTime(`${hour}:${selectedMinute}`)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      selectedHour === hour && styles.timeOptionTextSelected
                    ]}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <ScrollView style={styles.timeColumn}>
                {minutes.map(minute => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.timeOption,
                      selectedMinute === minute && styles.timeOptionSelected
                    ]}
                    onPress={() => setSelectedTime(`${selectedHour}:${minute}`)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      selectedMinute === minute && styles.timeOptionTextSelected
                    ]}>
                      {minute}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={styles.timePickerDoneButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.timePickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFilterDropdown = (
    visible: boolean,
    title: string,
    options: { value: string; label: string }[],
    currentValues: string[],
    onToggle: (value: string) => void,
    onClose: () => void
  ) => (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
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
  );

  const renderSiteSearchModal = () => {
    const activeFilterCount = 
      activeFilters.building_status.length +
      activeFilters.floor_condition.length +
      activeFilters.property_type.length;

    return (
      <Modal
        visible={showSiteSearch}
        animationType="slide"
        onRequestClose={() => setShowSiteSearch(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={IS_IOS ? 'padding' : undefined}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.searchModalHeader}>
              <TouchableOpacity 
                onPress={() => setShowSiteSearch(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={24} color={WHATSAPP_COLORS.surface} />
              </TouchableOpacity>
              <Text style={styles.searchModalTitle}>Select Sites</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons 
                  name="search" 
                  size={20} 
                  color={WHATSAPP_COLORS.textTertiary} 
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchModalInput}
                  placeholder="Search sites..."
                  value={siteSearchQuery}
                  onChangeText={setSiteSearchQuery}
                  placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                  autoFocus={!IS_IOS}
                />
                {siteSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSiteSearchQuery('')}
                    style={styles.clearSearchButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.textTertiary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowFilterModal(true)}
                  style={styles.filterButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                  {activeFilters.property_type.map((value) => {
                    const option = PROPERTY_TYPE_OPTIONS.find(o => o.value === value);
                    return (
                      <View key={`prop-${value}`} style={styles.activeFilter}>
                        <Text style={styles.activeFilterText}>
                          {option?.label || value}
                        </Text>
                        <TouchableOpacity 
                          onPress={() => handleFilterChange('property_type', value)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {activeFilters.building_status.map((value) => (
                    <View key={`status-${value}`} style={styles.activeFilter}>
                      <Text style={styles.activeFilterText}>
                        {beautifyName(value)}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => handleFilterChange('building_status', value)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {activeFilters.floor_condition.map((value) => (
                    <View key={`floor-${value}`} style={styles.activeFilter}>
                      <Text style={styles.activeFilterText}>
                        {beautifyName(value)}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => handleFilterChange('floor_condition', value)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={14} color={WHATSAPP_COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Selection Info */}
            <View style={styles.selectionInfoBar}>
              <Text style={styles.selectionInfoText}>
                {selectedSites.length} site(s) selected
              </Text>
              <TouchableOpacity 
                onPress={handleSelectAllSites}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.selectAllText}>
                  {selectedSites.length === filteredSites.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredSites}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedSites.some(s => s.id === item.id);
                const statusColor = getStatusColor(item.building_status);
                const propertyType = getPropertyTypeText(item);
                const propertyTypeColor = getPropertyTypeBadgeColor(item);
                
                const pricingText = item.managed_property && item.rent_per_seat
                  ? `${formatCurrency(item.rent_per_seat)}/seat`
                  : item.rent && item.total_area
                    ? `${formatCurrency(parseFloat(item.rent) / parseFloat(item.total_area))}/sq-ft`
                    : item.rent ? formatCurrency(item.rent) : '';

                return (
                  <TouchableOpacity
                    style={[
                      styles.siteCard,
                      isSelected && styles.siteCardSelected
                    ]}
                    onPress={() => handleSelectSite(item)}
                  >
                    {/* Selection Checkbox */}
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

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                          <Text style={styles.siteName} numberOfLines={1}>
                            {item.building_name}
                          </Text>
                          <View style={[styles.propertyTypeBadge, { backgroundColor: propertyTypeColor }]}>
                            <Text style={styles.propertyTypeText}>{propertyType}</Text>
                          </View>
                        </View>
                      </View>

                      {item.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textSecondary} />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {item.location}
                          </Text>
                        </View>
                      )}

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
                      </ScrollView>

                      {/* Pricing */}
                      {pricingText && (
                        <View style={styles.pricingRow}>
                          <View style={styles.pricingBadge}>
                            <Ionicons name="cash-outline" size={16} color={WHATSAPP_COLORS.success} />
                            <Text style={styles.pricingText}>{pricingText}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={styles.emptySearch}>
                  <Ionicons name="business" size={48} color={WHATSAPP_COLORS.border} />
                  <Text style={styles.emptySearchText}>No sites found</Text>
                </View>
              )}
            />

            {/* Selection Footer */}
            <View style={styles.selectionFooter}>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  selectedSites.length === 0 && styles.selectButtonDisabled
                ]}
                onPress={() => {
                  if (selectedSites.length > 0) {
                    setShowSiteSearch(false);
                    setSiteSearchQuery('');
                  }
                }}
                disabled={selectedSites.length === 0}
              >
                <Text style={styles.selectButtonText}>
                  Select {selectedSites.length} Site(s)
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Sites</Text>
            <TouchableOpacity 
              onPress={() => setShowFilterModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
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
                  {activeFilters.property_type.length > 0 
                    ? `${activeFilters.property_type.length} selected` 
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
                  {activeFilters.building_status.length > 0 
                    ? `${activeFilters.building_status.length} selected` 
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
                  {activeFilters.floor_condition.length > 0 
                    ? `${activeFilters.floor_condition.length} selected` 
                    : 'All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity 
              style={styles.clearFiltersButton} 
              onPress={clearAllFilters}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyFiltersButton} 
              onPress={() => setShowFilterModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.applyFiltersText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderScoutSearchModal = () => (
    <Modal
      visible={showScoutSearch}
      animationType="slide"
      onRequestClose={() => setShowScoutSearch(false)}
      statusBarTranslucent
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={IS_IOS ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowScoutSearch(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={WHATSAPP_COLORS.surface} />
            </TouchableOpacity>
            <Text style={styles.searchModalTitle}>Select Scout</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={WHATSAPP_COLORS.textTertiary} />
            <TextInput
              style={styles.searchModalInput}
              placeholder="Search scouts..."
              value={scoutSearchQuery}
              onChangeText={setScoutSearchQuery}
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              autoFocus={!IS_IOS}
            />
          </View>
          {loadingScouts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.loadingText}>Loading scouts...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredScouts}
              keyExtractor={(item) => item.employee_id}
              renderItem={({ item }) => {
                const isSelected = selectedScout?.employee_id === item.employee_id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.scoutOption,
                      isSelected && styles.scoutOptionSelected
                    ]}
                    onPress={() => handleSelectScout(item)}
                  >
                    <View style={[
                      styles.scoutAvatar,
                      { backgroundColor: getAvatarColor(`${item.first_name} ${item.last_name}`) }
                    ]}>
                      <Text style={styles.scoutAvatarText}>
                        {getInitials(`${item.first_name} ${item.last_name}`)}
                      </Text>
                    </View>
                    <View style={styles.scoutInfo}>
                      <Text style={styles.scoutName}>
                        {item.first_name} {item.last_name}
                      </Text>
                      <Text style={styles.scoutId}>ID: {item.employee_id}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={WHATSAPP_COLORS.success} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={styles.emptySearch}>
                  <Ionicons name="people" size={48} color={WHATSAPP_COLORS.border} />
                  <Text style={styles.emptySearchText}>No scouts found</Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Assignment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Assignment Details</Text>
          <Text style={styles.sectionDescription}>
            Select sites, scout, date and time for the visit
          </Text>

          {/* Site Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Select Site(s) *</Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setShowSiteSearch(true)}
            >
              {selectedSites.length > 0 ? (
                <View style={styles.selectedItemsContainer}>
                  <View style={styles.selectedSitesHeader}>
                    <Text style={styles.selectedCount}>
                      {selectedSites.length} site(s) selected
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
                  </View>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.selectedSitesScroll}
                  >
                    {selectedSites.slice(0, 3).map((site, index) => (
                      <View key={site.id} style={styles.siteChip}>
                        <View style={[
                          styles.siteChipAvatar,
                          { backgroundColor: getAvatarColor(site.building_name) }
                        ]}>
                          <Text style={styles.siteChipAvatarText}>
                            {getInitials(site.building_name)}
                          </Text>
                        </View>
                        <Text style={styles.siteChipText} numberOfLines={1}>
                          {site.building_name}
                        </Text>
                        {index === 2 && selectedSites.length > 3 && (
                          <Text style={styles.moreCount}>+{selectedSites.length - 3}</Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.placeholderSelection}>
                  <Ionicons name="business" size={20} color={WHATSAPP_COLORS.textTertiary} />
                  <Text style={styles.placeholderText}>Tap to select sites</Text>
                  <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Scout Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Select Scout *</Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setShowScoutSearch(true)}
            >
              {selectedScout ? (
                <View style={styles.selectedItem}>
                  <View style={[
                    styles.selectedAvatar,
                    { backgroundColor: getAvatarColor(`${selectedScout.first_name} ${selectedScout.last_name}`) }
                  ]}>
                    <Text style={styles.selectedAvatarText}>
                      {getInitials(`${selectedScout.first_name} ${selectedScout.last_name}`)}
                    </Text>
                  </View>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName}>
                      {selectedScout.first_name} {selectedScout.last_name}
                    </Text>
                    <Text style={styles.selectedSubtext}>ID: {selectedScout.employee_id}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
                </View>
              ) : (
                <View style={styles.placeholderSelection}>
                  <Ionicons name="person" size={20} color={WHATSAPP_COLORS.textTertiary} />
                  <Text style={styles.placeholderText}>Tap to select a scout</Text>
                  <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Date Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Select Date *</Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.selectedItem}>
                <Ionicons name="calendar" size={20} color={WHATSAPP_COLORS.primary} style={[{marginRight:10}]}/>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{formatDisplayDate(selectedDate)}</Text>
                  <Text style={styles.selectedSubtext}>
                    {selectedDate.toDateString() === new Date().toDateString() 
                      ? 'Today' 
                      : formatDate(selectedDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Time Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Select Time *</Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={styles.selectedItem}>
                <Ionicons name="time" size={20} color={WHATSAPP_COLORS.primary} style={[{marginRight:10}]}/>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedTime}</Text>
                  <Text style={styles.selectedSubtext}>Visit time</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color={WHATSAPP_COLORS.info} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How assignments work:</Text>
              <Text style={styles.infoText}>
                • You can assign multiple sites to a scout for the same date and time
              </Text>
              <Text style={styles.infoText}>
                • The scout will receive site visit assignments for the selected date and time
              </Text>
              <Text style={styles.infoText}>
                • Scout can upload photos and comments during the visit
              </Text>
              <Text style={styles.infoText}>
                • You can track progress and communicate with the scout
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (selectedSites.length === 0 || !selectedScout || !selectedDate || loading) && styles.createButtonDisabled
          ]}
          onPress={handleCreateAssignment}
          disabled={selectedSites.length === 0 || !selectedScout || !selectedDate || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>
                Create {selectedSites.length > 0 ? `Assignment (${selectedSites.length} sites)` : 'Assignment'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderSiteSearchModal()}
      {renderFilterModal()}
      {renderScoutSearchModal()}
      {renderDatePickerModal()}
      {renderTimePickerModal()}

      {/* Filter Dropdowns */}
      {renderFilterDropdown(
        showPropertyTypeFilter,
        'Select Property Type',
        PROPERTY_TYPE_OPTIONS,
        activeFilters.property_type,
        (value) => handleFilterChange('property_type', value),
        () => setShowPropertyTypeFilter(false)
      )}

      {renderFilterDropdown(
        showStatusFilter,
        'Select Building Status',
        BUILDING_STATUS_OPTIONS,
        activeFilters.building_status,
        (value) => handleFilterChange('building_status', value),
        () => setShowStatusFilter(false)
      )}

      {renderFilterDropdown(
        showFloorConditionFilter,
        'Select Floor Condition',
        FLOOR_CONDITION_OPTIONS,
        activeFilters.floor_condition,
        (value) => handleFilterChange('floor_condition', value),
        () => setShowFloorConditionFilter(false)
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  headerSpacer: {
    width: 32,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  selectionButton: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedItemsContainer: {
    width: '100%',
  },
  selectedSitesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  selectedSitesScroll: {
    flexDirection: 'row',
  },
  siteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.chipBackground,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    maxWidth: 150,
  },
  siteChipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  siteChipAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  siteChipText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  moreCount: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  selectedSubtext: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  placeholderSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.info + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.info + '30',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.info,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  createButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: WHATSAPP_COLORS.textTertiary,
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.surface,
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
  searchModalInput: {
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
    right: 60,
    zIndex: 1,
    padding: 8,
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
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
  selectionInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.lightBlue,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.info,
  },
  selectionInfoText: {
    fontSize: 15,
    fontWeight: '600',
    color: WHATSAPP_COLORS.info,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
  },
  siteCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
  },
  siteCardSelected: {
    borderColor: WHATSAPP_COLORS.info,
    backgroundColor: WHATSAPP_COLORS.lightBlue,
  },
  selectionCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
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
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  propertyTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
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
  selectionFooter: {
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  selectButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: WHATSAPP_COLORS.textTertiary,
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  scoutOptionSelected: {
    backgroundColor: WHATSAPP_COLORS.primary + '08',
  },
  scoutAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scoutAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  scoutInfo: {
    flex: 1,
  },
  scoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  scoutId: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptySearchText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  loadingText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 16,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthNavButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayHeader: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  calendarDaySelected: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },
  calendarDayTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  calendarDayTextPast: {
    color: WHATSAPP_COLORS.textTertiary,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 350,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
  },
  timePickerContent: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 20,
  },
  timeColumn: {
    flex: 1,
  },
  timeOption: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOptionSelected: {
    backgroundColor: WHATSAPP_COLORS.primary + '15',
    borderRadius: 8,
  },
  timeOptionText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  timeOptionTextSelected: {
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
  timePickerDoneButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  timePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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

export default CreateAssignment;