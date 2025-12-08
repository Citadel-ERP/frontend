// HolidayScreen.tsx - Modern Holiday Calendar Component
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    if (!token) return;
    
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
          
          if (formattedCities.length > 0 && !selectedCity) {
            const firstCity = formattedCities[0].name;
            setSelectedCity(firstCity);
            fetchHolidaysByCity(firstCity);
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
    }
  };

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
    }
  };

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setShowCityModal(false);
    fetchHolidaysByCity(cityName);
  };

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
      ['#FF6B9D', '#FFC371'],
      ['#4776E6', '#8E54E9'],
      ['#43E97B', '#38F9D7'],
      ['#F093FB', '#F5576C'],
      ['#FA709A', '#FEE140'],
      ['#30CFD0', '#330867'],
    ];
    return gradients[index % gradients.length];
  };

  const getHolidayIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('christmas')) return '🎅';
    if (nameLower.includes('new year')) return '🎉';
    if (nameLower.includes('diwali')) return '🪔';
    if (nameLower.includes('holi')) return '🎨';
    if (nameLower.includes('eid')) return '🌙';
    if (nameLower.includes('independence') || nameLower.includes('republic')) return '🇮🇳';
    if (nameLower.includes('gandhi')) return '🕊️';
    return '🎊';
  };

  const renderCityModal = () => (
    <Modal
      visible={showCityModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.cityModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select City</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCityModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
            {cities.map((city, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.cityItem,
                  selectedCity === city.name && styles.selectedCityItem
                ]}
                onPress={() => handleCitySelect(city.name)}
              >
                <Text style={[
                  styles.cityItemText,
                  selectedCity === city.name && styles.selectedCityItemText
                ]}>
                  {city.name}
                </Text>
                {selectedCity === city.name && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" translucent={false} />
      
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Holidays</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.cityFilterButton}
          onPress={() => setShowCityModal(true)}
          disabled={citiesLoading}
        >
          {citiesLoading ? (
            <ActivityIndicator color="#1e1b4b" size="small" />
          ) : (
            <>
              <Text style={styles.filterLabel}>Filter by city</Text>
              <View style={styles.filterValueContainer}>
                <Text style={styles.filterValue}>
                  {selectedCity || 'Select City'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#1e1b4b" size="large" />
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
                    <View style={[styles.holidayCardGradient, { backgroundColor: gradientColors[0] }]}>
                      <View style={styles.holidayContent}>
                        <View style={styles.holidayLeft}>
                          <Text style={styles.holidayIcon}>{icon}</Text>
                          <View style={styles.holidayTextContainer}>
                            <Text style={styles.holidayName}>{holiday.name}</Text>
                            <Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
                          </View>
                        </View>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateBadgeDay}>{dateInfo.day}</Text>
                          <Text style={styles.dateBadgeMonth}>{dateInfo.month}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📅</Text>
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
      </ScrollView>

      {renderCityModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  safeArea: {
    backgroundColor: '#1e1b4b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e1b4b',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 44,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cityFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6b7280',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    color: '#6b7280',
    marginTop: 12,
  },
  holidayCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  holidayCardGradient: {
    padding: 20,
  },
  holidayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holidayIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  holidayTextContainer: {
    flex: 1,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 12,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  dateBadgeDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 28,
  },
  dateBadgeMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cityModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '300',
  },
  cityList: {
    maxHeight: 400,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedCityItem: {
    backgroundColor: '#eff6ff',
  },
  cityItemText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  selectedCityItemText: {
    color: '#1e40af',
    fontWeight: '600',
  },
  checkMark: {
    fontSize: 18,
    color: '#1e40af',
    fontWeight: 'bold',
  },
});

export default HolidayScreen;