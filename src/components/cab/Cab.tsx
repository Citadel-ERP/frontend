// cab.tsx  — orchestrator for the new Browse-First flow
import React, { useState, useEffect } from 'react';
import {
    SafeAreaView, StatusBar, Alert, View, TouchableOpacity, Text
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';

import BookingScreen from './booking';
import AvailableCabsScreen from './availableCabs';
import MyBookingsScreen from './myBookings';
import BookVehicleModal from './bookVehicle';
import CancelBookingModal from './cancelBookingModal';
import ConfirmationModal from './confirmationModal';

import {
    CabProps, ScreenType, BookingFormData,
    Vehicle, Booking, Driver
} from './types';

import { formatTimeForAPI } from './utils';
import { styles } from './styles';

const TOKEN_KEY = 'token_2';

const Cab: React.FC<CabProps> = ({ onBack }) => {
    const [currentScreen, setCurrentScreen] = useState<ScreenType>('booking');
    const [selectedCity, setSelectedCity] = useState('');
    const [token, setToken] = useState<string | null>(null);

    // Vehicles & drivers in the city (not time-filtered, loaded once on browse)
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

    const [loading, setLoading] = useState(false);
    const [cityLoading, setCityLoading] = useState(false);

    // My bookings
    const [myBookings, setMyBookings] = useState<Booking[]>([]);

    // Selection
    const [selectedVehicles, setSelectedVehicles] = useState<Array<{ vehicle: Vehicle; driver: Driver | null }>>([]);

    // Modals
    const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
    const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

    // Booking form — dates default to sensible values
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

    // ─── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const initialize = async () => {
            try {
                const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
                const savedCity = await AsyncStorage.getItem('city');
                setToken(storedToken);
                if (savedCity) setSelectedCity(savedCity);
            } catch (error) {
                console.error('Error initializing:', error);
            }
        };
        initialize();
    }, []);

    // ─── Load city fleet (no time filter) ─────────────────────────────────────
    const loadCityFleet = async () => {
        if (!token) return;
        setCityLoading(true);
        try {
            const body = JSON.stringify({ token });

            const [vehiclesRes, driversRes] = await Promise.all([
                fetch(`${BACKEND_URL}/core/getCityVehicles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                }),
                fetch(`${BACKEND_URL}/core/getCityDrivers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                }),
            ]);

            if (vehiclesRes.ok) {
                const data = await vehiclesRes.json();
                setVehicles(data.vehicles || []);
            }
            if (driversRes.ok) {
                const data = await driversRes.json();
                setAvailableDrivers(data.drivers || []);
            }
        } catch (error) {
            console.error('Error loading city fleet:', error);
            Alert.alert('Error', 'Failed to load vehicles. Please try again.');
        } finally {
            setCityLoading(false);
        }
    };

    // ─── Navigate to cabs screen ───────────────────────────────────────────────
    const handleBrowseVehicles = async () => {
        setSelectedVehicles([]);
        await loadCityFleet();
        setCurrentScreen('cabs');
    };

    // ─── Fetch my bookings ─────────────────────────────────────────────────────
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
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    // ─── Book vehicles ─────────────────────────────────────────────────────────
    const bookVehicles = async () => {
        if (selectedVehicles.length === 0 || !bookingForm.purpose.trim()) {
            Alert.alert('Error', 'Please select at least one vehicle and provide a purpose');
            return;
        }
        if (!bookingForm.fromLocation.trim() || !bookingForm.toLocation.trim()) {
            Alert.alert('Error', 'Please enter pickup and destination locations');
            return;
        }

        setLoading(true);
        try {
            const startDateTime = `${bookingForm.startDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.startTime)}:00`;
            const endDateTime = `${bookingForm.endDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.endTime)}:00`;

            // Basic date validation
            if (new Date(startDateTime) >= new Date(endDateTime)) {
                Alert.alert('Invalid Time', 'End time must be after start time');
                setLoading(false);
                return;
            }

            const requestData: any = {
                token,
                vehicle_ids: selectedVehicles.map(sv => sv.vehicle.id),
                driver_ids: selectedVehicles
                    .map(sv => sv.driver?.employee_id)
                    .filter(Boolean),
                start_time: startDateTime,
                end_time: endDateTime,
                purpose: bookingForm.purpose,
                start_location: bookingForm.fromLocation,
                end_location: bookingForm.toLocation,
            };

            if (bookingForm.gracePeriod && bookingForm.gracePeriod.trim() !== '') {
                requestData.grace_period = bookingForm.gracePeriod;
            }

            if (bookingForm.bookingFor) {
                requestData.booked_for_employee_id = bookingForm.bookingFor.employee_id;
            }

            const response = await fetch(`${BACKEND_URL}/core/bookVehicle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            const responseData = await response.json();

            if (response.ok) {
                setIsBookingModalVisible(false);
                setIsConfirmationVisible(true);
                setSelectedVehicles([]);
                // Reset form for next booking
                setBookingForm({
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
                fetchMyBookings();
            } else {
                // Backend returned an error — typically a conflict
                const message = responseData.message || 'Failed to book vehicles';
                Alert.alert(
                    'Booking Failed',
                    message.includes('already booked')
                        ? `${message}\n\nPlease choose a different time or select another vehicle.`
                        : message,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error booking vehicles:', error);
            Alert.alert('Error', 'Network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Cancel booking ────────────────────────────────────────────────────────
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
                    reason_of_cancellation: cancelReason,
                }),
            });
            if (response.ok) {
                Alert.alert('Success', 'Booking cancelled successfully!');
                setIsCancelModalVisible(false);
                setCancelReason('');
                setSelectedBooking(null);
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

    const showBottomNav = currentScreen === 'booking' || currentScreen === 'myBookings';

    return (
        <SafeAreaView style={styles.appContainer}>
            <StatusBar translucent barStyle="light-content" backgroundColor="#017bf9" />

            {currentScreen === 'booking' && (
                <BookingScreen
                    selectedCity={selectedCity}
                    onBack={onBack}
                    onBrowseVehicles={handleBrowseVehicles}
                    token={token}
                />
            )}

            {currentScreen === 'cabs' && (
                <AvailableCabsScreen
                    vehicles={vehicles}
                    availableDrivers={availableDrivers}
                    selectedVehicles={selectedVehicles}
                    onBack={() => {
                        setCurrentScreen('booking');
                        setSelectedVehicles([]);
                    }}
                    onUpdateSelection={setSelectedVehicles}
                    onProceedToBooking={() => setIsBookingModalVisible(true)}
                />
            )}

            {currentScreen === 'myBookings' && (
                <MyBookingsScreen
                    bookings={myBookings}
                    loading={loading}
                    onBack={() => setCurrentScreen('booking')}
                    onCancelBooking={(booking) => {
                        setSelectedBooking(booking);
                        setIsCancelModalVisible(true);
                    }}
                    onRefresh={fetchMyBookings}
                />
            )}

            {/* Bottom Nav */}
            {showBottomNav && (
                <View style={styles.bottomNav}>
                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'booking' && styles.activeNavItem]}
                        onPress={() => {
                            setCurrentScreen('booking');
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.navIconContainer,
                            currentScreen === 'booking' && styles.activeNavIconContainer
                        ]}>
                            <MaterialCommunityIcons
                                name="car"
                                size={24}
                                color={currentScreen === 'booking' ? '#fff' : '#666'}
                            />
                        </View>
                        <Text style={[styles.navLabel, currentScreen === 'booking' && styles.activeNavLabel]}>
                            Book
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'myBookings' && styles.activeNavItem]}
                        onPress={() => {
                            setCurrentScreen('myBookings');
                            fetchMyBookings();
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.navIconContainer,
                            currentScreen === 'myBookings' && styles.activeNavIconContainer
                        ]}>
                            <MaterialCommunityIcons
                                name="clipboard-text"
                                size={24}
                                color={currentScreen === 'myBookings' ? '#fff' : '#666'}
                            />
                        </View>
                        <Text style={[styles.navLabel, currentScreen === 'myBookings' && styles.activeNavLabel]}>
                            My Bookings
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Booking Details Modal */}
            <BookVehicleModal
                visible={isBookingModalVisible}
                onClose={() => setIsBookingModalVisible(false)}
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                loading={loading}
                onBookVehicle={bookVehicles}
                selectedVehicles={selectedVehicles}
            />

            {/* Cancel Modal */}
            <CancelBookingModal
                visible={isCancelModalVisible}
                onClose={() => {
                    setIsCancelModalVisible(false);
                    setCancelReason('');
                }}
                selectedBooking={selectedBooking}
                cancelReason={cancelReason}
                setCancelReason={setCancelReason}
                loading={loading}
                onCancelBooking={cancelBooking}
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                visible={isConfirmationVisible}
                onClose={() => setIsConfirmationVisible(false)}
                onDone={() => {
                    setIsConfirmationVisible(false);
                    setCurrentScreen('myBookings');
                    fetchMyBookings();
                }}
            />
        </SafeAreaView>
    );
};

export default Cab;