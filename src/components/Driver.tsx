import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
  Dimensions, KeyboardAvoidingView, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

interface DriverProps {
  onBack: () => void;
}

interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
}

interface Office {
  id: number;
  name: string;
  address: Address;
  latitude: number | null;
  longitude: number | null;
}

interface AssignedEmployee {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
}

interface Vehicle {
  id: number;
  assigned_to: AssignedEmployee;
  vehicle_type: string;
  license_plate: string;
  model: string;
  make: string;
  color: string;
  fuel_type: string;
  seating_capacity: number;
  year: number;
  status: string;
  current_location: Address;
  office: Office;
  pollution_certificate: string;
  insurance_certificate: string;
  registration_certificate: string;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: number;
  vehicle: Vehicle;
  start_time: string;
  end_time: string;
  booked_by: AssignedEmployee;
  status: string;
  purpose: string;
  reason_of_cancellation: string | null;
  start_location: string;
  end_location: string;
  created_at: string;
  updated_at: string;
}

interface MaintenanceRecord {
  id: number;
  vehicle: Vehicle;
  maintenance_date: string;
  cost: string;
  description: string;
  logged_by: AssignedEmployee;
  start_date: string;
  end_date: string;
}

interface FuelLog {
  id: number;
  vehicle: Vehicle;
  fuel_date: string;
  quantity: string;
  cost: string;
  logged_by: AssignedEmployee;
  odometer_reading: string;
}

interface MaintenanceModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: {
    cost: string;
    description: string;
    start_date: string;
    end_date: string;
    document: any;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    cost: string;
    description: string;
    start_date: string;
    end_date: string;
    document: any;
  }>>;
  loading: boolean;
}

interface FuelLogModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: {
    quantity: string;
    cost: string;
    odometer_reading: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    quantity: string;
    cost: string;
    odometer_reading: string;
  }>>;
  loading: boolean;
}

interface MaintenanceLogsModalProps {
  isVisible: boolean;
  onClose: () => void;
  logs: MaintenanceRecord[];
  formatDate: (dateString: string) => string;
}

interface FuelLogsModalProps {
  isVisible: boolean;
  onClose: () => void;
  logs: FuelLog[];
  formatDateTime: (dateString: string) => string;
}

