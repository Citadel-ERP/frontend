import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
  Dimensions, KeyboardAvoidingView, FlatList, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
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
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#075E54" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Log Maintenance</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="currency-inr" size={20} color="#075E54" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={form.cost}
                    onChangeText={(text) => setForm(prev => ({ ...prev, cost: text }))}
                    placeholder="Enter maintenance cost"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="description" size={20} color="#075E54" style={styles.inputIcon} />
                  <TextInput
                    style={styles.descriptionInput}
                    value={form.description}
                    onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                    placeholder="Describe the maintenance work"
                    placeholderTextColor="#888"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                  <MaterialIcons name="date-range" size={20} color="#075E54" style={styles.buttonIcon} />
                  <Text style={[styles.dateButtonText, !form.start_date && styles.dateButtonPlaceholder]}>
                    {form.start_date || 'Select start date'}
                  </Text>
                </TouchableOpacity>
                {showStartDatePicker && (
                  <DateTimePicker value={startDate} mode="date" display="default" onChange={handleStartDateChange} />
                )}
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                  <MaterialIcons name="date-range" size={20} color="#075E54" style={styles.buttonIcon} />
                  <Text style={[styles.dateButtonText, !form.end_date && styles.dateButtonPlaceholder]}>
                    {form.end_date || 'Select end date'}
                  </Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker value={endDate} mode="date" display="default" onChange={handleEndDateChange} />
                )}
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity style={styles.documentButton} onPress={handleDocumentPick}>
                  <MaterialIcons name="attach-file" size={20} color="#075E54" style={styles.buttonIcon} />
                  <Text style={styles.documentButtonText}>
                    {form.document ? form.document.name || 'Document Selected' : 'Attach Document (Optional)'}
                  </Text>
                </TouchableOpacity>
                {form.document && (
                  <View style={styles.documentInfo}>
                    <View style={styles.documentRow}>
                      <MaterialIcons name="insert-drive-file" size={16} color="#075E54" />
                      <Text style={styles.documentName} numberOfLines={1}>
                        {form.document.name}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.removeDocumentButton} 
                      onPress={() => setForm(prev => ({ ...prev, document: null }))}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={onClose} disabled={loading}>
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
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit</Text>
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
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#075E54" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Fuel Log</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="fuel" size={20} color="#075E54" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={form.quantity}
                    onChangeText={(text) => setForm(prev => ({ ...prev, quantity: text }))}
                    placeholder="Enter fuel quantity (Liters)"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="currency-inr" size={20} color="#075E54" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={form.cost}
                    onChangeText={(text) => setForm(prev => ({ ...prev, cost: text }))}
                    placeholder="Enter fuel cost"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="speedometer" size={20} color="#075E54" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={form.odometer_reading}
                    onChangeText={(text) => setForm(prev => ({ ...prev, odometer_reading: text }))}
                    placeholder="Enter odometer reading (KM)"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={onClose} disabled={loading}>
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
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit</Text>
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
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Maintenance Logs</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.logHeaderLeft}>
                      <MaterialCommunityIcons name="toolbox" size={20} color="#075E54" />
                      <Text style={styles.logCost}>₹{log.cost}</Text>
                    </View>
                    <Text style={styles.logDate}>{formatDate(log.maintenance_date)}</Text>
                  </View>
                  <Text style={styles.logDescription}>{log.description}</Text>
                  <View style={styles.logDetails}>
                    <View style={styles.logDetailRow}>
                      <MaterialIcons name="calendar-today" size={14} color="#666" />
                      <Text style={styles.logDetail}>
                        {formatDate(log.start_date)} - {formatDate(log.end_date)}
                      </Text>
                    </View>
                    <View style={styles.logDetailRow}>
                      <Ionicons name="person" size={14} color="#666" />
                      <Text style={styles.logDetail}>
                        {log.logged_by.full_name}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="toolbox-outline" size={60} color="#CCCCCC" />
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
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Fuel Logs</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.logHeaderLeft}>
                      <MaterialCommunityIcons name="fuel" size={20} color="#075E54" />
                      <View>
                        <Text style={styles.logCost}>₹{log.cost}</Text>
                        <Text style={styles.logQuantity}>{log.quantity}L</Text>
                      </View>
                    </View>
                    <Text style={styles.logDate}>{formatDateTime(log.fuel_date)}</Text>
                  </View>
                  <View style={styles.fuelDetails}>
                    <View style={styles.fuelDetailItem}>
                      <MaterialCommunityIcons name="speedometer" size={16} color="#666" />
                      <Text style={styles.fuelDetailValue}>{log.odometer_reading} km</Text>
                    </View>
                  </View>
                  <View style={styles.logDetails}>
                    <View style={styles.logDetailRow}>
                      <Ionicons name="person" size={14} color="#666" />
                      <Text style={styles.logDetail}>
                        {log.logged_by.full_name}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="fuel" size={60} color="#CCCCCC" />
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

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

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
      const formData = new FormData();
      formData.append('token', token || '');
      formData.append('vehicle_id', selectedVehicle.id.toString());
      formData.append('cost', maintenanceForm.cost);
      formData.append('description', maintenanceForm.description);
      formData.append('start_date', maintenanceForm.start_date);
      formData.append('end_date', maintenanceForm.end_date);

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
      case 'active':
      case 'available':
      case 'completed': return '#25D366';
      case 'maintenance':
      case 'in-progress': return '#FF9500';
      case 'inactive':
      case 'not_available':
      case 'cancelled': return '#FF3B30';
      case 'booked': return '#007AFF';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'available': return 'checkmark-circle';
      case 'maintenance': return 'build';
      case 'inactive': return 'close-circle';
      case 'booked': return 'time';
      case 'completed': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      case 'in-progress': return 'sync-circle';
      default: return 'help-circle';
    }
  };

  const renderVehicleDetailPage = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      
      {/* Header with Back Button */}
      <View style={styles.detailHeader}>
        <TouchableOpacity 
          style={styles.detailBackButton} 
          onPress={() => setCurrentView('main')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.detailBackText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Vehicle Details</Text>
        <View style={styles.detailHeaderSpacer} />
      </View>

      <ScrollView style={styles.detailPageContainer} showsVerticalScrollIndicator={false}>
        {selectedVehicle && (
          <View style={styles.detailPageContent}>
            {/* Vehicle Header Card */}
            <View style={styles.vehicleDetailHeaderCard}>
              <View style={styles.vehicleDetailHeader}>
                <View style={styles.vehicleAvatar}>
                  <MaterialCommunityIcons name="car" size={40} color="#075E54" />
                </View>
                <View style={styles.vehicleDetailInfo}>
                  <Text style={styles.vehicleModelText}>
                    {selectedVehicle.make} {selectedVehicle.model}
                  </Text>
                  <Text style={styles.vehiclePlateText}>{selectedVehicle.license_plate}</Text>
                  <View style={styles.vehicleMeta}>
                    <View style={styles.metaChip}>
                      <MaterialCommunityIcons name="palette" size={12} color="#075E54" />
                      <Text style={styles.metaChipText}>{selectedVehicle.color}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <MaterialCommunityIcons name="fuel" size={12} color="#075E54" />
                      <Text style={styles.metaChipText}>{selectedVehicle.fuel_type}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Status Badge */}
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVehicle.status) }]}>
                <Ionicons name={getStatusIcon(selectedVehicle.status)} size={16} color="#FFFFFF" />
                <Text style={styles.statusBadgeText}>{selectedVehicle.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Vehicle Details Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="car-info" size={20} color="#075E54" />
                <Text style={styles.cardTitle}>Vehicle Details</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="car-door" size={18} color="#666" />
                  <Text style={styles.infoLabel}>Seating:</Text>
                  <Text style={styles.infoValue}>{selectedVehicle.seating_capacity} seats</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={styles.infoLabel}>Year:</Text>
                  <Text style={styles.infoValue}>{selectedVehicle.year}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={18} color="#666" />
                  <Text style={styles.infoLabel}>Location:</Text>
                  <Text style={styles.infoValue}>
                    {selectedVehicle.current_location.city}, {selectedVehicle.current_location.state}
                  </Text>
                </View>
              </View>
            </View>

            {/* Update Status Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="update" size={20} color="#075E54" />
                <Text style={styles.cardTitle}>Update Status</Text>
              </View>
              <View style={styles.statusOptions}>
                {['available', 'not_available', 'in_maintenance'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusOption, vehicleStatus === status && styles.statusOptionSelected]}
                    onPress={() => setVehicleStatus(status)}
                  >
                    <Ionicons 
                      name={getStatusIcon(status)} 
                      size={20} 
                      color={vehicleStatus === status ? '#FFFFFF' : '#075E54'} 
                    />
                    <Text style={[styles.statusOptionText, vehicleStatus === status && styles.statusOptionTextSelected]}>
                      {status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={updateVehicleStatus} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.updateButtonText}>Update Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsMaintenanceModalVisible(true)}>
                <MaterialCommunityIcons name="toolbox" size={24} color="#075E54" />
                <Text style={styles.actionButtonText}>Maintenance</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsFuelLogModalVisible(true)}>
                <MaterialCommunityIcons name="fuel" size={24} color="#075E54" />
                <Text style={styles.actionButtonText}>Fuel Log</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => fetchMaintenanceLogs(selectedVehicle.id)}>
                <MaterialCommunityIcons name="history" size={24} color="#075E54" />
                <Text style={styles.actionButtonText}>Logs</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => fetchFuelLogs(selectedVehicle.id)}>
                <MaterialCommunityIcons name="gas-station" size={24} color="#075E54" />
                <Text style={styles.actionButtonText}>Fuel History</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderBookingDetailPage = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      
      {/* Header with Back Button */}
      <View style={styles.detailHeader}>
        <TouchableOpacity 
          style={styles.detailBackButton} 
          onPress={() => setCurrentView('main')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.detailBackText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Booking Details</Text>
        <View style={styles.detailHeaderSpacer} />
      </View>

      <ScrollView style={styles.detailPageContainer} showsVerticalScrollIndicator={false}>
        {selectedBooking && (
          <View style={styles.detailPageContent}>
            {/* Booking Header Card */}
            <View style={styles.vehicleDetailHeaderCard}>
              <View style={styles.bookingDetailHeader}>
                <View style={styles.vehicleAvatar}>
                  <MaterialCommunityIcons name="car" size={40} color="#075E54" />
                </View>
                <View style={styles.bookingDetailInfo}>
                  <Text style={styles.bookingTitleText}>
                    {selectedBooking.vehicle.make} {selectedBooking.vehicle.model}
                  </Text>
                  <Text style={styles.bookingPlateText}>{selectedBooking.vehicle.license_plate}</Text>
                  <View style={styles.bookingMeta}>
                    <View style={styles.metaChip}>
                      <Ionicons name="person" size={12} color="#075E54" />
                      <Text style={styles.metaChipText}>{selectedBooking.booked_by.full_name}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Status Badge */}
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
                <Ionicons name={getStatusIcon(selectedBooking.status)} size={16} color="#FFFFFF" />
                <Text style={styles.statusBadgeText}>{selectedBooking.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Booking Information Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="info" size={20} color="#075E54" />
                <Text style={styles.cardTitle}>Booking Information</Text>
              </View>
              <View style={styles.bookingInfoGrid}>
                <View style={styles.infoRow}>
                  <MaterialIcons name="description" size={18} color="#666" />
                  <Text style={styles.infoLabel}>Purpose:</Text>
                  <Text style={styles.infoValue}>{selectedBooking.purpose}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={18} color="#666" />
                  <Text style={styles.infoLabel}>Route:</Text>
                  <Text style={styles.infoValue}>
                    {selectedBooking.start_location} → {selectedBooking.end_location}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={styles.infoLabel}>Start:</Text>
                  <Text style={styles.infoValue}>{formatDateTime(selectedBooking.start_time)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={styles.infoLabel}>End:</Text>
                  <Text style={styles.infoValue}>{formatDateTime(selectedBooking.end_time)}</Text>
                </View>
              </View>
            </View>

            {/* Update Booking Status Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="update" size={20} color="#075E54" />
                <Text style={styles.cardTitle}>Update Booking Status</Text>
              </View>
              <View style={styles.statusOptions}>
                {['booked', 'in-progress', 'completed', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusOption, bookingStatus === status && styles.statusOptionSelected]}
                    onPress={() => setBookingStatus(status)}
                  >
                    <Ionicons 
                      name={getStatusIcon(status)} 
                      size={20} 
                      color={bookingStatus === status ? '#FFFFFF' : '#075E54'} 
                    />
                    <Text style={[styles.statusOptionText, bookingStatus === status && styles.statusOptionTextSelected]}>
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {bookingStatus === 'cancelled' && (
                <View style={styles.formGroup}>
                  <View style={styles.inputContainer}>
                    <MaterialIcons name="warning" size={20} color="#FF3B30" style={styles.inputIcon} />
                    <TextInput
                      style={styles.descriptionInput}
                      value={cancellationReason}
                      onChangeText={setCancellationReason}
                      placeholder="Reason for cancellation"
                      placeholderTextColor="#888"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={updateBookingStatus} 
                disabled={loading || (bookingStatus === 'cancelled' && !cancellationReason.trim())}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.updateButtonText}>Update Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderVehicleItem = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => {
        setSelectedVehicle(item);
        setVehicleStatus(item.status);
        setCurrentView('vehicle-detail');
      }}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="car" size={28} color="#075E54" />
        </View>
        {item.status === 'available' && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>
            {item.make} {item.model}
          </Text>
          <Text style={styles.chatTime}>{item.year}</Text>
        </View>
        
        <View style={styles.chatMessage}>
          <Text style={styles.messageText} numberOfLines={1}>
            <Text style={styles.plateText}>{item.license_plate}</Text> • {item.color} • {item.seating_capacity} seats
          </Text>
        </View>
        
        <View style={styles.chatFooter}>
          <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeSmallText}>{item.status}</Text>
          </View>
          <Text style={styles.locationText}>
            <Ionicons name="location" size={12} color="#666" /> {item.current_location.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => {
        setSelectedBooking(item);
        setBookingStatus(item.status);
        setCancellationReason('');
        setCurrentView('booking-detail');
      }}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: '#E3F2FD' }]}>
          <MaterialCommunityIcons name="car-clock" size={28} color="#075E54" />
        </View>
      </View>
      
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>
            {item.vehicle.make} {item.vehicle.model}
          </Text>
          <Text style={styles.chatTime}>{formatDate(item.start_time)}</Text>
        </View>
        
        <View style={styles.chatMessage}>
          <Text style={styles.messageText} numberOfLines={1}>
            <Text style={styles.boldText}>{item.booked_by.full_name}</Text> • {item.purpose}
          </Text>
        </View>
        
        <View style={styles.chatFooter}>
          <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeSmallText}>{item.status}</Text>
          </View>
          <Text style={styles.locationText}>
            <Ionicons name="swap-horizontal" size={12} color="#666" /> {item.start_location} → {item.end_location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMainView = () => (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      
      {/* Main Header - Fixed to remove white space */}
      <View style={styles.mainHeader}>
        <View style={styles.mainHeaderContent}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.logoText}>DRIVER MODULE</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Section */}
        <View style={[styles.header, styles.headerBanner]}>
          <LinearGradient
            colors={['#4A5568', '#2D3748']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerBanner}
          >
            {/* Background Image */}
            <Image
              source={require('../assets/cars.jpeg')}
              style={[styles.headerImage]}
              resizeMode="cover"
            />
            {/* Dark overlay for better text visibility */}
            <View style={styles.headerOverlay} />
            
            {/* Banner Content */}
            <View style={styles.bannerContent}>
              <View style={styles.titleSection}>
                <Text style={styles.sectionTitle}>Manage Your Vehicles</Text>
                <Text style={styles.sectionSubtitle}>
                  {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} assigned
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'vehicles' && styles.activeTabButton]}
            onPress={() => setActiveTab('vehicles')}
          >
            <MaterialCommunityIcons 
              name="car" 
              size={24} 
              color={activeTab === 'vehicles' ? '#075E54' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'vehicles' && styles.activeTabText]}>
              Vehicles ({vehicles.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'bookings' && styles.activeTabButton]}
            onPress={() => setActiveTab('bookings')}
          >
            <MaterialIcons 
              name="bookmarks" 
              size={24} 
              color={activeTab === 'bookings' ? '#075E54' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
              Bookings ({bookings.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activeTab === 'vehicles' ? (
              vehicles.length > 0 ? (
                <FlatList
                  data={vehicles}
                  renderItem={renderVehicleItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="car-off" size={80} color="#CCCCCC" />
                  <Text style={styles.emptyTitle}>No Vehicles Assigned</Text>
                  <Text style={styles.emptySubtitle}>
                    Contact your administrator to get vehicle assignment
                  </Text>
                </View>
              )
            ) : (
              bookings.length > 0 ? (
                <FlatList
                  data={bookings}
                  renderItem={renderBookingItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="bookmark-remove" size={80} color="#CCCCCC" />
                  <Text style={styles.emptyTitle}>No Bookings Found</Text>
                  <Text style={styles.emptySubtitle}>Car bookings will appear here</Text>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const getPageTitle = () => {
    switch (currentView) {
      case 'vehicle-detail':
        return 'Vehicle Details';
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
    <>
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
    </>
  );
};

const styles = StyleSheet.create({
  // Main View Styles
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainHeader: {
    backgroundColor: '#075E54',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mainHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBanner: {
    height: 200,
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
  },
  bannerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'flex-end',
    position: 'relative',
    zIndex: 1,
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
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    backgroundColor: '#E8F5E9',
    borderBottomColor: '#075E54',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#075E54',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  chatMessage: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  plateText: {
    fontWeight: '600',
    color: '#075E54',
  },
  boldText: {
    fontWeight: '600',
    color: '#000000',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
  },
  statusBadgeSmallText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Detail Page Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  detailBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  detailBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  detailHeaderSpacer: {
    width: 60,
  },
  detailPageContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  detailPageContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  vehicleDetailHeaderCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  vehicleDetailHeader: {
    flexDirection: 'row',
  },
  vehicleAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleDetailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  vehicleModelText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  vehiclePlateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 8,
  },
  vehicleMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  metaChipText: {
    fontSize: 12,
    color: '#075E54',
    fontWeight: '500',
  },
  bookingDetailHeader: {
    flexDirection: 'row',
  },
  bookingDetailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookingTitleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  bookingPlateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 8,
  },
  bookingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 120,
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  infoGrid: {
    gap: 12,
  },
  bookingInfoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 4,
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#075E54',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  statusOptionSelected: {
    backgroundColor: '#075E54',
    borderColor: '#075E54',
  },
  statusOptionText: {
    fontSize: 12,
    color: '#075E54',
    fontWeight: '600',
  },
  statusOptionTextSelected: {
    color: '#FFFFFF',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#075E54',
    padding: 16,
    borderRadius: 25,
    gap: 8,
  },
  updateButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
    minWidth: 70,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#075E54',
    marginTop: 4,
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 48,
  },
  descriptionInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  dateButtonPlaceholder: {
    color: '#888',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  documentButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: '#075E54',
    marginLeft: 8,
    flex: 1,
  },
  removeDocumentButton: {
    padding: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#075E54',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  modalSubmitText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logCost: {
    fontSize: 18,
    fontWeight: '700',
    color: '#075E54',
  },
  logDate: {
    fontSize: 12,
    color: '#666',
  },
  logQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logDescription: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 12,
  },
  logDetails: {
    gap: 8,
  },
  logDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logDetail: {
    fontSize: 13,
    color: '#666',
  },
  fuelDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fuelDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fuelDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default Driver;