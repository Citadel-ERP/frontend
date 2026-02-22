// booking.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
    ActivityIndicator, StatusBar, SafeAreaView, Platform, Animated,
    useWindowDimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PreviousBookingsSectionProps, Booking, BookingScreenProps } from './types';
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

    const assignments = booking.vehicle_assignments || [];
    const hasMultipleVehicles = assignments.length > 1;
    const firstVehicle = assignments.length > 0 ? assignments[0].vehicle : null;

    return (
        <Animated.View style={[
            styles.bookingCard,
            isLargeScreen && styles.bookingCardDesktop,
            { transform: [{ translateY: slideAnim }] }
        ]}>
            <View style={styles.bookingCardHeader}>
                <View style={styles.vehicleInfo}>
                    <MaterialCommunityIcons name="car" size={20} color="#008069" />
                    <Text style={[styles.vehicleName, isLargeScreen && styles.vehicleNameDesktop]}>
                        {hasMultipleVehicles
                            ? `${assignments.length} Vehicles`
                            : firstVehicle
                                ? `${firstVehicle.make} ${firstVehicle.model}`
                                : 'Vehicle'}
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
                    <Text style={[styles.locationText, isLargeScreen && styles.locationTextDesktop]}>
                        {booking.start_location}
                    </Text>
                </View>
                <View style={styles.arrowContainer}>
                    <MaterialCommunityIcons name="arrow-down" size={16} color="#ccc" />
                </View>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#ff5e7a" />
                    <Text style={[styles.locationText, isLargeScreen && styles.locationTextDesktop]}>
                        {booking.end_location}
                    </Text>
                </View>
            </View>

            <View style={styles.bookingCardFooter}>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                    <Text style={[styles.dateTimeInfoText, isLargeScreen && styles.dateTimeInfoTextDesktop]}>
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        })}
                    </Text>
                </View>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                    <Text style={[styles.dateTimeInfoText, isLargeScreen && styles.dateTimeInfoTextDesktop]}>
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
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
    }, [loading]);

    if (loading) {
        return (
            <View style={styles.previousBookingsContainer}>
                <Text style={[styles.sectionTitle, isLargeScreen && styles.sectionTitleDesktop]}>
                    Recent Bookings
                </Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00d285" />
                </View>
            </View>
        );
    }

    if (bookings.length === 0) return null;

    return (
        <Animated.View style={[styles.previousBookingsContainer, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, isLargeScreen && styles.sectionTitleDesktop]}>
                Recent Bookings
            </Text>
            {bookings.map((booking, index) => (
                <BookingCard key={booking.id || index} booking={booking} index={index} />
            ))}
        </Animated.View>
    );
};