type ViewType = 'main' | 'vehicle-detail' | 'booking-detail';

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isVisible, onClose, onSubmit, form, setForm, loading
}) => {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const formatDateForDisplay = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      setForm(prev => ({ ...prev, start_date: formatDateForDisplay(selectedDate) }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setForm(prev => ({ ...prev, end_date: formatDateForDisplay(selectedDate) }));
    }
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const document = result.assets[0];
        setForm(prev => ({ 
          ...prev, 
          document: {
            name: document.name,
            uri: document.uri,
            type: document.mimeType,
            size: document.size,
          }
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Maintenance</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.cost}
                  onChangeText={(text) => setForm(prev => ({ ...prev, cost: text }))}
                  placeholder="Enter maintenance cost"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={form.description}
                  onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                  placeholder="Describe the maintenance work"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Date *</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                  <Text style={[styles.dateButtonText, !form.start_date && styles.dateButtonPlaceholder]}>
                    {form.start_date || 'Select start date'}
                  </Text>
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker value={startDate} mode="date" display="default" onChange={handleStartDateChange} />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>End Date *</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                  <Text style={[styles.dateButtonText, !form.end_date && styles.dateButtonPlaceholder]}>
                    {form.end_date || 'Select end date'}
                  </Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker value={endDate} mode="date" display="default" onChange={handleEndDateChange} />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Attach Document (Optional)</Text>
                <TouchableOpacity style={styles.documentButton} onPress={handleDocumentPick}>
                  <Text style={styles.documentButtonText}>
                    {form.document ? form.document.name || 'Document Selected' : 'Select Document'}
                  </Text>
                </TouchableOpacity>
                {form.document && (
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      📄 {form.document.name}
                    </Text>
                    <TouchableOpacity 
                      style={styles.removeDocumentButton} 
                      onPress={() => setForm(prev => ({ ...prev, document: null }))}
                    >
                      <Text style={styles.removeDocumentText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    (!form.cost || !form.description || !form.start_date || !form.end_date) && styles.modalSubmitButtonDisabled
                  ]}
                  onPress={onSubmit}
                  disabled={loading || !form.cost || !form.description || !form.start_date || !form.end_date}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Log Maintenance</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const FuelLogModal: React.FC<FuelLogModalProps> = ({
  isVisible, onClose, onSubmit, form, setForm, loading
}) => {
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Fuel Log</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Quantity (Liters) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.quantity}
                  onChangeText={(text) => setForm(prev => ({ ...prev, quantity: text }))}
                  placeholder="Enter fuel quantity"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.cost}
                  onChangeText={(text) => setForm(prev => ({ ...prev, cost: text }))}
                  placeholder="Enter fuel cost"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Odometer Reading (KM) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.odometer_reading}
                  onChangeText={(text) => setForm(prev => ({ ...prev, odometer_reading: text }))}
                  placeholder="Enter current odometer reading"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    (!form.quantity || !form.cost || !form.odometer_reading) && styles.modalSubmitButtonDisabled
                  ]}
                  onPress={onSubmit}
                  disabled={loading || !form.quantity || !form.cost || !form.odometer_reading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Add Fuel Log</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const MaintenanceLogsModal: React.FC<MaintenanceLogsModalProps> = ({
  isVisible, onClose, logs, formatDate
}) => {
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Maintenance Logs</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logCost}>₹{log.cost}</Text>
                  </View>
                  <Text style={styles.logDescription}>{log.description}</Text>
                  <View style={styles.logDetails}>
                    <Text style={styles.logDetail}>
                      <Text style={styles.logLabel}>Maintenance Date:</Text> {formatDate(log.maintenance_date)}
                    </Text>
                    <Text style={styles.logDetail}>
                      <Text style={styles.logLabel}>Period:</Text> {formatDate(log.start_date)} - {formatDate(log.end_date)}
                    </Text>
                    <Text style={styles.logDetail}>
                      <Text style={styles.logLabel}>Logged by:</Text> {log.logged_by.full_name}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No maintenance records</Text>
                <Text style={styles.emptyStateSubtext}>Maintenance history will appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const FuelLogsModal: React.FC<FuelLogsModalProps> = ({
  isVisible, onClose, logs, formatDateTime
}) => {
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fuel Logs</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logCost}>₹{log.cost}</Text>
                  </View>
                  <View style={styles.fuelDetails}>
                    <View style={styles.fuelDetailItem}>
                      <Text style={styles.fuelDetailLabel}>Quantity</Text>
                      <Text style={styles.fuelDetailValue}>{log.quantity}L</Text>
                    </View>
                    <View style={styles.fuelDetailItem}>
                      <Text style={styles.fuelDetailLabel}>Odometer</Text>
                      <Text style={styles.fuelDetailValue}>{log.odometer_reading} km</Text>
                    </View>
                  </View>
                  <View style={styles.logDetails}>
                    <Text style={styles.logDetail}>
                      <Text style={styles.logLabel}>Date:</Text> {formatDateTime(log.fuel_date)}
                    </Text>
                    <Text style={styles.logDetail}>
                      <Text style={styles.logLabel}>Logged by:</Text> {log.logged_by.full_name}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No fuel logs</Text>
                <Text style={styles.emptyStateSubtext}>Fuel consumption history will appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const Driver: React.FC<DriverProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'bookings'>('vehicles');
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [loading, setLoading] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [isMaintenanceModalVisible, setIsMaintenanceModalVisible] = useState(false);
  const [isFuelLogModalVisible, setIsFuelLogModalVisible] = useState(false);
  const [isMaintenanceLogsModalVisible, setIsMaintenanceLogsModalVisible] = useState(false);
  const [isFuelLogsModalVisible, setIsFuelLogsModalVisible] = useState(false);

  const [maintenanceForm, setMaintenanceForm] = useState({
    cost: '',
    description: '',
    start_date: '',
    end_date: '',
    document: null
  });

  const [fuelLogForm, setFuelLogForm] = useState({
    quantity: '',
    cost: '',
    odometer_reading: ''
  });

  const [vehicleStatus, setVehicleStatus] = useState('available');
  const [bookingStatus, setBookingStatus] = useState('booked');
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchVehicles();
      fetchBookings();
    }
  }, [token]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getAssignedVehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicle || []);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getCarBookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        console.error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchMaintenanceLogs = async (vehicleId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getVehicleMaintainanceLogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, vehicle_id: vehicleId }),
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceLogs(data.maintainance_logs || []);
        setIsMaintenanceLogsModalVisible(true);
      } else {
        Alert.alert('Error', 'Failed to fetch maintenance logs');
      }
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFuelLogs = async (vehicleId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getVehicleFuelLogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, vehicle_id: vehicleId }),
      });

      if (response.ok) {
        const data = await response.json();
        setFuelLogs(data.fuel_logs || []);
        setIsFuelLogsModalVisible(true);
      } else {
        Alert.alert('Error', 'Failed to fetch fuel logs');
      }
    } catch (error) {
      console.error('Error fetching fuel logs:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateVehicleStatus = async () => {
    if (!selectedVehicle) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/updateVehicleStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          vehicle_id: selectedVehicle.id,
          status: vehicleStatus
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Vehicle status updated successfully!');
        setCurrentView('main');
        fetchVehicles();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update vehicle status');
      }
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async () => {
    if (!selectedBooking) return;

    if (bookingStatus === 'cancelled' && !cancellationReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    try {
      const requestBody: any = {
        token,
        booking_id: selectedBooking.id,
        status: bookingStatus
      };

      if (bookingStatus === 'cancelled') {
        requestBody.reason_of_cancellation = cancellationReason;
      }

      const response = await fetch(`${BACKEND_URL}/employee/updateCarBookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        Alert.alert('Success', 'Booking status updated successfully!');
        setCurrentView('main');
        setCancellationReason('');
        fetchBookings();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update booking status');
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const submitMaintenance = async () => {
    if (!selectedVehicle || !maintenanceForm.cost || !maintenanceForm.description ||
      !maintenanceForm.start_date || !maintenanceForm.end_date) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('token', token);
      formData.append('vehicle_id', selectedVehicle.id.toString());
      formData.append('cost', maintenanceForm.cost);
      formData.append('description', maintenanceForm.description);
      formData.append('start_date', maintenanceForm.start_date);
      formData.append('end_date', maintenanceForm.end_date);

      // Add document if exists
      if (maintenanceForm.document) {
        formData.append('document', {
          uri: maintenanceForm.document.uri,
          name: maintenanceForm.document.name,
          type: maintenanceForm.document.type,
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/employee/createMaintainance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Maintenance record created successfully!');
        setIsMaintenanceModalVisible(false);
        setMaintenanceForm({ cost: '', description: '', start_date: '', end_date: '', document: null });
        fetchVehicles();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to create maintenance record');
      }
    } catch (error) {
      console.error('Error creating maintenance:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const submitFuelLog = async () => {
    if (!selectedVehicle || !fuelLogForm.quantity || !fuelLogForm.cost || !fuelLogForm.odometer_reading) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/addFuelLog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          vehicle_id: selectedVehicle.id,
          quantity: fuelLogForm.quantity,
          cost: fuelLogForm.cost,
          odometer_reading: fuelLogForm.odometer_reading
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Fuel log added successfully!');
        setIsFuelLogModalVisible(false);
        setFuelLogForm({ quantity: '', cost: '', odometer_reading: '' });
        fetchVehicles();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to add fuel log');
      }
    } catch (error) {
      console.error('Error adding fuel log:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active': return colors.success;
      case 'maintenance': return colors.warning;
      case 'inactive': return colors.error;
      case 'available': return colors.info;
      case 'not_available': return colors.error;
      case 'booked': return colors.primary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      case 'in-progress': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  const renderVehicleDetailPage = () => (
    <ScrollView style={styles.pageContainer} showsVerticalScrollIndicator={false}>
      {selectedVehicle && (
        <View style={styles.detailPageContent}>
          <View style={styles.vehicleDetailHeader}>
            <View style={styles.vehicleDetailInfo}>
              <Text style={styles.vehicleModelText}>
                {selectedVehicle.make} {selectedVehicle.model}
              </Text>
              <Text style={styles.vehiclePlateText}>{selectedVehicle.license_plate}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVehicle.status) }]}>
              <Text style={styles.statusBadgeText}>{selectedVehicle.status}</Text>
            </View>
          </View>

          <View style={styles.vehicleInfoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{selectedVehicle.color}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fuel Type</Text>
              <Text style={styles.infoValue}>{selectedVehicle.fuel_type}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Year</Text>
              <Text style={styles.infoValue}>{selectedVehicle.year}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Seating</Text>
              <Text style={styles.infoValue}>{selectedVehicle.seating_capacity} seats</Text>
            </View>
          </View>

          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Current Location</Text>
            <Text style={styles.locationText}>
              {selectedVehicle.current_location.address}, {selectedVehicle.current_location.city}, {selectedVehicle.current_location.state} - {selectedVehicle.current_location.zip_code}
            </Text>
          </View>

          <View style={styles.statusUpdateSection}>
            <Text style={styles.sectionTitle}>Update Vehicle Status</Text>
            <View style={styles.statusOptions}>
              {['available', 'booked', 'in_maintenance', 'not_available'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, vehicleStatus === status && styles.statusOptionSelected]}
                  onPress={() => setVehicleStatus(status)}
                >
                  <Text style={[styles.statusOptionText, vehicleStatus === status && styles.statusOptionTextSelected]}>
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={updateVehicleStatus} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Update Status</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonGroupsContainer}>
            <View style={styles.buttonGroup}>
              <Text style={styles.buttonGroupTitle}>Maintenance</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsMaintenanceModalVisible(true)}>
                <Text style={styles.secondaryButtonText}>Log Maintenance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton} onPress={() => fetchMaintenanceLogs(selectedVehicle.id)}>
                <Text style={styles.outlineButtonText}>View Maintenance Logs</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonGroup}>
              <Text style={styles.buttonGroupTitle}>Fuel</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsFuelLogModalVisible(true)}>
                <Text style={styles.secondaryButtonText}>Add Fuel Log</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineButton} onPress={() => fetchFuelLogs(selectedVehicle.id)}>
                <Text style={styles.outlineButtonText}>View Fuel Logs</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderBookingDetailPage = () => (
    <ScrollView style={styles.pageContainer} showsVerticalScrollIndicator={false}>
      {selectedBooking && (
        <View style={styles.detailPageContent}>
          <View style={styles.bookingDetailHeader}>
            <View style={styles.bookingDetailInfo}>
              <Text style={styles.bookingTitleText}>
                {selectedBooking.vehicle.make} {selectedBooking.vehicle.model}
              </Text>
              <Text style={styles.bookingPlateText}>{selectedBooking.vehicle.license_plate}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
              <Text style={styles.statusBadgeText}>{selectedBooking.status}</Text>
            </View>
          </View>

          <View style={styles.bookingInfoSection}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.bookingInfoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Booked By</Text>
                <Text style={styles.infoValue}>{selectedBooking.booked_by.full_name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Employee ID</Text>
                <Text style={styles.infoValue}>{selectedBooking.booked_by.employee_id}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Purpose</Text>
                <Text style={styles.infoValue}>{selectedBooking.purpose}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Start Location</Text>
                <Text style={styles.infoValue}>{selectedBooking.start_location}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>End Location</Text>
                <Text style={styles.infoValue}>{selectedBooking.end_location}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Start Date & Time</Text>
                <Text style={styles.infoValue}>{formatDateTime(selectedBooking.start_time)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>End Date & Time</Text>
                <Text style={styles.infoValue}>{formatDateTime(selectedBooking.end_time)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Booking Created</Text>
                <Text style={styles.infoValue}>{formatDateTime(selectedBooking.created_at)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statusUpdateSection}>
            <Text style={styles.sectionTitle}>Update Booking Status</Text>
            <View style={styles.statusOptions}>
              {['booked', 'in-progress', 'completed', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, bookingStatus === status && styles.statusOptionSelected]}
                  onPress={() => setBookingStatus(status)}
                >
                  <Text style={[styles.statusOptionText, bookingStatus === status && styles.statusOptionTextSelected]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {bookingStatus === 'cancelled' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Reason for Cancellation *</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={cancellationReason}
                  onChangeText={setCancellationReason}
                  placeholder="Please provide the reason for cancellation"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={updateBookingStatus} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Update Status</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderVehiclesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assigned Vehicles</Text>
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleCard}
              onPress={() => {
                setSelectedVehicle(vehicle);
                setVehicleStatus(vehicle.status);
                setCurrentView('vehicle-detail');
              }}
            >
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleModel}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.vehiclePlate}>{vehicle.license_plate}</Text>
                  <Text style={styles.vehicleType}>
                    {vehicle.vehicle_type} • {vehicle.fuel_type} • {vehicle.year}
                  </Text>
                </View>
                <View style={[styles.vehicleStatusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
                  <Text style={styles.vehicleStatusText}>{vehicle.status}</Text>
                </View>
              </View>

              <View style={styles.vehicleDetails}>
                <Text style={styles.vehicleLocation}>
                  📍 {vehicle.current_location.city}, {vehicle.current_location.state}
                </Text>
                <Text style={styles.vehicleCapacity}>👥 {vehicle.seating_capacity} seats</Text>
              </View>

              <View style={styles.vehicleFooter}>
                <Text style={styles.tapToView}>Tap to view details and manage</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No vehicles assigned</Text>
            <Text style={styles.emptyStateSubtext}>
              Contact your administrator to get vehicle assignment
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderBookingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Car Bookings</Text>
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => {
                setSelectedBooking(booking);
                setBookingStatus(booking.status);
                setCancellationReason('');
                setCurrentView('booking-detail');
              }}
            >
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingVehicle}>
                    {booking.vehicle.make} {booking.vehicle.model}
                  </Text>
                  <Text style={styles.bookingPlate}>{booking.vehicle.license_plate}</Text>
                </View>
                <View style={[styles.bookingStatusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.bookingStatusText}>{booking.status}</Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Booked by:</Text> {booking.booked_by.full_name}
                </Text>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Purpose:</Text> {booking.purpose}
                </Text>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Route:</Text> {booking.start_location} → {booking.end_location}
                </Text>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Duration:</Text> {formatDate(booking.start_time)} - {formatDate(booking.end_time)}
                </Text>
              </View>

              <View style={styles.bookingFooter}>
                <Text style={styles.tapToUpdate}>Tap to view details and update status</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No bookings found</Text>
            <Text style={styles.emptyStateSubtext}>Car bookings will appear here</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderMainView = () => (
    <>
      <View style={styles.tabNavigation}>
        {[
          { key: 'vehicles' as const, label: 'Vehicles' },
          { key: 'bookings' as const, label: 'Bookings' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          activeTab === 'vehicles' ? renderVehiclesTab() : renderBookingsTab()
        )}
      </View>
    </>
  );

  const getPageTitle = () => {
    switch (currentView) {
      case 'vehicle-detail':
        return selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Vehicle Details';
      case 'booking-detail':
        return 'Booking Details';
      default:
        return 'Driver Module';
    }
  };

  const handleBackPress = () => {
    if (currentView !== 'main') {
      setCurrentView('main');
    } else {
      onBack();
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'vehicle-detail':
        return renderVehicleDetailPage();
      case 'booking-detail':
        return renderBookingDetailPage();
      default:
        return renderMainView();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getPageTitle()}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderContent()}

      <MaintenanceModal
        isVisible={isMaintenanceModalVisible}
        onClose={() => setIsMaintenanceModalVisible(false)}
        onSubmit={submitMaintenance}
        form={maintenanceForm}
        setForm={setMaintenanceForm}
        loading={loading}
      />

      <FuelLogModal
        isVisible={isFuelLogModalVisible}
        onClose={() => setIsFuelLogModalVisible(false)}
        onSubmit={submitFuelLog}
        form={fuelLogForm}
        setForm={setFuelLogForm}
        loading={loading}
      />

      <MaintenanceLogsModal
        isVisible={isMaintenanceLogsModalVisible}
        onClose={() => setIsMaintenanceLogsModalVisible(false)}
        logs={maintenanceLogs}
        formatDate={formatDate}
      />

      <FuelLogsModal
        isVisible={isFuelLogsModalVisible}
        onClose={() => setIsFuelLogsModalVisible(false)}
        logs={fuelLogs}
        formatDateTime={formatDateTime}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  dateButton: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, minHeight: 48, justifyContent: 'center' },
  dateButtonText: { fontSize: fontSize.md, color: colors.black },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  documentName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    marginRight: spacing.sm,
  },
  dateButtonPlaceholder: { color: colors.textSecondary },
  documentButton: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.backgroundSecondary, minHeight: 48, justifyContent: 'center' },
  documentButtonText: { fontSize: fontSize.md, color: colors.text },
  removeDocumentButton: { marginTop: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  removeDocumentText: { fontSize: fontSize.sm, color: colors.error },
  buttonGroupsContainer: { marginTop: spacing.lg },
  container: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.primary },
  backButton: { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: { width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2, borderColor: colors.white, transform: [{ rotate: '-45deg' }] },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '600', color: colors.white, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  tabNavigation: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.xs },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: borderRadius.sm, marginHorizontal: 2 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary, backgroundColor: colors.backgroundSecondary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: colors.primary, fontWeight: '600' },
  contentContainer: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  pageContainer: { flex: 1, backgroundColor: colors.backgroundSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  detailPageContent: { paddingBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  vehicleCard: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  vehicleInfo: { flex: 1, marginRight: spacing.sm },
  vehicleModel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  vehiclePlate: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginBottom: spacing.xs },
  vehicleType: { fontSize: fontSize.xs, color: colors.textSecondary },
  vehicleStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  vehicleStatusText: { fontSize: fontSize.xs, color: colors.white, fontWeight: '600', textTransform: 'uppercase' },
  vehicleDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  vehicleLocation: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1, marginRight: spacing.sm },
  vehicleCapacity: { fontSize: fontSize.xs, color: colors.textSecondary },
  vehicleFooter: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  tapToView: { fontSize: fontSize.xs, color: colors.primary, fontStyle: 'italic' },
  bookingCard: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  bookingInfo: { flex: 1, marginRight: spacing.sm },
  bookingVehicle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  bookingPlate: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  bookingStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  bookingStatusText: { fontSize: fontSize.xs, color: colors.white, fontWeight: '600', textTransform: 'uppercase' },
  bookingDetails: { marginBottom: spacing.md },
  bookingDetail: { fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs },
  bookingLabel: { fontWeight: '600' },
  bookingFooter: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  tapToUpdate: { fontSize: fontSize.xs, color: colors.primary, fontStyle: 'italic' },
  vehicleDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.md },
  vehicleDetailInfo: { flex: 1, marginRight: spacing.md },
  vehicleModelText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  vehiclePlateText: { fontSize: fontSize.lg, color: colors.primary, fontWeight: '600' },
  bookingDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.md },
  bookingDetailInfo: { flex: 1, marginRight: spacing.md },
  bookingTitleText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  bookingPlateText: { fontSize: fontSize.lg, color: colors.primary, fontWeight: '600' },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  statusBadgeText: { fontSize: fontSize.sm, color: colors.white, fontWeight: '600', textTransform: 'uppercase' },
  vehicleInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg, backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, ...shadows.md },
  bookingInfoSection: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg, ...shadows.md },
  bookingInfoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: spacing.md, paddingRight: spacing.sm },
  infoLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.xs },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  locationSection: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg, ...shadows.md },
  locationText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  statusUpdateSection: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg, ...shadows.md },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.md },
  statusOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.backgroundSecondary },
  statusOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusOptionText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  statusOptionTextSelected: { color: colors.white, fontWeight: '600' },
  buttonGroup: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg, ...shadows.md },
  buttonGroupTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.md, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryButtonText: { fontSize: fontSize.sm, color: colors.white, fontWeight: '600' },
  secondaryButton: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginBottom: spacing.sm },
  secondaryButtonText: { fontSize: fontSize.sm, color: colors.white, fontWeight: '600' },
  outlineButton: { backgroundColor: 'transparent', padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  outlineButtonText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  emptyState: { backgroundColor: colors.white, padding: spacing.xl, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.lg },
  emptyStateText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  emptyStateSubtext: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  keyboardAvoidingView: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: screenHeight * 0.85, paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  modalCloseButton: { width: 32, height: 32, borderRadius: borderRadius.full, backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: fontSize.lg, color: colors.textSecondary, fontWeight: '600' },
  modalScrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  logCard: { backgroundColor: colors.backgroundSecondary, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  logHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: spacing.md },
  logCost: { fontSize: fontSize.lg, color: colors.success, fontWeight: '700' },
  logDescription: { fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.md, lineHeight: 20 },
  logDetails: {},
  logDetail: { fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs },
  logLabel: { fontWeight: '600' },
  fuelDetails: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  fuelDetailItem: { alignItems: 'center' },
  fuelDetailLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.xs },
  fuelDetailValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  formGroup: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  textInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.sm, color: colors.text, backgroundColor: colors.white, minHeight: 48 },
  descriptionInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.sm, color: colors.text, backgroundColor: colors.white, minHeight: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  modalCancelButton: { flex: 1, backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  modalSubmitButton: { flex: 1, backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginLeft: spacing.sm, minHeight: 48, justifyContent: 'center' },
  modalSubmitButtonDisabled: { backgroundColor: colors.textSecondary, opacity: 0.6 },
  modalSubmitText: { fontSize: fontSize.sm, color: colors.white, fontWeight: '600' },
});
export default Driver;