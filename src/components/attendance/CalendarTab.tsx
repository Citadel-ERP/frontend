// CalendarTab.tsx - Holiday Calendar Component with City Filter
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
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { Holiday } from './types';
import { formatDate } from './utils';
import { BACKEND_URL } from '../../config/config';

interface CalendarTabProps {
  holidays: Holiday[];
  token: string | null;
  onHolidaysUpdate: (holidays: Holiday[]) => void;
}

interface City {
  name: string;
}

const CalendarTab: React.FC<CalendarTabProps> = ({ holidays, token, onHolidaysUpdate }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showCityModal, setShowCityModal] = useState(false);
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
          // Transform the nested array structure to flat city objects
          const formattedCities = data.cities.map((cityArray: string[]) => ({
            name: cityArray[0]
          }));
          setCities(formattedCities);
          
          // Auto-select first city if available
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
          onHolidaysUpdate(data.holidays);
        } else {
          onHolidaysUpdate([]);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch holidays for selected city');
        onHolidaysUpdate([]);
      }
    } catch (error) {
      console.error('Error fetching holidays by city:', error);
      Alert.alert('Error', 'Network error occurred while fetching holidays');
      onHolidaysUpdate([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setShowCityModal(false);
    fetchHolidaysByCity(cityName);
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Holiday Calendar</Text>
          
          {/* City Filter Button */}
          <TouchableOpacity
            style={styles.cityFilterButton}
            onPress={() => setShowCityModal(true)}
            disabled={citiesLoading}
          >
            {citiesLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Text style={styles.cityFilterButtonText}>
                  {selectedCity || 'Select City'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading indicator for holidays */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading holidays...</Text>
          </View>
        ) : (
          <>
            {holidays.length > 0 ? (
              <>
                <Text style={styles.citySubtitle}>
                  Holidays in {selectedCity}
                </Text>
                {holidays.map((holiday) => (
                  <View key={holiday.id} style={styles.holidayItem}>
                    <View style={styles.holidayLeft}>
                      <View style={styles.holidayDateContainer}>
                        <Text style={styles.holidayDateText}>{formatDate(holiday.date)}</Text>
                      </View>
                      <View style={styles.holidayDetails}>
                        <Text style={styles.holidayName}>{holiday.name}</Text>
                        <Text style={styles.holidayType}>{holiday.type}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {selectedCity 
                    ? `No holidays found for ${selectedCity}` 
                    : 'Select a city to view holidays'
                  }
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {renderCityModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  cityFilterButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    ...shadows.sm,
  },
  cityFilterButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginRight: spacing.xs,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  citySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  loadingContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  holidayItem: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holidayDateContainer: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  holidayDateText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  holidayDetails: {
    flex: 1,
  },
  holidayName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  holidayType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '80%',
    maxHeight: '70%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  cityList: {
    maxHeight: 300,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedCityItem: {
    backgroundColor: colors.primary + '10',
  },
  cityItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  selectedCityItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkMark: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default CalendarTab;