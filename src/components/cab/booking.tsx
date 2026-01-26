import React, { useRef, useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, 
    ActivityIndicator, Alert, StatusBar, SafeAreaView, Platform, Animated, 
    useWindowDimensions 
} from 'react-native';
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
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;
    const isTablet = width >= 768;
    
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
        <Animated.View style={[
            styles.bookingCard,
            isLargeScreen && styles.bookingCardDesktop
        ]}>
            <View style={styles.bookingCardHeader}>
                <View style={styles.vehicleInfo}>
                    <MaterialCommunityIcons name="car" size={20} color="#008069" />
                    <Text style={[
                        styles.vehicleName,
                        isLargeScreen && styles.vehicleNameDesktop
                    ]}>
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
                    <Text style={[
                        styles.locationText,
                        isLargeScreen && styles.locationTextDesktop
                    ]}>{booking.start_location}</Text>
                </View>
                <View style={styles.arrowContainer}>
                    <MaterialCommunityIcons name="arrow-down" size={16} color="#ccc" />
                </View>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#ff5e7a" />
                    <Text style={[
                        styles.locationText,
                        isLargeScreen && styles.locationTextDesktop
                    ]}>{booking.end_location}</Text>
                </View>
            </View>

            <View style={styles.bookingCardFooter}>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                    <Text style={[
                        styles.dateTimeInfoText,
                        isLargeScreen && styles.dateTimeInfoTextDesktop
                    ]}>
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        })}
                    </Text>
                </View>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                    <Text style={[
                        styles.dateTimeInfoText,
                        isLargeScreen && styles.dateTimeInfoTextDesktop
                    ]}>
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
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;
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
            <View style={[
                styles.previousBookingsContainer,
                isLargeScreen && styles.previousBookingsContainerDesktop
            ]}>
                <Text style={[
                    styles.sectionTitle,
                    isLargeScreen && styles.sectionTitleDesktop
                ]}>Previous Bookings</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00d285" />
                </View>
            </View>
        );
    }

    if (bookings.length === 0) {
        return (
            <View style={[
                styles.previousBookingsContainer,
                isLargeScreen && styles.previousBookingsContainerDesktop
            ]}>
                <Text style={[
                    styles.sectionTitle,
                    isLargeScreen && styles.sectionTitleDesktop
                ]}>Previous Bookings</Text>
                <View style={[
                    styles.emptyStateContainer,
                    isLargeScreen && styles.emptyStateContainerDesktop
                ]}>
                    <View style={styles.emptyIconCircle}>
                        <MaterialCommunityIcons name="calendar-blank" size={40} color="#ccc" />
                    </View>
                    <Text style={[
                        styles.emptyStateTitle,
                        isLargeScreen && styles.emptyStateTitleDesktop
                    ]}>No Previous Bookings</Text>
                    <Text style={[
                        styles.emptyStateText,
                        isLargeScreen && styles.emptyStateTextDesktop
                    ]}>
                        Your booking history will appear here once you make your first reservation
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <Animated.View style={[
            styles.previousBookingsContainer,
            isLargeScreen && styles.previousBookingsContainerDesktop,
            { opacity: fadeAnim }
        ]}>
            <Text style={[
                styles.sectionTitle,
                isLargeScreen && styles.sectionTitleDesktop
            ]}>Previous Bookings</Text>
            <View style={isLargeScreen ? styles.bookingCardsGrid : {}}>
                {bookings.map((booking, index) => (
                    <BookingCard 
                        key={booking.id || index} 
                        booking={booking} 
                        index={index} 
                    />
                ))}
            </View>
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
    formatTimeForDisplay,
    formatDateForDisplay,
    token
}) => {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isLargeScreen = width >= 1024;
    const isTablet = width >= 768;
    
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
        <View style={[
            styles.screenContainer,
            isWeb && styles.screenContainerWeb
        ]}>
            <StatusBar translucent 
            backgroundColor="transparent" 
            barStyle="light-content"  />
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={[styles.scrollContainer,{marginTop:Platform.OS === 'ios' ? -60 : 0}]}
                    contentContainerStyle={[
                        styles.scrollContent,
                        isWeb && styles.scrollContentWeb
                    ]}
                    showsVerticalScrollIndicator={isWeb}
                >

                    <View style={[
                        styles.header,
                        styles.headerBanner,
                        isLargeScreen && styles.headerBannerDesktop
                    ]}>
                        <LinearGradient
                            colors={['#4A5568', '#2D3748']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                                styles.headerBanner,
                                isLargeScreen && styles.headerBannerDesktop
                            ]}
                        >
                            <Image
                                source={require('../../assets/cars.jpeg')}
                                style={[
                                    styles.headerImage,
                                    isLargeScreen && styles.headerImageDesktop
                                ]}
                                resizeMode="contain"
                            />
                            <View style={styles.headerOverlay} />

                            <View style={[
                                styles.headerContent,
                                isWeb && styles.headerContentWeb
                            ]}>
                                <View style={[styles.headerTopRow,{paddingTop:Platform.OS === 'ios' ? 40 : 0}]}>
                                    <TouchableOpacity style={styles.backButton} onPress={onBack}>
                                        <BackIcon />
                                    </TouchableOpacity>
                                    <View style={styles.headerCenter}>
                                        <Text style={[
                                            styles.logoText,
                                            isLargeScreen && styles.logoTextDesktop
                                        ]}>CITADEL</Text>
                                    </View>
                                    <View style={{ width: 2 }} />
                                </View>
                            </View>

                            <View style={[
                                styles.cityTitleContainer, 
                                styles.titleSection,
                                isLargeScreen && styles.titleSectionDesktop
                            ]}>
                                <Text style={[
                                    styles.headerTitle,
                                    isLargeScreen && styles.headerTitleDesktop
                                ]}>{selectedCity}</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    <View style={[
                        styles.bookingFormContent,
                        isWeb && styles.bookingFormContentWeb
                    ]}>
                        {/* Step 1: From Location */}
                        {bookingStep === 1 && (
                            <View style={[
                                styles.formStep,
                                isLargeScreen && styles.formStepDesktop
                            ]}>
                                <View style={styles.stepHeader}>
                                    <View style={styles.stepIcon}>
                                        <MaterialCommunityIcons name="map-marker" size={24} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={[
                                            styles.stepTitle,
                                            isLargeScreen && styles.stepTitleDesktop
                                        ]}>Where from?</Text>
                                        <Text style={[
                                            styles.stepSubtitle,
                                            isLargeScreen && styles.stepSubtitleDesktop
                                        ]}>Enter your pickup location</Text>
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <TextInput
                                        ref={fromInputRef}
                                        style={[
                                            styles.formInput,
                                            isLargeScreen && styles.formInputDesktop
                                        ]}
                                        value={bookingForm.fromLocation}
                                        onChangeText={(text) => setBookingForm({ ...bookingForm, fromLocation: text })}
                                        placeholder="Enter pickup location"
                                        placeholderTextColor="#999"
                                        autoFocus={bookingStep === 1}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.searchBtn, 
                                        !bookingForm.fromLocation.trim() && styles.disabledBtn,
                                        isLargeScreen && styles.searchBtnDesktop
                                    ]}
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
                                <View style={[
                                    styles.formStep,
                                    isLargeScreen && styles.formStepDesktop
                                ]}>
                                    <View style={styles.stepHeader}>
                                        <View style={styles.stepIcon}>
                                            <MaterialCommunityIcons name="map-marker-check" size={24} color="#fff" />
                                        </View>
                                        <View>
                                            <Text style={[
                                                styles.stepTitle,
                                                isLargeScreen && styles.stepTitleDesktop
                                            ]}>Where to?</Text>
                                            <Text style={[
                                                styles.stepSubtitle,
                                                isLargeScreen && styles.stepSubtitleDesktop
                                            ]}>Enter your destination</Text>
                                        </View>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <TextInput
                                            ref={toInputRef}
                                            style={[
                                                styles.formInput,
                                                isLargeScreen && styles.formInputDesktop
                                            ]}
                                            value={bookingForm.toLocation}
                                            onChangeText={(text) => setBookingForm({ ...bookingForm, toLocation: text })}
                                            placeholder="Enter destination"
                                            placeholderTextColor="#999"
                                            autoFocus={bookingStep === 2}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.searchBtn, 
                                            !bookingForm.toLocation.trim() && styles.disabledBtn,
                                            isLargeScreen && styles.searchBtnDesktop
                                        ]}
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
                            <View style={[
                                styles.formStep,
                                isLargeScreen && styles.formStepDesktop
                            ]}>
                                <View style={styles.stepHeader}>
                                    <View style={styles.stepIcon}>
                                        <MaterialCommunityIcons name="clock-outline" size={24} color="#fff" />
                                    </View>
                                    <View>
                                        <Text style={[
                                            styles.stepTitle,
                                            isLargeScreen && styles.stepTitleDesktop
                                        ]}>When?</Text>
                                        <Text style={[
                                            styles.stepSubtitle,
                                            isLargeScreen && styles.stepSubtitleDesktop
                                        ]}>Select date and time</Text>
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[
                                        styles.formLabel,
                                        isLargeScreen && styles.formLabelDesktop
                                    ]}>Start Date & Time</Text>
                                    <View style={[
                                        styles.dateTimeRow,
                                        isLargeScreen && styles.dateTimeRowDesktop
                                    ]}>
                                        <TouchableOpacity
                                            style={[
                                                styles.dateTimeInput,
                                                isLargeScreen && styles.dateTimeInputDesktop
                                            ]}
                                            onPress={() => onSetActivePickerType('startDate')}
                                        >
                                            <MaterialCommunityIcons name="calendar" size={20} color="#00d285" />
                                            <Text style={[
                                                styles.dateTimeText,
                                                isLargeScreen && styles.dateTimeTextDesktop
                                            ]}>
                                                {formatDateForDisplay(bookingForm.startDate)}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.dateTimeInput,
                                                isLargeScreen && styles.dateTimeInputDesktop
                                            ]}
                                            onPress={() => onSetActivePickerType('startTime')}
                                        >
                                            <MaterialCommunityIcons name="clock-outline" size={20} color="#00d285" />
                                            <Text style={[
                                                styles.dateTimeText,
                                                isLargeScreen && styles.dateTimeTextDesktop
                                            ]}>
                                                {formatTimeForDisplay(bookingForm.startTime)}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[
                                        styles.formLabel,
                                        isLargeScreen && styles.formLabelDesktop
                                    ]}>End Date & Time</Text>
                                    <View style={[
                                        styles.dateTimeRow,
                                        isLargeScreen && styles.dateTimeRowDesktop
                                    ]}>
                                        <TouchableOpacity
                                            style={[
                                                styles.dateTimeInput,
                                                isLargeScreen && styles.dateTimeInputDesktop
                                            ]}
                                            onPress={() => onSetActivePickerType('endDate')}
                                        >
                                            <MaterialCommunityIcons name="calendar" size={20} color="#ff5e7a" />
                                            <Text style={[
                                                styles.dateTimeText,
                                                isLargeScreen && styles.dateTimeTextDesktop
                                            ]}>
                                                {formatDateForDisplay(bookingForm.endDate)}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.dateTimeInput,
                                                isLargeScreen && styles.dateTimeInputDesktop
                                            ]}
                                            onPress={() => onSetActivePickerType('endTime')}
                                        >
                                            <MaterialCommunityIcons name="clock-outline" size={20} color="#ff5e7a" />
                                            <Text style={[
                                                styles.dateTimeText,
                                                isLargeScreen && styles.dateTimeTextDesktop
                                            ]}>
                                                {formatTimeForDisplay(bookingForm.endTime)}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {loading ? (
                                    <View style={[
                                        styles.searchBtn,
                                        isLargeScreen && styles.searchBtnDesktop
                                    ]}>
                                        <ActivityIndicator color="#fff" />
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={[
                                            styles.searchBtn,
                                            isLargeScreen && styles.searchBtnDesktop
                                        ]} 
                                        onPress={onSearchCabs}
                                    >
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
    headerImageDesktop: {
        height: 320,
    },
    screenContainer: {
        flex: 1,
        backgroundColor: '#e7e6e5',
    },
    screenContainerWeb: {
        alignItems: 'center',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#4A5568',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: '#e7e6e5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    scrollContentWeb: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
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
    headerBannerDesktop: {
        height: 320,
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 40,
        paddingVertical: 20,
        position: 'relative',
        zIndex: 1,
    },
    headerContentWeb: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
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
    titleSectionDesktop: {
        paddingHorizontal: 40,
        paddingVertical: 40,
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
    headerTitleDesktop: {
        fontSize: 32,
    },
    bookingFormContent: {
        padding: 20,
        paddingBottom: 100,
    },
    bookingFormContentWeb: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
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
    formStepDesktop: {
        padding: 32,
        borderRadius: 20,
        marginBottom: 32,
        minHeight: 400,
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
    stepTitleDesktop: {
        fontSize: 24,
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    stepSubtitleDesktop: {
        fontSize: 16,
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
    formLabelDesktop: {
        fontSize: 16,
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
    formInputDesktop: {
        paddingVertical: 18,
        fontSize: 18,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dateTimeRowDesktop: {
        gap: 16,
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
    dateTimeInputDesktop: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dateTimeText: {
        fontSize: 13,
        color: '#333',
        marginLeft: 10,
    },
    dateTimeTextDesktop: {
        fontSize: 15,
    },
    searchBtn: {
        backgroundColor: '#00d285',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    searchBtnDesktop: {
        padding: 20,
        borderRadius: 16,
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
    logoTextDesktop: {
        fontSize: 20,
        letterSpacing: 2,
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
    previousBookingsContainerDesktop: {
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    sectionTitleDesktop: {
        fontSize: 22,
        marginBottom: 20,
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
    emptyStateContainerDesktop: {
        padding: 48,
        borderRadius: 20,
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
    emptyStateTitleDesktop: {
        fontSize: 22,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyStateTextDesktop: {
        fontSize: 16,
        lineHeight: 24,
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
    bookingCardDesktop: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    bookingCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
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
    vehicleNameDesktop: {
        fontSize: 18,
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
    locationTextDesktop: {
        fontSize: 16,
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
    dateTimeInfoTextDesktop: {
        fontSize: 16,
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