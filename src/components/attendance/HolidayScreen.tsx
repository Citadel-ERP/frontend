import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Image,
  Platform,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import { Holiday } from './types';
import { BACKEND_URL } from '../../config/config';

interface HolidayScreenProps {
  onBack: () => void;
  token: string | null;
}

interface City {
  name: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HolidayScreen: React.FC<HolidayScreenProps> = ({ onBack, token }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showCityModal, setShowCityModal] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // Add for initial load state

  useEffect(() => {
    loadSavedCityAndFetchData();
  }, []);

  // Load saved city from AsyncStorage and fetch data
  const loadSavedCityAndFetchData = async () => {
    try {
      setInitialLoading(true);
      // Try to get saved city from AsyncStorage
      const savedCity = await AsyncStorage.getItem('city');
      
      // Fetch cities first
      await fetchCities(savedCity);
    } catch (error) {
      console.error('Error loading saved city:', error);
      Alert.alert('Error', 'Failed to load saved preferences');
      setInitialLoading(false);
    }
  };

  const fetchCities = async (savedCity: string | null = null) => {
    if (!token) {
      setInitialLoading(false);
      return;
    }

    setCitiesLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getCities`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.cities && Array.isArray(data.cities)) {
          const formattedCities = data.cities.map((cityArray: string[]) => ({
            name: cityArray[0]
          }));
          setCities(formattedCities);

          // Determine which city to select
          let cityToSelect = '';
          
          if (savedCity) {
            // Check if saved city exists in the fetched cities
            const cityExists = formattedCities.some(city => 
              city.name.toLowerCase() === savedCity.toLowerCase()
            );

            console.log('Saved city exists:', cityExists);
            
            if (cityExists) {
              cityToSelect = savedCity;
            }
          }
          
          // If no saved city or saved city doesn't exist, use first city
          if (!cityToSelect && formattedCities.length > 0) {
            cityToSelect = formattedCities[0].name;
          }
          
          if (cityToSelect) {
            setSelectedCity(cityToSelect);
            await fetchHolidaysByCity(cityToSelect);
          }
        }
      } else {
        Alert.alert('Error', 'Failed to fetch cities');
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      Alert.alert('Error', 'Network error occurred while fetching cities');
    } finally {
      setCitiesLoading(false);
      setInitialLoading(false);
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} /><Text style={styles.backText}>Back</Text>
    </View>
  );

  const fetchHolidaysByCity = async (cityName: string) => {
    if (!cityName) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getHolidays?city=${encodeURIComponent(cityName)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.holidays && Array.isArray(data.holidays)) {
          setHolidays(data.holidays);
        } else {
          setHolidays([]);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch holidays for selected city');
        setHolidays([]);
      }
    } catch (error) {
      console.error('Error fetching holidays by city:', error);
      Alert.alert('Error', 'Network error occurred while fetching holidays');
      setHolidays([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (selectedCity) {
      fetchHolidaysByCity(selectedCity);
    }
  }, [selectedCity]);

  const handleCitySelect = async (cityName: string) => {
    setSelectedCity(cityName);
    setShowCityModal(false);
    
    // Save selected city to AsyncStorage
    try {
      await AsyncStorage.setItem('city', cityName);
    } catch (error) {
      console.error('Error saving city to AsyncStorage:', error);
    }
    
    fetchHolidaysByCity(cityName);
  };

  // ... rest of the functions (formatDate, getMonthDay, getHolidayGradient, etc.) remain the same

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getMonthDay = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      month: months[date.getMonth()],
      day: date.getDate()
    };
  };

  const getHolidayGradient = (index: number) => {
    const gradients = [
      ['#667eea', '#764ba2'], // Purple Dream
      ['#f093fb', '#f5576c'], // Pink Sunset
      ['#4facfe', '#00f2fe'], // Blue Sky
      ['#43e97b', '#38f9d7'], // Mint Fresh
      ['#fa709a', '#fee140'], // Peach Glow
      ['#30cfd0', '#330867'], // Deep Ocean
      ['#a8edea', '#fed6e3'], // Soft Coral
      ['#ff9a9e', '#fecfef'], // Rose Garden
      ['#ffecd2', '#fcb69f'], // Warm Sunset
      ['#ff6e7f', '#bfe9ff'], // Cotton Candy
    ];
    return gradients[index % gradients.length];
  };

  const getHolidayIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('christmas')) return '🎄';
    if (nameLower.includes('new year')) return '🎊';
    if (nameLower.includes('diwali')) return '🪔';
    if (nameLower.includes('holi')) return '🎨';
    if (nameLower.includes('eid')) return '🌙';
    if (nameLower.includes('independence') || nameLower.includes('republic')) return '🇮🇳';
    if (nameLower.includes('gandhi')) return '🕊️';
    if (nameLower.includes('valentine')) return '❤️';
    if (nameLower.includes('durga')) return '🙏';
    if (nameLower.includes('navratri')) return '💃';
    return '✨';
  };

  const getCityIcon = (cityName: string) => {
    const cityLower = cityName.toLowerCase();

    if (cityLower.includes('mumbai')) return require('../../assets/mumbai.png');
    if (cityLower.includes('delhi')) return require('../../assets/delhi.png');
    if (cityLower.includes('bangalore') || cityLower.includes('bengaluru')) return require('../../assets/bangalore.png');
    if (cityLower.includes('chennai')) return require('../../assets/chennai.png');
    if (cityLower.includes('kolkata')) return require('../../assets/kolkata.png');
    if (cityLower.includes('hyderabad')) return require('../../assets/hyderabad.png');
    if (cityLower.includes('pune')) return require('../../assets/pune.png');
    if (cityLower.includes('gurgaon')) return require('../../assets/gurgaon.png');
    if (cityLower.includes('noida')) return require('../../assets/noida.png');
    if (cityLower.includes('jaipur')) return require('../../assets/jaipur.png');
    return require('../../assets/pune.png');
  };

  const renderCityModal = () => (
    <Modal
      visible={showCityModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCityModal(false)}
        />
        <View style={styles.cityModal}>
          <View style={styles.modalDragIndicator} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Select Your City</Text>
              <Text style={styles.modalSubtitle}>Choose a city to view holidays</Text>
            </View>
          </View>

          <ScrollView
            style={styles.cityList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cityListContent}
          >
            {cities.map((city, index) => {
              const isSelected = selectedCity === city.name;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.cityItem,
                    isSelected && styles.selectedCityItem
                  ]}
                  onPress={() => handleCitySelect(city.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cityItemLeft}>
                    <View style={[
                      styles.cityIconContainer,
                      isSelected && styles.selectedCityIconContainer
                    ]}>
                      <Image
                        source={getCityIcon(city.name)}
                        style={styles.cityIconImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={[
                      styles.cityItemText,
                      isSelected && styles.selectedCityItemText
                    ]}>
                      {city.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkMarkContainer}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Show loading during initial data fetch
  if (initialLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#5b21b6" translucent={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#5b21b6" size="large" />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5b21b6" translucent={false} />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
      >
        {/* Header inside ScrollView */}
        <View style={[styles.header, styles.headerBanner]}>
          <Image
            source={require('../../assets/attendance_bg.jpg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay} />

          <View style={[styles.headerContent, { marginTop: Platform.OS === 'ios' ? 20 : 0 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.logoText}>CITADEL</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>Holidays</Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.cityFilterButton}
            onPress={() => setShowCityModal(true)}
            disabled={citiesLoading}
            activeOpacity={0.8}
          >
            {citiesLoading ? (
              <ActivityIndicator color="#5b21b6" size="small" />
            ) : (
              <>
                <View style={styles.filterLeftSection}>
                  <View style={styles.filterIconContainer}>
                    {selectedCity ? (
                      <Image
                        source={getCityIcon(selectedCity)}
                        style={styles.filterIconImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.filterIcon}>📍</Text>
                    )}
                  </View>
                  <View style={styles.filterTextContainer}>
                    <Text style={styles.filterLabel}>Location</Text>
                    <Text style={styles.filterValue}>
                      {selectedCity || 'Select City'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.dropdownArrow}>›</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.holidaysContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#5b21b6" size="large" />
              <Text style={styles.loadingText}>Loading holidays...</Text>
            </View>
          ) : (
            <>
              {holidays.length > 0 ? (
                holidays.map((holiday, index) => {
                  const dateInfo = getMonthDay(holiday.date);
                  const gradientColors = getHolidayGradient(index);
                  const icon = getHolidayIcon(holiday.name);

                  return (
                    <View key={holiday.id} style={styles.holidayCard}>
                      <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.holidayCardGradient}
                      >
                        <View style={styles.holidayCardOverlay} />
                        <View style={styles.holidayContent}>
                          <View style={styles.holidayLeft}>
                            <View style={styles.holidayIconContainer}>
                              <Text style={styles.holidayIcon}>{icon}</Text>
                            </View>
                            <View style={styles.holidayTextContainer}>
                              <Text style={styles.holidayName}>{holiday.name}</Text>
                              <Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
                            </View>
                          </View>
                          <View style={styles.dateBadge}>
                            <Text style={styles.dateBadgeMonth}>{dateInfo.month}</Text>
                            <Text style={styles.dateBadgeDay}>{dateInfo.day}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIconContainer}>
                    <Text style={styles.emptyStateIcon}>📅</Text>
                  </View>
                  <Text style={styles.emptyStateTitle}>No Holidays Found</Text>
                  <Text style={styles.emptyStateText}>
                    {selectedCity
                      ? `No holidays scheduled for ${selectedCity}`
                      : 'Select a city to view holidays'
                    }
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {renderCityModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 30,
    width: '96%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerBanner: {
    height: 250,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e8e8e8',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  filterLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  filterIcon: {
    fontSize: 20,
  },
  filterTextContainer: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 28,
    color: '#9ca3af',
    fontWeight: '300',
  },
  holidaysContent: {
    padding: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
    fontWeight: '500',
  },
  holidayCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  holidayCardGradient: {
    padding: 0,
    position: 'relative',
  },
  holidayCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  holidayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holidayIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  holidayIcon: {
    fontSize: 32,
  },
  holidayTextContainer: {
    flex: 1,
  },
  holidayName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  holidayDate: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    fontWeight: '500',
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 12,
    minWidth: 64,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBadgeMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateBadgeDay: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 30,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cityModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  cityList: {
    maxHeight: 500,
  },
  cityListContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#fafafa',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCityItem: {
    backgroundColor: '#f3f0ff',
    borderColor: colors.primary,
  },
  cityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cityIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedCityIconContainer: {
    backgroundColor: '#fff',
  },
  cityIconText: {
    fontSize: 22,
  },
  cityItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  selectedCityItemText: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkMarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center'
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  cityIconImage: {
    width: 40,
    height: 40,
  },
  filterIconImage: {
    width: 40,
    height: 40
  },
});

export default HolidayScreen;