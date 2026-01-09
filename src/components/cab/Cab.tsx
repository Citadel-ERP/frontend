import React, { useState, useEffect, useRef } from 'react';
import {
    SafeAreaView, StatusBar, Alert, Modal, ActivityIndicator,
    Platform, Dimensions, View, TouchableOpacity, Text
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BACKEND_URL } from '../../config/config';

import BookingScreen from './booking';
import AvailableCabsScreen from './availableCabs';
import MyBookingsScreen from './myBookings';
import BookVehicleModal from './bookVehicle';
import CancelBookingModal from './cancelBookingModal';
import ConfirmationModal from './confirmationModal';

import {
    CabProps, ScreenType, BookingStep, BookingFormData,
    Vehicle, Booking, Driver
} from './types';

import {
    formatTimeForAPI, formatTimeForDisplay, formatDateForDisplay
} from './utils';

import { styles } from './styles';

const TOKEN_KEY = 'token_2';

const Cab: React.FC<CabProps> = ({ onBack }) => {
    const insets = useSafeAreaInsets();
    const [currentScreen, setCurrentScreen] = useState<ScreenType>('booking');
    const [bookingStep, setBookingStep] = useState<BookingStep>(1);
    const [selectedCity, setSelectedCity] = useState('');
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [myBookings, setMyBookings] = useState<Booking[]>([]);
    const [selectedVehicles, setSelectedVehicles] = useState<Array<{vehicle: Vehicle, driver: Driver | null}>>([]);
    const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
    const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
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

    useEffect(() => {
        const initialize = async () => {
            try {
                const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
                const savedCity = await AsyncStorage.getItem('city');
                
                setToken(storedToken);
                if (savedCity) {
                    setSelectedCity(savedCity);
                }
            } catch (error) {
                console.error('Error initializing:', error);
            }
        };
        initialize();
    }, []);

    const searchCabs = async () => {
        if (!bookingForm.fromLocation.trim() || !bookingForm.toLocation.trim()) {
            Alert.alert('Error', 'Please complete all location fields');
            return;
        }

        setLoading(true);
        try {
            const startDateTime = `${bookingForm.startDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.startTime)}:00`;
            const endDateTime = `${bookingForm.endDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.endTime)}:00`;
            const data = {
                token,
                start_date: startDateTime,
                end_date: endDateTime
            };
            // Fetch available vehicles
            const vehiclesResponse = await fetch(
                `${BACKEND_URL}/core/getAvailableVehicles`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                }
            );

            // Fetch available drivers
            const driversResponse = await fetch(
                `${BACKEND_URL}/core/getAvailableDrivers`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                }
            );

            if (vehiclesResponse.ok && driversResponse.ok) {
                const vehiclesData = await vehiclesResponse.json();
                const driversData = await driversResponse.json();
                
                setVehicles(vehiclesData.vehicles || []);
                setAvailableDrivers(driversData.drivers || []);
                setCurrentScreen('cabs');
                
                if (vehiclesData.vehicles.length === 0) {
                    Alert.alert('No Vehicles', 'No vehicles available for the selected time period');
                } else if (driversData.drivers.length === 0) {
                    Alert.alert('No Drivers', 'No drivers available for the selected time period. You can still select vehicles but drivers will need to be assigned later.');
                }
            } else {
                const error = await vehiclesResponse.json();
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
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const bookVehicles = async () => {
        if (selectedVehicles.length === 0 || !bookingForm.purpose.trim()) {
            Alert.alert('Error', 'Please select at least one vehicle and provide a purpose');
            return;
        }

        setLoading(true);
        try {
            const startDateTime = `${bookingForm.startDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.startTime)}:00`;
            const endDateTime = `${bookingForm.endDate.toISOString().split('T')[0]}T${formatTimeForAPI(bookingForm.endTime)}:00`;

            const requestData: any = {
                token,
                vehicle_ids: selectedVehicles.map(sv => sv.vehicle.id),
                driver_ids: selectedVehicles.map(sv => sv.driver?.id).filter(Boolean),
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
                requestData.booked_for_employee_id = bookingForm.bookingFor.employee_id;
            }

            const response = await fetch(`${BACKEND_URL}/core/bookVehicle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            if (response.ok) {
                setIsBookingModalVisible(false);
                setIsConfirmationVisible(true);
                setSelectedVehicles([]);
                fetchMyBookings();
            } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'Failed to book vehicles');
            }
        } catch (error) {
            console.error('Error booking vehicles:', error);
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

    const Container = SafeAreaView;
    const showBottomNav = currentScreen === 'booking' || currentScreen === 'myBookings';

    return (
        <Container style={styles.appContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#017bf9" />

            {currentScreen === 'booking' && (
                <BookingScreen
                    bookingStep={bookingStep}
                    setBookingStep={setBookingStep}
                    bookingForm={bookingForm}
                    setBookingForm={setBookingForm}
                    selectedCity={selectedCity}
                    loading={loading}
                    onBack={onBack}
                    onSearchCabs={searchCabs}
                    onSetActivePickerType={setActivePickerType}
                    formatTimeForDisplay={formatTimeForDisplay}
                    formatDateForDisplay={formatDateForDisplay}
                    token={token}
                />
            )}

            {currentScreen === 'cabs' && (
                <AvailableCabsScreen
                    vehicles={vehicles}
                    availableDrivers={availableDrivers}
                    selectedVehicles={selectedVehicles}
                    onBack={() => setCurrentScreen('booking')}
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

            {showBottomNav && (
                <View style={styles.bottomNav}>
                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'booking' && styles.activeNavItem]}
                        onPress={() => {
                            setCurrentScreen('booking');
                            setBookingStep(1);
                        }}
                    >
                        <Text style={[styles.navLabel, currentScreen === 'booking' && styles.activeNavLabel]}>Book</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navItem, currentScreen === 'myBookings' && styles.activeNavItem]}
                        onPress={() => {
                            setCurrentScreen('myBookings');
                            fetchMyBookings();
                        }}
                    >
                        <Text style={[styles.navLabel, currentScreen === 'myBookings' && styles.activeNavLabel]}>My Bookings</Text>
                    </TouchableOpacity>
                </View>
            )}

            <BookVehicleModal
                visible={isBookingModalVisible}
                onClose={() => setIsBookingModalVisible(false)}
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                loading={loading}
                onBookVehicle={bookVehicles}
                selectedVehicles={selectedVehicles}
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