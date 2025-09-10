import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
  Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

interface CabProps {
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
}

type TabType = 'search' | 'my-bookings';

const Cab: React.FC<CabProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Modal states
  const [isVehicleDetailModalVisible, setIsVehicleDetailModalVisible] = useState(false);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  
  // Search form states
  const [searchForm, setSearchForm] = useState({
    city: 'Hyderabad',
    start_date: '',
    end_date: '',
    start_time: '08:00',
    end_time: '18:00'
  });
  
  // Booking form states
  const [bookingForm, setBookingForm] = useState({
    purpose: '',
    start_location: '',
    end_location: ''
  });
  
  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

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
      fetchMyBookings();
      // Set default dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setSearchForm(prev => ({
        ...prev,
        start_date: today.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0]
      }));
    }
  }, [token]);

  const searchVehicles = async () => {
    if (!searchForm.city || !searchForm.start_date || !searchForm.end_date) {
      Alert.alert('Error', 'Please fill all search fields');
      return;
    }

    setLoading(true);
    try {
      const startDateTime = `${searchForm.start_date}T${searchForm.start_time}:00`;
      const endDateTime = `${searchForm.end_date}T${searchForm.end_time}:00`;
      
      const response = await fetch(
        `${BACKEND_URL}/core/getAvailableVehicles?city=${encodeURIComponent(searchForm.city)}&start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
        if (data.vehicles.length === 0) {
          Alert.alert('No Vehicles', 'No vehicles available for the selected criteria');
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to search vehicles');
      }
    } catch (error) {
      console.error('Error searching vehicles:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getMyBookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setMyBookings(data.vehicle_bookings || []);
      } else {
        console.error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const bookVehicle = async () => {
    if (!selectedVehicle || !bookingForm.purpose || !bookingForm.start_location || !bookingForm.end_location) {
      Alert.alert('Error', 'Please fill all booking fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/bookVehicle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          vehicle_id: selectedVehicle.id,
          start_time: searchForm.start_date,
          end_time: searchForm.end_date,
          purpose: bookingForm.purpose,
          start_location: bookingForm.start_location,
          end_location: bookingForm.end_location
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Vehicle booked successfully!');
        closeBookingModal();
        searchVehicles(); // Refresh available vehicles
        fetchMyBookings(); // Refresh bookings
        setActiveTab('my-bookings'); // Switch to bookings tab
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to book vehicle');
      }
    } catch (error) {
      console.error('Error booking vehicle:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/cancelbooking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          booking_id: selectedBooking.id,
          reason_of_cancellation: cancelReason
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Booking cancelled successfully!');
        closeCancelModal();
        fetchMyBookings();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleDetails = async (vehicleId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getVehicleDetails?vehicle_id=${vehicleId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedVehicle(data.vehicle);
        setIsVehicleDetailModalVisible(true);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to fetch vehicle details');
      }
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const closeBookingModal = () => {
    setIsBookingModalVisible(false);
    setBookingForm({ purpose: '', start_location: '', end_location: '' });
  };

  const closeCancelModal = () => {
    setIsCancelModalVisible(false);
    setCancelReason('');
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
      case 'available': return colors.success;
      case 'booked': return colors.primary;
      case 'completed': return colors.info;
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

  const VehicleDetailModal = () => (
    <Modal
      visible={isVehicleDetailModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsVehicleDetailModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={[styles.modalContainer, { maxHeight: screenHeight * 0.9 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vehicle Details</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsVehicleDetailModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedVehicle && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.vehicleDetailContainer}>
                  <View style={styles.vehicleDetailHeader}>
                    <View style={styles.vehicleDetailInfo}>
                      <Text style={styles.vehicleModelText}>
                        {selectedVehicle.make} {selectedVehicle.model}
                      </Text>
                      <Text style={styles.vehiclePlateText}>{selectedVehicle.license_plate}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(selectedVehicle.status) }
                    ]}>
                      <Text style={styles.statusBadgeText}>{selectedVehicle.status}</Text>
                    </View>
                  </View>

                  <View style={styles.vehicleInfoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Type</Text>
                      <Text style={styles.infoValue}>{selectedVehicle.vehicle_type}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Color</Text>
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
                    <Text style={styles.sectionTitle}>Driver Information</Text>
                    <Text style={styles.driverInfo}>
                      Name: {selectedVehicle.assigned_to.full_name}
                    </Text>
                    <Text style={styles.driverInfo}>
                      Employee ID: {selectedVehicle.assigned_to.employee_id}
                    </Text>
                  </View>

                  <View style={styles.locationSection}>
                    <Text style={styles.sectionTitle}>Current Location</Text>
                    <Text style={styles.locationText}>
                      {selectedVehicle.current_location.address}, {selectedVehicle.current_location.city}, {selectedVehicle.current_location.state} - {selectedVehicle.current_location.zip_code}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => {
                      setIsVehicleDetailModalVisible(false);
                      setIsBookingModalVisible(true);
                    }}
                  >
                    <Text style={styles.bookButtonText}>Book This Vehicle</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const BookingModal = () => (
    <Modal
      visible={isBookingModalVisible}
      transparent
      animationType="slide"
      onRequestClose={closeBookingModal}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Vehicle</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeBookingModal}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {selectedVehicle && (
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleInfoTitle}>
                    {selectedVehicle.make} {selectedVehicle.model}
                  </Text>
                  <Text style={styles.vehicleInfoText}>
                    {selectedVehicle.license_plate} • {selectedVehicle.seating_capacity} seats
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Purpose of Trip *</Text>
                <TextInput
                  style={styles.textInput}
                  value={bookingForm.purpose}
                  onChangeText={(text) => setBookingForm({ ...bookingForm, purpose: text })}
                  placeholder="Enter the purpose of your trip"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Location *</Text>
                <TextInput
                  style={styles.textInput}
                  value={bookingForm.start_location}
                  onChangeText={(text) => setBookingForm({ ...bookingForm, start_location: text })}
                  placeholder="Enter pickup location"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>End Location *</Text>
                <TextInput
                  style={styles.textInput}
                  value={bookingForm.end_location}
                  onChangeText={(text) => setBookingForm({ ...bookingForm, end_location: text })}
                  placeholder="Enter drop-off location"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.dateInfo}>
                <Text style={styles.dateInfoTitle}>Booking Period</Text>
                <Text style={styles.dateInfoText}>
                  From: {searchForm.start_date} at {searchForm.start_time}
                </Text>
                <Text style={styles.dateInfoText}>
                  To: {searchForm.end_date} at {searchForm.end_time}
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closeBookingModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    (!bookingForm.purpose || !bookingForm.start_location || !bookingForm.end_location) && styles.modalSubmitButtonDisabled
                  ]}
                  onPress={bookVehicle}
                  disabled={loading || !bookingForm.purpose || !bookingForm.start_location || !bookingForm.end_location}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Book Vehicle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const CancelModal = () => (
    <Modal
      visible={isCancelModalVisible}
      transparent
      animationType="slide"
      onRequestClose={closeCancelModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeCancelModal}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalScrollContent}>
            {selectedBooking && (
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingInfoTitle}>
                  {selectedBooking.vehicle.make} {selectedBooking.vehicle.model}
                </Text>
                <Text style={styles.bookingInfoText}>
                  {selectedBooking.vehicle.license_plate}
                </Text>
                <Text style={styles.bookingInfoText}>
                  {formatDate(selectedBooking.start_time)} - {formatDate(selectedBooking.end_time)}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason for Cancellation *</Text>
              <TextInput
                style={styles.descriptionInput}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Please provide a reason for cancelling this booking"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeCancelModal}
              >
                <Text style={styles.modalCancelText}>Keep Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  { backgroundColor: colors.error },
                  !cancelReason.trim() && styles.modalSubmitButtonDisabled
                ]}
                onPress={cancelBooking}
                disabled={loading || !cancelReason.trim()}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Cancel Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSearchTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Vehicles</Text>
        
        <View style={styles.searchForm}>
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.textInput}
                value={searchForm.city}
                onChangeText={(text) => setSearchForm({ ...searchForm, city: text })}
                placeholder="Enter city"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.textInput}
                value={searchForm.start_date}
                onChangeText={(text) => setSearchForm({ ...searchForm, start_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.textInput}
                value={searchForm.end_date}
                onChangeText={(text) => setSearchForm({ ...searchForm, end_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.textInput}
                value={searchForm.start_time}
                onChangeText={(text) => setSearchForm({ ...searchForm, start_time: text })}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.textInput}
                value={searchForm.end_time}
                onChangeText={(text) => setSearchForm({ ...searchForm, end_time: text })}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchVehicles}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search Vehicles</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Vehicles</Text>
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleCard}
              onPress={() => fetchVehicleDetails(vehicle.id)}
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
                <View style={[
                  styles.vehicleStatusBadge,
                  { backgroundColor: getStatusColor(vehicle.status) }
                ]}>
                  <Text style={styles.vehicleStatusText}>{vehicle.status}</Text>
                </View>
              </View>
              
              <View style={styles.vehicleDetails}>
                <Text style={styles.vehicleLocation}>
                  📍 {vehicle.current_location.city}, {vehicle.current_location.state}
                </Text>
                <Text style={styles.vehicleCapacity}>👥 {vehicle.seating_capacity} seats</Text>
              </View>
              
              <View style={styles.driverSection}>
                <Text style={styles.driverText}>
                  Driver: {vehicle.assigned_to.full_name}
                </Text>
              </View>
              
              <View style={styles.vehicleFooter}>
                <Text style={styles.tapToView}>Tap to view details and book</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No vehicles found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search criteria
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderMyBookingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Bookings</Text>
        {myBookings.length > 0 ? (
          myBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingVehicle}>
                    {booking.vehicle.make} {booking.vehicle.model}
                  </Text>
                  <Text style={styles.bookingPlate}>{booking.vehicle.license_plate}</Text>
                </View>
                <View style={[
                  styles.bookingStatusBadge,
                  { backgroundColor: getStatusColor(booking.status) }
                ]}>
                  <Text style={styles.bookingStatusText}>{booking.status}</Text>
                </View>
              </View>
              
              <View style={styles.bookingDetails}>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Purpose:</Text> {booking.purpose}
                </Text>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Route:</Text> {booking.start_location} → {booking.end_location}
                </Text>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Driver:</Text> {booking.vehicle.assigned_to.full_name}
                </Text>
                <Text style={styles.bookingDetail}>
                  <Text style={styles.bookingLabel}>Period:</Text> {formatDate(booking.start_time)} - {formatDate(booking.end_time)}
                </Text>
                {booking.reason_of_cancellation && (
                  <Text style={styles.bookingDetail}>
                    <Text style={styles.bookingLabel}>Cancellation Reason:</Text> {booking.reason_of_cancellation}
                  </Text>
                )}
              </View>
              
              {booking.status === 'booked' && (
                <View style={styles.bookingActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setSelectedBooking(booking);
                      setIsCancelModalVisible(true);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No bookings found</Text>
            <Text style={styles.emptyStateSubtext}>
              Your vehicle bookings will appear here
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'search': return renderSearchTab();
      case 'my-bookings': return renderMyBookingsTab();
      default: return renderSearchTab();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cab Booking</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabNavigation}>
        {[
          { key: 'search' as const, label: 'Search Vehicles' },
          { key: 'my-bookings' as const, label: 'My Bookings' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      <VehicleDetailModal />
      <BookingModal />
      <CancelModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, backgroundColor: colors.primary,
  },
  backButton: { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: colors.white, transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl, fontWeight: '600', color: colors.white,
    flex: 1, textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  tabNavigation: {
    flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderRadius: borderRadius.sm, marginHorizontal: 2,
  },
  activeTab: {
    borderBottomWidth: 3, borderBottomColor: colors.primary,
    backgroundColor: colors.backgroundSecondary,
  },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: colors.primary, fontWeight: '600' },
  contentContainer: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md,
  },
  
  // Search Form Styles
  searchForm: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  formRow: { flexDirection: 'row', marginBottom: spacing.md },
  formGroup: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    padding: spacing.md, fontSize: fontSize.sm, color: colors.text,
    backgroundColor: colors.white, minHeight: 48,
  },
  descriptionInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    padding: spacing.md, fontSize: fontSize.sm, color: colors.text,
    backgroundColor: colors.white, minHeight: 100, textAlignVertical: 'top',
  },
  searchButton: {
    backgroundColor: colors.primary, padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.sm,
  },
  searchButtonText: {
    fontSize: fontSize.md, color: colors.white, fontWeight: '600',
  },

  // Vehicle Card Styles
  vehicleCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border, elevation: 2,
  },
  vehicleHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.sm,
  },
  vehicleInfo: { flex: 1, marginRight: spacing.sm },
  vehicleModel: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs,
  },
  vehiclePlate: { 
    fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginBottom: spacing.xs,
  },
  vehicleType: { fontSize: fontSize.xs, color: colors.textSecondary },
  vehicleStatusBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    minWidth: 80, alignItems: 'center', justifyContent: 'center',
  },
  vehicleStatusText: {
    fontSize: fontSize.xs, color: colors.white, fontWeight: '600', textTransform: 'uppercase',
  },
  vehicleDetails: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginVertical: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  vehicleLocation: {
    fontSize: fontSize.xs, color: colors.textSecondary, flex: 1, marginRight: spacing.sm,
  },
  vehicleCapacity: {
    fontSize: fontSize.xs, color: colors.textSecondary,
  },
  driverSection: {
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  driverText: {
    fontSize: fontSize.xs, color: colors.info, fontWeight: '500',
  },
  vehicleFooter: {
    marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'center',
  },
  tapToView: {
    fontSize: fontSize.xs, color: colors.primary, fontStyle: 'italic',
  },

  // Booking Card Styles
  bookingCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  bookingHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.md,
  },
  bookingVehicle: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs,
  },
  bookingPlate: { 
    fontSize: fontSize.sm, color: colors.primary, fontWeight: '600',
  },
  bookingStatusBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    minWidth: 80, alignItems: 'center', justifyContent: 'center',
  },
  bookingStatusText: {
    fontSize: fontSize.xs, color: colors.white, fontWeight: '600', textTransform: 'uppercase',
  },
  bookingDetails: { marginBottom: spacing.md },
  bookingDetail: {
    fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs,
  },
  bookingLabel: { fontWeight: '600' },
  bookingActions: {
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.error, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    fontSize: fontSize.sm, color: colors.white, fontWeight: '600',
  },

  emptyState: {
    backgroundColor: colors.white, padding: spacing.xl, borderRadius: borderRadius.lg,
    alignItems: 'center', marginTop: spacing.lg,
  },
  emptyStateText: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1, justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, maxHeight: screenHeight * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text,
  },
  modalCloseButton: {
    width: 32, height: 32, borderRadius: borderRadius.full, backgroundColor: colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: fontSize.lg, color: colors.textSecondary, fontWeight: '600',
  },
  modalScrollContent: {
    padding: spacing.lg, paddingBottom: spacing.xl,
  },

  // Vehicle Detail Modal Styles
  vehicleDetailContainer: {
    paddingBottom: spacing.lg,
  },
  vehicleDetailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  vehicleDetailInfo: {
    flex: 1, marginRight: spacing.md,
  },
  vehicleModelText: {
    fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs,
  },
  vehiclePlateText: {
    fontSize: fontSize.lg, color: colors.primary, fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    minWidth: 90, alignItems: 'center', justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: fontSize.sm, color: colors.white, fontWeight: '600', textTransform: 'uppercase',
  },
  vehicleInfoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg,
  },
  infoItem: {
    width: '50%', marginBottom: spacing.md, paddingRight: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600',
    textTransform: 'uppercase', marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: fontSize.sm, color: colors.text, fontWeight: '500',
  },
  locationSection: {
    backgroundColor: colors.backgroundSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: fontSize.sm, color: colors.text, lineHeight: 20,
  },
  driverInfo: {
    fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs,
  },
  bookButton: {
    backgroundColor: colors.primary, padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center',
  },
  bookButtonText: {
    fontSize: fontSize.md, color: colors.white, fontWeight: '600',
  },

  // Form Styles in Modals
  vehicleInfoTitle: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm,
  },
  vehicleInfoText: {
    fontSize: fontSize.sm, color: colors.textSecondary,
  },
  dateInfo: {
    backgroundColor: colors.backgroundSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
  },
  dateInfoTitle: {
    fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm,
  },
  dateInfoText: {
    fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs,
  },
  bookingInfo: {
    backgroundColor: colors.backgroundSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
  },
  bookingInfoTitle: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm,
  },
  bookingInfoText: {
    fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg,
    paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
  },
  modalCancelButton: {
    flex: 1, backgroundColor: colors.backgroundSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center', marginRight: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1, backgroundColor: colors.primary, padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center', marginLeft: spacing.sm,
    minHeight: 48, justifyContent: 'center',
  },
  modalSubmitButtonDisabled: {
    backgroundColor: colors.textSecondary, opacity: 0.6,
  },
  modalSubmitText: {
    fontSize: fontSize.sm, color: colors.white, fontWeight: '600',
  },
});

export default Cab;