const BookingScreen: React.FC<BookingScreenProps> = ({
    selectedCity,
    onBack,
    onBrowseVehicles,
    token
}) => {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isLargeScreen = width >= 1024;

    const [previousBookings, setPreviousBookings] = useState<Booking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState<boolean>(true);

    const heroAnim = useRef(new Animated.Value(0)).current;
    const cardAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(heroAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(cardAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        const fetchPreviousBookings = async () => {
            if (!token) { setBookingsLoading(false); return; }
            try {
                const response = await fetch(`${BACKEND_URL}/core/getMyBookings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const recentBookings = (data.vehicle_bookings || [])
                        .sort((a: Booking, b: Booking) =>
                            new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
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

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={[styles.scrollContainer, { marginTop: Platform.OS === 'ios' ? -60 : 0 }]}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={isWeb}
                >
                    {/* Header Banner */}
                    <View style={styles.headerWrapper}>
                        <View style={styles.header}>
                            <LinearGradient
                                colors={['#4A5568', '#2D3748']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.headerBanner, isLargeScreen && styles.headerBannerDesktop]}
                            >
                                <Image
                                    source={require('../../assets/cars.jpeg')}
                                    style={[styles.headerImage, isLargeScreen && styles.headerImageDesktop]}
                                    resizeMode="cover"
                                />
                                <View style={styles.headerOverlay} />

                                <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? 50 : 40 }]}>
                                    <View style={styles.headerTopRow}>
                                        <TouchableOpacity style={styles.backButton} onPress={onBack}>
                                            <BackIcon />
                                        </TouchableOpacity>
                                        <View style={styles.headerCenter}>
                                            <Text style={[styles.logoText, isLargeScreen && styles.logoTextDesktop]}>
                                                CITADEL
                                            </Text>
                                        </View>
                                        <View style={{ width: 80 }} />
                                    </View>
                                </View>

                                <Animated.View
                                    style={[
                                        styles.titleSection,
                                        isLargeScreen && styles.titleSectionDesktop,
                                        { opacity: heroAnim }
                                    ]}
                                >
                                    <Text style={[styles.headerTitle, isLargeScreen && styles.headerTitleDesktop]}>
                                        {selectedCity || 'Book a Ride'}
                                    </Text>
                                    <Text style={styles.headerSubtitle}>
                                        Select your vehicle and driver
                                    </Text>
                                </Animated.View>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Main Content */}
                    <View style={styles.contentWrapper}>
                        <View style={[styles.bookingContent, isWeb && styles.bookingContentWeb]}>

                            {/* Browse Vehicles CTA */}
                            <Animated.View style={{ transform: [{ translateY: cardAnim }] }}>
                                <TouchableOpacity
                                    style={[styles.browseCard, isLargeScreen && styles.browseCardDesktop]}
                                    onPress={onBrowseVehicles}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#00d285', '#008069']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.browseCardGradient}
                                    >
                                        <View style={styles.browseCardContent}>
                                            <View style={styles.browseIconContainer}>
                                                <MaterialCommunityIcons name="car-multiple" size={36} color="#fff" />
                                            </View>
                                            <View style={styles.browseTextContainer}>
                                                <Text style={styles.browseTitle}>Browse Vehicles</Text>
                                                <Text style={styles.browseSubtitle}>
                                                    View all available cars and drivers in {selectedCity || 'your city'}
                                                </Text>
                                            </View>
                                            <MaterialCommunityIcons name="arrow-right-circle" size={32} color="rgba(255,255,255,0.8)" />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Info Cards */}
                            <Animated.View
                                style={[
                                    styles.infoCardsRow,
                                    { opacity: heroAnim, transform: [{ translateY: cardAnim }] }
                                ]}
                            >
                                <View style={styles.infoCard}>
                                    <View style={[styles.infoIconBg, { backgroundColor: 'rgba(0,210,133,0.1)' }]}>
                                        <MaterialCommunityIcons name="car" size={24} color="#00d285" />
                                    </View>
                                    <Text style={styles.infoCardTitle}>Select Vehicle</Text>
                                    {/* <Text style={styles.infoCardText}>Choose from available fleet</Text> */}
                                </View>
                                <View style={styles.infoCard}>
                                    <View style={[styles.infoIconBg, { backgroundColor: 'rgba(255,94,122,0.1)' }]}>
                                        <MaterialCommunityIcons name="account-check" size={24} color="#ff5e7a" />
                                    </View>
                                    <Text style={styles.infoCardTitle}>Pick Driver</Text>
                                    {/* <Text style={styles.infoCardText}>Pick your driver</Text> */}
                                </View>
                                <View style={styles.infoCard}>
                                    <View style={[styles.infoIconBg, { backgroundColor: 'rgba(1,123,249,0.1)' }]}>
                                        <MaterialCommunityIcons name="clipboard-check" size={24} color="#017bf9" />
                                    </View>
                                    <Text style={styles.infoCardTitle}>Confirm</Text>
                                    {/* <Text style={styles.infoCardText}>Set trip details and book</Text> */}
                                </View>
                            </Animated.View>

                            {/* Previous Bookings */}
                            <PreviousBookingsSection
                                bookings={previousBookings}
                                loading={bookingsLoading}
                            />
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    safeArea: { flex: 1, backgroundColor: '#4A5568' },
    scrollContainer: { flex: 1, backgroundColor: '#e7e6e5' },
    scrollContent: { flexGrow: 1 },
    headerWrapper: { width: '100%', alignItems: 'center' },
    header: { width: '100%', maxWidth: 1100, position: 'relative', overflow: 'hidden' },
    headerBanner: {
        height: 270,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        position: 'relative',
    },
    headerBannerDesktop: { height: 300 },
    headerImage: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%', opacity: 1,
    },
    headerImageDesktop: { height: 300 },
    headerOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    headerContent: {
        flex: 1, paddingHorizontal: 20, paddingVertical: 20,
        position: 'relative', zIndex: 1,
    },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    titleSection: {
        paddingHorizontal: 20, paddingVertical: 25,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        position: 'relative', zIndex: 1,
    },
    titleSectionDesktop: { paddingHorizontal: 40, paddingVertical: 35 },
    headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
    headerTitleDesktop: { fontSize: 34 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    contentWrapper: { width: '100%', alignItems: 'center' },
    bookingContent: { width: '100%', padding: 20, paddingBottom: 100 },
    bookingContentWeb: { maxWidth: 1100, alignSelf: 'center' },

    // Browse CTA Card
    browseCard: {
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#00d285',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    browseCardDesktop: { marginBottom: 24 },
    browseCardGradient: { borderRadius: 20, padding: 24 },
    browseCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    browseIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    browseTextContainer: { flex: 1 },
    browseTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
    browseSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },

    // Info Cards
    infoCardsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    infoIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    infoCardTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4, textAlign: 'center' },
    infoCardText: { fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 16 },

    // Previous Bookings
    previousBookingsContainer: { marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 15 },
    sectionTitleDesktop: { fontSize: 20, marginBottom: 18 },
    loadingContainer: {
        backgroundColor: '#fff', borderRadius: 15, padding: 40,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 15, elevation: 2,
    },
    bookingCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
        borderLeftWidth: 3, borderLeftColor: '#008069',
    },
    bookingCardDesktop: { padding: 18, borderRadius: 14, marginBottom: 14 },
    bookingCardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
    },
    vehicleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    vehicleName: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8, flexShrink: 1 },
    vehicleNameDesktop: { fontSize: 17 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    },
    statusText: { fontSize: 12, fontWeight: '600', marginLeft: 4, textTransform: 'capitalize' },
    bookingCardBody: { marginBottom: 12 },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    locationText: { fontSize: 14, color: '#666', marginLeft: 8, flex: 1 },
    locationTextDesktop: { fontSize: 15 },
    arrowContainer: { marginLeft: 8, marginBottom: 6 },
    bookingCardFooter: {
        flexDirection: 'row', alignItems: 'center', paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 20,
    },
    dateTimeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateTimeInfoText: { fontSize: 14, color: '#666' },
    dateTimeInfoTextDesktop: { fontSize: 15 },

    // Misc
    logoText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
    logoTextDesktop: { fontSize: 18, letterSpacing: 1.5 },
    backIcon: {
        height: 24, alignItems: 'center', justifyContent: 'center',
        display: 'flex', flexDirection: 'row', alignContent: 'center',
    },
    backArrow: {
        width: 12, height: 12,
        borderLeftWidth: 2, borderTopWidth: 2,
        borderColor: '#fff', transform: [{ rotate: '-45deg' }],
    },
    backButton: { padding: 8 },
    backText: { color: colors.white, fontSize: 16, marginLeft: 2 },
});

export default BookingScreen;