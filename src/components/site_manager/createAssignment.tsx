import React, { useState, useEffect, useCallback } from 'react';
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
};

interface Site {
  id: number;
  building_name: string;
  location: string;
  building_status: string;
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
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedScout, setSelectedScout] = useState<Scout | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [showSiteSearch, setShowSiteSearch] = useState(false);
  const [showScoutSearch, setShowScoutSearch] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [scoutSearchQuery, setScoutSearchQuery] = useState('');

  const filteredSites = sites.filter(site => 
    site.building_name.toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
    site.location.toLowerCase().includes(siteSearchQuery.toLowerCase())
  );

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
    if (!token || !selectedSite || !selectedScout || !selectedDate) {
      Alert.alert('Error', 'Please select a site, scout, and date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/assignSiteVisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          site_id: selectedSite.id,
          scout_id: selectedScout.employee_id,
          date: formatDate(selectedDate)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.message || !data.message.includes('Successfully assigned')) {
        throw new Error(data.message || 'Failed to create assignment');
      }

      Alert.alert('Success', 'Successfully assigned site visit');
      onAssignmentCreated();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      Alert.alert('Error', error.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site);
    setShowSiteSearch(false);
    setSiteSearchQuery('');
  };

  const handleSelectScout = (scout: Scout) => {
    setSelectedScout(scout);
    setShowScoutSearch(false);
    setScoutSearchQuery('');
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
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary}  />
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

  const renderSiteSearchModal = () => (
    <Modal
      visible={showSiteSearch}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSiteSearch(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.searchModalHeader}>
          <TouchableOpacity onPress={() => setShowSiteSearch(false)}>
            <Ionicons name="arrow-back" size={24} color={WHATSAPP_COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.searchModalTitle}>Select Site</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={WHATSAPP_COLORS.textTertiary} />
          <TextInput
            style={styles.searchModalInput}
            placeholder="Search sites..."
            value={siteSearchQuery}
            onChangeText={setSiteSearchQuery}
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredSites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.siteOption}
              onPress={() => handleSelectSite(item)}
            >
              <View style={[
                styles.siteAvatar,
                { backgroundColor: getAvatarColor(item.building_name) }
              ]}>
                <Text style={styles.siteAvatarText}>
                  {getInitials(item.building_name)}
                </Text>
              </View>
              <View style={styles.siteInfo}>
                <Text style={styles.siteName}>{item.building_name}</Text>
                <Text style={styles.siteLocation}>{item.location}</Text>
                <Text style={styles.siteStatus}>
                  Status: {item.building_status}
                </Text>
              </View>
              {selectedSite?.id === item.id && (
                <Ionicons name="checkmark-circle" size={24} color={WHATSAPP_COLORS.success} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptySearch}>
              <Ionicons name="business" size={48} color={WHATSAPP_COLORS.border} />
              <Text style={styles.emptySearchText}>No sites found</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderScoutSearchModal = () => (
    <Modal
      visible={showScoutSearch}
      transparent
      animationType="slide"
      onRequestClose={() => setShowScoutSearch(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.searchModalHeader}>
          <TouchableOpacity onPress={() => setShowScoutSearch(false)}>
            <Ionicons name="arrow-back" size={24} color={WHATSAPP_COLORS.textPrimary} />
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
            autoFocus
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
            Select a site, scout, and date for the visit
          </Text>

          {/* Site Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Select Site *</Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setShowSiteSearch(true)}
            >
              {selectedSite ? (
                <View style={styles.selectedItem}>
                  <View style={[
                    styles.selectedAvatar,
                    { backgroundColor: getAvatarColor(selectedSite.building_name) }
                  ]}>
                    <Text style={styles.selectedAvatarText}>
                      {getInitials(selectedSite.building_name)}
                    </Text>
                  </View>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName}>{selectedSite.building_name}</Text>
                    <Text style={styles.selectedSubtext}>{selectedSite.location}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
                </View>
              ) : (
                <View style={styles.placeholderSelection}>
                  <Ionicons name="business" size={20} color={WHATSAPP_COLORS.textTertiary} />
                  <Text style={styles.placeholderText}>Tap to select a site</Text>
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

          {/* Instructions */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color={WHATSAPP_COLORS.info} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How assignments work:</Text>
              <Text style={styles.infoText}>
                • The scout will receive a site visit assignment for the selected date
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
            (!selectedSite || !selectedScout || !selectedDate || loading) && styles.createButtonDisabled
          ]}
          onPress={handleCreateAssignment}
          disabled={!selectedSite || !selectedScout || !selectedDate || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create Assignment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderSiteSearchModal()}
      {renderScoutSearchModal()}
      {renderDatePickerModal()}
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
    backgroundColor: WHATSAPP_COLORS.background,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
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
  searchModalInput: {
    flex: 1,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    marginLeft: 12,
    paddingVertical: 8,
  },
  siteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  siteAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  siteAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  siteLocation: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4,
  },
  siteStatus: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
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
});

export default CreateAssignment;