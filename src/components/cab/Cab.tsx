import React, { useState, useEffect, useRef } from 'react';
import {
    SafeAreaView, StatusBar, Alert, Modal, ActivityIndicator,
    Platform, Dimensions, Animated, Text, View, TouchableOpacity, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BACKEND_URL } from '../../config/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CityScreen from './city';
import AvailableCabsScreen from './availableCabs';
import MyBookingsScreen from './myBookings';
import BookingScreen from './booking';
import BookVehicleModal from './bookVehicle';
import CancelBookingModal from './cancelBookingModal';
import ConfirmationModal from './confirmationModal';
import {
    CabProps, ScreenType, BookingStep, BookingFormData,
    Vehicle, Booking, AssignedEmployee
} from './types';
import {
    DEFAULT_CITIES, formatTimeForAPI, formatTimeForDisplay, formatDateForDisplay
} from './utils';
import { styles } from './styles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

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
    const [bookingForm, setBookingForm] = useState<BookingFormData>({
        fromLocation: '',
        toLocation: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        startTime: new Date(new Date().setHours(9, 0, 0, 0)),
        endTime: new Date(new Date().setHours(18, 0, 0, 0)),
        purpose: '',
        gracePeriod: '1',
        bookingFor: null,
    });
    const [cancelReason, setCancelReason] = useState('');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
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

    const handleViewBookingsFromCity = () => {
        setCurrentScreen('myBookings');
        fetchMyBookings();
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

    const handlePickerChange = (event: any, selectedDate?: Date) => {
        if (selectedDate && activePickerType) {
            setBookingForm(prev => ({
                ...prev,
                [activePickerType]: selectedDate
            }));
        }
        setActivePickerType(null);
    };

    const filteredCities = cities.filter(city =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Use conditional SafeAreaView for city screen
    const Container = currentScreen === 'city' ? View : SafeAreaView;

    // Check if bottom navigation should be shown
    const showBottomNav = currentScreen === 'booking' || currentScreen === 'myBookings';

    return (
        <Container style={styles.appContainer}>
            {currentScreen !== 'city' && <StatusBar barStyle="light-content" backgroundColor="#017bf9" />}

            {/* Main Screens */}
            {currentScreen === 'city' && (
                <CityScreen
                    onBack={onBack}
                    onCitySelect={handleCitySelect}
                    onViewBookings={handleViewBookingsFromCity}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filteredCities={filteredCities}
                />
            )}

            {currentScreen === 'booking' && (
                <BookingScreen
                    bookingStep={bookingStep}
                    setBookingStep={setBookingStep}
                    bookingForm={bookingForm}
                    setBookingForm={setBookingForm}
                    selectedCity={selectedCity}
                    loading={loading}
                    onBack={() => setCurrentScreen('city')}
                    onSearchCabs={searchCabs}
                    onSetActivePickerType={setActivePickerType}
                    formatTimeForDisplay={formatTimeForDisplay}
                    formatDateForDisplay={formatDateForDisplay}
                />
            )}

            {currentScreen === 'cabs' && (
                <AvailableCabsScreen
                    vehicles={vehicles}
                    onBack={() => setCurrentScreen('booking')}
                    onSelectVehicle={(vehicle) => {
                        setSelectedVehicle(vehicle);
                        setIsBookingModalVisible(true);
                    }}
                />
            )}

            {currentScreen === 'myBookings' && (
                <MyBookingsScreen
                    bookings={myBookings}
                    loading={loading}
                    onBack={() => setCurrentScreen('city')}
                    onCancelBooking={(booking) => {
                        setSelectedBooking(booking);
                        setIsCancelModalVisible(true);
                    }}
                    onRefresh={fetchMyBookings}
                />
            )}

            {/* Bottom Navigation - Show on booking and myBookings screens */}
            {showBottomNav && (
                <View style={styles.bottomNav}>
                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'booking' && styles.activeNavItem]}
                        onPress={() => {
                            setCurrentScreen('booking');
                            setBookingStep(1);
                        }}
                    >
                        <MaterialCommunityIcons 
                            name="car" 
                            size={24} 
                            color={currentScreen === 'booking' ? '#017bf9' : '#666'} 
                        />
                        <Text style={[styles.navLabel, currentScreen === 'booking' && styles.activeNavLabel]}>Book</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'myBookings' && styles.activeNavItem]}
                        onPress={() => setCurrentScreen('myBookings')}
                    >
                        <MaterialCommunityIcons 
                            name="format-list-bulleted" 
                            size={24} 
                            color={currentScreen === 'myBookings' ? '#017bf9' : '#666'} 
                        />
                        <Text style={[styles.navLabel, currentScreen === 'myBookings' && styles.activeNavLabel]}>My Bookings</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modals */}
            <BookVehicleModal
                visible={isBookingModalVisible}
                onClose={() => setIsBookingModalVisible(false)}
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                loading={loading}
                onBookVehicle={bookVehicle}
                showUserSuggestions={showUserSuggestions}
                setShowUserSuggestions={setShowUserSuggestions}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                userSearchResults={userSearchResults}
                onSelectUser={(user) => {
                    setBookingForm(prev => ({ ...prev, bookingFor: user }));
                    setShowUserSuggestions(false);
                    setSearchQuery('');
                }}
                onRemoveUser={() => setBookingForm(prev => ({ ...prev, bookingFor: null }))}
            />

            <CancelBookingModal
                visible={isCancelModalVisible}
                onClose={() => setIsCancelModalVisible(false)}
                selectedBooking={selectedBooking}
                cancelReason={cancelReason}
                setCancelReason={setCancelReason}
                loading={loading}
                onCancelBooking={cancelBooking}
            />

            <ConfirmationModal
                visible={isConfirmationVisible}
                onClose={() => setIsConfirmationVisible(false)}
                onDone={() => {
                    setIsConfirmationVisible(false);
                    setCurrentScreen('myBookings');
                }}
            />

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
        </Container>
    );
};

export default Cab;