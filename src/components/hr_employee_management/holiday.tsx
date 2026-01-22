// hr_employee_management/holiday.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';

interface Holiday {
  id: string;
  name: string;
  date: string;
  cities: string[];
  description?: string;
}

interface HolidayManagementProps {
  token: string;
  onBack: () => void;
}

const HolidayManagement: React.FC<HolidayManagementProps> = ({ token, onBack }) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: new Date(),
    cities: ['All'],
    description: '',
  });
  const [bulkHolidays, setBulkHolidays] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      // This would be a new endpoint to fetch holidays
      // For now, we'll use mock data
      const mockHolidays: Holiday[] = [
        {
          id: '1',
          name: 'Republic Day',
          date: '2024-01-26',
          cities: ['All'],
          description: 'National Holiday'
        },
        {
          id: '2',
          name: 'Holi',
          date: '2024-03-25',
          cities: ['Delhi', 'Mumbai'],
          description: 'Festival'
        }
      ];
      setHolidays(mockHolidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const addHoliday = async () => {
    if (!newHoliday.name.trim() || !newHoliday.cities.length) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/addHoliday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: newHoliday.name,
          date: newHoliday.date.toISOString().split('T')[0],
          cities: newHoliday.cities,
          description: newHoliday.description
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Holiday added successfully');
        setShowAddModal(false);
        setNewHoliday({
          name: '',
          date: new Date(),
          cities: ['All'],
          description: '',
        });
        fetchHolidays();
      } else {
        Alert.alert('Error', 'Failed to add holiday');
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const addBulkHolidays = async () => {
    if (!bulkHolidays.trim()) {
      Alert.alert('Error', 'Please enter holiday data');
      return;
    }

    try {
      // Parse bulk holidays - expecting JSON array
      const holidaysArray = JSON.parse(bulkHolidays);
      
      const response = await fetch(`${BACKEND_URL}/hr_manager/addHolidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          holidays: holidaysArray
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Holidays added successfully');
        setShowBulkAddModal(false);
        setBulkHolidays('');
        fetchHolidays();
      } else {
        Alert.alert('Error', 'Failed to add holidays');
      }
    } catch (error) {
      console.error('Error adding bulk holidays:', error);
      Alert.alert('Error', 'Invalid JSON format or network error');
    }
  };

  const deleteHoliday = async (id: string) => {
    Alert.alert(
      'Delete Holiday',
      'Are you sure you want to delete this holiday?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // API call to delete holiday
              setHolidays(holidays.filter(h => h.id !== id));
              Alert.alert('Success', 'Holiday deleted successfully');
            } catch (error) {
              console.error('Error deleting holiday:', error);
              Alert.alert('Error', 'Failed to delete holiday');
            }
          }
        }
      ]
    );
  };

  const renderHolidayItem = ({ item }: { item: Holiday }) => (
    <View style={styles.holidayItem}>
      <View style={styles.holidayInfo}>
        <Text style={styles.holidayName}>{item.name}</Text>
        <Text style={styles.holidayDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
        <Text style={styles.holidayCities}>
          Cities: {item.cities.join(', ')}
        </Text>
        {item.description && (
          <Text style={styles.holidayDescription}>{item.description}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteHoliday(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Holiday Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowBulkAddModal(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.headerButtonText}>Bulk Add</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.headerButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Holidays</Text>
          
          {loading ? (
            <Text>Loading...</Text>
          ) : holidays.length > 0 ? (
            <FlatList
              data={holidays}
              renderItem={renderHolidayItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noDataText}>No holidays found</Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Holiday</Text>
            </View>
            
            <Text style={styles.modalLabel}>Holiday Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={newHoliday.name}
              onChangeText={(text) => setNewHoliday({...newHoliday, name: text})}
              placeholder="Enter holiday name"
            />
            
            <Text style={styles.modalLabel}>Date *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {newHoliday.date.toDateString()}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={newHoliday.date}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setNewHoliday({...newHoliday, date});
                }}
              />
            )}
            
            <Text style={styles.modalLabel}>Cities (comma-separated) *</Text>
            <TextInput
              style={styles.modalInput}
              value={newHoliday.cities.join(', ')}
              onChangeText={(text) => setNewHoliday({...newHoliday, cities: text.split(',').map(c => c.trim())})}
              placeholder="Delhi, Mumbai, All"
            />
            
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              value={newHoliday.description}
              onChangeText={(text) => setNewHoliday({...newHoliday, description: text})}
              placeholder="Enter description"
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={addHoliday}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Add Holiday</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showBulkAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBulkAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Add Holidays</Text>
            </View>
            
            <Text style={styles.modalLabel}>Holidays (JSON Format)</Text>
            <Text style={styles.modalDescription}>
              Enter holidays in JSON array format:
              {'\n\n'}[
              {'\n'}  {"{"}
              {'\n'}    "name": "Holiday Name",
              {'\n'}    "date": "YYYY-MM-DD",
              {'\n'}    "cities": ["City1", "City2"],
              {'\n'}    "description": "Optional description"
              {'\n'}  {"}"}
              {'\n'}]
            </Text>
            
            <TextInput
              style={[styles.modalInput, { height: 200, fontFamily: 'monospace' }]}
              value={bulkHolidays}
              onChangeText={setBulkHolidays}
              placeholder="Paste JSON array here"
              multiline
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBulkAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={addBulkHolidays}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Add Holidays</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default HolidayManagement;