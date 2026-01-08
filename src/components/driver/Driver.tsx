import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

import { styles } from './styles';
import { BackIcon } from './components/BackIcon';
import { MaintenanceModal } from './components/modals/MaintenanceModal';
import { FuelLogModal } from './components/modals/FuelLogModal';
import { MaintenanceLogsModal } from './components/modals/MaintenanceLogsModal';
import { FuelLogsModal } from './components/modals/FuelLogsModal';
import {
  DriverProps,
  Vehicle,
  Booking,
  MaintenanceRecord,
  FuelLog,
  ViewType,
  TOKEN_KEY,
  Document,
} from './types';
import { BACKEND_URL } from '../../config/config';

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
    document: null as Document | null,
  });

  const [fuelLogForm, setFuelLogForm] = useState({
    quantity: '',
    cost: '',
    odometer_reading: '',
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
          status: vehicleStatus,
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
        status: bookingStatus,
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
    if (
      !selectedVehicle ||
      !maintenanceForm.cost ||
      !maintenanceForm.description ||
      !maintenanceForm.start_date ||
      !maintenanceForm.end_date
    ) {
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
        formData.append('document', maintenanceForm.document);
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
        setMaintenanceForm({
          cost: '',
          description: '',
          start_date: '',
          end_date: '',
          document: null,
        });
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
          odometer_reading: fuelLogForm.odometer_reading,
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
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'available':
      case 'completed':
        return '#25D366';
      case 'maintenance':
      case 'in-progress':
        return '#FF9500';
      case 'inactive':
      case 'not_available':
      case 'cancelled':
        return '#FF3B30';
      case 'booked':
        return '#007AFF';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'available':
        return 'checkmark-circle';
      case 'maintenance':
        return 'build';
      case 'inactive':
        return 'close-circle';
      case 'booked':
        return 'time';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle';
      case 'in-progress':
        return 'sync-circle';
      default:
        return 'help-circle';
    }
  };

  // Function to get vehicle image source
  const getVehicleImageSource = (vehicle: Vehicle) => {
    if (vehicle.image_url) {
      // If image_url is a full URL, use it directly
      if (vehicle.image_url.startsWith('http')) {
        return { uri: vehicle.image_url };
      }
      // If it's a relative path, append to BACKEND_URL
      return { uri: `${BACKEND_URL}/${vehicle.image_url.replace(/^\//, '')}` };
    }
    
    // If vehicle has images array with at least one image
    if (vehicle.images && vehicle.images.length > 0) {
      const firstImage = vehicle.images[0];
      if (firstImage.url) {
        if (firstImage.url.startsWith('http')) {
          return { uri: firstImage.url };
        }
        return { uri: `${BACKEND_URL}/${firstImage.url.replace(/^\//, '')}` };
      }
    }
    
    // Fallback to default car icon
    return null;
  };

  // Function to render vehicle image or icon
  const renderVehicleImage = (vehicle: Vehicle, size: 'small' | 'large' = 'small') => {
    const imageSource = getVehicleImageSource(vehicle);
    
    if (imageSource) {
      return (
        <Image
          source={imageSource}
          style={size === 'small' ? styles.vehicleImage : styles.vehicleImageLarge}
          resizeMode="cover"
          onError={(e) => {
            console.log('Failed to load vehicle image:', e.nativeEvent.error);
            // Image loading will fail silently and show the fallback icon
          }}
        />
      );
    }
    
    // Fallback to icon
    return (
      <View style={size === 'small' ? styles.vehicleIconContainer : styles.vehicleIconContainerLarge}>
        <MaterialCommunityIcons 
          name="car" 
          size={size === 'small' ? 28 : 40} 
          color="#075E54" 
        />
      </View>
    );
  };

  const renderVehicleDetailPage = () => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

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
            <View style={styles.vehicleDetailHeaderCard}>
              <View style={styles.vehicleDetailHeader}>
                {/* Vehicle Image or Icon */}
                {renderVehicleImage(selectedVehicle, 'large')}
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

            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVehicle.status) }]}>
                <Ionicons name={getStatusIcon(selectedVehicle.status)} size={16} color="#FFFFFF" />
                <Text style={styles.statusBadgeText}>{selectedVehicle.status.toUpperCase()}</Text>
              </View>
            </View>

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

            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="update" size={20} color="#075E54" />
                <Text style={styles.cardTitle}>Update Status</Text>
              </View>
              <View style={styles.statusOptions}>
                {['available', 'not_available', 'in_maintenance'].map((status) => {
                  let buttonColor = '#8E8E93'; // default color
                  if (status === 'available') buttonColor = '#25D366';
                  if (status === 'not_available') buttonColor = '#FF3B30';
                  if (status === 'in_maintenance') buttonColor = '#FF9500';

                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        vehicleStatus === status && styles.statusOptionSelected,
                        vehicleStatus === status && { backgroundColor: buttonColor }
                      ]}
                      onPress={() => setVehicleStatus(status)}
                    >
                      <Ionicons
                        name={getStatusIcon(status)}
                        size={20}
                        color={vehicleStatus === status ? '#FFFFFF' : buttonColor}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          vehicleStatus === status && styles.statusOptionTextSelected,
                          vehicleStatus === status && { color: '#FFFFFF' }
                        ]}
                      >
                        {status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
    </View>
  );

  const renderBookingDetailPage = () => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

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
            <View style={styles.vehicleDetailHeaderCard}>
              <View style={styles.bookingDetailHeader}>
                {/* Vehicle Image or Icon */}
                {selectedBooking.vehicle && renderVehicleImage(selectedBooking.vehicle, 'large')}
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

            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
                <Ionicons name={getStatusIcon(selectedBooking.status)} size={16} color="#FFFFFF" />
                <Text style={styles.statusBadgeText}>{selectedBooking.status.toUpperCase()}</Text>
              </View>
            </View>

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

            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="update" size={20} color="#075E54" />
                <Text style={styles.cardTitle}>Update Booking Status</Text>
              </View>
              <View style={styles.statusOptions}>
                {['booked', 'in-progress', 'completed', 'cancelled'].map((status) => {
                  const statusColor = getStatusColor(status);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        bookingStatus === status && styles.statusOptionSelected,
                        bookingStatus === status && { backgroundColor: statusColor }
                      ]}
                      onPress={() => setBookingStatus(status)}
                    >
                      <Ionicons
                        name={getStatusIcon(status)}
                        size={20}
                        color={bookingStatus === status ? '#FFFFFF' : statusColor}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          bookingStatus === status && styles.statusOptionTextSelected,
                          bookingStatus === status && { color: '#FFFFFF' }
                        ]}
                      >
                        {status.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
    </View>
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
        {/* Vehicle Image or Icon */}
        {renderVehicleImage(item, 'small')}
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
        {/* Vehicle Image or Icon */}
        {item.vehicle && renderVehicleImage(item.vehicle, 'small')}
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
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, styles.headerBanner]}>
          <LinearGradient
            colors={['#4A5568', '#2D3748']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerBanner}
          >
            <Image
              source={require('../../assets/cars.jpeg')}
              style={[styles.headerImage]}
              resizeMode="cover"
            />
            <View style={styles.headerOverlay} />
            <View style={styles.mainHeader}>
              <View style={styles.mainHeaderContent}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <BackIcon />
                </TouchableOpacity>
                <Text style={styles.logoText}>CITADEL</Text>
                <View style={styles.headerSpacer} />
              </View>
            </View>

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
    </View>
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

export default Driver;