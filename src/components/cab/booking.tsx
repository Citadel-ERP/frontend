import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Alert, StatusBar, SafeAreaView, Platform, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BookingStep, PreviousBookingsSectionProps, Booking, BookingScreenProps } from './types';
import { formatDateForDisplay, formatTimeForDisplay } from './utils';
import { colors } from '../../styles/theme';
import { BACKEND_URL } from '../../config/config';

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} />
        <Text style={styles.backText}>Back</Text>
    </View>
);

const BookingCard: React.FC<{ booking: Booking; index: number }> = ({ booking, index }) => {
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            delay: index * 100,
            useNativeDriver: true,
        }).start();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
            case 'approved':
            case 'assigned':
                return '#00d285';
            case 'pending':
                return '#ffb157';
            case 'cancelled':
            case 'rejected':
                return '#ff5e7a';
            default:
                return '#666';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
            case 'approved':
            case 'assigned':
                return 'check-circle';
            case 'pending':
                return 'clock-outline';
            case 'cancelled':
            case 'rejected':
                return 'close-circle';
            default:
                return 'information';
        }
    };

    // Get vehicle information from vehicle_assignments
    const assignments = booking.vehicle_assignments || [];
    const hasMultipleVehicles = assignments.length > 1;
    const firstVehicle = assignments.length > 0 ? assignments[0].vehicle : null;

    return (
        <Animated.View style={[styles.bookingCard, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.bookingCardHeader}>
                <View style={styles.vehicleInfo}>
                    <MaterialCommunityIcons name="car" size={20} color="#008069" />
                    <Text style={styles.vehicleName}>
                        {hasMultipleVehicles 
                            ? `${assignments.length} Vehicles`
                            : firstVehicle 
                                ? `${firstVehicle.make} ${firstVehicle.model}`
                                : 'Vehicle'
                        }
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}20` }]}>
                    <MaterialCommunityIcons
                        name={getStatusIcon(booking.status)}
                        size={14}
                        color={getStatusColor(booking.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status}
                    </Text>
                </View>
            </View>

            <View style={styles.bookingCardBody}>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#00d285" />
                    <Text style={styles.locationText}>{booking.start_location}</Text>
                </View>
                <View style={styles.arrowContainer}>
                    <MaterialCommunityIcons name="arrow-down" size={16} color="#ccc" />
                </View>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#ff5e7a" />
                    <Text style={styles.locationText}>{booking.end_location}</Text>
                </View>
            </View>

            <View style={styles.bookingCardFooter}>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                    <Text style={styles.dateTimeInfoText}>
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        })}
                    </Text>
                </View>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                    <Text style={styles.dateTimeInfoText}>
                        {new Date(booking.start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

const PreviousBookingsSection: React.FC<PreviousBookingsSectionProps> = ({ bookings, loading }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [loading]);

    if (loading) {
        return (
            <View style={styles.previousBookingsContainer}>
                <Text style={styles.sectionTitle}>Previous Bookings</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00d285" />
                </View>
            </View>
        );
    }

    if (bookings.length === 0) {
        return (
            <View style={styles.previousBookingsContainer}>
                <Text style={styles.sectionTitle}>Previous Bookings</Text>
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyIconCircle}>
                        <MaterialCommunityIcons name="calendar-blank" size={40} color="#ccc" />
                    </View>
                    <Text style={styles.emptyStateTitle}>No Previous Bookings</Text>
                    <Text style={styles.emptyStateText}>
                        Your booking history will appear here once you make your first reservation
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <Animated.View style={[styles.previousBookingsContainer, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Previous Bookings</Text>
            {bookings.map((booking, index) => (
                <BookingCard key={booking.id || index} booking={booking} index={index} />
            ))}
        </Animated.View>
    );
};

const BookingScreen: React.FC<BookingScreenProps> = ({
    bookingStep,
    setBookingStep,
    bookingForm,
    setBookingForm,
    selectedCity,
    loading,
    onBack,
    onSearchCabs,
    onSetActivePickerType,
    onChangeCity,
    formatTimeForDisplay,
    formatDateForDisplay,
    token
}) => {
    const fromInputRef = useRef<TextInput>(null);
    const toInputRef = useRef<TextInput>(null);
    
    // State for previous bookings
    const [previousBookings, setPreviousBookings] = useState<Booking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState<boolean>(true);

    // Fetch previous bookings once when component mounts or token changes
    useEffect(() => {
        const fetchPreviousBookings = async () => {
            if (!token) {
                setBookingsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/core/getMyBookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const recentBookings = (data.vehicle_bookings || [])
                        .sort((a: Booking, b: Booking) =>
                            new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                        )
                        .slice(0, 3);
                    setPreviousBookings(recentBookings);
                }
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setBookingsLoading(false);
            }
        };

        fetchPreviousBookings();
    }, [token]);

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
        if (nextStep === 2) {
            setTimeout(() => {
                toInputRef.current?.focus();
            }, 100);
        }
    };

    const handleBack = () => {
        if (bookingStep === 2) {
            // Go back to step 1 (Where from)
            setBookingStep(1);
        } else if (bookingStep === 3) {
            // Go back to step 2 (Where to)
            setBookingStep(2);
        } else {
            // On step 1, use the original onBack function (go to cities)
            onBack();
        }
    };

    return (
        <View style={styles.screenContainer}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
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
                                style={styles.headerImage}
                                resizeMode="cover"
                            />
                            <View style={styles.headerOverlay} />

                            <View style={styles.headerContent}>
                                <View style={styles.headerTopRow}>
                                    <TouchableOpacity style={styles.backButton} onPress={onBack}>
                                        <BackIcon />
                                    </TouchableOpacity>
                                    <View style={styles.headerCenter}>
                                        <Text style={styles.logoText}>CITADEL</Text>
                                    </View>
                                    <View style={{ width: 2 }} />
                                </View>
                            </View>

                            <View style={[styles.cityTitleContainer, styles.titleSection]}>
                                <Text style={styles.headerTitle}>{selectedCity}</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    <View style={styles.bookingFormContent}>
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
                                        onChangeText={(text) => setBookingForm({ ...bookingForm, fromLocation: text })}
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

                                {/* Previous Bookings in Step 1 */}
                                <PreviousBookingsSection 
                                    bookings={previousBookings} 
                                    loading={bookingsLoading} 
                                />
                            </View>
                        )}

                        {/* Step 2: To Location */}
                        {bookingStep === 2 && (
                            <>
                                <View style={styles.formStep}>
                                    <View style={styles.stepHeader}>
                                        <View style={styles.stepIcon}>
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
                                            onChangeText={(text) => setBookingForm({ ...bookingForm, toLocation: text })}
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

                                {/* Show Previous Bookings after entering locations */}
                                <PreviousBookingsSection 
                                    bookings={previousBookings} 
                                    loading={bookingsLoading} 
                                />
                            </>
                        )}

                        {/* Step 3: Schedule */}
                        {bookingStep === 3 && (
                            <View style={styles.formStep}>
                                <View style={styles.stepHeader}>
                                    <View style={styles.stepIcon}>
                                        <MaterialCommunityIcons name="clock-outline" size={24} color="#fff" />
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
                                            onPress={() => onSetActivePickerType('startDate')}
                                        >
                                            <MaterialCommunityIcons name="calendar" size={20} color="#00d285" />
                                            <Text style={styles.dateTimeText}>
                                                {formatDateForDisplay(bookingForm.startDate)}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.dateTimeInput}
                                            onPress={() => onSetActivePickerType('startTime')}
                                        >
                                            <MaterialCommunityIcons name="clock-outline" size={20} color="#00d285" />
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
                                            onPress={() => onSetActivePickerType('endDate')}
                                        >
                                            <MaterialCommunityIcons name="calendar" size={20} color="#ff5e7a" />
                                            <Text style={styles.dateTimeText}>
                                                {formatDateForDisplay(bookingForm.endDate)}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.dateTimeInput}
                                            onPress={() => onSetActivePickerType('endTime')}
                                        >
                                            <MaterialCommunityIcons name="clock-outline" size={20} color="#ff5e7a" />
                                            <Text style={styles.dateTimeText}>
                                                {formatTimeForDisplay(bookingForm.endTime)}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {loading ? (
                                    <View style={styles.searchBtn}>
                                        <ActivityIndicator color="#fff" />
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.searchBtn} onPress={onSearchCabs}>
                                        <Text style={styles.searchBtnText}>Search Available Cabs</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Previous Bookings in Step 3 */}
                                <PreviousBookingsSection 
                                    bookings={previousBookings} 
                                    loading={bookingsLoading} 
                                />
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
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
    screenContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#4A5568',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        position: 'relative',
        overflow: 'hidden',
    },
    headerBanner: {
        height: 250,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        position: 'relative',
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 40,
        paddingVertical: 20,
        position: 'relative',
        zIndex: 1,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginRight: 60,
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingVertical: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    cityTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
        marginRight: 8,
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
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateTimeText: {
        fontSize: 13,
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
    logoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
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
        color: colors.white,
        fontSize: 14,
        marginLeft: 2,
    },
    // Previous Bookings Styles
    previousBookingsContainer: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    loadingContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
    },
    emptyStateContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#008069',
    },
    bookingCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    vehicleName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
        flexShrink: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
        textTransform: 'capitalize',
    },
    bookingCardBody: {
        marginBottom: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    locationText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        flex: 1,
    },
    arrowContainer: {
        marginLeft: 8,
        marginBottom: 6,
    },
    bookingCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 20,
    },
    dateTimeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateTimeInfoText: {
        fontSize: 14,
        color: '#666',
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
});

export default BookingScreen;