import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
    StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
    Dimensions, KeyboardAvoidingView, Image, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

// Default cities as fallback - using all cities
const DEFAULT_CITIES = [
    { name: 'Bengaluru', icon: '🏛️' },
    { name: 'Mumbai', icon: '🌉' },
    { name: 'Hyderabad', icon: '🕌' },
    { name: 'Pune', icon: '🏰' },
    { name: 'Delhi', icon: '🏛️' },
    { name: 'Noida', icon: '🏙️' },
    { name: 'Chennai', icon: '🕍' },
    { name: 'Kolkata', icon: '🌉' },
    { name: 'Ahmedabad', icon: '🕌' },
    { name: 'Jaipur', icon: '🏰' },
    { name: 'Lucknow', icon: '🏛️' },
    { name: 'Chandigarh', icon: '🏙️' }
];

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
    grace_period?: number;
    booking_for_someone_else?: AssignedEmployee;
}

type ScreenType = 'city' | 'booking' | 'cabs' | 'myBookings';
type BookingStep = 1 | 2 | 3;

const Cab: React.FC<CabProps> = ({ onBack }) => {
    const insets = useSafeAreaInsets();
    const [currentScreen, setCurrentScreen] = useState<ScreenType>('city');
    const [bookingStep, setBookingStep] = useState<BookingStep>(1);
    const [selectedCity, setSelectedCity] = useState('');
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [myBookings, setMyBookings] = useState<Booking[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [cities, setCities] = useState(DEFAULT_CITIES);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
    const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
    const [showSwipeAnimation, setShowSwipeAnimation] = useState(false);
    const [activePickerType, setActivePickerType] = useState<string | null>(null);

    // Form states
    const [bookingForm, setBookingForm] = useState({
        fromLocation: '',
        toLocation: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startTime: new Date(new Date().setHours(9, 0, 0, 0)),
        endTime: new Date(new Date().setHours(18, 0, 0, 0)),
        purpose: '',
        gracePeriod: '1',
        bookingFor: null as AssignedEmployee | null,
    });

    const [cancelReason, setCancelReason] = useState('');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [showFromSuggestions, setShowFromSuggestions] = useState(false);
    const [showToSuggestions, setShowToSuggestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<AssignedEmployee[]>([]);
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);

    const swipeAnim = useRef(new Animated.Value(0)).current;
    const fromInputRef = useRef<TextInput>(null);
    const toInputRef = useRef<TextInput>(null);

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

    const searchUsers = async (query: string) => {
        if (!query.trim() || query.length < 2) return;

        try {
            const response = await fetch(
                `${BACKEND_URL}/core/getUsers?query=${encodeURIComponent(query)}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setUserSearchResults(data.data || []);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const handleCitySelect = (cityName: string) => {
        setSelectedCity(cityName);
        setCurrentScreen('booking');
        setBookingStep(1);
    };

    const handleNextStep = (nextStep: BookingStep) => {
        if (bookingStep === 1 && !bookingForm.fromLocation.trim()) {
            Alert.alert('Error', 'Please enter pickup location');
            return;
        }
        if (bookingStep === 2 && !bookingForm.toLocation.trim()) {
            Alert.alert('Error', 'Please enter destination');
            return;
        }

        setBookingStep(nextStep);
        
        // Focus the appropriate input when moving to next step
        if (nextStep === 2) {
            setTimeout(() => {
                toInputRef.current?.focus();
            }, 100);
        }
    };

    const searchCabs = async () => {
        if (!bookingForm.fromLocation.trim() || !bookingForm.toLocation.trim()) {
            Alert.alert('Error', 'Please complete all location fields');
            return;
        }

        setLoading(true);
        try {
            const startDateTime = `${bookingForm.startDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.startTime)}:00`;
            const endDateTime = `${bookingForm.endDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.endTime)}:00`;

            const response = await fetch(
                `${BACKEND_URL}/core/getAvailableVehicles?city=${encodeURIComponent(selectedCity)}&start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setVehicles(data.vehicles || []);
                setCurrentScreen('cabs');
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
        if (!token) return;

        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const bookVehicle = async () => {
        if (!selectedVehicle || !bookingForm.purpose.trim()) {
            Alert.alert('Error', 'Please fill all required booking fields');
            return;
        }

        setLoading(true);
        try {
            const startDateTime = `${bookingForm.startDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.startTime)}:00`;
            const endDateTime = `${bookingForm.endDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.endTime)}:00`;

            const requestData: any = {
                token,
                vehicle_id: selectedVehicle.id,
                start_time: startDateTime,
                end_time: endDateTime,
                purpose: bookingForm.purpose,
                start_location: bookingForm.fromLocation,
                end_location: bookingForm.toLocation
            };

            if (bookingForm.gracePeriod && bookingForm.gracePeriod.trim() !== '') {
                requestData.grace_period = bookingForm.gracePeriod;
            }

            if (bookingForm.bookingFor) {
                requestData.booking_for_someone_else = bookingForm.bookingFor.employee_id;
            }

            const response = await fetch(`${BACKEND_URL}/core/bookVehicle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            if (response.ok) {
                setIsBookingModalVisible(false);
                setIsConfirmationVisible(true);
                fetchMyBookings();
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
                setIsCancelModalVisible(false);
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

    const formatTimeForAPI = (date: Date): string => {
        return date.toTimeString().slice(0, 5);
    };

    const formatTimeForDisplay = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDateForDisplay = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
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
            case 'available': return '#00d285';
            case 'booked': return '#017bf9';
            case 'completed': return '#666';
            case 'cancelled': return '#ff5e7a';
            case 'in-progress': return '#ffb157';
            default: return '#666';
        }
    };

    const getStatusText = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'available': return 'Available';
            case 'booked': return 'Upcoming';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            case 'in-progress': return 'Current';
            default: return status;
        }
    };

    const handlePickerChange = (event: any, selectedDate?: Date) => {
        if (selectedDate && activePickerType) {
            setBookingForm(prev => ({
                ...prev,
                [activePickerType]: selectedDate
            }));
        }
        setActivePickerType(null);
    };

   
    // Filter cities based on search query
    const filteredCities = cities.filter(city =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Render Components
    const CityScreen = () => (
        <View style={styles.screenContainer}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Your City</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onBack}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#017bf9" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for your city"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#666"
                    />
                </View>
            </View>

            <View style={styles.divider}>
                <Text style={styles.dividerText}>Popular Cities</Text>
            </View>

            <ScrollView
                style={styles.citiesGridScroll}
                contentContainerStyle={styles.citiesGridContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredCities.map((city, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.cityCard}
                        onPress={() => handleCitySelect(city.name)}
                    >
                        <View style={styles.cityIcon}>
                            <Text style={styles.cityIconText}>{city.icon}</Text>
                        </View>
                        <Text style={styles.cityName}>{city.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const BookingScreen = () => (
        <View style={styles.screenContainer}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('city')}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Book Office Cab</Text>
                    <Text style={styles.headerSubtitle}>Plan your office commute in advance</Text>
                </View>
            </View>

            <ScrollView 
                style={styles.bookingForm}
                contentContainerStyle={styles.bookingFormContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Step 1: From Location */}
                {bookingStep === 1 && (
                    <View style={styles.formStep}>
                        <View style={styles.stepHeader}>
                            <View style={styles.stepIcon}>
                                <MaterialCommunityIcons name="map-marker" size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.stepTitle}>Where from?</Text>
                                <Text style={styles.stepSubtitle}>Enter your pickup location</Text>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <TextInput
                                ref={fromInputRef}
                                style={styles.formInput}
                                value={bookingForm.fromLocation}
                                onChangeText={(text) => setBookingForm(prev => ({ ...prev, fromLocation: text }))}
                                placeholder="Enter pickup location"
                                placeholderTextColor="#999"
                                autoFocus={bookingStep === 1}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.searchBtn, !bookingForm.fromLocation.trim() && styles.disabledBtn]}
                            onPress={() => handleNextStep(2)}
                            disabled={!bookingForm.fromLocation.trim()}
                        >
                            <Text style={styles.searchBtnText}>Next →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 2: To Location */}
                {bookingStep === 2 && (
                    <View style={styles.formStep}>
                        <View style={styles.stepHeader}>
                            <View style={[styles.stepIcon, { backgroundColor: '#ffb157' }]}>
                                <MaterialCommunityIcons name="map-marker-check" size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.stepTitle}>Where to?</Text>
                                <Text style={styles.stepSubtitle}>Enter your destination</Text>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <TextInput
                                ref={toInputRef}
                                style={styles.formInput}
                                value={bookingForm.toLocation}
                                onChangeText={(text) => setBookingForm(prev => ({ ...prev, toLocation: text }))}
                                placeholder="Enter destination"
                                placeholderTextColor="#999"
                                autoFocus={bookingStep === 2}
                            />
                        </View>

                        

                        <TouchableOpacity
                            style={[styles.searchBtn, !bookingForm.toLocation.trim() && styles.disabledBtn]}
                            onPress={() => handleNextStep(3)}
                            disabled={!bookingForm.toLocation.trim()}
                        >
                            <Text style={styles.searchBtnText}>Next →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 3: Schedule */}
                {bookingStep === 3 && (
                    <View style={styles.formStep}>
                        <View style={styles.stepHeader}>
                            <View style={[styles.stepIcon, { backgroundColor: '#ff5e7a' }]}>
                                <MaterialCommunityIcons name="clock" size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.stepTitle}>When?</Text>
                                <Text style={styles.stepSubtitle}>Select date and time</Text>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Start Date & Time</Text>
                            <View style={styles.dateTimeRow}>
                                <TouchableOpacity
                                    style={styles.dateTimeInput}
                                    onPress={() => setActivePickerType('startDate')}
                                >
                                    <MaterialCommunityIcons name="calendar" size={20} color="#017bf9" />
                                    <Text style={styles.dateTimeText}>
                                        {formatDateForDisplay(bookingForm.startDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.dateTimeInput}
                                    onPress={() => setActivePickerType('startTime')}
                                >
                                    <MaterialCommunityIcons name="clock-outline" size={20} color="#017bf9" />
                                    <Text style={styles.dateTimeText}>
                                        {formatTimeForDisplay(bookingForm.startTime)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>End Date & Time</Text>
                            <View style={styles.dateTimeRow}>
                                <TouchableOpacity
                                    style={styles.dateTimeInput}
                                    onPress={() => setActivePickerType('endDate')}
                                >
                                    <MaterialCommunityIcons name="calendar" size={20} color="#017bf9" />
                                    <Text style={styles.dateTimeText}>
                                        {formatDateForDisplay(bookingForm.endDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.dateTimeInput}
                                    onPress={() => setActivePickerType('endTime')}
                                >
                                    <MaterialCommunityIcons name="clock-outline" size={20} color="#017bf9" />
                                    <Text style={styles.dateTimeText}>
                                        {formatTimeForDisplay(bookingForm.endTime)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.searchBtn, loading && styles.disabledBtn]}
                            onPress={searchCabs}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.searchBtnText}>Search Available Cabs</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );

    const CabsScreen = () => (
        <View style={styles.screenContainer}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('booking')}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Available Cabs</Text>
            </View>

            <ScrollView style={styles.cabsList}>
                {vehicles.map((vehicle) => (
                    <TouchableOpacity
                        key={vehicle.id}
                        style={styles.cabCard}
                        onPress={() => {
                            setSelectedVehicle(vehicle);
                            setIsBookingModalVisible(true);
                        }}
                        disabled={vehicle.status !== 'Available'}
                    >
                        <Image
                            source={{ uri: `https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80` }}
                            style={styles.cabImage}
                            defaultSource={require('../assets/car-placeholder.jpeg')}
                        />

                        <View style={styles.cabInfo}>
                            <View style={styles.cabDetails}>
                                <Text style={styles.cabName}>{vehicle.make} {vehicle.model}</Text>
                                <Text style={styles.cabMeta}>
                                    {vehicle.license_plate} • {vehicle.vehicle_type} • {vehicle.color}
                                </Text>
                                <Text style={styles.cabMeta}>
                                    {vehicle.fuel_type} • {vehicle.year} • {vehicle.seating_capacity} Seater
                                </Text>

                                <View style={styles.cabSpecs}>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specText}>{vehicle.fuel_type}</Text>
                                    </View>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specText}>{vehicle.year}</Text>
                                    </View>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specText}>{vehicle.seating_capacity} Seater</Text>
                                    </View>
                                </View>

                                <View style={styles.driverInfo}>
                                    <View style={styles.driverAvatar}>
                                        <Text style={styles.driverAvatarText}>
                                            {vehicle.assigned_to.full_name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.driverName}>{vehicle.assigned_to.full_name}</Text>
                                        <Text style={styles.driverId}>Employee ID: {vehicle.assigned_to.employee_id}</Text>
                                    </View>
                                </View>

                                <Text style={styles.locationText}>
                                    <Text style={{ fontWeight: '600' }}>Current Location:</Text> {vehicle.current_location.city}, {vehicle.current_location.state}
                                </Text>
                            </View>

                            <View style={styles.cabActions}>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: vehicle.status === 'Available' ? 'rgba(0,210,133,0.1)' : 'rgba(255,181,87,0.1)' }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        { color: getStatusColor(vehicle.status) }
                                    ]}>
                                        {vehicle.status}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.selectBtn, vehicle.status !== 'Available' && styles.disabledBtn]}
                                    disabled={vehicle.status !== 'Available'}
                                    onPress={() => {
                                        setSelectedVehicle(vehicle);
                                        setIsBookingModalVisible(true);
                                    }}
                                >
                                    <Text style={styles.selectBtnText}>
                                        {vehicle.status === 'Available' ? 'Select' : 'Unavailable'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const MyBookingsScreen = () => {
        useEffect(() => {
            if (currentScreen === 'myBookings') {
                fetchMyBookings();
            }
        }, [currentScreen]);

        return (
            <View style={styles.screenContainer}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Bookings</Text>
                </View>

                <ScrollView style={styles.cabsList}>
                    {loading && myBookings.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#017bf9" />
                            <Text style={styles.loadingText}>Loading bookings...</Text>
                        </View>
                    ) : myBookings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="car" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No bookings yet</Text>
                            <TouchableOpacity
                                style={styles.searchBtn}
                                onPress={() => setCurrentScreen('booking')}
                            >
                                <Text style={styles.searchBtnText}>Book Your First Ride</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        myBookings.map((booking) => (
                            <View key={booking.id} style={styles.bookingCard}>
                                <View style={styles.bookingHeader}>
                                    <View>
                                        <Text style={styles.bookingCabName}>
                                            {booking.vehicle.make} {booking.vehicle.model}
                                        </Text>
                                        <Text style={styles.bookingCabMeta}>{booking.vehicle.license_plate}</Text>
                                    </View>
                                    <View style={[
                                        styles.bookingStatus,
                                        { backgroundColor: getStatusColor(booking.status) + '20' }
                                    ]}>
                                        <Text style={[styles.bookingStatusText, { color: getStatusColor(booking.status) }]}>
                                            {getStatusText(booking.status)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.bookingDetails}>
                                    <View style={styles.bookingInfoRow}>
                                        <Text style={styles.infoLabel}>Purpose:</Text>
                                        <Text style={styles.infoValue}>{booking.purpose}</Text>
                                    </View>

                                    <View style={styles.locationRow}>
                                        <View style={[styles.locationDot, styles.startDot]} />
                                        <Text style={styles.locationText}>{booking.start_location}</Text>
                                    </View>
                                    <View style={styles.locationRow}>
                                        <View style={[styles.locationDot, styles.endDot]} />
                                        <Text style={styles.locationText}>{booking.end_location}</Text>
                                    </View>

                                    <View style={styles.bookingInfoRow}>
                                        <Text style={styles.infoLabel}>Driver:</Text>
                                        <Text style={styles.infoValue}>{booking.vehicle.assigned_to.full_name}</Text>
                                    </View>

                                    <View style={styles.bookingInfoRow}>
                                        <Text style={styles.infoLabel}>Start:</Text>
                                        <Text style={styles.infoValue}>{formatDateTime(booking.start_time)}</Text>
                                    </View>

                                    <View style={styles.bookingInfoRow}>
                                        <Text style={styles.infoLabel}>End:</Text>
                                        <Text style={styles.infoValue}>{formatDateTime(booking.end_time)}</Text>
                                    </View>

                                    {booking.grace_period && (
                                        <View style={styles.bookingInfoRow}>
                                            <Text style={styles.infoLabel}>Grace Period:</Text>
                                            <Text style={styles.infoValue}>{booking.grace_period} hours</Text>
                                        </View>
                                    )}

                                    {booking.booking_for_someone_else && (
                                        <View style={styles.bookingInfoRow}>
                                            <Text style={styles.infoLabel}>Booking For:</Text>
                                            <Text style={styles.infoValue}>{booking.booking_for_someone_else.full_name}</Text>
                                        </View>
                                    )}

                                    {booking.reason_of_cancellation && (
                                        <View style={styles.bookingInfoRow}>
                                            <Text style={styles.infoLabel}>Cancellation Reason:</Text>
                                            <Text style={[styles.infoValue, { color: '#ff5e7a' }]}>
                                                {booking.reason_of_cancellation}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {booking.status === 'booked' && (
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={() => {
                                            setSelectedBooking(booking);
                                            setIsCancelModalVisible(true);
                                        }}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        );
    };

    const BookingModal = () => (
        <Modal
            visible={isBookingModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setIsBookingModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Booking Details</Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={() => setIsBookingModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Purpose of Trip</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={bookingForm.purpose}
                                    onChangeText={(text) => setBookingForm(prev => ({ ...prev, purpose: text }))}
                                    placeholder="e.g., Office commute, Client meeting"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Grace Period (hours)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={bookingForm.gracePeriod}
                                    onChangeText={(text) => setBookingForm(prev => ({ ...prev, gracePeriod: text }))}
                                    placeholder="Enter grace period in hours"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.checkboxWrapper}>
                                <TouchableOpacity
                                    style={styles.checkbox}
                                    onPress={() => {
                                        if (!bookingForm.bookingFor) {
                                            setShowUserSuggestions(true);
                                        } else {
                                            setBookingForm(prev => ({ ...prev, bookingFor: null }));
                                        }
                                    }}
                                >
                                    <MaterialCommunityIcons
                                        name={bookingForm.bookingFor ? "checkbox-marked" : "checkbox-blank-outline"}
                                        size={24}
                                        color="#017bf9"
                                    />
                                </TouchableOpacity>
                                <Text style={styles.checkboxLabel}>Booking for someone else</Text>
                            </View>

                            {bookingForm.bookingFor && (
                                <View style={styles.selectedPerson}>
                                    <View style={styles.selectedPersonAvatar}>
                                        <Text style={styles.selectedPersonAvatarText}>
                                            {bookingForm.bookingFor.full_name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <Text style={styles.selectedPersonName}>Booking for: {bookingForm.bookingFor.full_name}</Text>
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => setBookingForm(prev => ({ ...prev, bookingFor: null }))}
                                    >
                                        <Ionicons name="close" size={20} color="#ff5e7a" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {showUserSuggestions && (
                                <View style={styles.autocompleteWrapper}>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Search by name, employee ID, or email"
                                        placeholderTextColor="#999"
                                        onChangeText={(text) => {
                                            setSearchQuery(text);
                                            searchUsers(text);
                                        }}
                                    />
                                    <ScrollView style={styles.autocompleteList}>
                                        {userSearchResults.map((user) => (
                                            <TouchableOpacity
                                                key={user.employee_id}
                                                style={styles.autocompleteItem}
                                                onPress={() => {
                                                    setBookingForm(prev => ({ ...prev, bookingFor: user }));
                                                    setShowUserSuggestions(false);
                                                    setSearchQuery('');
                                                }}
                                            >
                                                <View style={styles.userAvatar}>
                                                    <Text style={styles.userAvatarText}>
                                                        {user.full_name.split(' ').map(n => n[0]).join('')}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.userName}>{user.full_name}</Text>
                                                    <Text style={styles.userDetails}>{user.employee_id} • {user.email}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.searchBtn, loading && styles.disabledBtn]}
                                onPress={bookVehicle}
                                disabled={loading || !bookingForm.purpose.trim()}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.searchBtnText}>Confirm Booking</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );

    const ConfirmationModal = () => (
        <Modal
            visible={isConfirmationVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsConfirmationVisible(false)}
        >
            <View style={styles.confirmationOverlay}>
                <View style={styles.confirmationContent}>
                    <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={48} color="#fff" />
                    </View>
                    <Text style={styles.confirmationTitle}>Trip Confirmed!</Text>
                    <Text style={styles.confirmationSubtitle}>Your booking has been confirmed successfully</Text>
                    <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={() => {
                            setIsConfirmationVisible(false);
                            setCurrentScreen('myBookings');
                        }}
                    >
                        <Text style={styles.searchBtnText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const CancelModal = () => (
        <Modal
            visible={isCancelModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setIsCancelModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cancel Booking</Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={() => setIsCancelModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.cancelWarning}>
                                Are you sure you want to cancel this booking?
                            </Text>

                            {selectedBooking && (
                                <View style={styles.bookingPreview}>
                                    <Text style={styles.previewTitle}>
                                        {selectedBooking.vehicle.make} {selectedBooking.vehicle.model}
                                    </Text>
                                    <Text style={styles.previewText}>{selectedBooking.vehicle.license_plate}</Text>
                                    <Text style={styles.previewText}>{selectedBooking.purpose}</Text>
                                    <Text style={styles.previewText}>
                                        {formatDateTime(selectedBooking.start_time)} - {formatDateTime(selectedBooking.end_time)}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Reason for Cancellation *</Text>
                                <TextInput
                                    style={[styles.formInput, styles.textArea]}
                                    value={cancelReason}
                                    onChangeText={setCancelReason}
                                    placeholder="Please provide a reason for cancelling"
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnCancel]}
                                    onPress={() => setIsCancelModalVisible(false)}
                                >
                                    <Text style={styles.modalBtnCancelText}>Keep Booking</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnConfirm, !cancelReason.trim() && styles.disabledBtn]}
                                    onPress={cancelBooking}
                                    disabled={loading || !cancelReason.trim()}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.modalBtnConfirmText}>Cancel Booking</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.appContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#017bf9" />

            {/* Main Screens */}
            {currentScreen === 'city' && <CityScreen />}
            {currentScreen === 'booking' && <BookingScreen />}
            {currentScreen === 'cabs' && <CabsScreen />}
            {currentScreen === 'myBookings' && <MyBookingsScreen />}

            {/* Bottom Navigation */}
            {currentScreen !== 'city' && (
                <View style={styles.bottomNav}>
                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'booking' && styles.activeNavItem]}
                        onPress={() => {
                            setCurrentScreen('booking');
                            setBookingStep(1);
                        }}
                    >
                        <MaterialCommunityIcons name="car" size={24} color={currentScreen === 'booking' ? '#017bf9' : '#666'} />
                        <Text style={[styles.navLabel, currentScreen === 'booking' && styles.activeNavLabel]}>Book</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'myBookings' && styles.activeNavItem]}
                        onPress={() => setCurrentScreen('myBookings')}
                    >
                        <MaterialCommunityIcons name="format-list-bulleted" size={24} color={currentScreen === 'myBookings' ? '#017bf9' : '#666'} />
                        <Text style={[styles.navLabel, currentScreen === 'myBookings' && styles.activeNavLabel]}>My Bookings</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modals */}
            <BookingModal />
            <CancelModal />
            <ConfirmationModal />

            {/* Date/Time Pickers */}
            {activePickerType && (
                <DateTimePicker
                    value={bookingForm[activePickerType as keyof typeof bookingForm] as Date}
                    mode={activePickerType.includes('Date') ? 'date' : 'time'}
                    display="default"
                    onChange={handlePickerChange}
                    minimumDate={activePickerType.includes('Date') ? new Date() : undefined}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    screenContainer: {
        flex: 1,
    },

    // Header
    header: {
        backgroundColor: '#017bf9',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 4,
    },
    backBtn: {
        position: 'absolute',
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        position: 'absolute',
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
        fontWeight: '400',
    },

    // City Selection
    searchBox: {
        padding: 20,
    },
    searchInputWrapper: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderRadius: 25,
        paddingHorizontal: 45,
        paddingVertical: 15,
        fontSize: 16,
        flex: 1,
    },
    searchIcon: {
        position: 'absolute',
        left: 20,
        zIndex: 1,
    },
    divider: {
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    citiesGridScroll: {
        flex: 1,
    },
    citiesGridContent: {
        padding: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cityCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        width: '48%',
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    cityIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#017bf9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cityIconText: {
        fontSize: 24,
    },
    cityName: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
        textAlign: 'center',
    },

    // Booking Form
    bookingForm: {
        flex: 1,
    },
    bookingFormContent: {
        padding: 20,
        paddingBottom: 100,
    },
    formStep: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
        minHeight: 300,
    },
    activeStep: {
        display: 'flex',
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    stepIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#00d285',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    stepTitle: {
        fontSize: 20,
        color: '#333',
        fontWeight: '600',
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    formInput: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dateTimeInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateTimeText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    
    searchBtn: {
        backgroundColor: '#00d285',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    searchBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.5,
    },

    // Cabs List
    cabsList: {
        flex: 1,
        padding: 20,
    },
    cabCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
    },
    cabImage: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 15,
    },
    cabInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cabDetails: {
        flex: 1,
        marginRight: 15,
    },
    cabName: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
        marginBottom: 5,
    },
    cabMeta: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
    },
    cabSpecs: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
    },
    specItem: {
        backgroundColor: 'rgba(1,123,249,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15,
    },
    specText: {
        fontSize: 12,
        color: '#017bf9',
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    driverAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ff5e7a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    driverAvatarText: {
        color: '#fff',
        fontWeight: '600',
    },
    driverName: {
        fontWeight: '600',
        color: '#333',
    },
    driverId: {
        fontSize: 12,
        color: '#666',
    },
    locationText: {
        fontSize: 13,
        color: '#666',
        marginTop: 10,
    },
    cabActions: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 15,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    selectBtn: {
        backgroundColor: '#00d285',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    selectBtnText: {
        color: '#fff',
        fontWeight: '600',
    },

    // My Bookings
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    bookingCabName: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
        marginBottom: 5,
    },
    bookingCabMeta: {
        fontSize: 13,
        color: '#666',
    },
    bookingStatus: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    bookingStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    bookingDetails: {
        marginBottom: 15,
    },
    bookingInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        color: '#666',
        fontSize: 14,
    },
    infoValue: {
        color: '#333',
        fontWeight: '500',
        fontSize: 14,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    locationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    startDot: {
        backgroundColor: '#00d285',
    },
    endDot: {
        backgroundColor: '#ff5e7a',
    },
    cancelBtn: {
        backgroundColor: '#ff5e7a',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    cancelBtnText: {
        color: '#fff',
        fontWeight: '600',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        padding: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        color: '#333',
        fontWeight: '600',
    },
    modalClose: {
        backgroundColor: '#f0f0f0',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScroll: {
        flexGrow: 0,
    },
    checkboxWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    checkbox: {
        marginRight: 10,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#333',
    },
    selectedPerson: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(1,123,249,0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 10,
    },
    selectedPersonAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ff5e7a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    selectedPersonAvatarText: {
        color: '#fff',
        fontWeight: '600',
    },
    selectedPersonName: {
        flex: 1,
        color: '#017bf9',
        fontWeight: '500',
    },
    removeBtn: {
        marginLeft: 10,
    },
    autocompleteWrapper: {
        marginTop: 10,
    },
    autocompleteList: {
        maxHeight: 150,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#017bf9',
        borderRadius: 12,
        marginTop: 5,
    },
    autocompleteItem: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ff5e7a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    userAvatarText: {
        color: '#fff',
        fontWeight: '600',
    },
    userName: {
        fontWeight: '600',
        color: '#333',
    },
    userDetails: {
        fontSize: 12,
        color: '#666',
    },
    cancelWarning: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    bookingPreview: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    previewText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 3,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    modalBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalBtnCancel: {
        backgroundColor: '#e0e0e0',
    },
    modalBtnConfirm: {
        backgroundColor: '#ff5e7a',
    },
    modalBtnCancelText: {
        color: '#333',
        fontWeight: '600',
    },
    modalBtnConfirmText: {
        color: '#fff',
        fontWeight: '600',
    },

    // Confirmation
    confirmationOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmationContent: {
        backgroundColor: '#fff',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        maxWidth: 320,
    },
    checkmark: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#00d285',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    confirmationTitle: {
        fontSize: 24,
        color: '#333',
        marginBottom: 10,
        fontWeight: '600',
    },
    confirmationSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },

    // Bottom Navigation
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    navItem: {
        alignItems: 'center',
        padding: 5,
    },
    activeNavItem: {},
    navLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
    },
    activeNavLabel: {
        color: '#017bf9',
    },

    // Loading & Empty States
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
    },
    loadingText: {
        marginTop: 15,
        color: '#666',
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        padding: 60,
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        marginTop: 20,
        marginBottom: 20,
    },
});

export default Cab;