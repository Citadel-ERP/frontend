// hr_employee_management/addHoliday.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WHATSAPP_COLORS } from './constants';
import { BACKEND_URL } from '../../config/config';

interface AddHolidayProps {
  token: string;
  onBack: () => void;
}

const CITIES = [
  'Gurgaon',
  'Chennai',
  'Mumbai',
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Noida',
];

const AddHoliday: React.FC<AddHolidayProps> = ({ token, onBack }) => {
  const [holidayName, setHolidayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const validateForm = (): boolean => {
    if (!holidayName.trim()) {
      Alert.alert('Validation Error', 'Please enter holiday name');
      return false;
    }
    if (selectedCities.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one city');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const response = await fetch(`${BACKEND_URL}/manager/HRaddHolidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: holidayName.trim(),
          date: formattedDate,
          cities: selectedCities,
          description: description.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', 'Holiday added successfully', [
          { text: 'OK', onPress: onBack }
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to add holiday');
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      Alert.alert('Error', 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
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
            <Text style={styles.sectionTitle}>Add Holiday</Text>
            <Text style={styles.sectionSubtitle}>Create a new holiday entry</Text>
          </View>
        </View>

        {/* Form Content */}
        <View style={styles.formContainer}>
          <View style={styles.formCard}>
            {/* Holiday Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Holiday Name *</Text>
              <TextInput
                style={styles.input}
                value={holidayName}
                onChangeText={setHolidayName}
                placeholder="Enter holiday name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Date Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.dateButtonText}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Cities Multi-Select */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cities *</Text>
              <TouchableOpacity
                style={styles.cityButton}
                onPress={() => setShowCityModal(true)}
              >
                <View style={styles.cityButtonContent}>
                  <Ionicons name="location-outline" size={20} color="#6b7280" />
                  <Text style={[
                    styles.cityButtonText,
                    selectedCities.length === 0 && styles.placeholderText
                  ]}>
                    {selectedCities.length === 0
                      ? 'Select cities'
                      : `${selectedCities.length} ${selectedCities.length === 1 ? 'city' : 'cities'} selected`
                    }
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              {selectedCities.length > 0 && (
                <View style={styles.selectedCitiesContainer}>
                  {selectedCities.map((city) => (
                    <View key={city} style={styles.cityChip}>
                      <Text style={styles.cityChipText}>{city}</Text>
                      <TouchableOpacity onPress={() => toggleCity(city)}>
                        <Ionicons name="close-circle" size={18} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Add Holiday</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* City Selection Modal */}
      <Modal
        visible={showCityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Cities</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cityList}>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={styles.cityItem}
                  onPress={() => toggleCity(city)}
                >
                  <View style={styles.cityItemLeft}>
                    <View style={[
                      styles.checkbox,
                      selectedCities.includes(city) && styles.checkboxSelected
                    ]}>
                      {selectedCities.includes(city) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.cityItemText}>{city}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowCityModal(false)}
              >
                <Text style={styles.modalButtonText}>
                  Done ({selectedCities.length} selected)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e7e6e5',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  headerBanner: {
    height: 220,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  cityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
  },
  cityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cityButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  selectedCitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  cityChipText: {
    fontSize: 14,
    color: '#4338ca',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    fontWeight: '700',
    color: '#111827',
  },
  cityList: {
    maxHeight: 400,
  },
  cityItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  cityItemText: {
    fontSize: 16,
    color: '#374151',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
});

export default AddHoliday;