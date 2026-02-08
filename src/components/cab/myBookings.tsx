import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image,
    useWindowDimensions, Platform, StatusBar, SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MyBookingsScreenProps } from './types';
import { formatDateTime, getStatusColor, getStatusText } from './utils';
import { colors } from '../../styles/theme';

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} />
        <Text style={styles.backText}>Back</Text>
    </View>
);

const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
    bookings,
    loading,
    onBack,
    onCancelBooking,
    onRefresh
}) => {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isLargeScreen = width >= 1024;
    const isTablet = width >= 768;

    return (
        <View style={styles.container}>
            <StatusBar 
                translucent 
                backgroundColor="transparent" 
                barStyle="light-content" 
            />
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
                                    resizeMode="cover"
                                />
                                <View style={styles.headerOverlay} />

                                <View style={[
                                    styles.headerContent,
                                    { paddingTop: Platform.OS === 'ios' ? 50 : 40 }
                                ]}>
                                    <View style={styles.headerTopRow}>
                                        <TouchableOpacity style={styles.backButton} onPress={onBack}>
                                            <BackIcon />
                                        </TouchableOpacity>
                                        <View style={styles.headerCenter}>
                                            <Text style={[
                                                styles.logoText,
                                                isLargeScreen && styles.logoTextDesktop
                                            ]}>CITADEL</Text>
                                        </View>
                                        <View style={{ width: 80 }} />
                                    </View>
                                </View>

                                <View style={[
                                    styles.titleSection,
                                    isLargeScreen && styles.titleSectionDesktop
                                ]}>
                                    <Text style={[
                                        styles.headerTitle,
                                        isLargeScreen && styles.headerTitleDesktop
                                    ]}>My Bookings</Text>
                                </View>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Main Content Area with Fixed Width */}
                    <View style={styles.contentWrapper}>
                        <View style={[
                            styles.bookingsContent,
                            isWeb && styles.bookingsContentWeb
                        ]}>
                            {loading && bookings.length === 0 ? (
                                <View style={[
                                    styles.loadingCard,
                                    isLargeScreen && styles.loadingCardDesktop
                                ]}>
                                    <ActivityIndicator size="large" color="#00d285" />
                                    <Text style={[
                                        styles.loadingText,
                                        isLargeScreen && styles.loadingTextDesktop
                                    ]}>Loading bookings...</Text>
                                </View>
                            ) : bookings.length === 0 ? (
                                <View style={[
                                    styles.emptyStateCard,
                                    isLargeScreen && styles.emptyStateCardDesktop
                                ]}>
                                    <View style={styles.emptyIconCircle}>
                                        <MaterialCommunityIcons name="car" size={48} color="#ccc" />
                                    </View>
                                    <Text style={[
                                        styles.emptyStateTitle,
                                        isLargeScreen && styles.emptyStateTitleDesktop
                                    ]}>No bookings yet</Text>
                                    <Text style={[
                                        styles.emptyStateText,
                                        isLargeScreen && styles.emptyStateTextDesktop
                                    ]}>
                                        Your booking history will appear here
                                    </Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.searchBtn,
                                            isLargeScreen && styles.searchBtnDesktop
                                        ]}
                                        onPress={onBack}
                                    >
                                        <Text style={styles.searchBtnText}>Book Your First Ride</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.bookingsGrid}>
                                    {bookings.map((booking) => {
                                        const assignments = booking.vehicle_assignments || [];
                                        const hasMultipleVehicles = assignments.length > 1;

                                        return (
                                            <View key={booking.id} style={[
                                                styles.bookingCard,
                                                isLargeScreen && styles.bookingCardDesktop
                                            ]}>
                                                <View style={styles.bookingHeader}>
                                                    <View style={styles.bookingHeaderLeft}>
                                                        <Text style={[
                                                            styles.bookingCabName,
                                                            isLargeScreen && styles.bookingCabNameDesktop
                                                        ]}>
                                                            {hasMultipleVehicles 
                                                                ? `${assignments.length} Vehicles Booked`
                                                                : assignments.length > 0 && assignments[0].vehicle
                                                                    ? `${assignments[0].vehicle.make} ${assignments[0].vehicle.model}`
                                                                    : 'Vehicle Booking'
                                                            }
                                                        </Text>
                                                        {!hasMultipleVehicles && assignments.length > 0 && assignments[0].vehicle && (
                                                            <Text style={[
                                                                styles.bookingCabMeta,
                                                                isLargeScreen && styles.bookingCabMetaDesktop
                                                            ]}>
                                                                {assignments[0].vehicle.license_plate}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <View style={[
                                                        styles.statusBadge,
                                                        { backgroundColor: `${getStatusColor(booking.status)}20` }
                                                    ]}>
                                                        <Text style={[
                                                            styles.statusText, 
                                                            { color: getStatusColor(booking.status) },
                                                            isLargeScreen && styles.statusTextDesktop
                                                        ]}>
                                                            {getStatusText(booking.status)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.bookingBody}>
                                                    <View style={styles.bookingInfoRow}>
                                                        <Text style={[
                                                            styles.infoLabel,
                                                            isLargeScreen && styles.infoLabelDesktop
                                                        ]}>Purpose:</Text>
                                                        <Text style={[
                                                            styles.infoValue,
                                                            isLargeScreen && styles.infoValueDesktop
                                                        ]}>{booking.purpose}</Text>
                                                    </View>
                                                    
                                                    <View style={styles.locationsContainer}>
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

                                                    {/* Vehicle assignments */}
                                                    {assignments.map((assignment, index) => (
                                                        <View key={assignment.id} style={[
                                                            styles.assignmentSection,
                                                            isLargeScreen && styles.assignmentSectionDesktop
                                                        ]}>
                                                            {hasMultipleVehicles && (
                                                                <Text style={[
                                                                    styles.vehicleNumberLabel,
                                                                    isLargeScreen && styles.vehicleNumberLabelDesktop
                                                                ]}>
                                                                    Vehicle {index + 1}:
                                                                </Text>
                                                            )}
                                                            {assignment.vehicle && (
                                                                <View style={styles.bookingInfoRow}>
                                                                    <Text style={[
                                                                        styles.infoLabel,
                                                                        isLargeScreen && styles.infoLabelDesktop
                                                                    ]}>
                                                                        {hasMultipleVehicles ? '' : 'Vehicle:'}
                                                                    </Text>
                                                                    <Text style={[
                                                                        styles.infoValue,
                                                                        isLargeScreen && styles.infoValueDesktop
                                                                    ]}>
                                                                        {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.license_plate})
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            <View style={styles.bookingInfoRow}>
                                                                <Text style={[
                                                                    styles.infoLabel,
                                                                    isLargeScreen && styles.infoLabelDesktop
                                                                ]}>Driver:</Text>
                                                                <Text style={[
                                                                    styles.infoValue,
                                                                    isLargeScreen && styles.infoValueDesktop
                                                                ]}>
                                                                    {assignment.assigned_driver 
                                                                        ? assignment.assigned_driver.full_name 
                                                                        : 'Not assigned yet'}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.bookingInfoRow}>
                                                                <Text style={[
                                                                    styles.infoLabel,
                                                                    isLargeScreen && styles.infoLabelDesktop
                                                                ]}>Assignment Status:</Text>
                                                                <Text style={[
                                                                    styles.infoValue,
                                                                    { color: getStatusColor(assignment.assignment_status) },
                                                                    isLargeScreen && styles.infoValueDesktop
                                                                ]}>
                                                                    {getStatusText(assignment.assignment_status)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}

                                                    <View style={styles.bookingInfoRow}>
                                                        <Text style={[
                                                            styles.infoLabel,
                                                            isLargeScreen && styles.infoLabelDesktop
                                                        ]}>Start:</Text>
                                                        <Text style={[
                                                            styles.infoValue,
                                                            isLargeScreen && styles.infoValueDesktop
                                                        ]}>{formatDateTime(booking.start_time)}</Text>
                                                    </View>
                                                    <View style={styles.bookingInfoRow}>
                                                        <Text style={[
                                                            styles.infoLabel,
                                                            isLargeScreen && styles.infoLabelDesktop
                                                        ]}>End:</Text>
                                                        <Text style={[
                                                            styles.infoValue,
                                                            isLargeScreen && styles.infoValueDesktop
                                                        ]}>{formatDateTime(booking.end_time)}</Text>
                                                    </View>
                                                    {booking.grace_period && (
                                                        <View style={styles.bookingInfoRow}>
                                                            <Text style={[
                                                                styles.infoLabel,
                                                                isLargeScreen && styles.infoLabelDesktop
                                                            ]}>Grace Period:</Text>
                                                            <Text style={[
                                                                styles.infoValue,
                                                                isLargeScreen && styles.infoValueDesktop
                                                            ]}>{booking.grace_period} hours</Text>
                                                        </View>
                                                    )}
                                                    {booking.booked_for && (
                                                        <View style={styles.bookingInfoRow}>
                                                            <Text style={[
                                                                styles.infoLabel,
                                                                isLargeScreen && styles.infoLabelDesktop
                                                            ]}>Booked For:</Text>
                                                            <Text style={[
                                                                styles.infoValue,
                                                                isLargeScreen && styles.infoValueDesktop
                                                            ]}>{booking.booked_for.full_name}</Text>
                                                        </View>
                                                    )}
                                                    {booking.reason_of_cancellation && (
                                                        <View style={styles.bookingInfoRow}>
                                                            <Text style={[
                                                                styles.infoLabel,
                                                                isLargeScreen && styles.infoLabelDesktop
                                                            ]}>Cancellation Reason:</Text>
                                                            <Text style={[
                                                                styles.infoValue, 
                                                                { color: '#ff5e7a' },
                                                                isLargeScreen && styles.infoValueDesktop
                                                            ]}>
                                                                {booking.reason_of_cancellation}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                
                                                {(booking.status === 'pending' || booking.status === 'assigned') && (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.cancelBtn,
                                                            isLargeScreen && styles.cancelBtnDesktop
                                                        ]}
                                                        onPress={() => onCancelBooking(booking)}
                                                    >
                                                        <Text style={[
                                                            styles.cancelBtnText,
                                                            isLargeScreen && styles.cancelBtnTextDesktop
                                                        ]}>Cancel Booking</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
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
    headerWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    header: {
        width: '100%',
        maxWidth: 1100,
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
        height: 280,
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
    headerImageDesktop: {
        height: 280,
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
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
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
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingVertical: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        position: 'relative',
        zIndex: 1,
    },
    titleSectionDesktop: {
        paddingHorizontal: 40,
        paddingVertical: 35,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    headerTitleDesktop: {
        fontSize: 28,
    },
    contentWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    bookingsContent: {
        width: '100%',
        padding: 20,
        paddingBottom: 100,
    },
    bookingsContentWeb: {
        maxWidth: 1100,
        alignSelf: 'center',
    },
    loadingCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
    },
    loadingCardDesktop: {
        padding: 80,
        borderRadius: 20,
    },
    loadingText: {
        marginTop: 15,
        color: '#666',
        fontSize: 16,
    },
    loadingTextDesktop: {
        fontSize: 18,
    },
    emptyStateCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 60,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
    },
    emptyStateCardDesktop: {
        padding: 80,
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
        fontSize: 20,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    emptyStateTextDesktop: {
        fontSize: 15,
        lineHeight: 22,
    },
    searchBtn: {
        backgroundColor: '#00d285',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    searchBtnDesktop: {
        padding: 18,
        borderRadius: 14,
    },
    searchBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    bookingsGrid: {
        gap: 15,
    },
    bookingCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
        marginBottom: 15,
    },
    bookingCardDesktop: {
        padding: 28,
        borderRadius: 20,
        marginBottom: 20,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    bookingHeaderLeft: {
        flex: 1,
    },
    bookingCabName: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
        marginBottom: 5,
    },
    bookingCabNameDesktop: {
        fontSize: 20,
    },
    bookingCabMeta: {
        fontSize: 13,
        color: '#666',
    },
    bookingCabMetaDesktop: {
        fontSize: 14,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    statusTextDesktop: {
        fontSize: 13,
    },
    bookingBody: {
        gap: 12,
    },
    bookingInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    infoLabel: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    infoLabelDesktop: {
        fontSize: 15,
    },
    infoValue: {
        color: '#333',
        fontWeight: '500',
        fontSize: 14,
        flex: 1,
        textAlign: 'right',
    },
    infoValueDesktop: {
        fontSize: 15,
    },
    locationsContainer: {
        marginVertical: 8,
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
        fontSize: 15,
    },
    arrowContainer: {
        marginLeft: 8,
        marginBottom: 6,
    },
    assignmentSection: {
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 10,
        marginTop: 8,
        gap: 8,
    },
    assignmentSectionDesktop: {
        padding: 15,
        borderRadius: 12,
    },
    vehicleNumberLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#00d285',
        marginBottom: 4,
    },
    vehicleNumberLabelDesktop: {
        fontSize: 16,
    },
    cancelBtn: {
        backgroundColor: '#ff5e7a',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15,
    },
    cancelBtnDesktop: {
        padding: 16,
        borderRadius: 14,
    },
    cancelBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    cancelBtnTextDesktop: {
        fontSize: 17,
    },
    logoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
    },
    logoTextDesktop: {
        fontSize: 18,
        letterSpacing: 1.5,
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
        fontSize: 16,
        marginLeft: 2,
    },
});

export default MyBookingsScreen;